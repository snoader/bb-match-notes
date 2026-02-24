import { useMemo, useState, useEffect } from "react";
import { Modal, BigButton } from "./Modal";
import type { TeamId, InducementKind } from "../../domain/enums";

type InducementEntry = {
  team: TeamId;
  kind: InducementKind;
  detail?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  teamNames: { A: string; B: string };
  bought: InducementEntry[];
  onSave: (v: { team: TeamId; kind: InducementKind; detail?: string }) => void | Promise<void>;
};

export function UseInducementModal({ open, onClose, teamNames, bought, onSave }: Props) {
  const [team, setTeam] = useState<TeamId>("A");
  const [kind, setKind] = useState<InducementKind | "">("");
  const [detail, setDetail] = useState("");

  useEffect(() => {
    if (!open) return;

    // Default Team = first team that actually has inducements
    const hasA = bought.some((x) => x.team === "A");
    const hasB = bought.some((x) => x.team === "B");

    if (hasA) setTeam("A");
    else if (hasB) setTeam("B");

    setKind("");
    setDetail("");
  }, [open, bought]);

  const teamInducements = useMemo(
    () => bought.filter((x) => x.team === team),
    [bought, team]
  );

  const kinds = useMemo(() => {
    const s = new Set<string>();
    const out: InducementKind[] = [];

    for (const i of teamInducements) {
      if (!s.has(i.kind)) {
        s.add(i.kind);
        out.push(i.kind);
      }
    }

    return out;
  }, [teamInducements]);

  const canSave = kind !== "";

  async function save() {
    if (!canSave) return;
    await onSave({ team, kind: kind as InducementKind, detail });
  }

  return (
    <Modal open={open} title="Use Inducement" onClose={onClose}>
      <div style={{ display: "grid", gap: 10 }}>
        {/* Team */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <button
            onClick={() => {
              setTeam("A");
              setKind("");
            }}
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
            onClick={() => {
              setTeam("B");
              setKind("");
            }}
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

        {/* Inducement */}
        {kinds.length === 0 ? (
          <div style={{ opacity: 0.7 }}>No inducements bought for this team.</div>
        ) : (
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as any)}
            style={{ padding: 12, borderRadius: 12, border: "1px solid #ddd" }}
          >
            <option value="">Select inducement…</option>
            {kinds.map((k) => (
              <option key={k} value={k}>
                {String(k)}
              </option>
            ))}
          </select>
        )}

        <input
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          placeholder="optional detail"
          style={{ padding: 12, borderRadius: 12, border: "1px solid #ddd" }}
        />

        <BigButton label="Save" onClick={save} disabled={!canSave} />
        <BigButton label="Cancel" onClick={onClose} secondary />
      </div>
    </Modal>
  );
}
