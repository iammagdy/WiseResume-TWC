export interface ReferralReward {
  friends: number;
  reward: string;
}

export const REFERRAL_REWARDS: ReferralReward[] = [
  { friends: 1, reward: '3 extra AI credits/day for 1 week' },
  { friends: 3, reward: '1 week of Pro features' },
  { friends: 5, reward: '1 month of Pro features' },
  { friends: 10, reward: 'Lifetime Premium badge' },
];

const FALLBACK_TEASER = 'Invite friends to WiseResume.';

export function getReferralTeaser(): string {
  const first = REFERRAL_REWARDS[0];
  if (!first) return FALLBACK_TEASER;
  return `Invite friends, earn ${first.reward}`;
}
