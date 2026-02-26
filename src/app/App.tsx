import { useEffect } from "react";
import { useMatchStore } from "../store/matchStore";
import { useAppStore } from "../store/appStore";
import { MatchStartScreen } from "../ui/screens/MatchStartScreen";
import { LiveMatchScreen } from "../ui/screens/LiveMatchScreen";

export default function App() {
  const init = useMatchStore((s) => s.init);
  const events = useMatchStore((s) => s.events);
  const isReady = useMatchStore((s) => s.isReady);
  const resetAll = useMatchStore((s) => s.resetAll);

  const screen = useAppStore((s) => s.screen);
  const setScreen = useAppStore((s) => s.setScreen);

  useEffect(() => init(), [init]);

  useEffect(() => {
    const isTestMode = import.meta.env.MODE === "test" || import.meta.env.VITE_E2E === "1";
    if (!isTestMode) return;

    window.__bbmn_test = {
      resetMatch: async () => {
        await resetAll();
      },
    };

    return () => {
      delete window.__bbmn_test;
    };
  }, [resetAll]);


  useEffect(() => {
    if (!isReady) return;
    const hasMatch = events.some((e) => e.type === "match_start");
    setScreen(hasMatch ? "live" : "start");
  }, [isReady, events, setScreen]);

  if (!isReady) return <div style={{ padding: 12 }}>Loading…</div>;

  return screen === "start" ? <MatchStartScreen /> : <LiveMatchScreen />;
}

