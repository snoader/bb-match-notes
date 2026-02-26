import { useMemo, useState } from "react";
import { useMatchStore, teamLabel } from "../../store/matchStore";
import { Modal, BigButton } from "../components/Modal";
import type {
  ApothecaryOutcome,
  InjuryCause,
  InjuryPayload,
  InjuryResult,
  StatReduction,
} from "../../domain/events";
import type { PlayerSlot, TeamId } from "../../domain/enums";
import { PLAYER_SLOTS } from "../../domain/enums";
import { buildPdfBlob, buildTxtReport } from "../../export/report";
import { deriveSppFromEvents } from "../../export/spp";
import { canShareFiles, downloadFile, printPdf, shareFile } from "../../export/actions";
import { PlayerPicker } from "../components/PlayerPicker";

const injuryCauses: InjuryCause[] = [
  "BLOCK",
  "FOUL",
  "SECRET_WEAPON",
  "CROWD",
  "FAILED_DODGE",
  "FAILED_GFI",
  "FAILED_PICKUP",
  "OTHER",
];

const injuryResults: InjuryResult[] = ["BH", "MNG", "NIGGLING", "STAT", "DEAD", "OTHER"];
const statReductions: StatReduction[] = ["MA", "AV", "AG", "PA", "ST"];
const apoOutcomes: ApothecaryOutcome[] = ["SAVED", "CHANGED_RESULT", "DIED_ANYWAY", "UNKNOWN"];

const causesWithCauser = new Set<InjuryCause>(["BLOCK", "FOUL", "SECRET_WEAPON", "CROWD"]);
type ExportFormat = "txt" | "json" | "pdf";
type ExportAction = "share" | "download" | "print";

const normalizeInjuryPayload = (payload: unknown): Required<Pick<InjuryPayload, "cause" | "injuryResult" | "apothecaryUsed">> & InjuryPayload => {
  const p = (payload ?? {}) as InjuryPayload;
  return {
    ...p,
    cause: p.cause ?? "OTHER",
    injuryResult: p.injuryResult ?? "OTHER",
    apothecaryUsed: p.apothecaryUsed ?? false,
  };
};

export function LiveMatchScreen() {
  const isReady = useMatchStore((s) => s.isReady);
  const events = useMatchStore((s) => s.events);
  const d = useMatchStore((s) => s.derived);
  const appendEvent = useMatchStore((s) => s.appendEvent);
  const undoLast = useMatchStore((s) => s.undoLast);

  const hasMatch = useMemo(() => events.some((e) => e.type === "match_start"), [events]);

  const [tdOpen, setTdOpen] = useState(false);
  const [tdTeam, setTdTeam] = useState<TeamId>("A");
  const [tdPlayer, setTdPlayer] = useState<PlayerSlot | "">("");

  const [completionOpen, setCompletionOpen] = useState(false);
  const [completionTeam, setCompletionTeam] = useState<TeamId>("A");
  const [completionPasser, setCompletionPasser] = useState<PlayerSlot | "">("");
  const [completionReceiver, setCompletionReceiver] = useState<PlayerSlot | "">("");

  const [interceptionOpen, setInterceptionOpen] = useState(false);
  const [interceptionTeam, setInterceptionTeam] = useState<TeamId>("A");
  const [interceptionPlayer, setInterceptionPlayer] = useState<PlayerSlot | "">("");

  const [injuryOpen, setInjuryOpen] = useState(false);
  const [injuryTeam, setInjuryTeam] = useState<TeamId>("A");
  const [victimTeam, setVictimTeam] = useState<TeamId>("B");
  const [victimPlayerId, setVictimPlayerId] = useState<PlayerSlot | "">("");
  const [cause, setCause] = useState<InjuryCause>("BLOCK");
  const [causerPlayerId, setCauserPlayerId] = useState<PlayerSlot | "">("");
  const [injuryResult, setInjuryResult] = useState<InjuryResult>("BH");
  const [injuryStat, setInjuryStat] = useState<StatReduction>("MA");
  const [apoUsed, setApoUsed] = useState(false);
  const [apoOutcome, setApoOutcome] = useState<ApothecaryOutcome>("SAVED");

  const [exportOpen, setExportOpen] = useState(false);
  const [mvpOpen, setMvpOpen] = useState(false);
  const [mvpA, setMvpA] = useState("");
  const [mvpB, setMvpB] = useState("");
  const [exportHint, setExportHint] = useState("");

  const turnButtons = [1, 2, 3, 4, 5, 6, 7, 8];
  const canShareAnyFiles = useMemo(() => {
    const check = new File([new Blob(["check"], { type: "text/plain" })], "check.txt", { type: "text/plain" });
    return canShareFiles([check]);
  }, []);

  async function doTouchdown() {
    if (!tdPlayer) return;
    await appendEvent({
      type: "touchdown",
      team: tdTeam,
      payload: { player: tdPlayer },
    });
    setTdOpen(false);
  }

  async function doCompletion() {
    if (!completionPasser) return;
    await appendEvent({
      type: "completion",
      team: completionTeam,
      payload: {
        passer: completionPasser,
        receiver: completionReceiver || undefined,
      },
    });
    setCompletionOpen(false);
  }

  async function doInterception() {
    if (!interceptionPlayer) return;
    await appendEvent({
      type: "interception",
      team: interceptionTeam,
      payload: { player: interceptionPlayer },
    });
    setInterceptionOpen(false);
  }

  async function doInjury() {
    if (!victimPlayerId) return;
    if (injuryResult === "STAT" && !injuryStat) return;
    const causerRequired = causesWithCauser.has(cause);
    if (causerRequired && !causerPlayerId) return;

    await appendEvent({
      type: "injury",
      team: injuryTeam,
      payload: {
        victimTeam,
        victimPlayerId,
        cause,
        causerPlayerId: causerRequired ? causerPlayerId : undefined,
        injuryResult,
        stat: injuryResult === "STAT" ? injuryStat : undefined,
        apothecaryUsed: apoUsed,
        apothecaryOutcome: apoUsed ? apoOutcome : undefined,
      },
    });

    setInjuryOpen(false);
  }

  async function doNextTurn() {
    await appendEvent({ type: "next_turn" });
  }

  async function setTurn(turn: number) {
    await appendEvent({ type: "turn_set", payload: { half: d.half, turn } });
  }

  async function useResource(team: TeamId, kind: "reroll" | "apothecary") {
    if (kind === "reroll") return appendEvent({ type: "reroll_used", team });
    if (kind === "apothecary") return appendEvent({ type: "apothecary_used", team });
  }

  function sanitizeFilenamePart(value: string) {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 32) || "team";
  }

  function baseMatchFilename(date: Date) {
    const day = date.toISOString().slice(0, 10);
    const teamA = sanitizeFilenamePart(d.teamNames.A);
    const teamB = sanitizeFilenamePart(d.teamNames.B);
    return { day, teamA, teamB };
  }

  function getFilename(format: ExportFormat) {
    const sourceDate = events.find((event) => event.type === "match_start")?.createdAt ?? Date.now();
    const { day, teamA, teamB } = baseMatchFilename(new Date(sourceDate));
    if (format === "json") return `bb-match-events_${teamA}_vs_${teamB}_${day}.json`;
    return `bb-match-report_${teamA}_vs_${teamB}_${day}.${format}`;
  }

  async function handleExportAction(format: ExportFormat, action: ExportAction, blob: Blob) {
    setExportHint("");
    const filename = getFilename(format);
    const file = new File([blob], filename, { type: blob.type });

    if (action === "download") {
      downloadFile(blob, filename, blob.type);
      return;
    }

    if (action === "print") {
      await printPdf(blob);
      return;
    }

    if (canShareFiles([file])) {
      await shareFile(file, `BB Match Notes ${format.toUpperCase()}`);
      return;
    }

    setExportHint("Share not supported on this device/browser. Downloading instead.");
    downloadFile(blob, filename, blob.type);
  }

  const rosters = useMemo(() => {
    const known = { A: new Set<string>(), B: new Set<string>() };
    for (const e of events) {
      if (e.type === "touchdown" && e.team && e.payload?.player) known[e.team].add(String(e.payload.player));
      if (e.type === "completion" && e.team && e.payload?.passer) known[e.team].add(String(e.payload.passer));
      if (e.type === "interception" && e.team && e.payload?.player) known[e.team].add(String(e.payload.player));
      if (e.type === "injury") {
        if (e.team && e.payload?.causerPlayerId) known[e.team].add(String(e.payload.causerPlayerId));
        const victimTeamId = e.payload?.victimTeam === "A" || e.payload?.victimTeam === "B" ? (e.payload.victimTeam as TeamId) : undefined;
        if (victimTeamId && e.payload?.victimPlayerId) known[victimTeamId].add(String(e.payload.victimPlayerId));
      }
    }

    const defaults = PLAYER_SLOTS.map((slot) => String(slot));
    const toRoster = (team: TeamId, teamName: string) => {
      const ids = known[team].size ? [...known[team]] : defaults;
      return ids.map((id) => ({ id, team, name: `${teamName} #${id}` }));
    };

    return { A: toRoster("A", d.teamNames.A), B: toRoster("B", d.teamNames.B) };
  }, [events, d.teamNames]);

  function makeExportBlob(format: ExportFormat, mvpSelections: Partial<Record<TeamId, string>> = {}) {
    const spp = deriveSppFromEvents(events, rosters, mvpSelections);

    if (format === "txt") {
      const txt = buildTxtReport({ events, teamNames: d.teamNames, score: d.score, summary: spp });
      return new Blob([txt], { type: "text/plain" });
    }

    if (format === "json") {
      const json = JSON.stringify({ events, sppSummary: spp }, null, 2);
      return new Blob([json], { type: "application/json" });
    }

    return buildPdfBlob({ events, teamNames: d.teamNames, score: d.score, summary: spp });
  }

  async function runExport(format: ExportFormat, action: ExportAction, mvpSelections: Partial<Record<TeamId, string>> = {}) {
    const blob = makeExportBlob(format, mvpSelections);
    await handleExportAction(format, action, blob);
  }

  if (!isReady) return <div style={{ padding: 12, opacity: 0.7 }}>Loading…</div>;

  return (
    <div className="live-screen">
      <div className="live-header-row">
        <div style={{ fontWeight: 800, fontSize: 18, overflowWrap: "anywhere" }}>BB Match Notes</div>
        <div className="live-header-actions">
          <button
            onClick={() => setExportOpen(true)}
            style={{ padding: "10px 12px", borderRadius: 14, border: "1px solid #ddd", background: "#fafafa", fontWeight: 700, minHeight: 44 }}
            disabled={!events.length}
          >
            Share / Export
          </button>
          <button
            onClick={undoLast}
            style={{ padding: "10px 12px", borderRadius: 14, border: "1px solid #ddd", background: "#fff", fontWeight: 700, minHeight: 44 }}
            disabled={!events.length}
          >
            Undo
          </button>
        </div>
      </div>

      <div className="live-score-grid">
        <div className="live-card">
          <div style={{ fontWeight: 800, overflowWrap: "anywhere" }}>{d.teamNames.A}</div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>{d.score.A}</div>
        </div>

        <div style={{ textAlign: "center", fontWeight: 900, fontSize: 20 }}>:</div>

        <div className="live-card" style={{ textAlign: "right" }}>
          <div style={{ fontWeight: 800, overflowWrap: "anywhere" }}>{d.teamNames.B}</div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>{d.score.B}</div>
        </div>
      </div>

      <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between", minWidth: 0 }}>
        <div style={{ padding: "10px 12px", borderRadius: 16, border: "1px solid #eee", fontWeight: 800, width: "100%", overflowWrap: "anywhere" }}>
          Half {d.half} · Turn {d.turn} · Weather: {d.weather ?? "—"}
        </div>
      </div>

      {!hasMatch && (
        <div style={{ marginTop: 10, padding: 12, borderRadius: 16, border: "1px solid #eee", opacity: 0.8 }}>
          No active match found. Start or resume a match from the Start screen.
        </div>
      )}

      <div className="live-section">
        <div style={{ fontWeight: 900, marginBottom: 8 }}>Resources</div>
        <div className="live-action-grid">
          {(["A", "B"] as TeamId[]).map((team) => (
            <div key={team} style={{ border: "1px solid #f0f0f0", borderRadius: 14, padding: 10, minWidth: 0 }}>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>{teamLabel(team, d.teamNames)}</div>
              <div className="live-action-grid">
                {[
                  { k: "reroll" as const, label: `Rerolls (${d.resources[team].rerolls})` },
                  { k: "apothecary" as const, label: `Apo (${d.resources[team].apothecary})` },
                ].map((x) => (
                  <button
                    key={x.k}
                    onClick={() => useResource(team, x.k)}
                    style={{
                      padding: "12px 10px",
                      borderRadius: 14,
                      border: "1px solid #ddd",
                      background: "#fafafa",
                      fontWeight: 800,
                      fontSize: 14,
                      minHeight: 44,
                      overflowWrap: "anywhere",
                    }}
                    disabled={!hasMatch}
                  >
                    {x.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="live-section">
        <div style={{ fontWeight: 900, marginBottom: 8 }}>Turn Tracker</div>
        <div className="live-turn-grid">
          {turnButtons.map((t) => (
            <button
              key={t}
              onClick={() => setTurn(t)}
              disabled={!hasMatch}
              style={{
                padding: "12px 0",
                minHeight: 44,
                borderRadius: 14,
                border: t === d.turn ? "1px solid #111" : "1px solid #ddd",
                background: t === d.turn ? "#111" : "#fafafa",
                color: t === d.turn ? "white" : "#111",
                fontWeight: 900,
                opacity: !hasMatch ? 0.5 : 1,
              }}
            >
              {t}
            </button>
          ))}
        </div>
        <div style={{ marginTop: 10 }}>
          <BigButton label="Next Turn" onClick={doNextTurn} disabled={!hasMatch} />
        </div>
      </div>

      <div className="live-section">
        <div style={{ fontWeight: 900, marginBottom: 8 }}>Actions</div>
        <div className="live-action-grid">
          <BigButton label="Touchdown" onClick={() => setTdOpen(true)} disabled={!hasMatch} />
          <BigButton label="Completion" onClick={() => setCompletionOpen(true)} disabled={!hasMatch} />
          <BigButton label="Interception" onClick={() => setInterceptionOpen(true)} disabled={!hasMatch} />
          <BigButton label="Injury" onClick={() => setInjuryOpen(true)} disabled={!hasMatch} />
        </div>
      </div>

      <div className="live-section">
        <div style={{ fontWeight: 900, marginBottom: 8 }}>Recent</div>
        <div style={{ display: "grid", gap: 8, minWidth: 0 }}>
          {[...events].slice(-12).reverse().map((e) => {
            const injuryText =
              e.type === "injury"
                ? (() => {
                    const p = normalizeInjuryPayload(e.payload);
                    return `Victim ${String(p.victimPlayerId ?? p.victimName ?? "?")} · ${p.injuryResult}${p.stat ? `(${p.stat})` : ""} · ${p.cause} · Apo ${p.apothecaryUsed ? "Yes" : "No"}`;
                  })()
                : "";

            return (
              <div key={e.id} style={{ padding: 10, borderRadius: 14, border: "1px solid #f0f0f0", minWidth: 0 }}>
                <div style={{ fontWeight: 900, overflowWrap: "anywhere" }}>
                  {e.type} {e.team ? `· ${teamLabel(e.team, d.teamNames)}` : ""} · H{e.half} T{e.turn}
                </div>
                {injuryText ? (
                  <div style={{ marginTop: 4, fontSize: 13, opacity: 0.85 }}>{injuryText}</div>
                ) : (
                  e.payload && (
                    <div
                      style={{
                        marginTop: 4,
                        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                        overflowX: "auto",
                        fontSize: 12,
                        opacity: 0.8,
                      }}
                    >
                      {JSON.stringify(e.payload)}
                    </div>
                  )
                )}
              </div>
            );
          })}
          {!events.length && <div style={{ opacity: 0.7 }}>No events yet.</div>}
        </div>
      </div>

      <Modal open={tdOpen} title="Touchdown" onClose={() => setTdOpen(false)}>
        <div style={{ display: "grid", gap: 10 }}>
          <div className="live-action-grid">
            <button
              onClick={() => setTdTeam("A")}
              style={{
                padding: "12px 10px",
                borderRadius: 14,
                border: tdTeam === "A" ? "1px solid #111" : "1px solid #ddd",
                background: tdTeam === "A" ? "#111" : "#fafafa",
                color: tdTeam === "A" ? "white" : "#111",
                fontWeight: 900,
                minHeight: 44,
                overflowWrap: "anywhere",
              }}
            >
              {d.teamNames.A}
            </button>
            <button
              onClick={() => setTdTeam("B")}
              style={{
                padding: "12px 10px",
                borderRadius: 14,
                border: tdTeam === "B" ? "1px solid #111" : "1px solid #ddd",
                background: tdTeam === "B" ? "#111" : "#fafafa",
                color: tdTeam === "B" ? "white" : "#111",
                fontWeight: 900,
                minHeight: 44,
                overflowWrap: "anywhere",
              }}
            >
              {d.teamNames.B}
            </button>
          </div>

          <PlayerPicker label="Scorer" value={tdPlayer} onChange={(v) => setTdPlayer(v)} />

          <BigButton label="Save TD" onClick={doTouchdown} disabled={!tdPlayer} />
        </div>
      </Modal>

      <Modal open={completionOpen} title="Completion" onClose={() => setCompletionOpen(false)}>
        <div style={{ display: "grid", gap: 10 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontWeight: 800 }}>Team</div>
            <select
              value={completionTeam}
              onChange={(e) => setCompletionTeam(e.target.value as TeamId)}
              style={{ padding: 12, borderRadius: 14, border: "1px solid #ddd" }}
            >
              <option value="A">{d.teamNames.A}</option>
              <option value="B">{d.teamNames.B}</option>
            </select>
          </label>

          <PlayerPicker label="Passer" value={completionPasser} onChange={(v) => setCompletionPasser(v)} />
          <PlayerPicker
            label="Receiver (optional)"
            value={completionReceiver}
            onChange={(v) => setCompletionReceiver(v)}
            allowEmpty
            onClear={() => setCompletionReceiver("")}
          />

          <BigButton label="Save Completion" onClick={doCompletion} disabled={!completionPasser} />
        </div>
      </Modal>

      <Modal open={interceptionOpen} title="Interception" onClose={() => setInterceptionOpen(false)}>
        <div style={{ display: "grid", gap: 10 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontWeight: 800 }}>Team</div>
            <select
              value={interceptionTeam}
              onChange={(e) => setInterceptionTeam(e.target.value as TeamId)}
              style={{ padding: 12, borderRadius: 14, border: "1px solid #ddd" }}
            >
              <option value="A">{d.teamNames.A}</option>
              <option value="B">{d.teamNames.B}</option>
            </select>
          </label>

          <PlayerPicker label="Interceptor" value={interceptionPlayer} onChange={(v) => setInterceptionPlayer(v)} />

          <BigButton label="Save Interception" onClick={doInterception} disabled={!interceptionPlayer} />
        </div>
      </Modal>

      <Modal open={injuryOpen} title="Injury" onClose={() => setInjuryOpen(false)}>
        <div style={{ display: "grid", gap: 10 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontWeight: 800 }}>Attacker team</div>
            <select
              value={injuryTeam}
              onChange={(e) => setInjuryTeam(e.target.value as TeamId)}
              style={{ padding: 12, borderRadius: 14, border: "1px solid #ddd" }}
            >
              <option value="A">{d.teamNames.A}</option>
              <option value="B">{d.teamNames.B}</option>
            </select>
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontWeight: 800 }}>Victim team</div>
            <select
              value={victimTeam}
              onChange={(e) => setVictimTeam(e.target.value as TeamId)}
              style={{ padding: 12, borderRadius: 14, border: "1px solid #ddd" }}
            >
              <option value="A">{d.teamNames.A}</option>
              <option value="B">{d.teamNames.B}</option>
            </select>
          </label>

          <PlayerPicker label="Victim player" value={victimPlayerId} onChange={(v) => setVictimPlayerId(v)} />

          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontWeight: 800 }}>Cause</div>
            <select value={cause} onChange={(e) => setCause(e.target.value as InjuryCause)} style={{ padding: 12, borderRadius: 14, border: "1px solid #ddd" }}>
              {injuryCauses.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </label>

          {causesWithCauser.has(cause) && (
            <PlayerPicker label="Causer player" value={causerPlayerId} onChange={(v) => setCauserPlayerId(v)} />
          )}

          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontWeight: 800 }}>Injury result</div>
            <select
              value={injuryResult}
              onChange={(e) => setInjuryResult(e.target.value as InjuryResult)}
              style={{ padding: 12, borderRadius: 14, border: "1px solid #ddd" }}
            >
              {injuryResults.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </label>

          {injuryResult === "STAT" && (
            <label style={{ display: "grid", gap: 6 }}>
              <div style={{ fontWeight: 800 }}>Characteristic reduction</div>
              <select
                value={injuryStat}
                onChange={(e) => setInjuryStat(e.target.value as StatReduction)}
                style={{ padding: 12, borderRadius: 14, border: "1px solid #ddd" }}
              >
                {statReductions.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 800 }}>
            <input type="checkbox" checked={apoUsed} onChange={(e) => setApoUsed(e.target.checked)} />
            Apothecary used
          </label>

          {apoUsed && (
            <label style={{ display: "grid", gap: 6 }}>
              <div style={{ fontWeight: 800 }}>Apothecary outcome (optional)</div>
              <select
                value={apoOutcome}
                onChange={(e) => setApoOutcome(e.target.value as ApothecaryOutcome)}
                style={{ padding: 12, borderRadius: 14, border: "1px solid #ddd" }}
              >
                {apoOutcomes.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>
            </label>
          )}

          <BigButton
            label="Save Injury"
            onClick={doInjury}
            disabled={!victimPlayerId || (causesWithCauser.has(cause) && !causerPlayerId)}
          />
        </div>
      </Modal>

      <Modal open={exportOpen} title="Export" onClose={() => setExportOpen(false)}>
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ fontWeight: 800 }}>PDF</div>
          <BigButton
            label="Select MVP + Actions"
            onClick={() => {
              setExportOpen(false);
              setMvpOpen(true);
              setExportHint("");
            }}
          />

          <div style={{ fontWeight: 800, marginTop: 4 }}>TXT</div>
          <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))" }}>
            <BigButton label="Share" onClick={() => runExport("txt", "share")} secondary />
            <BigButton label="Download" onClick={() => runExport("txt", "download")} secondary />
          </div>

          <div style={{ fontWeight: 800, marginTop: 4 }}>JSON</div>
          <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))" }}>
            <BigButton label="Share" onClick={() => runExport("json", "share")} secondary />
            <BigButton label="Download" onClick={() => runExport("json", "download")} secondary />
          </div>
          {!canShareAnyFiles && <div style={{ fontSize: 13, opacity: 0.8 }}>Share may not be supported on this device; we'll download instead.</div>}
          {exportHint && <div style={{ fontSize: 13, opacity: 0.8 }}>{exportHint}</div>}
        </div>
      </Modal>

      <Modal open={mvpOpen} title="Select MVP (PDF only)" onClose={() => setMvpOpen(false)}>
        <div style={{ display: "grid", gap: 10 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontWeight: 800 }}>{d.teamNames.A} MVP</div>
            <select value={mvpA} onChange={(e) => setMvpA(e.target.value)} style={{ padding: 12, borderRadius: 14, border: "1px solid #ddd" }}>
              <option value="">— none —</option>
              {rosters.A.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontWeight: 800 }}>{d.teamNames.B} MVP</div>
            <select value={mvpB} onChange={(e) => setMvpB(e.target.value)} style={{ padding: 12, borderRadius: 14, border: "1px solid #ddd" }}>
              <option value="">— none —</option>
              {rosters.B.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>
          <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))" }}>
            <BigButton label="Share" onClick={() => runExport("pdf", "share", { A: mvpA || undefined, B: mvpB || undefined })} secondary />
            <BigButton label="Download" onClick={() => runExport("pdf", "download", { A: mvpA || undefined, B: mvpB || undefined })} secondary />
            <BigButton label="Print" onClick={() => runExport("pdf", "print", { A: mvpA || undefined, B: mvpB || undefined })} secondary />
          </div>
          {!canShareAnyFiles && <div style={{ fontSize: 13, opacity: 0.8 }}>Share may not be supported on this device; we'll download instead.</div>}
          {exportHint && <div style={{ fontSize: 13, opacity: 0.8 }}>{exportHint}</div>}
        </div>
      </Modal>
    </div>
  );
}
