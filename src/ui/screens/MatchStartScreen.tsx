import { useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useMatchStore } from "../../store/matchStore";
import { useAppStore } from "../../store/appStore";
import { BigButton } from "../components/Modal";
import { WEATHERS, INDUCEMENTS, PRAYERS, type Weather, type InducementKind, type TeamId } from "../../domain/enums";

const fmt = (x: string) => x.replaceAll("_", " ");

type InducementEntry = { team: TeamId; kind: InducementKind; detail?: string };

export function MatchStartScreen() {
  const events = useMatchStore((s) => s.events);
  const d = useMatchStore((s) => s.derived);
  const appendEvent = useMatchStore((s) => s.appendEvent);
  const resetAll = useMatchStore((s) => s.resetAll);
  const setScreen = useAppStore((s) => s.setScreen);

  const hasMatch = useMemo(() => events.some((e) => e.type === "match_start"), [events]);

  // Start form state (NEW: empty + placeholder)
  const [teamAName, setTeamAName] = useState("");
  const [teamBName, setTeamBName] = useState("");
  const [weather, setWeather] = useState<Weather>("nice");

  // Resources (NEW: all start at 0, with stepper buttons)
  const [ra, setRa] = useState(0);
  const [rb, setRb] = useState(0);
  const [aa, setAa] = useState(0);
  const [ab, setAb] = useState(0);

  // Inducements
  const [inducements, setInducements] = useState<InducementEntry[]>([]);
  const [indTeam, setIndTeam] = useState<TeamId>("A");
  const [indKind, setIndKind] = useState<InducementKind>("Wizard");
const [starPlayerName, setStarPlayerName] = useState("");
const [prayerPick, setPrayerPick] = useState<(typeof PRAYERS)[number]>(PRAYERS[0]);

function addInducement() {
  let detail: string | undefined = undefined;

  if (indKind === "Star Player") {
    const n = starPlayerName.trim();
    detail = n || undefined;
  } else if (indKind === "Prayers to Nuffle") {
    detail = prayerPick; // wir speichern Prayer im detail-Feld
  }

  setInducements((prev) => [...prev, { team: indTeam, kind: indKind, detail }]);

  // reset only the relevant field
  setStarPlayerName("");
}

  function removeInducement(idx: number) {
    setInducements((prev) => prev.filter((_, i) => i !== idx));
  }

  async function startNewMatch() {
    await resetAll();
    await appendEvent({
      type: "match_start",
      half: 1,
      turn: 1,
      payload: {
        teamAName,
        teamBName,
        weather,
        resources: {
          A: { rerolls: ra, apothecary: aa },
          B: { rerolls: rb, apothecary: ab },
        },
        inducements, // ✅ gespeichert
      },
    });
    setScreen("live");
  }

  async function newMatchResetOnly() {
    await resetAll();
  }

  return (
    <div style={{ padding: 12, maxWidth: 760, margin: "0 auto" }}>
      {/* Placeholder styling (leicht grau) */}
      <style>{`
        input::placeholder { color: #9aa0a6; font-weight: 600; }
      `}</style>

      <div style={{ fontWeight: 900, fontSize: 20 }}>BB Match Notes</div>

      {hasMatch && (
        <div style={{ marginTop: 12, padding: 12, borderRadius: 16, border: "1px solid #eee" }}>
          <div style={{ fontWeight: 900, fontSize: 16 }}>Resume</div>
          <div style={{ marginTop: 8, opacity: 0.8 }}>
            <div style={{ fontWeight: 800 }}>
              {d.teamNames.A} vs {d.teamNames.B}
            </div>
            <div>
              Score {d.score.A}:{d.score.B} · Half {d.half} · Turn {d.turn} · Weather {String(d.weather ?? "—")}
            </div>
          </div>

          <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
            <BigButton label="Continue match" onClick={() => setScreen("live")} />
            <BigButton label="New match (reset)" onClick={newMatchResetOnly} secondary />
          </div>
        </div>
      )}

      <div style={{ marginTop: 14, padding: 12, borderRadius: 16, border: "1px solid #eee" }}>
        <div style={{ fontWeight: 900, fontSize: 16 }}>Start new match</div>

        <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
          <Field label="Team A">
            <input
              data-testid="start-team-a-name"
              value={teamAName}
              onChange={(e) => setTeamAName(e.target.value)}
              style={inputStyle}
              placeholder="Teamnamen eintragen"
            />
          </Field>

          <Field label="Team B">
            <input
              data-testid="start-team-b-name"
              value={teamBName}
              onChange={(e) => setTeamBName(e.target.value)}
              style={inputStyle}
              placeholder="Teamnamen eintragen"
            />
          </Field>

          <Field label="Weather">
            <select value={weather} onChange={(e) => setWeather(e.target.value as Weather)} style={inputStyle}>
              {WEATHERS.map((w) => (
                <option key={w} value={w}>
                  {fmt(w)}
                </option>
              ))}
            </select>
          </Field>

          {/* Resources */}
          <div style={{ fontWeight: 900, marginTop: 6 }}>Resources (start)</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Box title={teamAName.trim() || "Team A"}>
              <StepperRow label="Rerolls" value={ra} setValue={setRa} />
              <StepperRow label="Apothecary" value={aa} setValue={setAa} />
            </Box>

            <Box title={teamBName.trim() || "Team B"}>
              <StepperRow label="Rerolls" value={rb} setValue={setRb} />
              <StepperRow label="Apothecary" value={ab} setValue={setAb} />
            </Box>
          </div>

          {/* NEW: visual separation */}
          <div style={{ borderTop: "1px solid #eee", marginTop: 14, paddingTop: 14 }} />

          {/* Inducements */}
          <div style={{ fontWeight: 900 }}>Inducements</div>
          <div style={{ display: "grid", gap: 8, padding: 12, borderRadius: 16, border: "1px solid #eee" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <div style={{ fontWeight: 800 }}>Team</div>
                <select value={indTeam} onChange={(e) => setIndTeam(e.target.value as TeamId)} style={inputStyle}>
                  <option value="A">{teamAName.trim() || "Team A"}</option>
                  <option value="B">{teamBName.trim() || "Team B"}</option>
                </select>
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <div style={{ fontWeight: 800 }}>Kind</div>
                <select value={indKind} onChange={(e) => setIndKind(e.target.value as InducementKind)} style={inputStyle}>
                  {INDUCEMENTS.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </label>
            </div>

{indKind === "Star Player" && (
  <label style={{ display: "grid", gap: 6 }}>
    <div style={{ fontWeight: 800 }}>Name Starplayer</div>
    <input
      value={starPlayerName}
      onChange={(e) => setStarPlayerName(e.target.value)}
      style={inputStyle}
      placeholder="z.B. Griff Oberwald"
    />
  </label>
)}

{indKind === "Prayers to Nuffle" && (
  <label style={{ display: "grid", gap: 6 }}>
    <div style={{ fontWeight: 800 }}>Prayer</div>
    <select
      value={prayerPick}
      onChange={(e) => setPrayerPick(e.target.value as any)}
      style={inputStyle}
    >
      {PRAYERS.map((p) => (
        <option key={p} value={p}>
          {String(p).replaceAll("_", " ")}
        </option>
      ))}
    </select>
  </label>
)}

<BigButton
  label="Add inducement"
  onClick={addInducement}
  secondary
  disabled={indKind === "Star Player" && !starPlayerName.trim()}
/>

            {inducements.length > 0 && (
              <div style={{ display: "grid", gap: 6 }}>
                {inducements.map((it, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      padding: 10,
                      borderRadius: 14,
                      border: "1px solid #f0f0f0",
                    }}
                  >
                    <div style={{ fontWeight: 800 }}>
                      {(it.team === "A" ? teamAName.trim() || "Team A" : teamBName.trim() || "Team B")}: {it.kind}
                      {it.detail ? ` — ${it.detail}` : ""}
                    </div>
                    <button
                      onClick={() => removeInducement(idx)}
                      style={{
                        padding: "8px 10px",
                        borderRadius: 12,
                        border: "1px solid #ddd",
                        background: "#fff",
                        fontWeight: 900,
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <BigButton label="Start" onClick={startNewMatch} testId="start-begin-match" />
        </div>
      </div>
    </div>
  );
}

function Field(props: { label: string; children: ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <div style={{ fontWeight: 800 }}>{props.label}</div>
      {props.children}
    </label>
  );
}

function Box(props: { title: string; children: ReactNode }) {
  return (
    <div style={{ border: "1px solid #eee", borderRadius: 16, padding: 10 }}>
      <div style={{ fontWeight: 900, marginBottom: 8 }}>{props.title}</div>
      <div style={{ display: "grid", gap: 10 }}>{props.children}</div>
    </div>
  );
}

function StepperRow(props: { label: string; value: number; setValue: (n: number) => void }) {
  const dec = () => props.setValue(Math.max(0, props.value - 1));
  const inc = () => props.setValue(props.value + 1);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 130px", gap: 8, alignItems: "center" }}>
      <div style={{ fontWeight: 800 }}>{props.label}</div>

      <div style={{ display: "grid", gridTemplateColumns: "44px 1fr 44px", gap: 6, alignItems: "center" }}>
        <button
          onClick={dec}
          disabled={props.value <= 0}
          style={{
            height: 44,
            borderRadius: 12,
            border: "1px solid #ddd",
            background: props.value <= 0 ? "#f5f5f5" : "#fff",
            fontWeight: 900,
            fontSize: 18,
            opacity: props.value <= 0 ? 0.6 : 1,
          }}
        >
          –
        </button>

        <div
          style={{
            height: 44,
            borderRadius: 12,
            border: "1px solid #ddd",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 900,
            fontSize: 16,
            background: "#fafafa",
          }}
        >
          {props.value}
        </div>

        <button
          onClick={inc}
          style={{
            height: 44,
            borderRadius: 12,
            border: "1px solid #ddd",
            background: "#fff",
            fontWeight: 900,
            fontSize: 18,
          }}
        >
          +
        </button>
      </div>
    </div>
  );
}

const inputStyle: CSSProperties = {
  padding: 12,
  borderRadius: 14,
  border: "1px solid #ddd",
  fontWeight: 800,
};
