import { FakePaymentProvider } from '../src/modules/payment/fake-payment.provider';

describe('FakePaymentProvider', () => {
  const request = {
    bookingId: 'booking-1',
    userId: 'user-1',
    amount: 99000,
    idempotencyKey: 'booking-1',
  };

  it('성공 모드는 항상 승인하고 참조번호를 예매 ID로 고정한다', async () => {
    const provider = new FakePaymentProvider({ mode: 'success', delayMs: 0, failRate: 1 });
    const result = await provider.charge(request);
    expect(result).toEqual({
      approved: true,
      providerRef: 'fake_booking-1',
      reason: undefined,
    });
  });

  it('실패 모드는 외부 호출 없이 거절한다', async () => {
    const provider = new FakePaymentProvider({ mode: 'fail', delayMs: 0, failRate: 0 });
    await expect(provider.charge(request)).resolves.toMatchObject({
      approved: false,
      reason: 'FAKE_DECLINED',
    });
  });

  it('불안정 모드는 같은 예매 ID에 같은 결과를 돌려준다', async () => {
    const provider = new FakePaymentProvider({ mode: 'flaky', delayMs: 0, failRate: 0.5 });
    const first = await provider.charge(request);
    const second = await provider.charge(request);
    expect(second.approved).toBe(first.approved);
    expect(second.providerRef).toBe(first.providerRef);
  });
});
