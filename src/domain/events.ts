export type EventType =
  | "match_start"
  | "touchdown"
  | "casualty"
  | "ko"
  | "foul"
  | "turnover"
  | "kickoff"
  | "weather"
  | "inducement"
  | "reroll_used"
  | "apothecary_used"
  | "bribe_used"
  | "prayer_result"
  | "note"

export interface MatchEvent {
  id: string
  type: EventType
  half: number
  turn: number
  team?: "A" | "B"
  payload?: any
  createdAt: number
}
