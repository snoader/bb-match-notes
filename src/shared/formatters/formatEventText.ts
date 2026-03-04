import { normalizeInjuryPayload, type MatchEvent, type KickoffEventPayload } from "../../domain/events";
import { labelPrayer } from "../../domain/enums";
import { UI_TEXT, formatLabel, labelKickoff, titleCaseFromSnakeCase } from "../../domain/labels";
import { formatApothecaryOutcome, formatCasualtyResult, getFinalInjuryResult } from "./casualtyOutcome";
import { kickoffLabel, teamNameFor, weatherLabel } from "./labels";
import { displayTurn } from "./turnDisplay";

export type TeamNames = { A: string; B: string };

const playerId = (value: unknown) => (value ? String(value) : "?");
const rockOutcomeLabel = (value: string) => {
  const normalized = value.trim().toUpperCase();
  if (normalized === "KO") return "KO";
  return titleCaseFromSnakeCase(value);
};

const withDetail = (baseText: string, detailText?: string) => {
  if (!detailText) return baseText;
  return `${baseText}: ${detailText}`;
};

const formatKickoffLabel = (payload: unknown) => {
  if (!payload || typeof payload !== "object") return "Unknown";
  const kickoff = payload as Partial<KickoffEventPayload> & { result?: string };
  if (typeof kickoff.kickoffKey === "string" && kickoff.kickoffKey.trim()) return kickoffLabel(kickoff.kickoffKey);
  if (typeof kickoff.roll2d6 === "number") return kickoffLabel(kickoff.roll2d6);
  if (typeof kickoff.kickoffLabel === "string" && kickoff.kickoffLabel.trim()) return kickoff.kickoffLabel;
  if (typeof kickoff.result === "string" && kickoff.result.trim()) return labelKickoff(kickoff.result);
  return "Unknown";
};

const formatKickoffEventDetails = (payload: unknown, teamNames: TeamNames): { baseText: string; detailText?: string } | undefined => {
  if (!payload || typeof payload !== "object") return undefined;
  const kickoff = payload as Partial<KickoffEventPayload>;

  if (!kickoff.kickoffKey) {
    return { baseText: `${UI_TEXT.kickOff} · ${formatKickoffLabel(payload)}` };
  }

  if (kickoff.kickoffKey === "CHANGING_WEATHER") {
    const weather = kickoff.details?.newWeather;
    return {
      baseText: `${UI_TEXT.kickOff} · ${UI_TEXT.weather}`,
      detailText: weather ? weatherLabel(String(weather)) : undefined,
    };
  }

  if (kickoff.kickoffKey === "TIME_OUT") {
    const delta = kickoff.details?.appliedDelta;
    return {
      baseText: `${UI_TEXT.kickOff} · Time-Out`,
      detailText: delta === 1 || delta === -1 ? `${delta > 0 ? "+" : ""}${delta} ${UI_TEXT.turn}` : undefined,
    };
  }

  if (kickoff.kickoffKey === "THROW_A_ROCK") {
    const targetTeam = kickoff.details?.targetTeam ? teamNameFor(kickoff.details.targetTeam, teamNames) : undefined;
    const targetPlayer = kickoff.details?.targetPlayer;
    const target = [targetTeam, targetPlayer ? `#${targetPlayer}` : undefined].filter(Boolean).join(" ");
    const outcome = kickoff.details?.outcome ? rockOutcomeLabel(kickoff.details.outcome) : undefined;
    const detailParts = [target, outcome].filter(Boolean);

    return {
      baseText: `${UI_TEXT.kickOff} · Rock`,
      detailText: detailParts.length ? detailParts.join(" ") : undefined,
    };
  }

  if (kickoff.kickoffKey === "PITCH_INVASION") {
    const affectedA = typeof kickoff.details?.affectedA === "number" ? `A${kickoff.details.affectedA}` : undefined;
    const affectedB = typeof kickoff.details?.affectedB === "number" ? `B${kickoff.details.affectedB}` : undefined;
    const notes = typeof kickoff.details?.notes === "string" && kickoff.details.notes.trim() ? kickoff.details.notes.trim() : undefined;

    return {
      baseText: `${UI_TEXT.kickOff} · Pitch Invasion`,
      detailText: [affectedA, affectedB, notes].filter(Boolean).join(" ") || undefined,
    };
  }

  return {
    baseText: `${UI_TEXT.kickOff} · ${formatKickoffLabel(payload)}`,
  };
};

export function formatEventText(event: MatchEvent, teamNames: TeamNames): string {
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
    const payload = normalizeInjuryPayload(event.payload);
    const victimTeam = payload.victimTeam;
    const team = victimTeam === "A" ? teamNames.A : victimTeam === "B" ? teamNames.B : "Unknown team";
    const id = playerId(payload.victimPlayerId ?? payload.victimName);
    const finalResult = getFinalInjuryResult(payload);
    const finalStat = finalResult === "STAT" ? (payload.apothecaryUsed ? payload.apothecaryStat : payload.stat) : undefined;
    const result = payload.apothecaryUsed
      ? formatCasualtyResult(payload.injuryResult, payload.stat)
      : formatCasualtyResult(finalResult, finalStat);
    const apothecaryText = formatApothecaryOutcome(payload);
    return `${team} Player ${id} · Casualty: ${result}${apothecaryText}`;
  }

  if (type === "kickoff" || type === "kickoff_event") {
    const kickoffSummary = formatKickoffEventDetails(event.payload, teamNames);
    if (!kickoffSummary) return UI_TEXT.kickOff;
    return withDetail(kickoffSummary.baseText, kickoffSummary.detailText);
  }

  if (type === "weather_set") {
    const weather = event.payload?.weather;
    return withDetail("Weather changed", weather ? weatherLabel(String(weather)) : undefined);
  }

  if (type === "turn_set") {
    const halfValue = typeof event.payload?.half === "number" ? event.payload.half : undefined;
    const turn = typeof event.payload?.turn === "number" ? formatLabel(UI_TEXT.turn, String(displayTurn(halfValue ?? event.half, event.payload.turn))) : undefined;
    const half = typeof halfValue === "number" ? formatLabel(UI_TEXT.half, String(halfValue)) : undefined;
    return withDetail("Turn adjusted", [half, turn].filter(Boolean).join(" · ") || undefined);
  }

  if (type === "half_changed") {
    return withDetail("Half changed", typeof event.payload?.half === "number" ? formatLabel(UI_TEXT.half, String(event.payload.half)) : undefined);
  }

  if (type === "reroll_used") return `Re-roll used · ${teamNameFor(event.team, teamNames)}`;
  if (type === "apothecary_used") return `Apothecary used · ${teamNameFor(event.team, teamNames)}`;

  if (type === "prayer_result") {
    const result = typeof event.payload?.result === "string" ? labelPrayer(event.payload.result) : undefined;
    return withDetail(`Prayer · ${teamNameFor(event.team, teamNames)}`, result);
  }

  if (type === "note") {
    const detail = typeof event.payload?.text === "string" ? event.payload.text.trim() : undefined;
    return withDetail("Note", detail || undefined);
  }

  if (type === "drive_start") return "Drive start";
  if (type === "match_start") return UI_TEXT.matchStart;
  if (type === "next_turn") return formatLabel(UI_TEXT.turn, String(displayTurn(event.half, event.turn)));

  return titleCaseFromSnakeCase(type);
}
