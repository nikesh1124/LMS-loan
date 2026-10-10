export const INTEREST_RATE = 12;
export const MIN_AMOUNT = 50000;
export const MAX_AMOUNT = 500000;
export const MIN_TENURE = 30;
export const MAX_TENURE = 365;

export const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

export function calculateLoan(principal: number, tenureDays: number) {
  const simpleInterest = round2((principal * INTEREST_RATE * tenureDays) / (365 * 100));
  return { simpleInterest, totalRepayment: round2(principal + simpleInterest) };
}
