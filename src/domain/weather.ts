import { sortByLabel } from "../shared/sort";

const WEATHER_VALUES = ["nice", "sweltering_heat", "very_sunny", "pouring_rain", "blizzard"] as const;

export type Weather = (typeof WEATHER_VALUES)[number];

export const formatWeather = (weather?: string): string => {
  if (!weather) return "—";
  return weather
    .trim()
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
};

export const WEATHER_OPTIONS: readonly Weather[] = sortByLabel(WEATHER_VALUES, (weather) => formatWeather(weather));
