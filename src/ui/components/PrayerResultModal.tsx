import React, { useState, useEffect } from "react";
import { Modal, BigButton } from "./Modal";
import type { TeamId } from "../../domain/enums";
import { PRAYERS } from "../../domain/enums";

type PrayerResult = (typeof PRAYERS)[number];

type Props = {
  open: boolean;
  onClose: () => void;
  teamNames: { A: string; B: string };
  onSave: (v: { team: TeamId; result: PrayerResult }) => void | Promise<void>;
};

export function PrayerResultModal({ open, onClose, teamNames, onSave }: Props) {
  const [team, setTeam] = useState<TeamId>("A");
  const [result, setResult] = useState<PrayerResult | "">("");

  useEffect(() => {
    if (open) {
      setTeam("A");
      setResult("");
    }
  }, [open]);

  const canSave = result !== "";

  async function save() {
    if (!canSave) return;
    await onSave({ team, result: result as PrayerResult });
  }

  return (
    <Modal open={open} title="Prayer Result" onClose={onClose}>
      <div style={{ display: "grid", gap: 10 }}>
        {/* Team */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <button
            onClick={() => setTeam("A")}
            style={{
              padding: "12px",
              borderRadius: 14,
              border: team === "A" ? "1px solid #111" : "1px solid #ddd",
              background: team === "A" ? "#111" : "#fafafa",
              color: team === "A" ? "white" : "#111",
              fontWeight: 800,
            }}
          >
            {teamNames.A}
          </button>

          <button
            onClick={() => setTeam("B")}
            style={{
              padding: "12px",
              borderRadius: 14,
              border: team === "B" ? "1px solid #111" : "1px solid #ddd",
              background: team === "B" ? "#111" : "#fafafa",
              color: team === "B" ? "white" : "#111",
              fontWeight: 800,
            }}
          >
            {teamNames.B}
          </button>
        </div>

        {/* Result */}
        <select
          value={result}
          onChange={(e) => setResult(e.target.value as any)}
          style={{ padding: 12, borderRadius: 12, border: "1px solid #ddd" }}
        >
          <option value="">Select prayer…</option>
          {PRAYERS.map((p) => (
            <option key={p} value={p}>
              {String(p)}
            </option>
          ))}
        </select>

        <BigButton label="Save" onClick={save} disabled={!canSave} />
        <BigButton label="Cancel" onClick={onClose} secondary />
      </div>
    </Modal>
  );
}
