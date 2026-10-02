import { RetryableError } from '../src/common/errors';
import { LockClient, RedisRedlock } from '../src/common/redis/redis-redlock';

class MemoryLockClient implements LockClient {
  readonly store = new Map<string, { value: string; expiresAt: number }>();
  fail = false;

  async set(
    key: string,
    value: string,
    _expiryMode: 'PX',
    ttlMs: number,
    _condition: 'NX',
  ): Promise<string | null> {
    if (this.fail) {
      throw new Error('redis down');
    }
    const current = this.store.get(key);
    if (current && current.expiresAt > Date.now()) {
      return null;
    }
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
    return 'OK';
  }

  async eval(_script: string, _numKeys: number, key: string, token: string): Promise<number> {
    const current = this.store.get(key);
    if (!current || current.value !== token) {
      return 0;
    }
    this.store.delete(key);
    return 1;
  }
}

describe('RedisRedlock', () => {
  const options = { retryCount: 0, retryDelayMs: 1, driftFactor: 0.01 };

  it('쿼럼을 얻으면 잠그고, 토큰이 맞는 노드만 해제한다', async () => {
    const nodes = [new MemoryLockClient(), new MemoryLockClient(), new MemoryLockClient()];
    const redlock = new RedisRedlock(nodes, options);

    const result = await redlock.using('lock:seat:1', 1_000, async () => 'held');
    expect(result).toBe('held');
    expect(nodes.every((node) => node.store.size === 0)).toBe(true);
  });

  it('잠긴 자원은 해제 전에 다시 잠글 수 없다', async () => {
    const nodes = [new MemoryLockClient(), new MemoryLockClient(), new MemoryLockClient()];
    const redlock = new RedisRedlock(nodes, options);
    const first = await redlock.acquire('lock:seat:1', 5_000);

    await expect(redlock.acquire('lock:seat:1', 5_000)).rejects.toBeInstanceOf(RetryableError);
    await redlock.release(first);
    await expect(redlock.acquire('lock:seat:1', 5_000)).resolves.toEqual(
      expect.objectContaining({ resource: 'lock:seat:1' }),
    );
  });

  it('노드 3대 중 1대가 죽어도 다수결로 잠근다', async () => {
    const nodes = [new MemoryLockClient(), new MemoryLockClient(), new MemoryLockClient()];
    nodes[2].fail = true;
    const redlock = new RedisRedlock(nodes, options);

    await expect(redlock.acquire('lock:seat:9', 1_000)).resolves.toEqual(
      expect.objectContaining({ resource: 'lock:seat:9' }),
    );
  });

  it('다수결에 실패하면 부분 잠금을 되돌린다', async () => {
    const nodes = [new MemoryLockClient(), new MemoryLockClient(), new MemoryLockClient()];
    nodes[1].fail = true;
    nodes[2].fail = true;
    const redlock = new RedisRedlock(nodes, options);

    await expect(redlock.acquire('lock:seat:3', 1_000)).rejects.toBeInstanceOf(RetryableError);
    expect(nodes[0].store.size).toBe(0);
  });
});
