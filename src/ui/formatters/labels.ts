import type { EventType, InjuryCause, InjuryResult, MatchEvent } from "../../domain/events";
import type { DerivedMatchState } from "../../domain/projection";
import { mapKickoffRoll, type KickoffKey } from "../../rules/bb2025/kickoff";

const WEATHER_LABELS: Record<string, string> = {
  NICE: "Nice",
  VERY_SUNNY: "Very Sunny",
  POURING_RAIN: "Pouring Rain",
  BLIZZARD: "Blizzard",
  SWELTERING_HEAT: "Sweltering Heat",
};

const EVENT_LABELS: Partial<Record<EventType, string>> = {
  injury: "Casualty",
};

const KICKOFF_KEY_LABELS: Record<KickoffKey, string> = {
  GET_THE_REF: "Get the Ref",
  TIME_OUT: "Time-Out: clock adjustment",
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

const INJURY_CAUSE_LABELS: Record<InjuryCause | "FAILED_PICKUP", string> = {
  BLOCK: "Block",
  FOUL: "Foul",
  SECRET_WEAPON: "Secret Weapon",
  CROWD: "Crowd",
  FAILED_DODGE: "Failed Dodge",
  FAILED_GFI: "Failed Rush",
  OTHER: "Other",
  FAILED_PICKUP: "Unknown (legacy)",
};

const INJURY_RESULT_LABELS: Record<InjuryResult, string> = {
  BH: "Badly Hurt",
  MNG: "Miss Next Game",
  NIGGLING: "Niggling Injury",
  STAT: "Characteristic Reduction",
  DEAD: "Dead",
  OTHER: "Other",
};

type TeamNames = DerivedMatchState["teamNames"];

export const titleCase = (value: string, normalizeCase = false) => {
  const source = normalizeCase ? value.toLowerCase() : value;
  return source.replace(/_/g, " ").replace(/\b\w/g, (x) => x.toUpperCase());
};

export const eventLabel = (type: MatchEvent["type"]): string => {
  return EVENT_LABELS[type] ?? titleCase(type, true);
};

export const kickoffLabel = (value: KickoffKey | number | undefined): string => {
  if (typeof value === "number") {
    return mapKickoffRoll(value).label;
  }

  if (!value) return "Unknown";
  return KICKOFF_KEY_LABELS[value] ?? titleCase(value, true);
};

export const weatherLabel = (value?: string): string => {
  if (!value) return "—";
  const normalized = value.trim().toUpperCase();
  return WEATHER_LABELS[normalized] ?? titleCase(value);
};

export const formatWeatherLabel = weatherLabel;

export const injuryCauseLabel = (value: unknown): string => {
  if (typeof value !== "string") return "Other";
  const normalized = value.trim().toUpperCase() as InjuryCause | "FAILED_PICKUP";
  return INJURY_CAUSE_LABELS[normalized] ?? titleCase(value, true);
};

export const injuryResultLabel = (value: unknown): string => {
  if (typeof value !== "string") return "Other";
  const normalized = value.trim().toUpperCase() as InjuryResult;
  return INJURY_RESULT_LABELS[normalized] ?? titleCase(value, true);
};

export const teamNameFor = (team: MatchEvent["team"] | undefined, teamNames: TeamNames) => {
  if (team === "A") return teamNames.A;
  if (team === "B") return teamNames.B;
  return "Unknown team";
};
