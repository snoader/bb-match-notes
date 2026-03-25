import type { KickoffEventPayload, MatchEvent } from "../domain/events";
import type { DerivedMatchState } from "../domain/projection";
import type { TeamId } from "../domain/enums";
import { formatWeather } from "../domain/weather";
import { deriveSppFromEvents, type Rosters, type SppSummary } from "./spp";
import { formatKickoffExportDetail } from "./kickoffDetails";

export const MATCH_JSON_SCHEMA_VERSION = "1.1.0";

export type MatchJSONExport = {
  schemaVersion: string;
  generatedAt: string;
  match: {
    teamNames: { A: string; B: string };
    weather?: string;
    inducementsBought: DerivedMatchState["inducementsBought"];
    teamMeta: DerivedMatchState["teamMeta"];
    driveIndexCurrent: number;
    kickoffPending: boolean;
  };
  events: Array<MatchEvent & { exportDetail?: string }>;
  derived: {
    score: Record<TeamId, number>;
    half: number;
    turn: number;
    resources: DerivedMatchState["resources"];
    sppSummary: SppSummary;
    finalTreasuryDelta: DerivedMatchState["finalTreasuryDelta"];
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
  const events = [...matchState.events]
    .sort((a, b) => a.createdAt - b.createdAt)
    .map((event) => {
      if (event.type !== "kickoff_event" || !event.payload) return event;
      const exportDetail = formatKickoffExportDetail(event.payload as KickoffEventPayload);
      return exportDetail ? { ...event, exportDetail } : event;
    });
  const sppSummary = deriveSppFromEvents(events, matchState.rosters, matchState.mvpSelections);

  return {
    schemaVersion: MATCH_JSON_SCHEMA_VERSION,
    generatedAt: (matchState.generatedAt ?? new Date()).toISOString(),
    match: {
      teamNames: { ...matchState.derived.teamNames },
      weather: formatWeather(matchState.derived.weather),
      inducementsBought: [...matchState.derived.inducementsBought],
      teamMeta: {
        A: matchState.derived.teamMeta.A ? { ...matchState.derived.teamMeta.A } : undefined,
        B: matchState.derived.teamMeta.B ? { ...matchState.derived.teamMeta.B } : undefined,
      },
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
      finalTreasuryDelta: {
        A: { ...matchState.derived.finalTreasuryDelta.A, inputs: { ...matchState.derived.finalTreasuryDelta.A.inputs }, breakdown: { ...matchState.derived.finalTreasuryDelta.A.breakdown } },
        B: { ...matchState.derived.finalTreasuryDelta.B, inputs: { ...matchState.derived.finalTreasuryDelta.B.inputs }, breakdown: { ...matchState.derived.finalTreasuryDelta.B.breakdown } },
      },
    },
  };
}
