import type { ApothecaryOutcome, InjuryCause, InjuryResult } from "./events";
import type { KickoffResult } from "./enums";
import type { InducementKind } from "./inducements";
import { labelInducement as labelInducementValue } from "./inducements";
import type { Weather } from "./weather";
import type { KickoffKey } from "../rules/bb2025/kickoff";

export const UI_TEXT = {
  weather: "Weather",
  weatherPrefix: "Weather:",
  kickOff: "Kick-off",
  round: "Round",
  turn: "Turn",
  half: "Half",
  matchStart: "Match start",
} as const;

export const titleCaseFromSnakeCase = (value: string): string => {
  return value
    .trim()
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
};

export const formatLabel = (prefix: string, valueLabel: string): string => `${prefix} ${valueLabel}`;

export const WEATHER_LABEL: Record<Weather, string> = {
  nice: "Nice",
  sweltering_heat: "Sweltering Heat",
  very_sunny: "Very Sunny",
  pouring_rain: "Pouring Rain",
  blizzard: "Blizzard",
};

export const KICKOFF_LABEL: Record<KickoffKey, string> = {
  GET_THE_REF: "Get the Ref",
  TIME_OUT: "Time-Out",
  PERFECT_DEFENCE: "Perfect Defence",
  HIGH_KICK: "High Kick",
  CHEERING_FANS: "Cheering Fans",
  CHANGING_WEATHER: "Changing Weather",
  BRILLIANT_COACHING: "Brilliant Coaching",
  QUICK_SNAP: "Quick Snap",
  BLITZ: "Blitz",
  THROW_A_ROCK: "Throw a Rock",
  PITCH_INVASION: "Pitch Invasion",
};

export const KICKOFF_RESULT_LABEL: Record<KickoffResult, string> = {
  get_the_ref: "Get the Ref",
  riot: "Time-Out",
  perfect_defence: "Perfect Defence",
  high_kick: "High Kick",
  cheering_fans: "Cheering Fans",
  changing_weather: "Changing Weather",
  brilliant_coaching: "Brilliant Coaching",
  quick_snap: "Quick Snap",
  blitz: "Blitz",
  throw_a_rock: "Throw a Rock",
  pitch_invasion: "Pitch Invasion",
};

export const CAUSE_LABEL: Record<InjuryCause | "FAILED_PICKUP", string> = {
  BLOCK: "Block",
  FOUL: "Foul",
  SECRET_WEAPON: "Secret Weapon",
  CROWD: "Crowd",
  FAILED_DODGE: "Failed Dodge",
  FAILED_GFI: "Failed Rush",
  OTHER: "Other",
  FAILED_PICKUP: "Unknown (legacy)",
};

export const INJURY_OUTCOME_LABEL: Record<InjuryResult, string> = {
  BH: "Badly Hurt",
  MNG: "Miss Next Game",
  NIGGLING: "Niggling Injury",
  STAT: "Characteristic Reduction",
  DEAD: "Dead",
  OTHER: "Other",
};

export const APOTHECARY_LABEL: Record<ApothecaryOutcome, string> = {
  RECOVERED: "Recovered",
  BH: "Badly Hurt",
  MNG: "Miss Next Game",
  DEAD: "Dead",
  STAT: "Characteristic Reduction",
};


export const labelCause = (cause: InjuryCause | "FAILED_PICKUP" | string): string => {
  const normalized = cause.trim().toUpperCase() as InjuryCause | "FAILED_PICKUP";
  return CAUSE_LABEL[normalized] ?? titleCaseFromSnakeCase(cause);
};

export const labelWeather = (weather?: string): string => {
  if (!weather) return "—";
  const normalized = weather.trim().toLowerCase() as Weather;
  return WEATHER_LABEL[normalized] ?? titleCaseFromSnakeCase(weather);
};

export const labelKickoff = (value: KickoffKey | KickoffResult | string): string => {
  const upper = value.trim().toUpperCase() as KickoffKey;
  if (upper in KICKOFF_LABEL) return KICKOFF_LABEL[upper];

  const lower = value.trim().toLowerCase() as KickoffResult;
  if (lower in KICKOFF_RESULT_LABEL) return KICKOFF_RESULT_LABEL[lower];

  return titleCaseFromSnakeCase(value);
};

export const labelInducement = (kind: InducementKind): string => labelInducementValue(kind);

export const labelInjuryOutcome = (outcome: InjuryResult | string): string => {
  const normalized = outcome.trim().toUpperCase() as InjuryResult;
  return INJURY_OUTCOME_LABEL[normalized] ?? titleCaseFromSnakeCase(outcome);
};

export const labelApothecaryOutcome = (outcome: ApothecaryOutcome | string): string => {
  const normalized = outcome.trim().toUpperCase() as ApothecaryOutcome;
  return APOTHECARY_LABEL[normalized] ?? titleCaseFromSnakeCase(outcome);
};
