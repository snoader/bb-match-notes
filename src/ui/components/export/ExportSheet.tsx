import { useMemo, useState } from "react";
import { Modal, BigButton } from "../Modal";
import type { MatchEvent } from "../../../domain/events";
import type { DerivedMatchState } from "../../../domain/projection";
import type { TeamId } from "../../../domain/enums";
import type { Rosters } from "../../../export/spp";
import { getExportPayload, payloadToBlob, type ExportFormat } from "../../../export/payload";

type Props = {
  open: boolean;
  onClose: () => void;
  events: MatchEvent[];
  derived: DerivedMatchState;
  rosters: Rosters;
  isSmallScreen: boolean;
};

const formatLabels: Record<ExportFormat, string> = {
  text: "Text (Share)",
  markdown: "Markdown",
  json: "JSON",
};

async function copyText(text: string) {
  await navigator.clipboard.writeText(text);
}

function downloadText(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function sharePayload(payload: { filename: string; mime: string; text: string; title: string; format: ExportFormat }) {
  if (!navigator.share) {
    await copyText(payload.text);
    return;
  }

  if (payload.format === "json") {
    const jsonFile = new File([payload.text], payload.filename, { type: payload.mime });
    if (navigator.canShare?.({ files: [jsonFile] })) {
      await navigator.share({ title: payload.title, files: [jsonFile] });
      return;
    }
  }

  await navigator.share({ title: payload.title, text: payload.text });
}

export function ExportSheet(props: Props) {
  const { open, onClose, events, derived, rosters, isSmallScreen } = props;
  const [format, setFormat] = useState<ExportFormat>("text");
  const [mvpA, setMvpA] = useState("");
  const [mvpB, setMvpB] = useState("");

  const mvpSelections = useMemo<Partial<Record<TeamId, string>>>(() => ({ A: mvpA || undefined, B: mvpB || undefined }), [mvpA, mvpB]);
  const payload = useMemo(
    () => getExportPayload({ format, events, derived, rosters, mvpSelections }),
    [format, events, derived, rosters, mvpSelections],
  );

  const primaryLabel = isSmallScreen ? "Share" : "Download";

  async function runPrimaryAction() {
    if (isSmallScreen) {
      await sharePayload(payload);
      return;
    }
    downloadText(payload.filename, payloadToBlob(payload));
  }

  async function runCopyAction() {
    await copyText(payload.text);
  }

  return (
    <Modal open={open} title="Export" onClose={onClose}>
      <div style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "grid", gap: 8 }}>
          {(["text", "markdown", "json"] as ExportFormat[]).map((candidate) => (
            <button
              key={candidate}
              onClick={() => setFormat(candidate)}
              style={{
                minHeight: 44,
                borderRadius: 14,
                border: format === candidate ? "1px solid #111" : "1px solid #ddd",
                background: format === candidate ? "#111" : "#fafafa",
                color: format === candidate ? "white" : "#111",
                fontWeight: 700,
                textAlign: "left",
                padding: "12px",
              }}
            >
              {formatLabels[candidate]}
            </button>
          ))}
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ fontWeight: 700 }}>{derived.teamNames.A} MVP (optional)</div>
          <select value={mvpA} onChange={(event) => setMvpA(event.target.value)} style={{ minHeight: 44, borderRadius: 12, border: "1px solid #ddd", padding: "10px 12px" }}>
            <option value="">— none —</option>
            {rosters.A.map((player) => (
              <option key={player.id} value={player.id}>{player.name}</option>
            ))}
          </select>
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ fontWeight: 700 }}>{derived.teamNames.B} MVP (optional)</div>
          <select value={mvpB} onChange={(event) => setMvpB(event.target.value)} style={{ minHeight: 44, borderRadius: 12, border: "1px solid #ddd", padding: "10px 12px" }}>
            <option value="">— none —</option>
            {rosters.B.map((player) => (
              <option key={player.id} value={player.id}>{player.name}</option>
            ))}
          </select>
        </div>

        <BigButton label={primaryLabel} onClick={() => void runPrimaryAction()} testId="export-primary" />
        <BigButton label="Copy" onClick={() => void runCopyAction()} secondary testId="export-copy" />
      </div>
    </Modal>
  );
}
