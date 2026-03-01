import type { TeamId, PlayerSlot, Weather, KickoffResult } from "./enums";
import type { KickoffKey } from "../rules/bb2025/kickoff";
import type { InducementKind, PrayerResult } from "./enums";

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

export type EventType = (typeof MATCH_EVENT_TYPES)[number];
export type MatchEventType = EventType;

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
  | "OTHER";

export const INJURY_CAUSES: InjuryCause[] = ["BLOCK", "FOUL", "SECRET_WEAPON", "CROWD", "FAILED_DODGE", "FAILED_GFI"];
export const PLAYER_CAUSED_INJURY_CAUSES: InjuryCause[] = ["BLOCK", "FOUL"];

export function normalizeInjuryCause(cause: unknown): InjuryCause {
  if (typeof cause !== "string") return "OTHER";
  return (INJURY_CAUSES as string[]).includes(cause) ? (cause as InjuryCause) : "OTHER";
}

export function formatInjuryCauseForDisplay(cause: unknown): string {
  if (cause === "FAILED_PICKUP") return "Unknown (legacy)";
  const normalizedCause = normalizeInjuryCause(cause);
  if (normalizedCause === "FAILED_GFI") return "Failed Rush";
  return normalizedCause.replace(/_/g, " ").replace(/\b\w/g, (x) => x.toUpperCase());
}

export type InjuryResult = "BH" | "MNG" | "NIGGLING" | "STAT" | "DEAD" | "OTHER";

export type StatReduction = "MA" | "AV" | "AG" | "PA" | "ST";

export type ApothecaryOutcome = "RECOVERED" | "BH" | "MNG" | "DEAD" | "STAT";

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
  apothecaryStat?: StatReduction;
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

type KickoffEventPayloadBase = {
  driveIndex: number;
  kickingTeam: TeamId;
  receivingTeam: TeamId;
  roll2d6: number;
  kickoffLabel: string;
};

export type KickoffDetails =
  | {
      kickoffKey: "CHANGING_WEATHER";
      details: { newWeather: Weather };
    }
  | {
      kickoffKey: "TIME_OUT";
      details: {
        appliedDelta: -1 | 1;
      };
    }
  | {
      kickoffKey: "THROW_A_ROCK";
      details?: {
        targetTeam?: TeamId;
        targetPlayer?: PlayerSlot;
        outcome?: "stunned" | "ko" | "casualty" | "unknown";
      };
    }
  | {
      kickoffKey: "PITCH_INVASION";
      details?: {
        affectedA?: number;
        affectedB?: number;
        notes?: string;
      };
    }
  | {
      kickoffKey: Exclude<KickoffKey, "CHANGING_WEATHER" | "THROW_A_ROCK" | "PITCH_INVASION">;
      details?: undefined;
    };

export type KickoffEventPayload = KickoffEventPayloadBase & KickoffDetails;

export type InducementUsedPayload = {
  kind: InducementKind;
  detail?: string; // z.B. Star Player Name, Prayer Name etc.
};

export type PrayerResultPayload = {
  result: PrayerResult;
};

export type TurnStatePayload = {
  half?: number;
  turn?: number;
};

export type WeatherSetPayload = {
  weather?: Weather;
};

export type EventPayloadByType = {
  match_start: MatchStartPayload;
  next_turn: undefined;
  turn_set: TurnStatePayload;
  half_changed: TurnStatePayload;
  touchdown: TouchdownPayload;
  completion: CompletionPayload;
  interception: InterceptionPayload;
  injury: InjuryPayload;
  casualty: CasualtyPayload;
  ko: undefined;
  foul: undefined;
  turnover: undefined;
  kickoff: KickoffPayload;
  kickoff_event: KickoffEventPayload;
  weather_set: WeatherSetPayload;
  reroll_used: undefined;
  apothecary_used: undefined;
  prayer_result: PrayerResultPayload;
  note: Record<string, unknown>;
};

export type EventPayload = EventPayloadByType[EventType];

export interface MatchEvent {
  id: string;
  type: EventType;

  half: number; // 1..2
  turn: number; // 1..8

  team?: TeamId;
  payload?: any;

  createdAt: number;
}
