import type { CSSProperties } from "react";

type TeamNames = { A: string; B: string };
type Score = { A: number; B: number };

type ScoreBoardProps = {
  teamNames: TeamNames;
  score: Score;
  half: number;
  turn: number;
  weather?: string;
};

export function ScoreBoard({ teamNames, score, half, turn, weather }: ScoreBoardProps) {
  return (
    <>
      <div className="live-score-grid">
        <div className="live-card">
          <div style={teamNameStyle}>{teamNames.A}</div>
          <div style={scoreStyle}>{score.A}</div>
        </div>

        <div style={separatorStyle}>:</div>

        <div className="live-card" style={{ textAlign: "right" }}>
          <div style={teamNameStyle}>{teamNames.B}</div>
          <div style={scoreStyle}>{score.B}</div>
        </div>
      </div>

      <div style={metaOuterStyle}>
        <div style={metaInnerStyle}>Half {half} · Turn {turn} · Weather: {weather ?? "—"}</div>
      </div>
    </>
  );
}

const teamNameStyle: CSSProperties = { fontWeight: 800, overflowWrap: "anywhere" };
const scoreStyle: CSSProperties = { fontSize: 28, fontWeight: 900 };
const separatorStyle: CSSProperties = { textAlign: "center", fontWeight: 900, fontSize: 20 };
const metaOuterStyle: CSSProperties = { marginTop: 10, display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between", minWidth: 0 };
const metaInnerStyle: CSSProperties = {
  padding: "10px 12px",
  borderRadius: 16,
  border: "1px solid #eee",
  fontWeight: 800,
  width: "100%",
  overflowWrap: "anywhere",
};
