export const WEATHER_OPTIONS = [
  "nice",
  "sweltering_heat",
  "very_sunny",
  "pouring_rain",
  "blizzard",
] as const;

export type Weather = (typeof WEATHER_OPTIONS)[number];

export const formatWeather = (weather?: string): string => {
  if (!weather) return "—";
  return weather
    .trim()
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
};
