import { create } from "zustand";

export type Screen = "start" | "live" | "end";

export type DeferredInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type AppStore = {
  screen: Screen;
  deferredInstallPrompt: DeferredInstallPromptEvent | null;
  canInstall: boolean;
  setScreen: (s: Screen) => void;
  setDeferredInstallPrompt: (event: DeferredInstallPromptEvent | null) => void;
  clearDeferredInstallPrompt: () => void;
  promptInstall: () => Promise<void>;
};

export const useAppStore = create<AppStore>((set, get) => ({
  screen: "start",
  deferredInstallPrompt: null,
  canInstall: false,
  setScreen: (screen) => set({ screen }),
  setDeferredInstallPrompt: (event) => set({ deferredInstallPrompt: event, canInstall: Boolean(event) }),
  clearDeferredInstallPrompt: () => set({ deferredInstallPrompt: null, canInstall: false }),
  promptInstall: async () => {
    const deferredPrompt = get().deferredInstallPrompt;
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
  },
}));
