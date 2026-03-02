import { useEffect } from "react";
import { useMatchStore } from "../store/matchStore";
import { useAppStore } from "../store/appStore";
import { hasReachedEndCondition } from "../domain/matchEnd";
import { MatchStartScreen } from "../ui/screens/MatchStartScreen";
import { LiveMatchScreen } from "../ui/screens/LiveMatchScreen";
import { EndGameScreen } from "../ui/screens/EndGameScreen";

export default function App() {
  const init = useMatchStore((s) => s.init);
  const events = useMatchStore((s) => s.events);
  const derived = useMatchStore((s) => s.derived);
  const isReady = useMatchStore((s) => s.isReady);

  const screen = useAppStore((s) => s.screen);
  const setScreen = useAppStore((s) => s.setScreen);

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

  if (!isReady) return <div style={{ padding: 12 }}>Loading…</div>;

  if (screen === "start") return <MatchStartScreen />;
  if (screen === "end") return <EndGameScreen />;
  return <LiveMatchScreen />;
}
