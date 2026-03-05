import { create } from "zustand";
import type { ThemeName } from "../theme/theme";

const THEME_STORAGE_KEY = "bb-match-notes.theme";

function getInitialTheme(): ThemeName {
  if (typeof window === "undefined") return "minimal";
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return stored === "bloodbowl" ? "bloodbowl" : "minimal";
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
