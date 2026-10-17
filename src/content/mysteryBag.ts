export type MysteryReward = { readonly kind: 'money'; readonly amount: number }
  | { readonly kind: 'bomb'; readonly amount: 1 };

export const MYSTERY_BAG_RULES = {
  bombChance: 0.25,
  moneyAmounts: [50, 100, 150, 300],
  fullInventoryMoney: 100,
  noticeSeconds: 3,
} as const;

/** One random draw per successfully deposited bag. Randomness is injectable for tests. */
export function rollMysteryReward(random: () => number): MysteryReward {
  const roll = random();
  const { bombChance, moneyAmounts } = MYSTERY_BAG_RULES;
  if (roll < bombChance) return { kind: 'bomb', amount: 1 };
  const index = Math.min(moneyAmounts.length - 1,
    Math.floor((roll - bombChance) / (1 - bombChance) * moneyAmounts.length));
  return { kind: 'money', amount: moneyAmounts[index] };
}
