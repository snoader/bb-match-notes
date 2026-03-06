import { memo } from "react";
import { BigButton } from "../Modal";
import { displayTurn } from "../../formatters/turnDisplay";

type TurnTrackerProps = {
  turnButtons: number[];
  currentTurn: number;
  half: number;
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

function turnButtonStyle(isCurrent: boolean, hasMatch: boolean) {
  return {
    ...turnButtonBaseStyle,
    border: isCurrent ? "1px solid var(--accent)" : "1px solid var(--border)",
    background: isCurrent ? "var(--accent)" : "var(--surface-2)",
    color: isCurrent ? "var(--btn-text)" : "var(--accent)",
    opacity: !hasMatch ? 0.5 : 1,
  };
}

export const TurnTracker = memo(function TurnTracker({ turnButtons, currentTurn, half, hasMatch, onSetTurn, onNextTurn }: TurnTrackerProps) {
  return (
    <div className="live-section">
      <div style={sectionTitleStyle}>Turn Tracker</div>
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
        <BigButton label="Next Turn" onClick={onNextTurn} disabled={!hasMatch} />
      </div>
    </div>
  );
});
