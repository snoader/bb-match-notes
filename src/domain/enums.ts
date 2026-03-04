import { sortByLabel } from "../shared/sort";
import { INDUCEMENT_OPTIONS } from "./inducements";

export type TeamId = "A" | "B";

/** Weather */
export { WEATHER_OPTIONS as WEATHERS, type Weather } from "./weather";

/** Kickoff table */
export const KICKOFF_RESULTS = [
  "get_the_ref",
  "riot",
  "perfect_defence",
  "high_kick",
  "cheering_fans",
  "changing_weather",
  "brilliant_coaching",
  "quick_snap",
  "blitz",
  "throw_a_rock",
  "pitch_invasion",
] as const;

export type KickoffResult = (typeof KICKOFF_RESULTS)[number];

/** Prayers to Nuffle */
const PRAYER_VALUES = [
  "treacherous_trapdoor",
  "friends_with_the_ref",
  "iron_man",
  "knuckle_dusters",
  "bad_habits",
  "greasy_cleats",
  "blessed_statue",
  "moles_under_pitch",
  "perfect_passing",
  "fan_interaction",
  "necessary_violence",
  "fouling_frenzy",
] as const;

export type PrayerResult = (typeof PRAYER_VALUES)[number];

export const PRAYERS: readonly PrayerResult[] = sortByLabel(PRAYER_VALUES, (prayer) => prayer.replaceAll("_", " "));

/** Player slot identifiers */
export const PLAYER_SLOTS = [
  1, 2, 3, 4, 5, 6, 7, 8,
  9, 10, 11, 12, 13, 14, 15, 16,
  "S1", "S2", "S3", "S4",
  "M1", "M2", "M3", "M4",
] as const;

export type PlayerSlot = (typeof PLAYER_SLOTS)[number];

/** Inducements */
export { type InducementKind } from "./inducements";
export { INDUCEMENT_OPTIONS, type InducementOption, type TeamMeta, isInducementAllowed, isSelectableInducement, labelInducement } from "./inducements";
export const INDUCEMENTS = INDUCEMENT_OPTIONS.map((option) => option.kind);
