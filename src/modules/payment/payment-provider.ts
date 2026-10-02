export interface ChargeRequest {
  bookingId: string;
  userId: string;
  amount: number;
  idempotencyKey: string;
}

export interface ChargeResult {
  approved: boolean;
  providerRef: string;
  reason?: string;
}

export interface VoidChargeRequest {
  bookingId: string;
  providerRef: string;
}

export interface PaymentProvider {
  readonly name: string;
  charge(request: ChargeRequest): Promise<ChargeResult>;
  voidCharge(request: VoidChargeRequest): Promise<void>;
}

export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');
