import { useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useMatchStore } from "../../store/matchStore";
import { useAppStore } from "../../store/appStore";
import { BigButton } from "../components/Modal";
import { Stepper } from "../components/Stepper";
import { INDUCEMENTS, PRAYERS, labelPrayer, type InducementKind, type TeamId, isInducementAllowed } from "../../domain/enums";
import { WEATHER_OPTIONS, type Weather } from "../../domain/weather";
import { displayTurn } from "../formatters/turnDisplay";
import { weatherLabel } from "../formatters/labels";
import { labelInducement } from "../../domain/labels";


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
  const [weather, setWeather] = useState<Weather | "">("");
  const [showValidationErrors, setShowValidationErrors] = useState(false);

  // Resources (NEW: all start at 0, with stepper buttons)
  const [ra, setRa] = useState(0);
  const [rb, setRb] = useState(0);
  const [aa, setAa] = useState(0);
  const [ab, setAb] = useState(0);

  // Inducements
  const [inducements, setInducements] = useState<InducementEntry[]>([]);
  const [indTeam, setIndTeam] = useState<TeamId>("A");
  const [indKind, setIndKind] = useState<InducementKind | "">("");
  const [starPlayerName, setStarPlayerName] = useState("");
  const [prayerPick, setPrayerPick] = useState<(typeof PRAYERS)[number]>(PRAYERS[0]);
  const [indDetails, setIndDetails] = useState("");

  const variablePriceKinds: InducementKind[] = ["Biased Referee", "Infamous Coaching Staff", "Mercenary Players", "Star Players"];

  const inducementDetailPlaceholder: Partial<Record<InducementKind, string>> = {
    "Biased Referee": "e.g. referee name",
    "Mercenary Players": "e.g. Orc Lineman",
    "Star Players": "e.g. Griff Oberwald",
    "Infamous Coaching Staff": "e.g. Josef Bugman",
  };

  function addInducement() {
  if (indKind === "") return;

  let detail: string | undefined = undefined;

  if (indKind === "Star Players") {
    const n = starPlayerName.trim();
    detail = n || undefined;
  } else if (indKind === "Prayers to Nuffle") {
    detail = prayerPick;
  } else if (variablePriceKinds.includes(indKind)) {
    detail = indDetails.trim() || undefined;
  }

  setInducements((prev) => [...prev, { team: indTeam, kind: indKind as InducementKind, detail }]);

  setStarPlayerName("");
  setIndDetails("");
  setIndKind("");
}

  function removeInducement(idx: number) {
    setInducements((prev) => prev.filter((_, i) => i !== idx));
  }

  const teamANameTrimmed = teamAName.trim();
  const teamBNameTrimmed = teamBName.trim();
  const isTeamAValid = teamANameTrimmed.length > 0;
  const isTeamBValid = teamBNameTrimmed.length > 0;
  const isWeatherValid = weather !== "";
  const isInducementValid = indKind !== "";
  const isStarPlayerValid = indKind !== "Star Players" || !!starPlayerName.trim();
  const isStartFormValid = isTeamAValid && isTeamBValid && isWeatherValid;

  async function handleStartMatch() {
    if (!isStartFormValid) {
      setShowValidationErrors(true);
      return;
    }

    await startNewMatch();
  }

  async function startNewMatch() {
    await resetAll();
    await appendEvent({
      type: "match_start",
      half: 1,
      turn: 1,
      payload: {
        teamAName: teamANameTrimmed,
        teamBName: teamBNameTrimmed,
        weather: weather as Weather,
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
        input::placeholder { color: var(--color-input-placeholder); font-weight: 600; }
      `}</style>


      {hasMatch && (
        <div style={{ marginTop: 12, padding: 12, borderRadius: 16, border: "1px solid var(--color-border-soft)" }}>
          <div style={{ fontWeight: 900, fontSize: 16 }}>Resume</div>
          <div style={{ marginTop: 8, opacity: 0.8 }}>
            <div style={{ fontWeight: 800 }}>
              {d.teamNames.A} vs {d.teamNames.B}
            </div>
            <div>
              Score {d.score.A}:{d.score.B} · Half {d.half} · Turn {displayTurn(d.half, d.turn)} · Weather {weatherLabel(d.weather)}
            </div>
          </div>

          <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
            <BigButton label="Continue match" onClick={() => setScreen("live")} />
            <BigButton label="New match (reset)" onClick={newMatchResetOnly} secondary />
          </div>
        </div>
      )}

      <div style={{ marginTop: 14, padding: 12, borderRadius: 16, border: "1px solid var(--color-border-soft)" }}>
        <div style={{ fontWeight: 900, fontSize: 16 }}>Start new match</div>

        <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
          <Field label="Team A">
            <input
              value={teamAName}
              onChange={(e) => setTeamAName(e.target.value)}
              style={inputStyle}
              placeholder="Enter team name"
            />
            {showValidationErrors && !isTeamAValid && <FieldError text="Team A name is required." />}
          </Field>

          <Field label="Team B">
            <input
              value={teamBName}
              onChange={(e) => setTeamBName(e.target.value)}
              style={inputStyle}
              placeholder="Enter team name"
            />
            {showValidationErrors && !isTeamBValid && <FieldError text="Team B name is required." />}
          </Field>

          <Field label="Weather">
            <select value={weather} onChange={(e) => setWeather(e.target.value as Weather | "")} style={inputStyle}>
              <option value="">Select weather</option>
              {WEATHER_OPTIONS.map((w) => (
                <option key={w} value={w}>
                  {weatherLabel(w)}
                </option>
              ))}
            </select>
            {showValidationErrors && !isWeatherValid && <FieldError text="Weather is required." />}
          </Field>

          {/* Resources */}
          <div style={{ fontWeight: 900, marginTop: 6 }}>Resources (start)</div>
          <div className="start-resource-grid" style={{ display: "grid", gap: 10 }}>
            <Box title={teamAName.trim() || "Team A"}>
              <Stepper label="Rerolls" value={ra} onChange={setRa} testId="team-a-rerolls" />
              <Stepper label="Apothecary" value={aa} onChange={setAa} testId="team-a-apothecary" />
            </Box>

            <Box title={teamBName.trim() || "Team B"}>
              <Stepper label="Rerolls" value={rb} onChange={setRb} testId="team-b-rerolls" />
              <Stepper label="Apothecary" value={ab} onChange={setAb} testId="team-b-apothecary" />
            </Box>
          </div>

          {/* NEW: visual separation */}
          <div style={{ borderTop: "1px solid var(--color-border-soft)", marginTop: 14, paddingTop: 14 }} />

          {/* Inducements */}
          <div style={{ fontWeight: 900 }}>Inducements</div>
          <div style={{ display: "grid", gap: 8, padding: 12, borderRadius: 16, border: "1px solid var(--color-border-soft)" }}>
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
                <select value={indKind} onChange={(e) => setIndKind(e.target.value as InducementKind | "")} style={inputStyle}>
                  <option value="">Please select</option>
                  {INDUCEMENTS.map((k) => (
                    <option key={k} value={k}>
                      {labelInducement(k)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

{indKind === "Star Players" && (
  <label style={{ display: "grid", gap: 6 }}>
    <div style={{ fontWeight: 800 }}>Star player name</div>
    <input
      value={starPlayerName}
      onChange={(e) => setStarPlayerName(e.target.value)}
      style={inputStyle}
      placeholder="e.g. Griff Oberwald"
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
          {labelPrayer(p)}
        </option>
      ))}
    </select>
  </label>
)}


{variablePriceKinds.includes(indKind as InducementKind) && indKind !== "Star Players" && (
  <label style={{ display: "grid", gap: 6 }}>
    <div style={{ fontWeight: 800 }}>Details (optional)</div>
    <input
      value={indDetails}
      onChange={(e) => setIndDetails(e.target.value)}
      style={inputStyle}
      placeholder={inducementDetailPlaceholder[indKind as InducementKind] ?? "Optional details"}
    />
  </label>
)}

{isInducementValid && isInducementAllowed(indKind as InducementKind) && (
  <div style={{ fontSize: 13, color: "var(--color-text-muted)", fontWeight: 700 }}>
    {isInducementAllowed(indKind as InducementKind)}
  </div>
)}

<BigButton
  label="Add inducement"
  onClick={addInducement}
  secondary
  disabled={!isInducementValid || !isStarPlayerValid}
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
                      border: "1px solid var(--color-border-muted)",
                    }}
                  >
                    <div style={{ fontWeight: 800 }}>
                      {(it.team === "A" ? teamAName.trim() || "Team A" : teamBName.trim() || "Team B")}: {labelInducement(it.kind)}
                      {it.detail ? ` — ${it.detail}` : ""}
                    </div>
                    <button
                      onClick={() => removeInducement(idx)}
                      style={{
                        padding: "8px 10px",
                        borderRadius: 12,
                        border: "1px solid var(--color-border)",
                        background: "var(--color-surface)",
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

          <div
            onPointerDownCapture={() => {
              if (!isStartFormValid) setShowValidationErrors(true);
            }}
          >
            <BigButton label="Start match" onClick={handleStartMatch} disabled={!isStartFormValid} />
          </div>
        </div>
      </div>
    </div>
  );
}

function FieldError(props: { text: string }) {
  return <div style={{ color: "var(--color-danger-border)", fontWeight: 700, fontSize: 13 }}>{props.text}</div>;
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
    <div style={{ border: "1px solid var(--color-border-soft)", borderRadius: 16, padding: 10 }}>
      <div style={{ fontWeight: 900, marginBottom: 8 }}>{props.title}</div>
      <div style={{ display: "grid", gap: 10 }}>{props.children}</div>
    </div>
  );
}

const inputStyle: CSSProperties = {
  padding: 12,
  borderRadius: 14,
  border: "1px solid var(--color-input-border)",
  background: "var(--color-input-bg)",
  color: "var(--color-input-text)",
  fontWeight: 800,
  background: "var(--input-bg)",
  color: "var(--input-text)",
};
