export const PRICING_VERSION = '2026-10-22';
export const PRICING = Object.freeze({
  version: PRICING_VERSION,
  currency: 'USD' as const,
  starterMonthlyMinor: 2000,
  includedAccounts: 2,
  extraAccountMonthlyMinor: 800,
  targetMarginBps: 4000,
  minimumTopupMinor: 1000,
  callMinimumBalanceMinor: 500,
  smsMinimumBalanceMinor: 200,
});

function minor(value: number) {
  if (!Number.isSafeInteger(value) || value < 0) throw new RangeError('Use nonnegative integer USD cents.');
}

/** Margin is a share of the retail charge, rather than a markup on provider cost. */
export function retailAmountMinor(providerCostMinor: number, targetMarginBps = PRICING.targetMarginBps): number {
  minor(providerCostMinor);
  if (!Number.isInteger(targetMarginBps) || targetMarginBps < 0 || targetMarginBps >= 10000) throw new RangeError('Margin must be from 0 to 9999 basis points.');
  const divisor = BigInt(10000 - targetMarginBps);
  const result = (BigInt(providerCostMinor) * 10000n + divisor - 1n) / divisor;
  if (result > BigInt(Number.MAX_SAFE_INTEGER)) throw new RangeError('Retail charge exceeds supported integer cents.');
  return Number(result);
}

export function starterMonthlyMinor(connectedAccounts: number): number {
  minor(connectedAccounts);
  const result = BigInt(PRICING.starterMonthlyMinor) + BigInt(Math.max(0, connectedAccounts - PRICING.includedAccounts)) * BigInt(PRICING.extraAccountMonthlyMinor);
  if (result > BigInt(Number.MAX_SAFE_INTEGER)) throw new RangeError('Subscription charge exceeds supported integer cents.');
  return Number(result);
}

export function requiredWalletBalanceMinor(capability: 'voice_call' | 'sms_send' | 'other', reservationAmountMinor: number): number {
  minor(reservationAmountMinor);
  const floor = capability === 'voice_call' ? PRICING.callMinimumBalanceMinor : capability === 'sms_send' ? PRICING.smsMinimumBalanceMinor : 0;
  return Math.max(floor, reservationAmountMinor);
}
