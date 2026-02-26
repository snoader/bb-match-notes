import type { TeamId, PlayerSlot, Weather, KickoffResult } from "./enums";
import type { KickoffKey } from "../rules/bb2025/kickoff";

export type EventType =
  | "match_start"
  | "next_turn"
  | "turn_set"
  | "half_changed"
  | "touchdown"
  | "completion"
  | "interception"
  | "injury"
  | "casualty"
  | "ko"
  | "foul"
  | "turnover"
  | "kickoff"
  | "kickoff_event"
  | "weather_set"
  | "reroll_used"
  | "apothecary_used"
  | "prayer_result"
  | "note";

export interface MatchEvent {
  id: string;
  type: EventType;

  half: number; // 1..2
  turn: number; // 1..8

  team?: TeamId;
  payload?: any;

  createdAt: number;
}

export type MatchStartPayload = {
  teamAName: string;
  teamBName: string;
  weather?: Weather;
  resources?: {
    A: { rerolls: number; apothecary: number };
    B: { rerolls: number; apothecary: number };
  };
  inducements?: Array<{ team: TeamId; kind: string; detail?: string }>;
};

export type TouchdownPayload = { player?: PlayerSlot };

export type CompletionPayload = {
  passer?: PlayerSlot;
  receiver?: PlayerSlot;
};

export type InterceptionPayload = {
  player?: PlayerSlot;
};

export type InjuryCause =
  | "BLOCK"
  | "FOUL"
  | "SECRET_WEAPON"
  | "CROWD"
  | "FAILED_DODGE"
  | "FAILED_GFI"
  | "FAILED_PICKUP"
  | "OTHER";

export type InjuryResult = "BH" | "MNG" | "NIGGLING" | "STAT" | "DEAD" | "OTHER";

export type StatReduction = "MA" | "AV" | "AG" | "PA" | "ST";

export type ApothecaryOutcome = "SAVED" | "CHANGED_RESULT" | "DIED_ANYWAY" | "UNKNOWN";

export type InjuryPayload = {
  victimTeam?: TeamId;
  victimPlayerId?: PlayerSlot;
  victimName?: string;
  cause?: InjuryCause;
  causerPlayerId?: PlayerSlot;
  causerName?: string;
  injuryResult?: InjuryResult;
  stat?: StatReduction;
  apothecaryUsed?: boolean;
  apothecaryOutcome?: ApothecaryOutcome;
};

export type CasualtyPayload = {
  attackerTeam?: TeamId;
  attackerPlayer?: PlayerSlot;
  victimPlayer?: PlayerSlot;
  result: "BH" | "SI" | "Dead";
};

export type KickoffPayload = {
  result: KickoffResult;
};

export type KickoffEventPayload = {
  driveIndex: number;
  kickingTeam: TeamId;
  receivingTeam: TeamId;
  roll2d6?: number;
  kickoffKey: KickoffKey;
  kickoffLabel: string;
};

import type { InducementKind, PrayerResult } from "./enums";

export type InducementUsedPayload = {
  kind: InducementKind;
  detail?: string; // z.B. Star Player Name, Prayer Name etc.
};

export type PrayerResultPayload = {
  result: PrayerResult;
};
