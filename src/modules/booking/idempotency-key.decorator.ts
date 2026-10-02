import { createParamDecorator, ExecutionContext, BadRequestException } from '@nestjs/common';

export const IdempotencyKey = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string => {
    const request = context.switchToHttp().getRequest<{ header: (name: string) => string | undefined }>();
    const key = request.header('idempotency-key')?.trim();
    if (!key || key.length < 8 || key.length > 128 || !/^[A-Za-z0-9:_-]+$/.test(key)) {
      throw new BadRequestException(
        'Idempotency-Key 헤더는 8~128자의 영문, 숫자, :, _, - 만 허용됩니다.',
      );
    }
    return key;
  },
);
