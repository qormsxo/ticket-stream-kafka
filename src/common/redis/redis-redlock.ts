import { randomBytes } from 'crypto';
import { RetryableError } from '../errors';
import { sleep } from '../utils/sleep';

export interface LockClient {
  set(
    key: string,
    value: string,
    expiryMode: 'PX',
    ttlMs: number,
    condition: 'NX',
  ): Promise<string | null>;
  eval(
    script: string,
    numKeys: number,
    key: string,
    token: string,
  ): Promise<unknown>;
}

export interface HeldLock {
  resource: string;
  token: string;
}

const UNLOCK_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0
end
`;

export interface RedlockOptions {
  retryCount: number;
  retryDelayMs: number;
  driftFactor: number;
}

/**
 * 과반 Redis에 같은 토큰을 심어 잠그는 기능.
 * 시계 오차에는 약하므로 좌석의 최종 판단은 DB 행 잠금이 담당함.
 */
export class RedisRedlock {
  constructor(
    private readonly clients: LockClient[],
    private readonly options: RedlockOptions,
  ) {
    if (clients.length === 0) {
      throw new Error('Redlock에는 Redis 노드가 하나 이상 필요합니다.');
    }
  }

  get quorum(): number {
    return Math.floor(this.clients.length / 2) + 1;
  }

  async using<T>(resource: string, ttlMs: number, task: () => Promise<T>): Promise<T> {
    const lock = await this.acquire(resource, ttlMs);
    try {
      return await task();
    } finally {
      // 성공이든 실패든 여기서 잠금을 해제함
      await this.release(lock);
    }
  }

  async acquire(resource: string, ttlMs: number): Promise<HeldLock> {
    const attempts = this.options.retryCount + 1;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      const lock = await this.tryAcquire(resource, ttlMs);
      if (lock) {
        return lock;
      }
      if (attempt < attempts) {
        const jitter = Math.floor(Math.random() * this.options.retryDelayMs);
        await sleep(this.options.retryDelayMs + jitter);
      }
    }

    throw new RetryableError(`락 획득 실패: ${resource}`);
  }

  async release(lock: HeldLock): Promise<void> {
    await Promise.all(
      this.clients.map(async (client) => {
        try {
          await client.eval(UNLOCK_SCRIPT, 1, lock.resource, lock.token);
        } catch {
          // 소수 노드 실패는 무시함. 남은 키는 TTL이 지나면 사라짐
        }
      }),
    );
  }

  private async tryAcquire(resource: string, ttlMs: number): Promise<HeldLock | null> {
    const token = randomBytes(16).toString('hex');
    const startedAt = Date.now();
    const votes = await Promise.all(
      this.clients.map(async (client) => {
        try {
          const reply = await client.set(resource, token, 'PX', ttlMs, 'NX');
          return reply === 'OK';
        } catch {
          return false;
        }
      }),
    );

    const granted = votes.filter(Boolean).length;
    const elapsed = Date.now() - startedAt;
    const drift = Math.round(this.options.driftFactor * ttlMs) + 2;
    const validity = ttlMs - elapsed - drift;
    // 과반을 얻어도 남은 유효 시간이 없으면 잠금으로 인정하지 않고 부분 키를 지움
    if (granted >= this.quorum && validity > 0) {
      return { resource, token };
    }

    await this.release({ resource, token });
    return null;
  }
}
