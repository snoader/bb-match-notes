import type { MatchEvent } from "../../domain/events";

const WEATHER_LABELS: Record<string, string> = {
  NICE: "Nice",
  VERY_SUNNY: "Very Sunny",
  POURING_RAIN: "Pouring Rain",
  BLIZZARD: "Blizzard",
  SWELTERING_HEAT: "Sweltering Heat",
};

export type TeamNames = { A: string; B: string };

export const titleCase = (value: string, normalizeCase = false) => {
  const source = normalizeCase ? value.toLowerCase() : value;
  return source.replace(/_/g, " ").replace(/\b\w/g, (x) => x.toUpperCase());
};

export const formatWeatherLabel = (value?: string): string => {
  if (!value) return "—";
  const normalized = value.trim().toUpperCase();
  return WEATHER_LABELS[normalized] ?? titleCase(value);
};

export const teamNameFor = (team: MatchEvent["team"] | undefined, teamNames: TeamNames) => {
  if (team === "A") return teamNames.A;
  if (team === "B") return teamNames.B;
  return "Unknown team";
};
