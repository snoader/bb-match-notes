import { useEffect } from "react";
import { useMatchStore } from "../store/matchStore";
import { useAppStore, type DeferredInstallPromptEvent } from "../store/appStore";
import { hasReachedEndCondition } from "../domain/matchEnd";
import { MatchStartScreen } from "../ui/screens/MatchStartScreen";
import { LiveMatchScreen } from "../ui/screens/LiveMatchScreen";
import { EndGameScreen } from "../ui/screens/EndGameScreen";
import { isStandalone } from "../shared/pwaInstall";
import { UpdateToast } from "../ui/components/app/UpdateToast";

export default function App() {
  const init = useMatchStore((s) => s.init);
  const events = useMatchStore((s) => s.events);
  const derived = useMatchStore((s) => s.derived);
  const isReady = useMatchStore((s) => s.isReady);

  const screen = useAppStore((s) => s.screen);
  const setScreen = useAppStore((s) => s.setScreen);
  const setDeferredInstallPrompt = useAppStore((s) => s.setDeferredInstallPrompt);
  const clearDeferredInstallPrompt = useAppStore((s) => s.clearDeferredInstallPrompt);
  const setInstalled = useAppStore((s) => s.setInstalled);

  useEffect(() => init(), [init]);

  useEffect(() => {
    if (!isReady) return;
    const hasMatch = events.some((e) => e.type === "match_start");
    if (!hasMatch) {
      setScreen("start");
      return;
    }

    const hasFinishedByTurns = hasReachedEndCondition(derived.half, derived.turn);
    const matchFinished = hasFinishedByTurns && !derived.kickoffPending;
    setScreen(matchFinished ? "end" : "live");
  }, [isReady, events, derived.half, derived.turn, derived.kickoffPending, setScreen]);

  useEffect(() => {
    function onBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setDeferredInstallPrompt(event as DeferredInstallPromptEvent);
    }

    function onAppInstalled() {
      clearDeferredInstallPrompt();
      setInstalled(true);
    }

    function onDisplayModeChange() {
      setInstalled(isStandalone());
    }

    const mediaQuery = window.matchMedia("(display-mode: standalone)");

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    mediaQuery.addEventListener("change", onDisplayModeChange);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
      mediaQuery.removeEventListener("change", onDisplayModeChange);
    };
  }, [setDeferredInstallPrompt, clearDeferredInstallPrompt, setInstalled]);

  if (!isReady) return <div style={{ padding: 12 }}>Loading…</div>;

  return (
    <>
      {screen === "start" && <MatchStartScreen />}
      {screen === "end" && <EndGameScreen />}
      {screen === "live" && <LiveMatchScreen />}
      <UpdateToast />
    </>
  );
}
