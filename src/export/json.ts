import type { MatchEvent } from "../domain/events";
import type { DerivedMatchState } from "../domain/projection";
import type { TeamId } from "../domain/enums";
import { deriveSppFromEvents, type Rosters, type SppSummary } from "./spp";

export const MATCH_JSON_SCHEMA_VERSION = "1.0.0";

export type MatchJSONExport = {
  schemaVersion: string;
  generatedAt: string;
  match: {
    teamNames: { A: string; B: string };
    weather?: string;
    inducementsBought: DerivedMatchState["inducementsBought"];
    driveIndexCurrent: number;
    kickoffPending: boolean;
  };
  events: MatchEvent[];
  derived: {
    score: Record<TeamId, number>;
    half: number;
    turn: number;
    resources: DerivedMatchState["resources"];
    sppSummary: SppSummary;
  };
};

export type ExportMatchJSONInput = {
  events: MatchEvent[];
  derived: DerivedMatchState;
  rosters: Rosters;
  mvpSelections?: Partial<Record<TeamId, string>>;
  generatedAt?: Date;
};

export function exportMatchJSON(matchState: ExportMatchJSONInput): MatchJSONExport {
  const events = [...matchState.events].sort((a, b) => a.createdAt - b.createdAt);
  const sppSummary = deriveSppFromEvents(events, matchState.rosters, matchState.mvpSelections);

  return {
    schemaVersion: MATCH_JSON_SCHEMA_VERSION,
    generatedAt: (matchState.generatedAt ?? new Date()).toISOString(),
    match: {
      teamNames: { ...matchState.derived.teamNames },
      weather: matchState.derived.weather,
      inducementsBought: [...matchState.derived.inducementsBought],
      driveIndexCurrent: matchState.derived.driveIndexCurrent,
      kickoffPending: matchState.derived.kickoffPending,
    },
    events,
    derived: {
      score: { ...matchState.derived.score },
      half: matchState.derived.half,
      turn: matchState.derived.turn,
      resources: {
        A: { ...matchState.derived.resources.A },
        B: { ...matchState.derived.resources.B },
      },
      sppSummary,
    },
  };
}

