import type { MatchEvent, KickoffEventPayload } from "../../domain/events";
import type { DerivedMatchState } from "../../domain/projection";
import { formatApothecaryOutcome, formatCasualtyResult, getFinalInjuryResult } from "./casualtyOutcome";

type TeamNames = DerivedMatchState["teamNames"];

const titleCase = (value: string) => value.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (x) => x.toUpperCase());
const weatherLabel = (value: string) => {
  const normalized = value.trim().toUpperCase();
  const labels: Record<string, string> = {
    VERY_SUNNY: "Very Sunny",
    POURING_RAIN: "Pouring Rain",
    SWELTERING_HEAT: "Sweltering Heat",
    BLIZZARD: "Blizzard",
    NICE: "Nice",
  };
  return labels[normalized] ?? titleCase(value);
};

const playerId = (value: unknown) => (value ? String(value) : "?");
const rockOutcomeLabel = (value: string) => {
  const normalized = value.trim().toUpperCase();
  if (normalized === "KO") return "KO";
  return titleCase(value);
};

const teamNameFor = (team: MatchEvent["team"] | undefined, teamNames: TeamNames) => {
  if (team === "A") return teamNames.A;
  if (team === "B") return teamNames.B;
  return "Unknown team";
};

const withDetail = (baseText: string, detailText?: string) => {
  if (!detailText) return baseText;
  return `${baseText}: ${detailText}`;
};

const formatKickoffLabel = (payload: unknown) => {
  if (!payload || typeof payload !== "object") return "Unknown";
  const kickoff = payload as Partial<KickoffEventPayload> & { result?: string };
  if (typeof kickoff.kickoffLabel === "string" && kickoff.kickoffLabel.trim()) return kickoff.kickoffLabel;
  if (typeof kickoff.result === "string" && kickoff.result.trim()) return titleCase(kickoff.result);
  return "Unknown";
};

const formatKickoffEventDetails = (payload: unknown, teamNames: TeamNames): { baseText: string; detailText?: string } | undefined => {
  if (!payload || typeof payload !== "object") return undefined;
  const kickoff = payload as Partial<KickoffEventPayload>;

  if (!kickoff.kickoffKey) {
    return { baseText: `Kick-off · ${formatKickoffLabel(payload)}` };
  }

  if (kickoff.kickoffKey === "CHANGING_WEATHER") {
    const weather = kickoff.details?.newWeather;
    return {
      baseText: "Kick-off · Weather",
      detailText: weather ? weatherLabel(String(weather)) : undefined,
    };
  }

  if (kickoff.kickoffKey === "TIME_OUT") {
    const delta = kickoff.details?.appliedDelta;
    return {
      baseText: "Kick-off · Time-Out",
      detailText: delta === 1 || delta === -1 ? `${delta > 0 ? "+" : ""}${delta} Turn` : undefined,
    };
  }

  if (kickoff.kickoffKey === "THROW_A_ROCK") {
    const targetTeam = kickoff.details?.targetTeam ? teamNameFor(kickoff.details.targetTeam, teamNames) : undefined;
    const targetPlayer = kickoff.details?.targetPlayer;
    const target = [targetTeam, targetPlayer ? `#${targetPlayer}` : undefined].filter(Boolean).join(" ");
    const outcome = kickoff.details?.outcome ? rockOutcomeLabel(kickoff.details.outcome) : undefined;
    const detailParts = [target, outcome].filter(Boolean);

    return {
      baseText: "Kick-off · Rock",
      detailText: detailParts.length ? detailParts.join(" ") : undefined,
    };
  }

  if (kickoff.kickoffKey === "PITCH_INVASION") {
    const affectedA = typeof kickoff.details?.affectedA === "number" ? `A${kickoff.details.affectedA}` : undefined;
    const affectedB = typeof kickoff.details?.affectedB === "number" ? `B${kickoff.details.affectedB}` : undefined;
    const notes = typeof kickoff.details?.notes === "string" && kickoff.details.notes.trim() ? kickoff.details.notes.trim() : undefined;

    return {
      baseText: "Kick-off · Pitch Invasion",
      detailText: [affectedA, affectedB, notes].filter(Boolean).join(" ") || undefined,
    };
  }

  return {
    baseText: `Kick-off · ${formatKickoffLabel(payload)}`,
  };
};

export function formatEvent(event: MatchEvent, teamNames: TeamNames): string {
  const type = event.type as string;

  if (type === "touchdown") {
    return `Touchdown · ${teamNameFor(event.team, teamNames)} · Player ${playerId(event.payload?.player)}`;
  }

  if (type === "completion") {
    return `Completion · ${teamNameFor(event.team, teamNames)} · Player ${playerId(event.payload?.passer)}`;
  }

  if (type === "interception") {
    return `Interception · ${teamNameFor(event.team, teamNames)} · Player ${playerId(event.payload?.player)}`;
  }

  if (type === "injury") {
    const victimTeam = event.payload?.victimTeam;
    const team = victimTeam === "A" ? teamNames.A : victimTeam === "B" ? teamNames.B : "Unknown team";
    const id = playerId(event.payload?.victimPlayerId ?? event.payload?.victimName);
    const finalResult = getFinalInjuryResult(event.payload);
    const finalStat = finalResult === "STAT" ? (event.payload?.apothecaryUsed ? event.payload?.apothecaryStat : event.payload?.stat) : undefined;
    const result = event.payload?.apothecaryUsed
      ? formatCasualtyResult(event.payload.injuryResult, event.payload.stat)
      : formatCasualtyResult(finalResult, finalStat);
    const apothecaryText = formatApothecaryOutcome(event.payload);
    return `${team} Player ${id} · Casualty: ${result}${apothecaryText}`;
  }

  if (type === "kickoff" || type === "kickoff_event") {
    const kickoffSummary = formatKickoffEventDetails(event.payload, teamNames);
    if (!kickoffSummary) return "Kick-off";
    return withDetail(kickoffSummary.baseText, kickoffSummary.detailText);
  }

  if (type === "weather_set") {
    const weather = event.payload?.weather;
    return withDetail("Weather changed", weather ? weatherLabel(String(weather)) : undefined);
  }

  if (type === "turn_set") {
    const turn = typeof event.payload?.turn === "number" ? `Turn ${event.payload.turn}` : undefined;
    const half = typeof event.payload?.half === "number" ? `Half ${event.payload.half}` : undefined;
    return withDetail("Turn adjusted", [half, turn].filter(Boolean).join(" · ") || undefined);
  }

  if (type === "half_changed") {
    return withDetail("Half changed", typeof event.payload?.half === "number" ? `Half ${event.payload.half}` : undefined);
  }

  if (type === "reroll_used") return `Re-roll used · ${teamNameFor(event.team, teamNames)}`;
  if (type === "apothecary_used") return `Apothecary used · ${teamNameFor(event.team, teamNames)}`;

  if (type === "prayer_result") {
    const result = typeof event.payload?.result === "string" ? titleCase(event.payload.result) : undefined;
    return withDetail(`Prayer · ${teamNameFor(event.team, teamNames)}`, result);
  }

  if (type === "note") {
    const detail = typeof event.payload?.text === "string" ? event.payload.text.trim() : undefined;
    return withDetail("Note", detail || undefined);
  }

  if (type === "drive_start") return "Drive start";
  if (type === "match_start") return "Match start";
  if (type === "next_turn") return "Next turn";

  return titleCase(type);
}
