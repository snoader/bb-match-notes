export const MATCH_EVENT_TYPES = [
  "match_start",
  "next_turn",
  "turn_set",
  "half_changed",
  "touchdown",
  "completion",
  "interception",
  "injury",
  "casualty",
  "ko",
  "foul",
  "turnover",
  "kickoff",
  "kickoff_event",
  "weather_set",
  "reroll_used",
  "apothecary_used",
  "prayer_result",
  "note",
] as const;

export type MatchEventType = (typeof MATCH_EVENT_TYPES)[number];
