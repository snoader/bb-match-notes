import { useMatchStore } from "../../store/matchStore";
import { displayTurn } from "../formatters/turnDisplay";

export function EndGameScreen() {
  const d = useMatchStore((s) => s.derived);

  return (
    <div style={{ padding: 12, display: "grid", gap: 12 }}>
      <h2 style={{ margin: 0 }}>Final Score</h2>
      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: 12,
          padding: 12,
          background: "#fafafa",
          fontWeight: 700,
        }}
      >
        {d.teamNames.A} {d.score.A} : {d.score.B} {d.teamNames.B}
      </div>
      <div style={{ opacity: 0.75 }}>Match ended at Half {d.half}, Turn {displayTurn(d.half, d.turn)}.</div>
      <div style={{ opacity: 0.75, fontSize: 13 }}>Undo the latest turn/event to continue the live match view.</div>
    </div>
  );
}

