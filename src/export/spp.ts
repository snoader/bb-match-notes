import type { MatchEvent } from "../domain/events";
import type { TeamId } from "../domain/enums";
import { deriveSppSummaryFromEvents, sortPlayersForTeam as sortPlayersForTeamBase, type Rosters, type SppPlayerSummary, type SppSummary } from "../domain/spp";

export type { Rosters, SppPlayerSummary, SppSummary };
export { finalInjuryOutcome } from "../domain/spp";

export function deriveSppFromEvents(events: MatchEvent[], rosters: Rosters, mvpSelections: Partial<Record<TeamId, string>> = {}): SppSummary {
  return deriveSppSummaryFromEvents(events, { rosters, mvpSelections });
}

export function sortPlayersForTeam(summary: SppSummary, team: TeamId): SppPlayerSummary[] {
  return sortPlayersForTeamBase(summary, team);
}
