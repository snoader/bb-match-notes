import type { MatchEvent, MatchEventType } from "./events";
import type { TeamId } from "./enums";
import type { DerivedMatchState } from "./projection";

export type EventGuardContext = {
  state: DerivedMatchState;
  recentEvents: MatchEvent[];
};

function hasStartedMatch(recentEvents: MatchEvent[]) {
  return recentEvents.some((event) => event.type === "match_start");
}

function canRecordDriveAction(state: DerivedMatchState, recentEvents: MatchEvent[]) {
  return hasStartedMatch(recentEvents) && !state.kickoffPending;
}

const gameplayActionEvents = new Set<MatchEventType>([
  "touchdown",
  "completion",
  "interception",
  "injury",
  "casualty",
  "ko",
  "foul",
  "turnover",
  "reroll_used",
  "apothecary_used",
  "prayer_result",
]);

export function canStartDrive({ state, recentEvents }: EventGuardContext) {
  return hasStartedMatch(recentEvents) && state.kickoffPending;
}

export function canSelectKickoff(context: EventGuardContext) {
  return canStartDrive(context);
}

export function canRecordTouchdown({ state, recentEvents }: EventGuardContext) {
  return canRecordDriveAction(state, recentEvents);
}

export function canRecordCompletion({ state, recentEvents }: EventGuardContext) {
  return canRecordDriveAction(state, recentEvents);
}

export function canRecordInterception({ state, recentEvents }: EventGuardContext) {
  return canRecordDriveAction(state, recentEvents);
}

export function canRecordCasualty({ state, recentEvents }: EventGuardContext) {
  return canRecordDriveAction(state, recentEvents);
}

export function canRecordGameplayAction(context: EventGuardContext, eventType: MatchEventType) {
  if (!gameplayActionEvents.has(eventType)) return true;
  return canRecordDriveAction(context.state, context.recentEvents);
}

export function hasApothecaryAvailable(state: DerivedMatchState, team: TeamId) {
  return state.resources[team].apothecary > 0;
}

export function canVictimUseApothecary(state: DerivedMatchState, victimTeam: TeamId) {
  return hasApothecaryAvailable(state, victimTeam);
}

export function canUseApothecary({ state, recentEvents }: EventGuardContext, team: TeamId) {
  return canRecordDriveAction(state, recentEvents) && hasApothecaryAvailable(state, team);
}
