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
            style={{
              ...turnButtonBaseStyle,
              border: t === currentTurn ? "1px solid #111" : "1px solid #ddd",
              background: t === currentTurn ? "#111" : "#fafafa",
              color: t === currentTurn ? "white" : "#111",
              opacity: !hasMatch ? 0.5 : 1,
            }}
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
