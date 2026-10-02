import { Logger } from '@nestjs/common';
import { FakePaymentMode } from '../../config/configuration';
import { sleep } from '../../common/utils/sleep';
import { ChargeRequest, ChargeResult, PaymentProvider, VoidChargeRequest } from './payment-provider';

export interface FakePaymentOptions {
  mode: FakePaymentMode;
  delayMs: number;
  failRate: number;
}

// PG 없이 승인 결과를 만드는 기능. 같은 bookingId면 결과도 같음. 실제 청구는 없음
export class FakePaymentProvider implements PaymentProvider {
  readonly name = 'fake';
  private readonly logger = new Logger(FakePaymentProvider.name);

  constructor(private readonly options: FakePaymentOptions) {}

  // 외부 호출 없이 지연만 흉내 낸 뒤 승인 또는 거절을 반환함
  async charge(request: ChargeRequest): Promise<ChargeResult> {
    if (this.options.delayMs > 0) {
      await sleep(this.options.delayMs);
    }

    const approved = this.approvedFor(request.bookingId);
    return {
      approved,
      providerRef: `fake_${request.bookingId}`,
      reason: approved ? undefined : 'FAKE_DECLINED',
    };
  }

  async voidCharge(request: VoidChargeRequest): Promise<void> {
    this.logger.log(`fake void booking=${request.bookingId} ref=${request.providerRef}`);
  }

  // success, fail, flaky 모드에 따라 승인 여부를 정함. flaky는 bookingId 해시로 고정함
  private approvedFor(bookingId: string): boolean {
    if (this.options.mode === 'success') {
      return true;
    }
    if (this.options.mode === 'fail') {
      return false;
    }

    const hash = [...bookingId].reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const threshold = Math.max(0, Math.min(100, Math.round(this.options.failRate * 100)));
    return hash % 100 >= threshold;
  }
}
