export type FakePaymentMode = 'success' | 'fail' | 'flaky';

export interface AppEnv {
  nodeEnv: string;
  role: string;
  httpPort: number;
  workerPort: number;
  dbHost: string;
  dbPort: number;
  dbUser: string;
  dbPassword: string;
  dbName: string;
  dbSynchronize: boolean;
  dbLogging: boolean;
  redisUrls: string[];
  kafkaBrokers: string[];
  kafkaClientId: string;
  seatHoldTtlMs: number;
  redlockTtlMs: number;
  redlockRetryCount: number;
  redlockRetryDelayMs: number;
  lockTimeoutMs: number;
  paymentProvider: string;
  fakePaymentMode: FakePaymentMode;
  fakePaymentDelayMs: number;
  fakePaymentFailRate: number;
  seedOnBoot: boolean;
  seedSeatCount: number;
  outboxPollMs: number;
  outboxBatchSize: number;
  outboxStuckSeconds: number;
  holdSweepMs: number;
}

function int(value: string | undefined, fallback: number): number {
  if (value === undefined || value === '') {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function bool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === '') {
    return fallback;
  }
  return value === 'true' || value === '1';
}

function list(value: string | undefined, fallback: string): string[] {
  return (value ?? fallback)
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function paymentMode(value: string | undefined): FakePaymentMode {
  if (value === 'fail' || value === 'flaky') {
    return value;
  }
  return 'success';
}

export const configuration = (): AppEnv => {
  const role = process.env.WORKER_ROLE?.trim() || 'gateway';
  const gateway = role === 'gateway';

  return {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    role,
    httpPort: int(process.env.HTTP_PORT, 3000),
    workerPort: int(process.env.WORKER_PORT, 3001),
    dbHost: process.env.DB_HOST ?? 'localhost',
    dbPort: int(process.env.DB_PORT, 5432),
    dbUser: process.env.DB_USER ?? 'ticket',
    dbPassword: process.env.DB_PASSWORD ?? 'ticket',
    dbName: process.env.DB_NAME ?? 'ticket',
    dbSynchronize: bool(process.env.DB_SYNCHRONIZE, gateway),
    dbLogging: bool(process.env.DB_LOGGING, false),
    redisUrls: list(
      process.env.REDIS_URLS,
      'redis://localhost:6379,redis://localhost:6380,redis://localhost:6381',
    ),
    kafkaBrokers: list(process.env.KAFKA_BROKERS, 'localhost:9092'),
    kafkaClientId: process.env.KAFKA_CLIENT_ID ?? `ticket-${role}`,
    seatHoldTtlMs: int(process.env.SEAT_HOLD_TTL_MS, 180_000),
    redlockTtlMs: int(process.env.REDLOCK_TTL_MS, 5_000),
    redlockRetryCount: int(process.env.REDLOCK_RETRY_COUNT, 8),
    redlockRetryDelayMs: int(process.env.REDLOCK_RETRY_DELAY_MS, 100),
    lockTimeoutMs: int(process.env.LOCK_TIMEOUT_MS, 2_000),
    paymentProvider: process.env.PAYMENT_PROVIDER ?? 'fake',
    fakePaymentMode: paymentMode(process.env.FAKE_PAYMENT_MODE),
    fakePaymentDelayMs: int(process.env.FAKE_PAYMENT_DELAY_MS, 20),
    fakePaymentFailRate: Number(process.env.FAKE_PAYMENT_FAIL_RATE ?? '0.2'),
    seedOnBoot: bool(process.env.SEED_ON_BOOT, gateway),
    seedSeatCount: int(process.env.SEED_SEAT_COUNT, 100),
    outboxPollMs: int(process.env.OUTBOX_POLL_MS, 500),
    outboxBatchSize: int(process.env.OUTBOX_BATCH_SIZE, 100),
    outboxStuckSeconds: int(process.env.OUTBOX_STUCK_SECONDS, 30),
    holdSweepMs: int(process.env.HOLD_SWEEP_MS, 5_000),
  };
};
