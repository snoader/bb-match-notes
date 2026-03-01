import type { CSSProperties } from "react";
import { displayTurn } from "../../formatters/turnDisplay";

type TeamNames = { A: string; B: string };
type Score = { A: number; B: number };

type ScoreBoardProps = {
  teamNames: TeamNames;
  score: Score;
  half: number;
  turn: number;
  weather?: string;
};

const WEATHER_LABELS: Record<string, string> = {
  pouring_rain: "Rain",
  very_sunny: "Sunny",
  blizzard: "Blizzard",
  sweltering_heat: "Heat",
  nice: "Nice",
};

function toWeatherLabel(weather?: string): string {
  if (!weather) return "—";
  return WEATHER_LABELS[weather] ?? weather.replace(/_/g, " ").replace(/\b\w/g, (x) => x.toUpperCase());
}

export function ScoreBoard({ teamNames, score, half, turn, weather }: ScoreBoardProps) {
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
          H{half} • T{displayTurn(half, turn)} • {toWeatherLabel(weather)}
        </div>
      </div>
    </div>
  );
}

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
  border: "1px solid #eee",
  fontWeight: 800,
  width: "100%",
  overflowWrap: "anywhere",
  textAlign: "center",
  fontSize: 14,
};
