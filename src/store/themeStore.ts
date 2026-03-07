import { create } from "zustand";
import { THEME_STORAGE_KEY, type ThemeName } from "../theme/theme";

const FALLBACK_THEME: ThemeName = "minimal-light";

function isThemeName(value: string | null): value is ThemeName {
  return value === "bloodbowl" || value === "minimal-light" || value === "minimal-dark";
}

function getInitialTheme(): ThemeName {
  if (typeof window === "undefined") return FALLBACK_THEME;
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (isThemeName(stored)) return stored;
  if (stored === "minimal") return "minimal-light";
  if (window.matchMedia("(prefers-color-scheme: dark)").matches) return "minimal-dark";
  return FALLBACK_THEME;
}

type ThemeStore = {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
};

export const useThemeStore = create<ThemeStore>((set) => ({
  theme: getInitialTheme(),
  setTheme: (theme) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    }
    set({ theme });
  },
}));
