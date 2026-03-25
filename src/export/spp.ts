import type { MatchEvent } from "../domain/events";
import type { TeamId } from "../domain/enums";
import type { MatchTeamMeta } from "../domain/teamMeta";
import {
  buildSppTeamView as buildSppTeamViewBase,
  deriveSppSummaryFromEvents,
  sortPlayersForTeam as sortPlayersForTeamBase,
  validateSppSummary as validateSppSummaryBase,
  type Rosters,
  type SppPlayerSummary,
  type SppSummary,
  type SppSummaryDebug,
  type SppTeamView,
} from "../domain/spp";

export type { Rosters, SppPlayerSummary, SppSummary, SppSummaryDebug, SppTeamView };
export { finalInjuryOutcome } from "../domain/spp";
export { deriveSppPrayerEventImpacts } from "../domain/spp";

export function deriveSppFromEvents(
  events: MatchEvent[],
  rosters: Rosters,
  mvpSelections: Partial<Record<TeamId, string>> = {},
  teamMeta?: MatchTeamMeta,
): SppSummary {
  return deriveSppSummaryFromEvents(events, { rosters, mvpSelections, teamMeta });
}

export function sortPlayersForTeam(summary: SppSummary, team: TeamId): SppPlayerSummary[] {
  return sortPlayersForTeamBase(summary, team);
}

export function buildSppTeamView(summary: SppSummary, team: TeamId): SppTeamView {
  return buildSppTeamViewBase(summary, team);
}

export function validateSppSummary(summary: SppSummary): SppSummaryDebug {
  return validateSppSummaryBase(summary);
}
