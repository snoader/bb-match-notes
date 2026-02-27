import { BigButton } from "../Modal";

type TurnTrackerProps = {
  turnButtons: number[];
  currentTurn: number;
  hasMatch: boolean;
  onSetTurn: (turn: number) => void;
  onNextTurn: () => void;
};

export function TurnTracker({ turnButtons, currentTurn, hasMatch, onSetTurn, onNextTurn }: TurnTrackerProps) {
  return (
    <div className="live-section">
      <div style={{ fontWeight: 900, marginBottom: 8 }}>Turn Tracker</div>
      <div className="live-turn-grid">
        {turnButtons.map((t) => (
          <button
            key={t}
            onClick={() => onSetTurn(t)}
            disabled={!hasMatch}
            style={{
              padding: "12px 0",
              minHeight: 44,
              borderRadius: 14,
              border: t === currentTurn ? "1px solid #111" : "1px solid #ddd",
              background: t === currentTurn ? "#111" : "#fafafa",
              color: t === currentTurn ? "white" : "#111",
              fontWeight: 900,
              opacity: !hasMatch ? 0.5 : 1,
            }}
          >
            {t}
          </button>
        ))}
      </div>
      <div style={{ marginTop: 10 }}>
        <BigButton label="Next Turn" onClick={onNextTurn} disabled={!hasMatch} />
      </div>
    </div>
  );
}
