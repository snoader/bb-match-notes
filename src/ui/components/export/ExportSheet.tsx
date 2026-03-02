import { useMemo, useState } from "react";
import { Modal, BigButton } from "../Modal";
import { PlayerPicker } from "../PlayerPicker";
import type { MatchEvent } from "../../../domain/events";
import type { DerivedMatchState } from "../../../domain/projection";
import type { PlayerSlot, TeamId } from "../../../domain/enums";
import type { Rosters } from "../../../export/spp";
import { getExportPayload, payloadToBlob, type ExportFormat, type ExportPayload } from "../../../export/payload";

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

function downloadText(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function sharePayload(payload: ExportPayload) {
  if (!navigator.share) {
    downloadText(payload.filename, payloadToBlob(payload));
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
  const [pickerTeam, setPickerTeam] = useState<TeamId | null>(null);

  const mvpSelections = useMemo<Partial<Record<TeamId, string>>>(() => ({ A: mvpA || undefined, B: mvpB || undefined }), [mvpA, mvpB]);
  const payload = useMemo(
    () => getExportPayload({ format, events, derived, rosters, mvpSelections }),
    [format, events, derived, rosters, mvpSelections],
  );

  const primaryLabel = isSmallScreen ? "Share" : "Download";
  const selectedA = rosters.A.find((player) => player.id === mvpA);
  const selectedB = rosters.B.find((player) => player.id === mvpB);

  const activeMvp = pickerTeam === "A" ? mvpA : mvpB;

  function setMvpForTeam(team: TeamId, playerId: string) {
    if (team === "A") {
      setMvpA(playerId);
      return;
    }
    setMvpB(playerId);
  }

  function clearMvpForTeam(team: TeamId) {
    if (team === "A") {
      setMvpA("");
      return;
    }
    setMvpB("");
  }

  async function runPrimaryAction() {
    if (isSmallScreen) {
      await sharePayload(payload);
      return;
    }
    downloadText(payload.filename, payloadToBlob(payload));
  }

  return (
    <Modal open={open} title="Export" onClose={onClose}>
      <div style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ fontWeight: 700 }}>{derived.teamNames.A} MVP (optional)</div>
          {selectedA ? (
            <>
              <div style={{ fontWeight: 800, border: "1px solid #ddd", borderRadius: 12, padding: "10px 12px", minHeight: 44, display: "flex", alignItems: "center" }}>
                #{selectedA.id} {selectedA.name}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setPickerTeam("A")} style={{ minHeight: 44, borderRadius: 12, border: "1px solid #ddd", padding: "10px 12px", fontWeight: 700, background: "#fafafa" }}>
                  Change
                </button>
                <button onClick={() => clearMvpForTeam("A")} style={{ minHeight: 44, borderRadius: 12, border: "1px solid #ddd", padding: "10px 12px", fontWeight: 700, background: "#fff" }}>
                  Clear
                </button>
              </div>
            </>
          ) : (
            <button onClick={() => setPickerTeam("A")} style={{ minHeight: 44, borderRadius: 12, border: "1px solid #ddd", padding: "10px 12px", fontWeight: 700, background: "#fafafa", textAlign: "left" }}>
              Select player
            </button>
          )}
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ fontWeight: 700 }}>{derived.teamNames.B} MVP (optional)</div>
          {selectedB ? (
            <>
              <div style={{ fontWeight: 800, border: "1px solid #ddd", borderRadius: 12, padding: "10px 12px", minHeight: 44, display: "flex", alignItems: "center" }}>
                #{selectedB.id} {selectedB.name}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setPickerTeam("B")} style={{ minHeight: 44, borderRadius: 12, border: "1px solid #ddd", padding: "10px 12px", fontWeight: 700, background: "#fafafa" }}>
                  Change
                </button>
                <button onClick={() => clearMvpForTeam("B")} style={{ minHeight: 44, borderRadius: 12, border: "1px solid #ddd", padding: "10px 12px", fontWeight: 700, background: "#fff" }}>
                  Clear
                </button>
              </div>
            </>
          ) : (
            <button onClick={() => setPickerTeam("B")} style={{ minHeight: 44, borderRadius: 12, border: "1px solid #ddd", padding: "10px 12px", fontWeight: 700, background: "#fafafa", textAlign: "left" }}>
              Select player
            </button>
          )}
        </div>

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

        <BigButton label={primaryLabel} onClick={() => void runPrimaryAction()} testId="export-primary" />
      </div>

      <Modal open={pickerTeam !== null} title={pickerTeam ? `${derived.teamNames[pickerTeam]} MVP` : "Select MVP"} onClose={() => setPickerTeam(null)}>
        {pickerTeam && (
          <PlayerPicker
            label="Select player"
            value={(activeMvp as PlayerSlot | "") ?? ""}
            onChange={(value) => {
              setMvpForTeam(pickerTeam, String(value));
              setPickerTeam(null);
            }}
            allowEmpty
            onClear={() => clearMvpForTeam(pickerTeam)}
          />
        )}
      </Modal>
    </Modal>
  );
}
