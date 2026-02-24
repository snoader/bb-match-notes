export const Weather = [
  "nice",
  "very_sunny",
  "pouring_rain",
  "blizzard",
  "sweltering_heat"
] as const

export type WeatherType = typeof Weather[number]


export const KickoffEvents = [
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
  "pitch_invasion"
] as const


export const PrayerResults = [
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
  "fouling_frenzy"
] as const
