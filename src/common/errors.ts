export class RetryableError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'RetryableError';
  }
}

function readCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') {
    return undefined;
  }

  const record = error as { code?: string; driverError?: { code?: string } };
  return record.code ?? record.driverError?.code;
}

export function isUniqueViolation(error: unknown): boolean {
  return readCode(error) === '23505';
}

export function isRetryableDbError(error: unknown): boolean {
  const code = readCode(error);
  return code === '40P01' || code === '55P03' || code === '40001';
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
