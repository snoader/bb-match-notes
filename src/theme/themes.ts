import { bloodBowlTheme } from "./bloodBowlTheme";
import { minimalDarkTheme } from "./minimalDarkTheme";
import { minimalTheme } from "./minimalTheme";
import type { ThemeDefinition, ThemeName } from "./theme";

export const themes: Record<ThemeName, ThemeDefinition> = {
  "minimal-light": minimalTheme,
  "minimal-dark": minimalDarkTheme,
  bloodbowl: bloodBowlTheme,
};

export const THEME_OPTIONS: ReadonlyArray<{ value: ThemeName; label: string }> = [
  { value: "minimal-light", label: "Minimal Light" },
  { value: "minimal-dark", label: "Minimal Dark" },
  { value: "bloodbowl", label: "Blood Bowl" },
];
