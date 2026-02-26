import type { PlayerSlot } from "../../domain/enums";

const rows: Array<PlayerSlot[]> = [
  [1, 2, 3, 4],
  [5, 6, 7, 8],
  [9, 10, 11, 12],
  [13, 14, 15, 16],
  ["S1", "S2", "S3", "S4"],
  ["M1", "M2", "M3", "M4"],
];

export function PlayerPicker(props: {
  value: PlayerSlot | "";
  onChange: (v: PlayerSlot) => void;
  allowEmpty?: boolean;
  onClear?: () => void;
  label?: string;
  testId?: string;
}) {
  const selected = props.value ? String(props.value) : null;
  const canClear = !!props.allowEmpty && !!props.onClear;

  return (
    <div style={{ display: "grid", gap: 8 }} data-testid={props.testId}>
      {(props.label || selected || canClear) && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", minWidth: 0 }}>
          <div style={{ fontWeight: 900, overflowWrap: "anywhere" }}>{props.label ?? ""}</div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", minWidth: 0 }}>
            {selected && (
              <div
                style={{
                  padding: "6px 10px",
                  borderRadius: 999,
                  border: "1px solid #ddd",
                  background: "#fafafa",
                  fontWeight: 900,
                  fontSize: 14,
                  overflowWrap: "anywhere",
                }}
              >
                Selected: {selected}
              </div>
            )}

            {canClear && (
              <button
                onClick={props.onClear}
                style={{
                  padding: "8px 10px",
                  borderRadius: 12,
                  border: "1px solid #ddd",
                  background: "#fff",
                  fontWeight: 900,
                  fontSize: 14,
                  minHeight: 44,
                }}
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      <div style={{ display: "grid", gap: 6 }}>
        {rows.map((r, idx) => (
          <div key={idx} style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
            {r.map((slot) => {
              const active = props.value === slot;
              return (
                <button
                  key={String(slot)}
                  onClick={() => props.onChange(slot)}
                  style={{
                    padding: "14px 0",
                    borderRadius: 14,
                    border: active ? "1px solid #111" : "1px solid #ddd",
                    background: active ? "#111" : "#fafafa",
                    color: active ? "white" : "#111",
                    fontWeight: 900,
                    fontSize: 16,
                    minHeight: 44,
                    touchAction: "manipulation",
                  }}
                >
                  {String(slot)}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
