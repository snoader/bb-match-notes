import { useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { THEMED_INPUT_STYLE } from "../styles/formStyles";
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
  const [aa, setAa] = useState(false);
  const [ab, setAb] = useState(false);
  const [efa, setEfa] = useState(0);
  const [efb, setEfb] = useState(0);
  const [fra, setFra] = useState(1);
  const [frb, setFrb] = useState(1);

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
  const canAddInducement = isInducementValid && isStarPlayerValid;
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
          A: { rerolls: ra, hasApothecary: aa },
          B: { rerolls: rb, hasApothecary: ab },
        },
        fans: {
          A: { existingFans: efa, fansRoll: fra },
          B: { existingFans: efb, fansRoll: frb },
        },
        inducements,
      },
    });
    setScreen("live");
  }

  async function newMatchResetOnly() {
    await resetAll();
  }

  return (
    <div style={{ padding: 12, maxWidth: 760, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
      {hasMatch && (
        <div style={{ marginTop: 12, padding: 12, borderRadius: 16, border: "1px solid var(--border)", background: "var(--surface)" }}>
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

      <div style={{ marginTop: 14, padding: 12, borderRadius: 16, border: "1px solid var(--border)", background: "var(--surface)" }}>
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
          <div style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 700 }}>
            Winnings delta setup: capture Dedicated Fans and Fans Roll per team (no starting treasury).
          </div>
          <div className="start-resource-grid" style={{ display: "grid", gap: 10 }}>
            <Box title={teamAName.trim() || "Team A"}>
              <Stepper label="Rerolls" value={ra} onChange={setRa} testId="team-a-rerolls" />
              <BooleanChoice label="Apothecary" value={aa} onChange={setAa} testId="team-a-apothecary" />
              <FansGroup existingFans={efa} onExistingFansChange={setEfa} fansRoll={fra} onFansRollChange={setFra} testIdPrefix="team-a" />
            </Box>

            <Box title={teamBName.trim() || "Team B"}>
              <Stepper label="Rerolls" value={rb} onChange={setRb} testId="team-b-rerolls" />
              <BooleanChoice label="Apothecary" value={ab} onChange={setAb} testId="team-b-apothecary" />
              <FansGroup existingFans={efb} onExistingFansChange={setEfb} fansRoll={frb} onFansRollChange={setFrb} testIdPrefix="team-b" />
            </Box>
          </div>

          {/* NEW: visual separation */}
          <div style={{ borderTop: "1px solid var(--divider)", marginTop: 14, paddingTop: 14 }} />

          {/* Inducements */}
          <div className="start-screen-section-heading">Inducements</div>
          <div className="start-screen-section-card">
            <div className="start-inducement-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
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
  <div style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 700 }}>
    {isInducementAllowed(indKind as InducementKind)}
  </div>
)}

<div
  style={{
    display: "grid",
    gap: 8,
    paddingTop: 4,
    borderTop: "1px solid var(--divider)",
  }}
>
  <div style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 700 }}>Add optional inducements before you start the match.</div>
  <div className="start-screen-secondary-cta" style={{ marginTop: 4 }}>
    <BigButton
      label="Add inducement"
      onClick={addInducement}
      secondary
      disabled={!canAddInducement}
    />
  </div>
</div>

            {inducements.length > 0 && (
              <div style={{ display: "grid", gap: 6, minWidth: 0 }}>
                {inducements.map((it, idx) => (
                  <div
                    key={idx}
                    className="start-inducement-row"
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: 10,
                      padding: 10,
                      borderRadius: 14,
                      border: "1px solid var(--border)", background: "var(--surface-2)",
                    }}
                  >
                    <div style={{ fontWeight: 800, minWidth: 0, overflowWrap: "anywhere", flex: "1 1 220px" }}>
                      {(it.team === "A" ? teamAName.trim() || "Team A" : teamBName.trim() || "Team B")}: {labelInducement(it.kind)}
                      {it.detail ? ` — ${it.detail}` : ""}
                    </div>
                    <button
                      onClick={() => removeInducement(idx)}
                      style={{
                        padding: "8px 10px",
                        borderRadius: 12,
                        width: "100%",
                        maxWidth: 120,
                        border: "1px solid var(--btn-border)",
                        background: "var(--btn-bg)", color: "var(--btn-text)",
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
            className="start-screen-primary-cta"
            style={{
              display: "grid",
              gap: 10,
              marginTop: 18,
              paddingTop: 18,
              borderTop: "1px solid var(--divider)",
            }}
            onPointerDownCapture={() => {
              if (!isStartFormValid) setShowValidationErrors(true);
            }}
          >
            <div style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 700 }}>When everything is set, start the match with the primary action below.</div>
            <BigButton
              label="▶ START MATCH"
              onClick={handleStartMatch}
              disabled={!isStartFormValid}
              className="start-match-button"
              style={{
                minHeight: 56,
                letterSpacing: "0.08em",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function FieldError(props: { text: string }) {
  return <div style={{ color: "var(--danger)", fontWeight: 700, fontSize: 13 }}>{props.text}</div>;
}

function Field(props: { label: string; children: ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <div style={{ fontWeight: 800, color: "var(--text-secondary)" }}>{props.label}</div>
      {props.children}
    </label>
  );
}


function BooleanChoice(props: { label: string; value: boolean; onChange: (value: boolean) => void; testId: string }) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ fontWeight: 800, color: "var(--text-secondary)" }}>{props.label}</div>
      <div
        role="group"
        aria-label={props.label}
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 8,
        }}
      >
        {([
          { label: "No", selected: !props.value },
          { label: "Yes", selected: props.value },
        ] as const).map((option) => (
          <button
            key={option.label}
            type="button"
            data-testid={`${props.testId}-${option.label.toLowerCase()}`}
            aria-pressed={option.selected}
            onClick={() => props.onChange(option.label === "Yes")}
            style={{
              minHeight: 44,
              padding: "10px 12px",
              borderRadius: 14,
              border: option.selected ? "1px solid var(--interactive-active-border)" : "1px solid var(--border)",
              background: option.selected ? "var(--interactive-active-bg)" : "var(--surface-2)",
              color: option.selected ? "var(--interactive-active-text)" : "var(--text-primary)",
              fontWeight: 900,
            }}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Box(props: { title: string; children: ReactNode }) {
  return (
    <div style={{ border: "1px solid var(--border)", background: "var(--surface)", borderRadius: 16, padding: 10 }}>
      <div style={{ fontWeight: 900, marginBottom: 8, color: "var(--text-primary)" }}>{props.title}</div>
      <div style={{ display: "grid", gap: 10 }}>{props.children}</div>
    </div>
  );
}

function FansGroup(props: {
  existingFans: number;
  onExistingFansChange: (v: number) => void;
  fansRoll: number;
  onFansRollChange: (v: number) => void;
  testIdPrefix: string;
}) {
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 12, padding: "10px 10px 8px", background: "var(--surface-2)", display: "grid", gap: 8 }}>
      <div style={{ fontWeight: 800, fontSize: 13, color: "var(--text-secondary)" }}>Fans</div>
      <FansRow label="Existing" value={props.existingFans} min={0} max={99} onChange={props.onExistingFansChange} testId={`${props.testIdPrefix}-existing-fans`} />
      <FansRow label="Roll" value={props.fansRoll} min={1} max={6} onChange={props.onFansRollChange} testId={`${props.testIdPrefix}-fans-roll`} />
    </div>
  );
}

function FansRow(props: { label: string; value: number; min: number; max: number; onChange: (v: number) => void; testId: string }) {
  const canDecrease = props.value > props.min;
  const canIncrease = props.value < props.max;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "56px 48px minmax(0, 1fr) 48px", columnGap: 8, alignItems: "center" }}>
      <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text-secondary)" }}>{props.label}</div>
      <button
        data-testid={`${props.testId}-decrease`}
        onClick={() => props.onChange(Math.max(props.min, props.value - 1))}
        disabled={!canDecrease}
        aria-label={`decrease ${props.label.toLowerCase()}`}
        style={{
          minWidth: 48, minHeight: 48, height: 48, borderRadius: 12,
          border: "1px solid var(--color-button-secondary-border)",
          background: !canDecrease ? "var(--color-surface-muted)" : "var(--color-button-secondary-bg)",
          fontWeight: 900, fontSize: 24, lineHeight: 1,
          color: !canDecrease ? "var(--control-fg-muted)" : "var(--icon-primary)",
          boxShadow: "inset 0 1px 0 var(--color-surface-inset)",
        }}
      >
        −
      </button>
      <div style={{
        textAlign: "center", fontSize: 14, minHeight: 48, borderRadius: 12,
        border: "1px solid var(--border)", fontWeight: 800, background: "var(--surface)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "var(--control-fg)",
      }}>
        {props.value}
      </div>
      <button
        data-testid={`${props.testId}-increase`}
        onClick={() => props.onChange(Math.min(props.max, props.value + 1))}
        disabled={!canIncrease}
        aria-label={`increase ${props.label.toLowerCase()}`}
        style={{
          minWidth: 48, minHeight: 48, height: 48, borderRadius: 12,
          border: "1px solid var(--color-button-secondary-border)",
          background: !canIncrease ? "var(--color-surface-muted)" : "var(--color-button-secondary-bg)",
          fontWeight: 900, fontSize: 24, lineHeight: 1,
          color: !canIncrease ? "var(--control-fg-muted)" : "var(--icon-primary)",
          boxShadow: "inset 0 1px 0 var(--color-surface-inset)",
        }}
      >
        +
      </button>
    </div>
  );
}

const inputStyle: CSSProperties = {
  ...THEMED_INPUT_STYLE,
  width: "100%",
  maxWidth: "100%",
  boxSizing: "border-box",
  fontWeight: 800,
  background: "var(--input-bg)",
  color: "var(--input-text)",
  border: "1px solid var(--input-border)",
};
