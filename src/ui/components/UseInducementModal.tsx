import { useMemo, useState, useEffect } from "react";
import { Modal, BigButton } from "./Modal";
import type { TeamId, InducementKind } from "../../domain/enums";
import { sortByLabel } from "../../shared/sort";
import { labelInducement } from "../../domain/labels";
import { isSelectableInducement } from "../../domain/enums";

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

    const hasA = bought.some((x) => x.team === "A" && isSelectableInducement(x.kind));
    const hasB = bought.some((x) => x.team === "B" && isSelectableInducement(x.kind));

    if (hasA) setTeam("A");
    else if (hasB) setTeam("B");

    setDetail("");
  }, [open, bought]);

  const teamInducements = useMemo(() => bought.filter((x) => x.team === team && isSelectableInducement(x.kind)), [bought, team]);

  const kinds = useMemo(() => {
    const s = new Set<string>();
    const out: InducementKind[] = [];

    for (const i of teamInducements) {
      if (!s.has(i.kind)) {
        s.add(i.kind);
        out.push(i.kind);
      }
    }

    return sortByLabel(out, (kindLabel) => labelInducement(kindLabel));
  }, [teamInducements]);

  useEffect(() => {
    if (kind && !kinds.includes(kind)) {
      setKind("");
    }
  }, [kind, kinds]);

  const canSave = kind !== "";

  async function save() {
    if (!canSave) return;
    await onSave({ team, kind: kind as InducementKind, detail });
  }

  return (
    <Modal open={open} title="Use Inducement" onClose={onClose}>
      <div style={{ display: "grid", gap: 10 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <button
            onClick={() => {
              setTeam("A");
            }}
            style={{
              padding: "12px",
              borderRadius: 14,
              border: team === "A" ? "1px solid var(--color-primary)" : "1px solid var(--color-border)",
              background: team === "A" ? "var(--color-primary)" : "var(--color-surface-soft)",
              color: team === "A" ? "var(--color-primary-contrast)" : "var(--color-primary)",
              fontWeight: 800,
            }}
          >
            {teamNames.A}
          </button>

          <button
            onClick={() => {
              setTeam("B");
            }}
            style={{
              padding: "12px",
              borderRadius: 14,
              border: team === "B" ? "1px solid var(--color-primary)" : "1px solid var(--color-border)",
              background: team === "B" ? "var(--color-primary)" : "var(--color-surface-soft)",
              color: team === "B" ? "var(--color-primary-contrast)" : "var(--color-primary)",
              fontWeight: 800,
            }}
          >
            {teamNames.B}
          </button>
        </div>

        {kinds.length === 0 ? (
          <div style={{ opacity: 0.7 }}>No inducements bought for this team.</div>
        ) : (
          <select value={kind} onChange={(e) => setKind(e.target.value as InducementKind | "")} style={{ padding: 12, borderRadius: 12, border: "1px solid var(--color-border)" }}>
            <option value="">Please select</option>
            {kinds.map((k) => (
              <option key={k} value={k}>
                {labelInducement(k)}
              </option>
            ))}
          </select>
        )}

        {kinds.length > 0 && !canSave && <div style={{ color: "var(--color-danger-border)", fontSize: 13, fontWeight: 700 }}>Please select an inducement.</div>}

        <input value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="Optional details" style={{ padding: 12, borderRadius: 12, border: "1px solid var(--color-border)" }} />

        <BigButton label="Save" onClick={save} disabled={!canSave} />
        <BigButton label="Cancel" onClick={onClose} secondary />
      </div>
    </Modal>
  );
}
