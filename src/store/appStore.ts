import { create } from "zustand";
import { isIOS, isStandalone } from "../shared/pwaInstall";

export type Screen = "start" | "live" | "end";

export type DeferredInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type AppStore = {
  screen: Screen;
  deferredInstallPrompt: DeferredInstallPromptEvent | null;
  installed: boolean;
  canInstallPrompt: boolean;
  canShowIosInstallHelp: boolean;
  updateAvailable: boolean;
  updateHandler: (() => Promise<void>) | null;
  setScreen: (s: Screen) => void;
  setInstalled: (installed: boolean) => void;
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
  installed: isStandalone(),
  canInstallPrompt: false,
  canShowIosInstallHelp: isIOS() && !isStandalone(),
  updateAvailable: false,
  updateHandler: null,
  setScreen: (screen) => set({ screen }),
  setInstalled: (installed) => set({ installed, canShowIosInstallHelp: isIOS() && !installed }),
  setDeferredInstallPrompt: (event) => set({ deferredInstallPrompt: event, canInstallPrompt: Boolean(event) }),
  clearDeferredInstallPrompt: () => set({ deferredInstallPrompt: null, canInstallPrompt: false }),
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
