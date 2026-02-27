import { create } from "zustand";

export type Screen = "start" | "live" | "end";

type AppStore = {
  screen: Screen;
  setScreen: (s: Screen) => void;
};

export const useAppStore = create<AppStore>((set) => ({
  screen: "start",
  setScreen: (screen) => set({ screen }),
}));
