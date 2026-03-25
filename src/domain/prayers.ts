import type { TeamId } from "./enums";
import type { MatchEvent } from "./events";

export const SPP_RELEVANT_PRAYERS = ["perfect_passing", "fan_interaction", "necessary_violence", "fouling_frenzy"] as const;

export type SppRelevantPrayer = (typeof SPP_RELEVANT_PRAYERS)[number];
export type PrayerDuration = "until_end_of_game" | "until_end_of_drive";

export type ActiveSppPrayer = {
  prayer: SppRelevantPrayer;
  duration: PrayerDuration;
  sourceEventId: string;
  sourceDriveIndex: number;
};

export type ActiveSppPrayersByTeam = Record<TeamId, ActiveSppPrayer[]>;

const DRIVE_PRAYERS = new Set<SppRelevantPrayer>(["fan_interaction", "necessary_violence", "fouling_frenzy"]);
const SPP_RELEVANT_PRAYER_SET = new Set<SppRelevantPrayer>(SPP_RELEVANT_PRAYERS);

export const isSppRelevantPrayer = (value: unknown): value is SppRelevantPrayer =>
  typeof value === "string" && SPP_RELEVANT_PRAYER_SET.has(value as SppRelevantPrayer);

export const getSppPrayerDuration = (prayer: SppRelevantPrayer): PrayerDuration =>
  DRIVE_PRAYERS.has(prayer) ? "until_end_of_drive" : "until_end_of_game";

const getEventTeam = (event: MatchEvent): TeamId | undefined =>
  event.team === "A" || event.team === "B" ? event.team : undefined;

export function deriveActiveSppPrayersByTeam(events: MatchEvent[], eventDriveIndex: Map<string, number>, driveIndexCurrent: number): ActiveSppPrayersByTeam {
  const latest: Record<TeamId, Partial<Record<SppRelevantPrayer, ActiveSppPrayer>>> = { A: {}, B: {} };

  for (const event of events) {
    if (event.type !== "prayer_result") continue;
    const team = getEventTeam(event);
    if (!team) continue;
    const prayer = event.payload?.result;
    if (!isSppRelevantPrayer(prayer)) continue;

    const sourceDriveIndex = eventDriveIndex.get(event.id) ?? 1;
    latest[team][prayer] = {
      prayer,
      duration: getSppPrayerDuration(prayer),
      sourceEventId: event.id,
      sourceDriveIndex,
    };
  }

  const isActive = (entry: ActiveSppPrayer) =>
    entry.duration === "until_end_of_game" || entry.sourceDriveIndex === driveIndexCurrent;

  return {
    A: Object.values(latest.A).filter((entry): entry is ActiveSppPrayer => Boolean(entry) && isActive(entry)),
    B: Object.values(latest.B).filter((entry): entry is ActiveSppPrayer => Boolean(entry) && isActive(entry)),
  };
}
