import { Logger } from '@nestjs/common';
import { FakePaymentMode } from '../../config/configuration';
import { sleep } from '../../common/utils/sleep';
import { ChargeRequest, ChargeResult, PaymentProvider, VoidChargeRequest } from './payment-provider';

export interface FakePaymentOptions {
  mode: FakePaymentMode;
  delayMs: number;
  failRate: number;
}

/**
 * 부하 테스트용 결제 대역. bookingId가 같으면 승인 여부도 같다.
 * 외부 PG를 호출하지 않으므로 비용은 0원이다.
 */
export class FakePaymentProvider implements PaymentProvider {
  readonly name = 'fake';
  private readonly logger = new Logger(FakePaymentProvider.name);

  constructor(private readonly options: FakePaymentOptions) {}

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
