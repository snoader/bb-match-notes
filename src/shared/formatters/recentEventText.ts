import type { MatchEvent } from "../../domain/events";
import type { SppPrayerEventImpact } from "../../domain/spp";
import { formatEventText, type TeamNames } from "./formatEventText";

const KICKOFF_TITLE_PREFIX = /^\s*Kick-off(?:\s*(?:·|:)\s*)?/i;
const TREASURY_RELEVANT_EVENT_TYPES = new Set(["touchdown", "stalling"] as const);

type TreasuryDeltaSnapshot = {
  A: { winningsDelta: number };
  B: { winningsDelta: number };
};

function stripKickoffPrefix(title: string): string {
  const cleaned = title.replace(KICKOFF_TITLE_PREFIX, "").trim();
  return cleaned || title;
}

function formatProjectedDelta(value: number): string {
  const sign = value >= 0 ? "+" : "-";
  return `${sign}${Math.round(Math.abs(value) / 1000)}k`;
}

function formatProjectedTreasuryDeltaLine(event: MatchEvent, teamNames: TeamNames, snapshot?: TreasuryDeltaSnapshot): string | null {
  if (!snapshot || !TREASURY_RELEVANT_EVENT_TYPES.has(event.type as "touchdown" | "stalling")) return null;

  if (event.type === "stalling" && (event.team === "A" || event.team === "B")) {
    return `${teamNames[event.team]} projected delta now ${formatProjectedDelta(snapshot[event.team].winningsDelta)}`;
  }

  return `Projected treasury delta: ${teamNames.A} ${formatProjectedDelta(snapshot.A.winningsDelta)} · ${teamNames.B} ${formatProjectedDelta(snapshot.B.winningsDelta)}`;
}

function formatPrayerImpactLine(prayerImpact?: SppPrayerEventImpact): string | null {
  if (!prayerImpact) return null;
  const reason = prayerImpact.reason === "completion" ? "Completion" : "Casualty";
  const prayer = prayerImpact.prayer.replaceAll("_", " ");
  return `SPP modified by Prayer (${prayer}): ${reason} ${prayerImpact.baseAward} → ${prayerImpact.boostedAward}`;
}

export function formatRecentEventLines(
  event: MatchEvent,
  teamNames: TeamNames,
  treasuryDeltaSnapshot?: TreasuryDeltaSnapshot,
  prayerImpact?: SppPrayerEventImpact,
): string[] {
  const formatted = formatEventText(event, teamNames);
  if (!formatted || event.type === "weather_set") return [];
  if (event.type === "kickoff" || event.type === "kickoff_event") {
    return [stripKickoffPrefix(formatted)];
  }

  const prayerImpactLine = formatPrayerImpactLine(prayerImpact);
  const treasuryDeltaLine = formatProjectedTreasuryDeltaLine(event, teamNames, treasuryDeltaSnapshot);
  return [formatted, prayerImpactLine, treasuryDeltaLine].filter((line): line is string => Boolean(line));
}
