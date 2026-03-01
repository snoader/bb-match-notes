import type { MatchEvent, KickoffEventPayload } from "../../domain/events";
import type { DerivedMatchState } from "../../domain/projection";
import { formatCasualtyResult, getFinalInjuryResult } from "./casualtyOutcome";

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

  if (eventType === "injury") {
    const payload = e.payload;
    const victimTeamId = e.payload?.victimTeam;
    const victimTeam = victimTeamId === "A" ? teamNames.A : victimTeamId === "B" ? teamNames.B : "Unknown team";
    const victim = casualtyPlayerLabel(e.payload?.victimPlayerId ?? e.payload?.victimName);
    const finalResultRaw = getFinalInjuryResult(payload);
    const finalStat = finalResultRaw === "STAT" && payload?.apothecaryUsed ? payload.apothecaryStat ?? payload.stat : payload?.stat;
    const preApothecaryResult = formatCasualtyResult(payload?.injuryResult, payload?.stat);
    const finalResult = payload?.apothecaryUsed && payload?.injuryResult
      ? preApothecaryResult
      : formatCasualtyResult(finalResultRaw, finalStat);
    const apoText = formatApothecaryOutcome(payload);
    return `${victimTeam} ${victim} · Casualty: ${finalResult}${apoText}`;
  }

  if (type === "kickoff" || type === "kickoff_event") {
    return `Kick-off: ${formatKickoffLabel(event.payload)}`;
  }

  if (type === "drive_start") return "Drive start";
  if (type === "match_start") return "Match start";

  return titleCase(type);
}
