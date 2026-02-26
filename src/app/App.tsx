import { useEffect } from "react";
import { useMatchStore } from "../store/matchStore";
import { useAppStore } from "../store/appStore";
import { MatchStartScreen } from "../ui/screens/MatchStartScreen";
import { LiveMatchScreen } from "../ui/screens/LiveMatchScreen";

export default function App() {
  const init = useMatchStore((s) => s.init);
  const events = useMatchStore((s) => s.events);
  const isReady = useMatchStore((s) => s.isReady);

  const screen = useAppStore((s) => s.screen);
  const setScreen = useAppStore((s) => s.setScreen);
  const resetAll = useMatchStore((s) => s.resetAll);

  useEffect(() => init(), [init]);

  useEffect(() => {
    if (!isReady) return;
    const hasMatch = events.some((e) => e.type === "match_start");
    setScreen(hasMatch ? "live" : "start");
  }, [isReady, events, setScreen]);

  useEffect(() => {
    if (!(import.meta.env.MODE === "test" || import.meta.env.VITE_E2E === "1")) return;

    (window as Window & { __bbmn_test?: { reset: () => Promise<void> } }).__bbmn_test = {
      reset: async () => {
        await resetAll();
        setScreen("start");
      },
    };
  }, [resetAll, setScreen]);

  if (!isReady) return <div style={{ padding: 12 }}>Loading…</div>;

  return screen === "start" ? <MatchStartScreen /> : <LiveMatchScreen />;
}
