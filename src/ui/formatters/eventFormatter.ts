import type { MatchEvent, KickoffEventPayload } from "../../domain/events";
import type { DerivedMatchState } from "../../domain/projection";
import { formatApothecaryOutcome, formatCasualtyResult, getFinalInjuryResult } from "./casualtyOutcome";

type TeamNames = DerivedMatchState["teamNames"];

const titleCase = (value: string) => value.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (x) => x.toUpperCase());

const playerId = (value: unknown) => (value ? String(value) : "?");

const teamNameFor = (team: MatchEvent["team"] | undefined, teamNames: TeamNames) => {
  if (team === "A") return teamNames.A;
  if (team === "B") return teamNames.B;
  return "Unknown team";
};

const formatKickoffLabel = (payload: unknown) => {
  if (!payload || typeof payload !== "object") return "Unknown";
  const kickoff = payload as Partial<KickoffEventPayload> & { result?: string };
  if (typeof kickoff.kickoffLabel === "string" && kickoff.kickoffLabel.trim()) return kickoff.kickoffLabel;
  if (typeof kickoff.result === "string" && kickoff.result.trim()) return titleCase(kickoff.result);
  return "Unknown";
};

const formatKickoffEventDetails = (payload: unknown, teamNames: TeamNames): string | undefined => {
  if (!payload || typeof payload !== "object") return undefined;
  const kickoff = payload as Partial<KickoffEventPayload>;

  if (kickoff.kickoffKey === "CHANGING_WEATHER") {
    const weather = kickoff.details?.newWeather;
    return weather ? `Kick-off · Changing Weather → ${weather}` : "Kick-off · Changing Weather";
  }

  if (kickoff.kickoffKey === "TIME_OUT") {
    const delta = kickoff.details?.appliedDelta;
    if (delta === 1 || delta === -1) return `Kick-off · Time-Out → Both teams ${delta > 0 ? "+" : ""}${delta}`;
    return "Kick-off · Time-Out";
  }

  if (kickoff.kickoffKey === "THROW_A_ROCK") {
    const parts: string[] = ["Kick-off · Throw a Rock"];
    const targetTeam = kickoff.details?.targetTeam ? teamNameFor(kickoff.details.targetTeam, teamNames) : undefined;
    const targetPlayer = kickoff.details?.targetPlayer;
    const outcome = kickoff.details?.outcome;

    if (targetTeam || targetPlayer) {
      const targetLabel = [targetTeam, targetPlayer ? `Player ${targetPlayer}` : undefined].filter(Boolean).join(" ");
      if (targetLabel) parts.push(targetLabel);
    }

    if (outcome) parts.push(titleCase(outcome));
    return parts.join(" → ");
  }

  if (kickoff.kickoffKey === "PITCH_INVASION") {
    const values: string[] = [];
    if (typeof kickoff.details?.affectedA === "number") values.push(`A:${kickoff.details.affectedA}`);
    if (typeof kickoff.details?.affectedB === "number") values.push(`B:${kickoff.details.affectedB}`);
    return values.length ? `Kick-off · Pitch Invasion → ${values.join(" ")}` : "Kick-off · Pitch Invasion";
  }

  return undefined;
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
    const detailedKickoff = formatKickoffEventDetails(event.payload, teamNames);
    if (detailedKickoff) return detailedKickoff;
    return `Kick-off: ${formatKickoffLabel(event.payload)}`;
  }

  if (type === "drive_start") return "Drive start";
  if (type === "match_start") return "Match start";

  return titleCase(type);
}
