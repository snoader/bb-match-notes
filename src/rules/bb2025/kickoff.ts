export const KICKOFF_EVENTS = [
  { roll: 2, key: "GET_THE_REF", label: "Get the Ref" },
  { roll: 3, key: "TIME_OUT", label: "Time Out" },
  { roll: 4, key: "PERFECT_DEFENCE", label: "Perfect Defence" },
  { roll: 5, key: "HIGH_KICK", label: "High Kick" },
  { roll: 6, key: "CHEERING_FANS", label: "Cheering Fans" },
  { roll: 7, key: "CHANGING_WEATHER", label: "Changing Weather" },
  { roll: 8, key: "BRILLIANT_COACHING", label: "Brilliant Coaching" },
  { roll: 9, key: "QUICK_SNAP", label: "Quick Snap" },
  { roll: 10, key: "BLITZ", label: "Blitz" },
  { roll: 11, key: "THROW_A_ROCK", label: "Throw a Rock" },
  { roll: 12, key: "PITCH_INVASION", label: "Pitch Invasion" },
] as const;

export type KickoffEvent = (typeof KICKOFF_EVENTS)[number];
export type KickoffKey = KickoffEvent["key"];

export function listKickoffEvents(): readonly KickoffEvent[] {
  return KICKOFF_EVENTS;
}

export function mapKickoffRoll(roll2d6: number): { key: KickoffKey; label: string } {
  const normalizedRoll = Math.max(2, Math.min(12, Math.round(roll2d6)));
  const event = KICKOFF_EVENTS.find((kickoffEvent) => kickoffEvent.roll === normalizedRoll) ?? KICKOFF_EVENTS[0];
  return { key: event.key, label: event.label };
}
