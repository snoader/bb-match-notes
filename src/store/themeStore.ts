import { create } from "zustand";
import type { ThemeName } from "../theme/theme";

const THEME_STORAGE_KEY = "bb-match-notes.theme";

function getInitialTheme(): ThemeName {
  if (typeof window === "undefined") return "minimal-light";
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "bloodbowl" || stored === "minimal-light" || stored === "minimal-dark") return stored;
  if (stored === "minimal") return "minimal-light";
  return "minimal-light";
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
