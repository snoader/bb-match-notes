import type { MatchEvent, KickoffEventPayload } from "../../domain/events";
import type { DerivedMatchState } from "../../domain/projection";
import { formatApothecaryOutcome, formatCasualtyResult, getFinalInjuryResult } from "./casualtyOutcome";

type TeamNames = DerivedMatchState["teamNames"];

const titleCase = (value: string) => value.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (x) => x.toUpperCase());

const playerLabel = (value: unknown) => (value ? `Player ${String(value)}` : "Player ?");
const casualtyPlayerLabel = (value: unknown) => (value ? `#${String(value)}` : "#?");

const formatKickoffName = (payload: unknown) => {
  if (!payload || typeof payload !== "object") return "Unknown";
  const p = payload as Partial<KickoffEventPayload> & { result?: string };
  if (typeof p.kickoffLabel === "string" && p.kickoffLabel.trim()) return p.kickoffLabel;
  if (typeof p.result === "string" && p.result.trim()) return titleCase(p.result);
  return "Unknown";
};

export function formatEvent(e: MatchEvent, teamNames: TeamNames, _derived: DerivedMatchState): string {
  const eventType = e.type as string;

  if (eventType === "touchdown") {
    return `${playerLabel(e.payload?.player)} scored`;
  }

  if (eventType === "completion") {
    const receiver = e.payload?.receiver ? ` to ${playerLabel(e.payload?.receiver)}` : "";
    return `${playerLabel(e.payload?.passer)} completed a pass${receiver}`;
  }

  if (eventType === "interception") {
    return `${playerLabel(e.payload?.player)} intercepted the ball`;
  }

  if (eventType === "injury") {
    const victimTeamId = e.payload?.victimTeam;
    const victimTeam = victimTeamId === "A" ? teamNames.A : victimTeamId === "B" ? teamNames.B : "Unknown team";
    const victim = casualtyPlayerLabel(e.payload?.victimPlayerId ?? e.payload?.victimName);
    const finalResult = e.payload?.apothecaryUsed
      ? formatCasualtyResult(e.payload?.injuryResult, e.payload?.stat)
      : formatCasualtyResult(getFinalInjuryResult(e.payload), e.payload?.stat);
    const apoText = formatApothecaryOutcome(e.payload);
    return `${victimTeam} ${victim} · Casualty: ${finalResult}${apoText}`;
  }

  if (eventType === "kickoff" || eventType === "kickoff_event") {
    return formatKickoffName(e.payload);
  }

  if (eventType === "drive_start") return "Drive start";
  if (eventType === "match_start") return "Match start";

  return titleCase(eventType);
}
