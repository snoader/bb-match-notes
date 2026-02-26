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
import { computeStats, toStatsText, toTimelineText } from "../../export/export";
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

  const turnButtons = [1, 2, 3, 4, 5, 6, 7, 8];

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

  function download(filename: string, text: string, mime = "text/plain") {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportPlainText() {
    const lines = events.map((e) => {
      const t = new Date(e.createdAt).toLocaleTimeString();
      const base = `[${t}] H${e.half} T${e.turn} ${e.type}`;
      const team = e.team ? ` ${teamLabel(e.team, d.teamNames)}` : "";
      const extra = e.payload ? ` ${JSON.stringify(e.payload)}` : "";
      return base + team + extra;
    });
    download("bb-match-notes-raw.txt", lines.join("\n"), "text/plain");
  }

  function exportJSON() {
    download("bb-match-notes.json", JSON.stringify({ events }, null, 2), "application/json");
  }

  const stats = useMemo(() => computeStats(events), [events]);

  function exportTimeline() {
    const text = toTimelineText(events, d.teamNames);
    download("bb-timeline.txt", text, "text/plain");
  }

  function exportStats() {
    const text = toStatsText(stats, d.teamNames);
    download("bb-stats.txt", text, "text/plain");
  }

  function escapeHtml(s: string) {
    return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  }

  function buildReportHtml() {
    const statsText = toStatsText(stats, d.teamNames);
    const timelineText = toTimelineText(events, d.teamNames);
    const title = `BB Match Notes — ${d.teamNames.A} vs ${d.teamNames.B}`;

    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial; margin: 24px; }
    h1 { margin: 0 0 6px 0; font-size: 20px; }
    h2 { margin: 18px 0 8px 0; font-size: 16px; }
    .meta { color: #444; margin-bottom: 16px; }
    pre { white-space: pre-wrap; border: 1px solid #ddd; border-radius: 12px; padding: 12px; }
    @media print { body { margin: 12mm; } }
  </style>
</head>
<body>
  <h1>${escapeHtml(d.teamNames.A)} vs ${escapeHtml(d.teamNames.B)}</h1>
  <div class="meta">Half ${d.half} · Turn ${d.turn} · Weather: ${escapeHtml(String(d.weather ?? "—"))}</div>

  <h2>Statistics</h2>
  <pre>${escapeHtml(statsText)}</pre>

  <h2>Timeline</h2>
  <pre>${escapeHtml(timelineText)}</pre>
</body>
</html>`;
  }

  function exportPDF() {
    const w = window.open("", "_blank");
    if (!w) {
      alert("Popup blocked. Please allow popups for PDF export.");
      return;
    }
    w.document.open();
    w.document.write(buildReportHtml());
    w.document.close();
    w.focus();
    w.print();
  }

  if (!isReady) return <div style={{ padding: 12, opacity: 0.7 }}>Loading…</div>;

  return (
    <div style={{ padding: 12, maxWidth: 760, margin: "0 auto" }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontWeight: 800, fontSize: 18 }}>BB Match Notes</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setExportOpen(true)}
            style={{ padding: "10px 12px", borderRadius: 14, border: "1px solid #ddd", background: "#fafafa", fontWeight: 700 }}
            disabled={!events.length}
          >
            Export
          </button>
          <button
            onClick={undoLast}
            style={{ padding: "10px 12px", borderRadius: 14, border: "1px solid #ddd", background: "#fff", fontWeight: 700 }}
            disabled={!events.length}
          >
            Undo
          </button>
        </div>
      </div>

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 80px 1fr", gap: 8, alignItems: "center" }}>
        <div style={{ padding: 12, borderRadius: 16, border: "1px solid #eee" }}>
          <div style={{ fontWeight: 800 }}>{d.teamNames.A}</div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>{d.score.A}</div>
        </div>

        <div style={{ textAlign: "center", fontWeight: 900, fontSize: 20 }}>:</div>

        <div style={{ padding: 12, borderRadius: 16, border: "1px solid #eee", textAlign: "right" }}>
          <div style={{ fontWeight: 800 }}>{d.teamNames.B}</div>
          <div style={{ fontSize: 28, fontWeight: 900 }}>{d.score.B}</div>
        </div>
      </div>

      <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ padding: "10px 12px", borderRadius: 16, border: "1px solid #eee", fontWeight: 800 }}>
          Half {d.half} · Turn {d.turn} · Weather: {d.weather ?? "—"}
        </div>
      </div>

      {!hasMatch && (
        <div style={{ marginTop: 10, padding: 12, borderRadius: 16, border: "1px solid #eee", opacity: 0.8 }}>
          No active match found. Start or resume a match from the Start screen.
        </div>
      )}

      <div style={{ marginTop: 10, padding: 12, borderRadius: 16, border: "1px solid #eee" }}>
        <div style={{ fontWeight: 900, marginBottom: 8 }}>Resources</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {(["A", "B"] as TeamId[]).map((team) => (
            <div key={team} style={{ border: "1px solid #f0f0f0", borderRadius: 14, padding: 10 }}>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>{teamLabel(team, d.teamNames)}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
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

      <div style={{ marginTop: 10, padding: 12, borderRadius: 16, border: "1px solid #eee" }}>
        <div style={{ fontWeight: 900, marginBottom: 8 }}>Turn Tracker</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 6 }}>
          {turnButtons.map((t) => (
            <button
              key={t}
              onClick={() => setTurn(t)}
              disabled={!hasMatch}
              style={{
                padding: "12px 0",
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

      <div style={{ marginTop: 10, padding: 12, borderRadius: 16, border: "1px solid #eee" }}>
        <div style={{ fontWeight: 900, marginBottom: 8 }}>Actions</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
          <BigButton label="Touchdown" onClick={() => setTdOpen(true)} disabled={!hasMatch} />
          <BigButton label="Completion" onClick={() => setCompletionOpen(true)} disabled={!hasMatch} />
          <BigButton label="Interception" onClick={() => setInterceptionOpen(true)} disabled={!hasMatch} />
          <BigButton label="Injury" onClick={() => setInjuryOpen(true)} disabled={!hasMatch} />
        </div>
      </div>

      <div style={{ marginTop: 10, padding: 12, borderRadius: 16, border: "1px solid #eee" }}>
        <div style={{ fontWeight: 900, marginBottom: 8 }}>Recent</div>
        <div style={{ display: "grid", gap: 8 }}>
          {[...events].slice(-12).reverse().map((e) => {
            const injuryText =
              e.type === "injury"
                ? (() => {
                    const p = normalizeInjuryPayload(e.payload);
                    return `Victim ${String(p.victimPlayerId ?? p.victimName ?? "?")} · ${p.injuryResult}${p.stat ? `(${p.stat})` : ""} · ${p.cause} · Apo ${p.apothecaryUsed ? "Yes" : "No"}`;
                  })()
                : "";

            return (
              <div key={e.id} style={{ padding: 10, borderRadius: 14, border: "1px solid #f0f0f0" }}>
                <div style={{ fontWeight: 900 }}>
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
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <button
              onClick={() => setTdTeam("A")}
              style={{
                padding: "12px 10px",
                borderRadius: 14,
                border: tdTeam === "A" ? "1px solid #111" : "1px solid #ddd",
                background: tdTeam === "A" ? "#111" : "#fafafa",
                color: tdTeam === "A" ? "white" : "#111",
                fontWeight: 900,
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
          <BigButton label="PDF (Print / Save as PDF)" onClick={exportPDF} />
          <BigButton label="Timeline (txt)" onClick={exportTimeline} secondary />
          <BigButton label="Statistics (txt)" onClick={exportStats} secondary />
          <BigButton label="JSON" onClick={exportJSON} secondary />
          <BigButton label="Raw Log (txt)" onClick={exportPlainText} secondary />
        </div>
      </Modal>
    </div>
  );
}
