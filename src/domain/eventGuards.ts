import type { MatchEvent } from "./events";
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
