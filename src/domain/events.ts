import type { TeamId, PlayerSlot, Weather, KickoffResult } from "./enums";

export type EventType =
  | "match_start"
  | "next_turn"
  | "turn_set"
  | "half_changed"
  | "touchdown"
  | "casualty"
  | "ko"
  | "foul"
  | "turnover"
  | "kickoff"
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

export type CasualtyPayload = {
  attackerTeam?: TeamId;
  attackerPlayer?: PlayerSlot;
  victimPlayer?: PlayerSlot;
  result: "BH" | "SI" | "Dead";
};

export type KickoffPayload = {
  result: KickoffResult;
};

import type { InducementKind, PrayerResult } from "./enums";

export type InducementUsedPayload = {
  kind: InducementKind;
  detail?: string; // z.B. Star Player Name, Prayer Name etc.
};

export type PrayerResultPayload = {
  result: PrayerResult;
};
