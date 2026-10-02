import { Module } from '@nestjs/common';
import { AppConfigService } from '../../config/app-config.service';
import { OutboxModule } from '../outbox/outbox.module';
import { FakePaymentProvider } from './fake-payment.provider';
import { PAYMENT_PROVIDER, PaymentProvider } from './payment-provider';
import { PaymentConsumer } from './payment.consumer';
import { PaymentService } from './payment.service';

@Module({
  imports: [OutboxModule],
  controllers: [PaymentConsumer],
  providers: [
    PaymentService,
    {
      provide: PAYMENT_PROVIDER,
      inject: [AppConfigService],
      useFactory: (config: AppConfigService): PaymentProvider => {
        if (config.paymentProvider !== 'fake') {
          throw new Error(`지원하지 않는 결제 제공자입니다: ${config.paymentProvider}`);
        }
        return new FakePaymentProvider({
          mode: config.fakePaymentMode,
          delayMs: config.fakePaymentDelayMs,
          failRate: config.fakePaymentFailRate,
        });
      },
    },
  ],
})
export class PaymentModule {}
