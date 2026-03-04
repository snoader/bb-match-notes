import type { EventType, MatchEvent } from "../../domain/events";
import { labelCause, labelInjuryOutcome, labelKickoff, labelWeather, titleCaseFromSnakeCase } from "../../domain/labels";
import { mapKickoffRoll, type KickoffKey } from "../../rules/bb2025/kickoff";

const EVENT_LABELS: Partial<Record<EventType, string>> = {
  injury: "Casualty",
};

export const titleCase = (value: string, normalizeCase = false) => {
  const source = normalizeCase ? value.toLowerCase() : value;
  return titleCaseFromSnakeCase(source);
};

export const eventLabel = (type: MatchEvent["type"]): string => {
  return EVENT_LABELS[type] ?? titleCase(type, true);
};

export const kickoffLabel = (value: KickoffKey | number | undefined): string => {
  if (typeof value === "number") {
    return labelKickoff(mapKickoffRoll(value).key);
  }

  if (!value) return "Unknown";
  return labelKickoff(value);
};

export const weatherLabel = (value?: string): string => labelWeather(value);

export const formatWeatherLabel = weatherLabel;

export const injuryCauseLabel = (value: unknown): string => {
  if (typeof value !== "string") return "Other";
  return labelCause(value);
};

export const injuryResultLabel = (value: unknown): string => {
  if (typeof value !== "string") return "Other";
  return labelInjuryOutcome(value);
};

export const teamNameFor = (team: MatchEvent["team"] | undefined, teamNames: { A: string; B: string }) => {
  if (team === "A") return teamNames.A;
  if (team === "B") return teamNames.B;
  return "Unknown team";
};
