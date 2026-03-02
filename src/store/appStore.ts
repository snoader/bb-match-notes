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
  updateAvailable: boolean;
  updateHandler: (() => Promise<void>) | null;
  setScreen: (s: Screen) => void;
  setDeferredInstallPrompt: (event: DeferredInstallPromptEvent | null) => void;
  clearDeferredInstallPrompt: () => void;
  setUpdateAvailable: (available: boolean) => void;
  setUpdateHandler: (handler: (() => Promise<void>) | null) => void;
  applyUpdate: () => Promise<void>;
  promptInstall: () => Promise<void>;
};

export const useAppStore = create<AppStore>((set, get) => ({
  screen: "start",
  deferredInstallPrompt: null,
  canInstall: false,
  updateAvailable: false,
  updateHandler: null,
  setScreen: (screen) => set({ screen }),
  setDeferredInstallPrompt: (event) => set({ deferredInstallPrompt: event, canInstall: Boolean(event) }),
  clearDeferredInstallPrompt: () => set({ deferredInstallPrompt: null, canInstall: false }),
  setUpdateAvailable: (updateAvailable) => set({ updateAvailable }),
  setUpdateHandler: (updateHandler) => set({ updateHandler }),
  applyUpdate: async () => {
    const updateHandler = get().updateHandler;
    if (!updateHandler) return;
    await updateHandler();
    set({ updateAvailable: false });
    window.location.reload();
  },
  promptInstall: async () => {
    const deferredPrompt = get().deferredInstallPrompt;
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
  },
}));
