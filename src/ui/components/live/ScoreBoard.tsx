import { memo, type CSSProperties } from "react";
import { formatWeather } from "../../../domain/weather";
import { displayTurn } from "../../formatters/turnDisplay";

type TeamNames = { A: string; B: string };
type Score = { A: number; B: number };

type ScoreBoardProps = {
  teamNames: TeamNames;
  score: Score;
  half: number;
  turn: number;
  weather?: string;
  activeTeamName?: string;
};

export const ScoreBoard = memo(function ScoreBoard({ teamNames, score, half, turn, weather, activeTeamName }: ScoreBoardProps) {
  const shownRound = displayTurn(half, turn);
  return (
    <div className="live-scoreboard-shell">
      <div className="live-score-grid">
        <div style={teamAStyle}>{teamNames.A}</div>
        <div style={scoreStyle}>
          {score.A}:{score.B}
        </div>
        <div style={teamBStyle}>{teamNames.B}</div>
      </div>

      <div style={metaOuterStyle}>
        <div style={metaInnerStyle}>
{`Round ${shownRound}`}{activeTeamName ? ` — ${activeTeamName}` : ""} <span style={metaDividerStyle}>•</span> <span style={metaSubtleStyle}>{`Half ${half}`}</span> <span style={metaDividerStyle}>•</span> {formatWeather(weather)}
        </div>
      </div>
    </div>
  );
});

const teamBaseStyle: CSSProperties = {
  fontWeight: 800,
  overflowWrap: "anywhere",
  fontSize: 16,
  lineHeight: 1.2,
};

const teamAStyle: CSSProperties = { ...teamBaseStyle, textAlign: "right" };
const teamBStyle: CSSProperties = { ...teamBaseStyle, textAlign: "left" };
const scoreStyle: CSSProperties = { textAlign: "center", fontSize: 40, fontWeight: 900, lineHeight: 1 };
const metaOuterStyle: CSSProperties = { marginTop: 6, minWidth: 0 };
const metaInnerStyle: CSSProperties = {
  padding: "6px 10px",
  borderRadius: 12,
  border: "1px solid var(--border)",
  fontWeight: 800,
  width: "100%",
  overflowWrap: "anywhere",
  textAlign: "center",
  fontSize: 14,
};

const metaSubtleStyle: CSSProperties = { color: "var(--text-muted)" };
const metaDividerStyle: CSSProperties = { color: "var(--text-muted)" };
