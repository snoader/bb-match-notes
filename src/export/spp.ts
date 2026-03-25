import type { MatchEvent } from "../domain/events";
import type { TeamId } from "../domain/enums";
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

export function deriveSppFromEvents(events: MatchEvent[], rosters: Rosters, mvpSelections: Partial<Record<TeamId, string>> = {}): SppSummary {
  return deriveSppSummaryFromEvents(events, { rosters, mvpSelections });
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
