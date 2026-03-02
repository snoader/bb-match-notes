import type { MatchEvent } from "../../domain/events";
import type { DerivedMatchState } from "../../domain/projection";
import { formatEventText } from "../../shared/formatters/formatEventText";

export function formatEvent(event: MatchEvent, teamNames: DerivedMatchState["teamNames"]): string {
  return formatEventText(event, teamNames);
}
