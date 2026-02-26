export const BB2025_KICKOFF_TABLE = {
  2: { key: "GET_THE_REF", label: "Get the Ref" },
  3: { key: "TIME_OUT", label: "Time Out" },
  4: { key: "PERFECT_DEFENCE", label: "Perfect Defence" },
  5: { key: "HIGH_KICK", label: "High Kick" },
  6: { key: "CHEERING_FANS", label: "Cheering Fans" },
  7: { key: "CHANGING_WEATHER", label: "Changing Weather" },
  8: { key: "BRILLIANT_COACHING", label: "Brilliant Coaching" },
  9: { key: "QUICK_SNAP", label: "Quick Snap" },
  10: { key: "BLITZ", label: "Blitz" },
  11: { key: "THROW_A_ROCK", label: "Throw a Rock" },
  12: { key: "PITCH_INVASION", label: "Pitch Invasion" },
} as const;

export type KickoffKey = (typeof BB2025_KICKOFF_TABLE)[keyof typeof BB2025_KICKOFF_TABLE]["key"];

export function mapKickoffRoll(roll2d6: number): { key: KickoffKey; label: string } {
  const normalizedRoll = Math.max(2, Math.min(12, Math.round(roll2d6)));
  return BB2025_KICKOFF_TABLE[normalizedRoll as keyof typeof BB2025_KICKOFF_TABLE];
}
