export type ThemeName = "minimal" | "bloodbowl";

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
