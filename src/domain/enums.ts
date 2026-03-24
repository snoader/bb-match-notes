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

export const PRAYER_D6_ROLL_BY_KEY: Partial<Record<PrayerResult, 1 | 2 | 3 | 4 | 5 | 6>> = {
  treacherous_trapdoor: 1,
  friends_with_the_ref: 2,
  iron_man: 3,
  knuckle_dusters: 4,
  bad_habits: 5,
  greasy_cleats: 6,
};

const titleCaseFromSnakeCase = (value: string): string => value
  .replaceAll("_", " ")
  .toLowerCase()
  .replace(/\b\w/g, (character) => character.toUpperCase());

export const labelPrayer = (prayer: PrayerResult | string): string => {
  const baseLabel = titleCaseFromSnakeCase(prayer);
  const roll = PRAYER_D6_ROLL_BY_KEY[prayer as PrayerResult];
  return roll ? `${baseLabel} (${roll})` : baseLabel;
};

export const PRAYERS: readonly PrayerResult[] = PRAYER_VALUES;

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
export { type MatchTeamMeta, type TeamIdentity, type TeamMeta, type TeamSppMeta } from "./teamMeta";
export { INDUCEMENT_OPTIONS, type InducementOption, isInducementAllowed, isSelectableInducement, labelInducement } from "./inducements";
export const INDUCEMENTS = INDUCEMENT_OPTIONS.map((option) => option.kind);
