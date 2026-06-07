/** 1 loyalty point earned per this many IQD spent */
export const LOYALTY_EARN_PER_IQD = 1000;
/** Each loyalty point redeems for this many IQD discount */
export const LOYALTY_REDEEM_IQD = 100;

export function calcLoyaltyEarned(totalIqd: number): number {
  return Math.floor(totalIqd / LOYALTY_EARN_PER_IQD);
}

export function calcLoyaltyDiscount(points: number): number {
  return points * LOYALTY_REDEEM_IQD;
}
