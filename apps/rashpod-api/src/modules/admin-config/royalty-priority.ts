export type RoyaltyScope = "DESIGNER" | "PRODUCT_TYPE" | "CHANNEL" | "DEFAULT";

export interface RoyaltyCandidate {
  id: string;
  scope: RoyaltyScope;
  isActive: boolean;
}

const priority: Record<RoyaltyScope, number> = {
  DESIGNER: 4,
  PRODUCT_TYPE: 3,
  CHANNEL: 2,
  DEFAULT: 1,
};

export function pickRoyaltyRule(candidates: RoyaltyCandidate[]): RoyaltyCandidate | undefined {
  return candidates
    .filter((c) => c.isActive)
    .sort((a, b) => priority[b.scope] - priority[a.scope])[0];
}
