import type { MatchEvent } from "../domain/events";
import type { DerivedMatchState } from "../domain/projection";
import type { TeamId } from "../domain/enums";
import { exportMatchJSON } from "./json";
import { buildMarkdownReport, buildTxtReport } from "./report";
import { deriveSppFromEvents, type Rosters } from "./spp";

export type ExportFormat = "text" | "markdown" | "json";

export type ExportPayload = {
  format: ExportFormat;
  filename: string;
  mime: string;
  text: string;
  title: string;
};

export type BuildExportPayloadInput = {
  format: ExportFormat;
  events: MatchEvent[];
  derived: DerivedMatchState;
  rosters: Rosters;
  mvpSelections?: Partial<Record<TeamId, string>>;
};

export function getExportPayload(input: BuildExportPayloadInput): ExportPayload {
  const { format, events, derived, rosters, mvpSelections } = input;
  const summary = deriveSppFromEvents(events, rosters, mvpSelections);

  if (format === "text") {
    return {
      format,
      filename: "bb-match-report.txt",
      mime: "text/plain",
      title: "BB Match Notes Report",
      text: buildTxtReport({ events, teamNames: derived.teamNames, score: derived.score, summary }),
    };
  }

  if (format === "markdown") {
    return {
      format,
      filename: "bb-match-report.md",
      mime: "text/markdown",
      title: "BB Match Notes Markdown",
      text: buildMarkdownReport({ events, teamNames: derived.teamNames, score: derived.score, summary }),
    };
  }

  return {
    format,
    filename: "bb-match-notes.json",
    mime: "application/json",
    title: "BB Match Notes JSON",
    text: JSON.stringify(
      exportMatchJSON({
        events,
        derived,
        rosters,
        mvpSelections,
      }),
      null,
      2,
    ),
  };
}

export function payloadToBlob(payload: ExportPayload): Blob {
  return new Blob([payload.text], { type: `${payload.mime};charset=utf-8` });
}
