import { bloodBowlTheme } from "./bloodBowlTheme";
import { minimalDarkTheme } from "./minimalDarkTheme";
import { minimalTheme } from "./minimalTheme";
import type { ThemeDefinition, ThemeName } from "./theme";

export const themes: Record<ThemeName, ThemeDefinition> = {
  "minimal-light": minimalTheme,
  "minimal-dark": minimalDarkTheme,
  bloodbowl: bloodBowlTheme,
};
