/**
 * Booking money helpers — keep rounding and remaining-balance
 * invariants identical everywhere (checkout, apply, public API).
 */

export function roundMoney(n: number): number {
  return Math.round(Number(n) * 100) / 100;
}

export function remainingBalance(
  totalAmount: number,
  amountPaid: number,
): number {
  return Math.max(roundMoney(Number(totalAmount) - Number(amountPaid || 0)), 0);
}

export function chargeNowAmount(
  totalAmount: number,
  paymentType: 'full' | 'deposit',
  depositPercent: number,
): number {
  const total = roundMoney(totalAmount);
  if (paymentType !== 'deposit') return total;
  const pct = Math.min(Math.max(Number(depositPercent) || 0, 1), 100);
  return roundMoney((total * pct) / 100);
}

export type SettlementStatus = 'pending' | 'partially_paid' | 'paid';

export function settlementStatus(
  amountPaid: number,
  remaining: number,
): SettlementStatus {
  const paid = roundMoney(Number(amountPaid) || 0);
  const due = roundMoney(Number(remaining) || 0);
  if (paid > 0 && due <= 0) return 'paid';
  if (paid > 0 && due > 0) return 'partially_paid';
  return 'pending';
}

export function amountsMatch(
  expected: number,
  actual: unknown,
): boolean {
  if (actual == null || actual === '') return true;
  const n = Number(actual);
  if (!Number.isFinite(n)) return true;
  return roundMoney(n) === roundMoney(expected);
}
