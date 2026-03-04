import { sortByLabel } from "../shared/sort";
import { labelWeather } from "./labels";

const WEATHER_VALUES = ["nice", "sweltering_heat", "very_sunny", "pouring_rain", "blizzard"] as const;

export type Weather = (typeof WEATHER_VALUES)[number];

export const formatWeather = (weather?: string): string => labelWeather(weather);

export const WEATHER_OPTIONS: readonly Weather[] = sortByLabel(WEATHER_VALUES, (weather) => labelWeather(weather));
