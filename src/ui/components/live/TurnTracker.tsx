import { memo } from "react";
import { BigButton } from "../Modal";
import { displayTurn } from "../../../shared/formatters/turnDisplay";

type TurnTrackerProps = {
  turnButtons: number[];
  currentTurn: number;
  half: number;
  activeTeamName?: string;
  hasMatch: boolean;
  onSetTurn: (turn: number) => void;
  onNextTurn: () => void;
};

const sectionTitleStyle = { fontWeight: 900, marginBottom: 8 } as const;
const turnButtonBaseStyle = {
  padding: "12px 0",
  minHeight: 44,
  borderRadius: 14,
  fontWeight: 900,
} as const;
const nextTurnWrapStyle = { marginTop: 10 } as const;
const currentTurnCardStyle = {
  display: "grid",
  gap: 4,
  marginBottom: 10,
  padding: "12px 14px",
  borderRadius: 16,
  border: "1px solid var(--border)",
  background: "var(--surface-2)",
} as const;
const currentTurnLabelStyle = {
  fontSize: 12,
  fontWeight: 700,
  color: "var(--text-muted)",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
} as const;
const currentTurnValueStyle = {
  fontSize: 24,
  lineHeight: 1.1,
  fontWeight: 900,
  overflowWrap: "anywhere",
} as const;
const currentTurnMetaStyle = {
  fontSize: 13,
  color: "var(--text-muted)",
  fontWeight: 700,
} as const;

function turnButtonStyle(isCurrent: boolean, hasMatch: boolean) {
  return {
    ...turnButtonBaseStyle,
    border: isCurrent ? "1px solid var(--interactive-active-border)" : "1px solid var(--border)",
    background: isCurrent ? "var(--interactive-active-bg)" : "var(--surface-2)",
    color: isCurrent ? "var(--interactive-active-text)" : "var(--interactive-active-ghost-text)",
    opacity: !hasMatch ? 0.5 : 1,
  };
}

export const TurnTracker = memo(function TurnTracker({ turnButtons, currentTurn, half, activeTeamName, hasMatch, onSetTurn, onNextTurn }: TurnTrackerProps) {
  const shownRound = displayTurn(half, currentTurn);
  const currentTeamLabel = activeTeamName ?? "Awaiting kick-off";

  return (
    <div className="live-section">
      <div style={sectionTitleStyle}>Turn Tracker</div>
      <div style={currentTurnCardStyle} aria-live="polite">
        <div style={currentTurnLabelStyle}>Current turn</div>
        <div style={currentTurnValueStyle}>Turn {shownRound}{activeTeamName ? ` — ${activeTeamName}` : ""}</div>
        <div style={currentTurnMetaStyle}>{activeTeamName ? `Active team: ${currentTeamLabel}` : `Half ${half}`}</div>
      </div>
      <div className="live-turn-grid">
        {turnButtons.map((t) => (
          <button
            key={t}
            onClick={() => onSetTurn(t)}
            disabled={!hasMatch}
            style={turnButtonStyle(t === currentTurn, hasMatch)}
          >
            {displayTurn(half, t)}
          </button>
        ))}
      </div>
      <div style={nextTurnWrapStyle}>
        <BigButton label="Next Team Turn" onClick={onNextTurn} disabled={!hasMatch} />
      </div>
    </div>
  );
});
