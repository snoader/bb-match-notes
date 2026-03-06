export type ThemeName = "minimal-light" | "minimal-dark" | "bloodbowl";

export type ThemeTokens = Record<string, string>;

export type ThemeDefinition = {
  name: ThemeName;
  tokens: ThemeTokens;
};

export function applyThemeTokens(tokens: ThemeTokens) {
  const root = document.documentElement;
  Object.entries(tokens).forEach(([token, value]) => {
    root.style.setProperty(token, value);
  });
}

export const THEME_STORAGE_KEY = "bb-match-notes.theme";
