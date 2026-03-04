import type { MatchEvent } from "../../domain/events";
import { formatEventText, type TeamNames } from "../../shared/formatters/formatEventText";

const KICKOFF_TITLE_PREFIX = /^\s*Kick-off(?:\s*(?:·|:)\s*)?/i;

function stripKickoffPrefix(title: string): string {
  const cleaned = title.replace(KICKOFF_TITLE_PREFIX, "").trim();
  return cleaned || title;
}

export function formatRecentEventLines(event: MatchEvent, teamNames: TeamNames): string[] {
  const formatted = formatEventText(event, teamNames);
  if (!formatted || event.type === "weather_set") return [];
  if (event.type === "kickoff" || event.type === "kickoff_event") {
    return [stripKickoffPrefix(formatted)];
  }
  return [formatted];
}

