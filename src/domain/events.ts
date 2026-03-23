import type { TeamId, PlayerSlot, KickoffResult } from "./enums";
import type { Weather } from "./weather";
import type { KickoffKey } from "../rules/bb2025/kickoff";
import type { InducementKind, PrayerResult } from "./enums";
import { labelCause } from "./labels";

export const MATCH_EVENT_TYPES = [
  "match_start",
  "next_turn",
  "turn_set",
  "half_changed",
  "touchdown",
  "completion",
  "interception",
  "stalling",
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

export type TeamFansPayload = {
  existingFans: number;
  fansRoll: number;
};

export type MatchStartPayload = {
  teamAName: string;
  teamBName: string;
  weather?: Weather;
  resources?: {
    A: { rerolls: number; apothecary: number };
    B: { rerolls: number; apothecary: number };
  };
  fans?: {
    A: TeamFansPayload;
    B: TeamFansPayload;
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

export type StallingPayload = {
  rollResult: number;
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
  if (typeof cause !== "string") return labelCause("OTHER");
  return labelCause(cause);
}

export type InjuryResult = "BH" | "MNG" | "NIGGLING" | "STAT" | "DEAD" | "OTHER";

export type StatReduction = "MA" | "AV" | "AG" | "PA" | "ST";

export type ApothecaryOutcome = "RECOVERED" | "BH" | "MNG" | "DEAD" | "STAT";

const INJURY_RESULTS: InjuryResult[] = ["BH", "MNG", "NIGGLING", "STAT", "DEAD", "OTHER"];
const APOTHECARY_OUTCOMES: ApothecaryOutcome[] = ["RECOVERED", "BH", "MNG", "DEAD", "STAT"];
const STAT_REDUCTIONS: StatReduction[] = ["MA", "AV", "AG", "PA", "ST"];

export function normalizeInjuryResult(result: unknown): InjuryResult {
  if (typeof result !== "string") return "OTHER";
  return (INJURY_RESULTS as string[]).includes(result) ? (result as InjuryResult) : "OTHER";
}

export function normalizeApothecaryOutcome(outcome: unknown): ApothecaryOutcome | undefined {
  if (typeof outcome !== "string") return undefined;
  return (APOTHECARY_OUTCOMES as string[]).includes(outcome) ? (outcome as ApothecaryOutcome) : undefined;
}

export function normalizeStatReduction(stat: unknown): StatReduction | undefined {
  if (typeof stat !== "string") return undefined;
  return (STAT_REDUCTIONS as string[]).includes(stat) ? (stat as StatReduction) : undefined;
}

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

export type NormalizedInjuryPayload = Omit<InjuryPayload, "cause" | "injuryResult" | "apothecaryUsed" | "stat" | "apothecaryOutcome" | "apothecaryStat"> & {
  cause: InjuryCause;
  injuryResult: InjuryResult;
  apothecaryUsed: boolean;
  stat?: StatReduction;
  apothecaryOutcome?: ApothecaryOutcome;
  apothecaryStat?: StatReduction;
};

export function normalizeInjuryPayload(payload: unknown): NormalizedInjuryPayload {
  const p = (payload && typeof payload === "object" ? payload : {}) as InjuryPayload & {
    result?: unknown;
    apothecaryResult?: unknown;
    characteristic?: unknown;
    apothecaryCharacteristic?: unknown;
  };

  const apothecaryOutcome = normalizeApothecaryOutcome(p.apothecaryOutcome ?? p.apothecaryResult);

  return {
    ...p,
    cause: normalizeInjuryCause(p.cause),
    injuryResult: normalizeInjuryResult(p.injuryResult ?? p.result),
    stat: normalizeStatReduction(p.stat ?? p.characteristic),
    apothecaryUsed: typeof p.apothecaryUsed === "boolean" ? p.apothecaryUsed : apothecaryOutcome !== undefined,
    apothecaryOutcome,
    apothecaryStat: normalizeStatReduction(p.apothecaryStat ?? p.apothecaryCharacteristic),
  };
}

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
  turn?: number; // shared round marker within the half (1..8)
  roundNumber?: number;
  activeTeamId?: TeamId;
  teamTurnIndex?: number; // individual active-team turns since the last kick-off/reset
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
  stalling: StallingPayload;
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
  turn: number; // shared round marker within the current half (1..8)

  team?: TeamId;
  payload?: any;

  createdAt: number;
}
