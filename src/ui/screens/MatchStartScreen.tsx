import React, { useMemo, useState } from "react";
import { useMatchStore } from "../../store/matchStore";
import { useAppStore } from "../../store/appStore";
import { BigButton } from "../components/Modal";
import {
  WEATHERS,
  INDUCEMENTS,
  type Weather,
  type InducementKind,
  type TeamId,
} from "../../domain/enums";

const fmt = (x: string) => x.replaceAll("_", " ");

type InducementEntry = { team: TeamId; kind: InducementKind; detail?: string };

export function MatchStartScreen() {
  const events = useMatchStore((s) => s.events);
  const d = useMatchStore((s) => s.derived);
  const appendEvent = useMatchStore((s) => s.appendEvent);
  const resetAll = useMatchStore((s) => s.resetAll);
  const setScreen = useAppStore((s) => s.setScreen);

  const hasMatch = useMemo(() => events.some((e) => e.type === "match_start"), [events]);

  // Start form state
  const [teamAName, setTeamAName] = useState("Team A");
  const [teamBName, setTeamBName] = useState("Team B");
  const [weather, setWeather] = useState<Weather>("nice");

  // Resources
  const [ra, setRa] = useState(3);
  const [rb, setRb] = useState(3);
  const [aa, setAa] = useState(1);
  const [ab, setAb] = useState(1);
  const [ba, setBa] = useState(0);
  const [bb, setBb] = useState(0);
  const [ma, setMa] = useState(0);
  const [mb, setMb] = useState(0);

  // Inducements
  const [inducements, setInducements] = useState<InducementEntry[]>([]);
  const [indTeam, setIndTeam] = useState<TeamId>("A");
  const [indKind, setIndKind] = useState<InducementKind>("Wizard");
  const [indDetail, setIndDetail] = useState("");

  function addInducement() {
    const detail = indDetail.trim() || undefined;
    setInducements((prev) => [...prev, { team: indTeam, kind: indKind, detail }]);
    setIndDetail("");
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
          A: { rerolls: ra, apothecary: aa, bribes: ba, mascot: ma },
          B: { rerolls: rb, apothecary: ab, bribes: bb, mascot: mb },
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
      <div style={{ fontWeight: 900, fontSize: 20 }}>BB Match Notes</div>

      {hasMatch && (
        <div style={{ marginTop: 12, padding: 12, borderRadius: 16, border: "1px solid #eee" }}>
          <div style={{ fontWeight: 900, fontSize: 16 }}>Resume</div>
          <div style={{ marginTop: 8, opacity: 0.8 }}>
            <div style={{ fontWeight: 800 }}>
              {d.teamNames.A} vs {d.teamNames.B}
            </div>
            <div>
              Score {d.score.A}:{d.score.B} · Half {d.half} · Turn {d.turn} · Weather{" "}
              {String(d.weather ?? "—")}
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
            <input value={teamAName} onChange={(e) => setTeamAName(e.target.value)} style={inputStyle} />
          </Field>

          <Field label="Team B">
            <input value={teamBName} onChange={(e) => setTeamBName(e.target.value)} style={inputStyle} />
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

          <div style={{ fontWeight: 900, marginTop: 6 }}>Resources (start)</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Box title={teamAName || "Team A"}>
              <NumRow label="Rerolls" value={ra} setValue={setRa} />
              <NumRow label="Apothecary" value={aa} setValue={setAa} />
              <NumRow label="Bribes" value={ba} setValue={setBa} />
              <NumRow label="Mascot" value={ma} setValue={setMa} />
            </Box>
            <Box title={teamBName || "Team B"}>
              <NumRow label="Rerolls" value={rb} setValue={setRb} />
              <NumRow label="Apothecary" value={ab} setValue={setAb} />
              <NumRow label="Bribes" value={bb} setValue={setBb} />
              <NumRow label="Mascot" value={mb} setValue={setMb} />
            </Box>
          </div>

          <div style={{ fontWeight: 900, marginTop: 10 }}>Inducements</div>
          <div style={{ display: "grid", gap: 8, padding: 10, borderRadius: 16, border: "1px solid #eee" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <div style={{ fontWeight: 800 }}>Team</div>
                <select value={indTeam} onChange={(e) => setIndTeam(e.target.value as TeamId)} style={inputStyle}>
                  <option value="A">{teamAName || "Team A"}</option>
                  <option value="B">{teamBName || "Team B"}</option>
                </select>
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <div style={{ fontWeight: 800 }}>Kind</div>
                <select
                  value={indKind}
                  onChange={(e) => setIndKind(e.target.value as InducementKind)}
                  style={inputStyle}
                >
                  {INDUCEMENTS.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label style={{ display: "grid", gap: 6 }}>
              <div style={{ fontWeight: 800 }}>Detail (optional)</div>
              <input
                value={indDetail}
                onChange={(e) => setIndDetail(e.target.value)}
                style={inputStyle}
                placeholder="e.g. Griff Oberwald"
              />
            </label>

            <BigButton label="Add inducement" onClick={addInducement} secondary />

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
                      {(it.team === "A" ? teamAName || "Team A" : teamBName || "Team B")}: {it.kind}
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

          <BigButton label="Start" onClick={startNewMatch} />
        </div>
      </div>
    </div>
  );
}

function Field(props: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <div style={{ fontWeight: 800 }}>{props.label}</div>
      {props.children}
    </label>
  );
}

function Box(props: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ border: "1px solid #eee", borderRadius: 16, padding: 10 }}>
      <div style={{ fontWeight: 900, marginBottom: 8 }}>{props.title}</div>
      <div style={{ display: "grid", gap: 8 }}>{props.children}</div>
    </div>
  );
}

function NumRow(props: { label: string; value: number; setValue: (n: number) => void }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 90px", gap: 8, alignItems: "center" }}>
      <div style={{ fontWeight: 800 }}>{props.label}</div>
      <input
        type="number"
        inputMode="numeric"
        value={props.value}
        onChange={(e) => props.setValue(Number(e.target.value))}
        style={inputStyle}
      />
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: 12,
  borderRadius: 14,
  border: "1px solid #ddd",
  fontWeight: 800,
};
