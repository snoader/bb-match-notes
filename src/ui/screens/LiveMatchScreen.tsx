import { useMemo, useState } from "react";
import { useMatchStore, teamLabel } from "../../store/matchStore";
import { Modal, BigButton } from "../components/Modal";
import type { TeamId, PlayerSlot, Weather, KickoffResult } from "../../domain/enums";
import { computeStats, toStatsText, toTimelineText } from "../../export/export";
import { PlayerPicker } from "../components/PlayerPicker";
import { UseInducementModal } from "../components/UseInducementModal";
import { PrayerResultModal } from "../components/PrayerResultModal";

const kickoffResults: KickoffResult[] = [
  "get_the_ref",
  "riot",
  "perfect_defence",
  "high_kick",
  "cheering_fans",
  "changing_weather",
  "brilliant_coaching",
  "quick_snap",
  "blitz",
  "throw_a_rock",
  "pitch_invasion",
];

const weathers: Weather[] = ["nice", "very_sunny", "pouring_rain", "blizzard", "sweltering_heat"];

function formatKickoff(r: KickoffResult) {
  return r.replaceAll("_", " ");
}
function formatWeather(w: Weather) {
  return w.replaceAll("_", " ");
}

export function LiveMatchScreen() {
  const isReady = useMatchStore((s) => s.isReady);
  const events = useMatchStore((s) => s.events);
  const d = useMatchStore((s) => s.derived);
  const appendEvent = useMatchStore((s) => s.appendEvent);
  const undoLast = useMatchStore((s) => s.undoLast);

  const hasMatch = useMemo(() => events.some((e) => e.type === "match_start"), [events]);

  // TD modal
  const [tdOpen, setTdOpen] = useState(false);
  const [tdTeam, setTdTeam] = useState<TeamId>("A");
  const [tdPlayer, setTdPlayer] = useState<PlayerSlot | "">("");

  // After TD: kickoff prompt
  const [kickPromptOpen, setKickPromptOpen] = useState(false);

  // CAS modal
  const [casOpen, setCasOpen] = useState(false);
  const [casAttTeam, setCasAttTeam] = useState<TeamId>("A");
  const [casAttPlayer, setCasAttPlayer] = useState<PlayerSlot | "">("");
  const [casVicPlayer, setCasVicPlayer] = useState<PlayerSlot | "">("");
  const [casResult, setCasResult] = useState<"BH" | "SI" | "Dead">("BH");

  // Kickoff modal
  const [kickOpen, setKickOpen] = useState(false);
  const [kickResult, setKickResult] = useState<KickoffResult>("riot");

  // Weather modal
  const [weatherOpen, setWeatherOpen] = useState(false);
  const [weatherPick, setWeatherPick] = useState<Weather>("nice");

  // Export modal
  const [exportOpen, setExportOpen] = useState(false);

  // NEW: Inducement + Prayer modals
  const [indOpen, setIndOpen] = useState(false);
  const [prayerOpen, setPrayerOpen] = useState(false);

  const turnButtons = [1, 2, 3, 4, 5, 6, 7, 8];

  async function doTouchdown() {
    if (!tdPlayer) return;
    await appendEvent({
      type: "touchdown",
      team: tdTeam,
      payload: { player: tdPlayer },
    });
    setTdOpen(false);
    setKickPromptOpen(true);
  }

  async function doCasualty() {
    await appendEvent({
      type: "casualty",
      team: casAttTeam,
      payload: {
        attackerTeam: casAttTeam,
        attackerPlayer: casAttPlayer || undefined,
        victimPlayer: casVicPlayer || undefined,
        result: casResult,
      },
    });
    setCasOpen(false);
  }

  async function doKickoff() {
    await appendEvent({ type: "kickoff", payload: { result: kickResult } });
    setKickOpen(false);

    if (kickResult === "changing_weather") {
      setWeatherPick((d.weather as Weather) ?? "nice");
      setWeatherOpen(true);
    }
  }

  async function doWeatherSet() {
    await appendEvent({ type: "weather_set", payload: { weather: weatherPick } });
    setWeatherOpen(false);
  }

  async function doNextTurn() {
    await appendEvent({ type: "next_turn" });
  }

  async function setTurn(turn: number) {
    await appendEvent({ type: "turn_set", payload: { half: d.half, turn } });
  }

  async function useResource(team: TeamId, kind: "reroll" | "apothecary" | "bribe" | "mascot") {
    if (kind === "reroll") return appendEvent({ type: "reroll_used", team });
    if (kind === "apothecary") return appendEvent({ type: "apothecary_used", team });
    if (kind === "bribe") return appendEvent({ type: "bribe_used", team });

    // Mascot bleibt wie bisher (Legacy): inducement_used(kind:"Mascot")
    return appendEvent({ type: "inducement_used", team, payload: { kind: "Mascot" } });
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

  // Only bought inducements (projected from match_start.payload.inducements)
  const bought = d.inducementsBought ?? [];

  return (
    <div style={{ padding: 12, maxWidth: 760, margin: "0 auto" }}>
      {/* Header */}
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

      {/* Scoreboard */}
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

      {/* Half / Turn */}
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

      {/* Resources */}
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
                  { k: "bribe" as const, label: `Bribes (${d.resources[team].bribes})` },
                  { k: "mascot" as const, label: `Mascot (${d.resources[team].mascot})` },
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

      {/* Turn tracker */}
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

      {/* Action buttons */}
      <div style={{ marginTop: 10, padding: 12, borderRadius: 16, border: "1px solid #eee" }}>
        <div style={{ fontWeight: 900, marginBottom: 8 }}>Actions</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
          <BigButton label="Touchdown" onClick={() => setTdOpen(true)} disabled={!hasMatch} />
          <BigButton label="Casualty" onClick={() => setCasOpen(true)} disabled={!hasMatch} />
          <BigButton label="Kickoff" onClick={() => setKickOpen(true)} disabled={!hasMatch} secondary />
          <BigButton label="KO" onClick={() => appendEvent({ type: "ko" })} disabled={!hasMatch} secondary />
          <BigButton label="Foul" onClick={() => appendEvent({ type: "foul" })} disabled={!hasMatch} secondary />
          <BigButton label="Turnover" onClick={() => appendEvent({ type: "turnover" })} disabled={!hasMatch} secondary />

          <BigButton
            label="Inducement"
            onClick={() => setIndOpen(true)}
            disabled={!hasMatch || bought.length === 0}
            secondary
          />
          <BigButton label="Prayer" onClick={() => setPrayerOpen(true)} disabled={!hasMatch} secondary />
        </div>

        {hasMatch && bought.length === 0 && (
          <div style={{ marginTop: 8, opacity: 0.7, fontSize: 13 }}>No bought inducements recorded in match_start.</div>
        )}
      </div>

      {/* Recent events */}
      <div style={{ marginTop: 10, padding: 12, borderRadius: 16, border: "1px solid #eee" }}>
        <div style={{ fontWeight: 900, marginBottom: 8 }}>Recent</div>
        <div style={{ display: "grid", gap: 8 }}>
          {[...events].slice(-12).reverse().map((e) => (
            <div key={e.id} style={{ padding: 10, borderRadius: 14, border: "1px solid #f0f0f0" }}>
              <div style={{ fontWeight: 900 }}>
                {e.type} {e.team ? `· ${teamLabel(e.team, d.teamNames)}` : ""} · H{e.half} T{e.turn}
              </div>
              {e.payload && (
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
              )}
            </div>
          ))}
          {!events.length && <div style={{ opacity: 0.7 }}>No events yet.</div>}
        </div>
      </div>

      {/* Use Inducement Modal */}
      <UseInducementModal
        open={indOpen}
        onClose={() => setIndOpen(false)}
        teamNames={d.teamNames}
        bought={bought}
        onSave={async ({ team, kind, detail }) => {
          await appendEvent({
            type: "inducement_used",
            team,
            payload: { kind, detail: detail || undefined },
          });
          setIndOpen(false);
        }}
      />

      {/* Prayer Result Modal */}
      <PrayerResultModal
        open={prayerOpen}
        onClose={() => setPrayerOpen(false)}
        teamNames={d.teamNames}
        onSave={async ({ team, result }) => {
          await appendEvent({
            type: "prayer_result",
            team,
            payload: { result },
          });
          setPrayerOpen(false);
        }}
      />

      {/* TD modal */}
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

      {/* Kickoff prompt */}
      <Modal open={kickPromptOpen} title="Record kickoff?" onClose={() => setKickPromptOpen(false)}>
        <div style={{ display: "grid", gap: 10 }}>
          <BigButton
            label="Yes"
            onClick={() => {
              setKickPromptOpen(false);
              setKickOpen(true);
            }}
          />
          <BigButton label="Skip" onClick={() => setKickPromptOpen(false)} secondary />
        </div>
      </Modal>

      {/* CAS modal */}
      <Modal open={casOpen} title="Casualty" onClose={() => setCasOpen(false)}>
        <div style={{ display: "grid", gap: 10 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontWeight: 800 }}>Attacker team</div>
            <select
              value={casAttTeam}
              onChange={(e) => setCasAttTeam(e.target.value as TeamId)}
              style={{ padding: 12, borderRadius: 14, border: "1px solid #ddd" }}
            >
              <option value="A">{d.teamNames.A}</option>
              <option value="B">{d.teamNames.B}</option>
            </select>
          </label>

          <PlayerPicker
            label="Attacker player (optional)"
            value={casAttPlayer}
            onChange={(v) => setCasAttPlayer(v)}
            allowEmpty
            onClear={() => setCasAttPlayer("")}
          />

          <PlayerPicker
            label="Victim player (optional)"
            value={casVicPlayer}
            onChange={(v) => setCasVicPlayer(v)}
            allowEmpty
            onClear={() => setCasVicPlayer("")}
          />

          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontWeight: 800 }}>Result</div>
            <select
              value={casResult}
              onChange={(e) => setCasResult(e.target.value as any)}
              style={{ padding: 12, borderRadius: 14, border: "1px solid #ddd" }}
            >
              <option value="BH">BH</option>
              <option value="SI">SI</option>
              <option value="Dead">Dead</option>
            </select>
          </label>

          <BigButton label="Save CAS" onClick={doCasualty} />
        </div>
      </Modal>

      {/* Kickoff modal */}
      <Modal open={kickOpen} title="Kickoff" onClose={() => setKickOpen(false)}>
        <div style={{ display: "grid", gap: 10 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontWeight: 800 }}>Result</div>
            <select
              value={kickResult}
              onChange={(e) => setKickResult(e.target.value as KickoffResult)}
              style={{ padding: 12, borderRadius: 14, border: "1px solid #ddd" }}
            >
              {kickoffResults.map((r) => (
                <option key={r} value={r}>
                  {formatKickoff(r)}
                </option>
              ))}
            </select>
          </label>

          <BigButton label="Save kickoff" onClick={doKickoff} />
        </div>
      </Modal>

      {/* Weather modal */}
      <Modal open={weatherOpen} title="Weather" onClose={() => setWeatherOpen(false)}>
        <div style={{ display: "grid", gap: 10 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontWeight: 800 }}>Set weather</div>
            <select
              value={weatherPick}
              onChange={(e) => setWeatherPick(e.target.value as Weather)}
              style={{ padding: 12, borderRadius: 14, border: "1px solid #ddd" }}
            >
              {weathers.map((w) => (
                <option key={w} value={w}>
                  {formatWeather(w)}
                </option>
              ))}
            </select>
          </label>

          <BigButton label="Save weather" onClick={doWeatherSet} />
        </div>
      </Modal>

      {/* Export modal */}
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
