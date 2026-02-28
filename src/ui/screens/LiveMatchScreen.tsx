import { useState } from "react";
import { teamLabel } from "../../store/matchStore";
import { Modal, BigButton } from "../components/Modal";
import type { ApothecaryOutcome, InjuryCause, InjuryResult, StatReduction } from "../../domain/events";
import { WEATHERS, type TeamId, type Weather } from "../../domain/enums";
import { PlayerPicker } from "../components/PlayerPicker";
import { ScoreBoard } from "../components/live/ScoreBoard";
import { KickoffBanner } from "../components/live/KickoffBanner";
import { ResourcesPanel } from "../components/live/ResourcesPanel";
import { TurnTracker } from "../components/live/TurnTracker";
import { ActionsPanel } from "../components/live/ActionsPanel";
import { ExportSheet } from "../components/export/ExportSheet";
import { useIsSmallScreen } from "../hooks/useIsSmallScreen";
import { useMatchStore } from "../../store/matchStore";
import { useAppStore } from "../../store/appStore";
import {
  apoOutcomes,
  causesWithCauser,
  injuryCauses,
  injuryResults,
  normalizeInjuryPayload,
  statReductions,
  throwRockOutcomes,
  useLiveMatch,
} from "../hooks/useLiveMatch";

export function LiveMatchScreen() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [restartConfirmOpen, setRestartConfirmOpen] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);
  const isSmallScreen = useIsSmallScreen();
  const resetMatch = useMatchStore((s) => s.resetAll);
  const setScreen = useAppStore((s) => s.setScreen);
  const live = useLiveMatch();
  const { isReady, events, d, hasMatch, turnButtons, kickoffOptions, kickoffMapped, rosters } = live;
  const { kickoffAllowed, touchdownAllowed, completionAllowed, interceptionAllowed, casualtyAllowed } = live.guards;
  const { undoLast, doNextTurn, setTurn, consumeResource } = live.actions;
  const { touchdown, completion, interception, injury, kickoff } = live;
  const eventTypeLabel = (eventType: string) => (eventType === "injury" ? "Casualty" : eventType);

  const prettyLabel = (value: string) => value.replace(/_/g, " ").replace(/\b\w/g, (x) => x.toUpperCase());
  const primaryInjuryCauses: InjuryCause[] = ["BLOCK", "FOUL", "SECRET_WEAPON", "FAILED_DODGE", "FAILED_GFI", "CROWD"];
  const otherInjuryCauses = injuryCauses.filter((injuryCause) => !primaryInjuryCauses.includes(injuryCause));
  const usingOtherCause = Boolean(injury.cause) && !primaryInjuryCauses.includes(injury.cause);

  async function confirmRestartMatch() {
    if (isRestarting) return;
    setIsRestarting(true);
    await resetMatch();
    setRestartConfirmOpen(false);
    setMenuOpen(false);
    setScreen("start");
    setIsRestarting(false);
  }

  if (!isReady) return <div style={{ padding: 12, opacity: 0.7 }}>Loading…</div>;

  return (
    <div className="live-screen">
      <div className="live-header-row">
        <div style={{ fontWeight: 800, fontSize: 18, overflowWrap: "anywhere" }}>BB Match Notes</div>
        <button className="live-menu-trigger" onClick={() => setMenuOpen(true)} aria-label="Open match actions menu">
          ☰
        </button>
      </div>

      <div className="live-scoreboard-sticky">
        <ScoreBoard teamNames={d.teamNames} score={d.score} half={d.half} turn={d.turn} weather={d.weather} />
      </div>

      <KickoffBanner
        hasMatch={hasMatch}
        kickoffPending={d.kickoffPending}
        driveIndexCurrent={d.driveIndexCurrent}
        driveKickoff={d.driveKickoff}
        onRecordKickoff={() => kickoffAllowed && kickoff.setOpen(true)}
      />

      <ResourcesPanel teamNames={d.teamNames} resources={d.resources} hasMatch={hasMatch} canConsumeResources={!d.kickoffPending} onConsumeResource={consumeResource} />

      <TurnTracker turnButtons={turnButtons} currentTurn={d.turn} hasMatch={hasMatch} onSetTurn={setTurn} onNextTurn={doNextTurn} />

      <ActionsPanel
        canRecordTouchdown={touchdownAllowed}
        canRecordCompletion={completionAllowed}
        canRecordInterception={interceptionAllowed}
        canRecordCasualty={casualtyAllowed}
        onTouchdown={() => touchdownAllowed && touchdown.setOpen(true)}
        onCompletion={() => completionAllowed && completion.setOpen(true)}
        onInterception={() => interceptionAllowed && interception.setOpen(true)}
        onInjury={() => casualtyAllowed && injury.setOpen(true)}
        kickoffPending={d.kickoffPending}
      />

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
                  {eventTypeLabel(e.type)} {e.team ? `· ${teamLabel(e.team, d.teamNames)}` : ""} · H{e.half} T{e.turn}
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

      <Modal open={menuOpen} title="Match actions" onClose={() => setMenuOpen(false)}>
        <div className="live-menu-actions">
          <button
            className="live-menu-action-button"
            onClick={() => {
              setMenuOpen(false);
              setExportOpen(true);
            }}
            disabled={!events.length}
          >
            Export
          </button>
          <button
            className="live-menu-action-button"
            onClick={() => {
              undoLast();
              setMenuOpen(false);
            }}
            disabled={!events.length}
          >
            Undo
          </button>
          <button
            className="live-menu-action-button live-menu-action-button-danger"
            onClick={() => {
              setMenuOpen(false);
              setRestartConfirmOpen(true);
            }}
          >
            Restart match
          </button>
        </div>
      </Modal>

      <Modal open={restartConfirmOpen} title="Restart match?" onClose={() => !isRestarting && setRestartConfirmOpen(false)}>
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ textAlign: "left" }}>This will delete the current match on this device. This cannot be undone.</div>
          <div className="live-confirm-actions">
            <BigButton label="Cancel" onClick={() => setRestartConfirmOpen(false)} secondary disabled={isRestarting} />
            <BigButton label={isRestarting ? "Restarting…" : "Restart"} onClick={confirmRestartMatch} disabled={isRestarting} />
          </div>
        </div>
      </Modal>

      <ExportSheet open={exportOpen} onClose={() => setExportOpen(false)} events={events} derived={d} rosters={rosters} isSmallScreen={isSmallScreen} />

      <Modal open={touchdown.open} title="Touchdown" onClose={() => touchdown.setOpen(false)}>
        <div style={{ display: "grid", gap: 10 }}>
          <div className="live-action-grid">
            <button
              onClick={() => touchdown.setTeam("A")}
              style={{
                padding: "12px 10px",
                borderRadius: 14,
                border: touchdown.team === "A" ? "1px solid #111" : "1px solid #ddd",
                background: touchdown.team === "A" ? "#111" : "#fafafa",
                color: touchdown.team === "A" ? "white" : "#111",
                fontWeight: 900,
                minHeight: 44,
                overflowWrap: "anywhere",
              }}
            >
              {d.teamNames.A}
            </button>
            <button
              onClick={() => touchdown.setTeam("B")}
              style={{
                padding: "12px 10px",
                borderRadius: 14,
                border: touchdown.team === "B" ? "1px solid #111" : "1px solid #ddd",
                background: touchdown.team === "B" ? "#111" : "#fafafa",
                color: touchdown.team === "B" ? "white" : "#111",
                fontWeight: 900,
                minHeight: 44,
                overflowWrap: "anywhere",
              }}
            >
              {d.teamNames.B}
            </button>
          </div>

          <PlayerPicker label="Scorer" value={touchdown.player} onChange={(v) => touchdown.setPlayer(v)} />

          <BigButton label="Save TD" onClick={touchdown.save} disabled={!touchdown.player} />
        </div>
      </Modal>

      <Modal open={completion.open} title="Completion" onClose={() => completion.setOpen(false)}>
        <div style={{ display: "grid", gap: 10 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontWeight: 800 }}>Team</div>
            <select
              value={completion.team}
              onChange={(e) => completion.setTeam(e.target.value as TeamId)}
              style={{ padding: 12, borderRadius: 14, border: "1px solid #ddd" }}
            >
              <option value="A">{d.teamNames.A}</option>
              <option value="B">{d.teamNames.B}</option>
            </select>
          </label>

          <PlayerPicker label="Passer" value={completion.passer} onChange={(v) => completion.setPasser(v)} />
          <PlayerPicker
            label="Receiver (optional)"
            value={completion.receiver}
            onChange={(v) => completion.setReceiver(v)}
            allowEmpty
            onClear={() => completion.setReceiver("")}
          />

          <BigButton label="Save Completion" onClick={completion.save} disabled={!completion.passer} />
        </div>
      </Modal>

      <Modal open={interception.open} title="Interception" onClose={() => interception.setOpen(false)}>
        <div style={{ display: "grid", gap: 10 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontWeight: 800 }}>Team</div>
            <select
              value={interception.team}
              onChange={(e) => interception.setTeam(e.target.value as TeamId)}
              style={{ padding: 12, borderRadius: 14, border: "1px solid #ddd" }}
            >
              <option value="A">{d.teamNames.A}</option>
              <option value="B">{d.teamNames.B}</option>
            </select>
          </label>

          <PlayerPicker label="Interceptor" value={interception.player} onChange={(v) => interception.setPlayer(v)} />

          <BigButton label="Save Interception" onClick={interception.save} disabled={!interception.player} />
        </div>
      </Modal>

      <Modal open={injury.open} title="Casualty" onClose={() => injury.setOpen(false)}>
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ fontWeight: 800 }}>Cause</div>
            <div style={{ fontSize: 13, color: "#4b5563" }}>Only record what happened. No dice are rolled.</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
              {primaryInjuryCauses.map((cause) => (
                <button
                  key={cause}
                  type="button"
                  onClick={() => injury.setCause(cause)}
                  style={{
                    padding: "12px 10px",
                    borderRadius: 14,
                    border: injury.cause === cause ? "1px solid #111" : "1px solid #ddd",
                    background: injury.cause === cause ? "#111" : "#fafafa",
                    color: injury.cause === cause ? "#fff" : "#111",
                    fontWeight: 800,
                    minHeight: 44,
                  }}
                >
                  {prettyLabel(cause)}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  if (otherInjuryCauses.length > 0) {
                    injury.setCause(otherInjuryCauses[0]);
                  }
                }}
                style={{
                  padding: "12px 10px",
                  borderRadius: 14,
                  border: usingOtherCause ? "1px solid #111" : "1px solid #ddd",
                  background: usingOtherCause ? "#111" : "#fafafa",
                  color: usingOtherCause ? "#fff" : "#111",
                  fontWeight: 800,
                  minHeight: 44,
                  gridColumn: "span 2",
                }}
              >
                Other…
              </button>
            </div>

            {usingOtherCause && (
              <select value={injury.cause} onChange={(e) => injury.setCause(e.target.value as InjuryCause)} style={{ padding: 12, borderRadius: 14, border: "1px solid #ddd", minHeight: 44 }}>
                {otherInjuryCauses.map((x) => (
                  <option key={x} value={x}>
                    {prettyLabel(x)}
                  </option>
                ))}
              </select>
            )}
          </div>

          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontWeight: 800 }}>Victim team</div>
            <select
              value={injury.victimTeam}
              onChange={(e) => injury.setVictimTeam(e.target.value as TeamId)}
              style={{ padding: 12, borderRadius: 14, border: "1px solid #ddd" }}
            >
              <option value="A">{d.teamNames.A}</option>
              <option value="B">{d.teamNames.B}</option>
            </select>
          </label>

          <PlayerPicker label="Victim player (optional)" value={injury.victimPlayerId} onChange={(v) => injury.setVictimPlayerId(v)} allowEmpty onClear={() => injury.setVictimPlayerId("")} />

          {causesWithCauser.has(injury.cause) && (
            <>
              <PlayerPicker label="Causer player" value={injury.causerPlayerId} onChange={(v) => injury.setCauserPlayerId(v)} />
              <div style={{ fontSize: 13, color: "#4b5563" }}>Attacker team is derived as {injury.victimTeam === "A" ? d.teamNames.B : d.teamNames.A}.</div>
            </>
          )}

          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontWeight: 800 }}>Casualty result</div>
            <select
              value={injury.injuryResult}
              onChange={(e) => injury.setInjuryResult(e.target.value as InjuryResult)}
              style={{ padding: 12, borderRadius: 14, border: "1px solid #ddd" }}
            >
              {injuryResults.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </label>

          {injury.injuryResult === "STAT" && (
            <label style={{ display: "grid", gap: 6 }}>
              <div style={{ fontWeight: 800 }}>Characteristic reduction</div>
              <select
                value={injury.injuryStat}
                onChange={(e) => injury.setInjuryStat(e.target.value as StatReduction)}
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
            <input type="checkbox" checked={injury.apoUsed} onChange={(e) => injury.setApoUsed(e.target.checked)} />
            Apothecary used
          </label>

          {injury.apoUsed && (
            <label style={{ display: "grid", gap: 6 }}>
              <div style={{ fontWeight: 800 }}>Apothecary outcome (optional)</div>
              <select
                value={injury.apoOutcome}
                onChange={(e) => injury.setApoOutcome(e.target.value as ApothecaryOutcome)}
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
            label="Save Casualty"
            onClick={injury.save}
            disabled={causesWithCauser.has(injury.cause) && !injury.causerPlayerId}
          />
        </div>
      </Modal>

      <Modal open={kickoff.open} title="Kick-off" onClose={() => kickoff.setOpen(false)}>
        <div data-testid="kickoff-modal" style={{ display: "grid", gap: 10 }}>
          {kickoff.message && <div style={{ color: "#b45309", fontWeight: 700 }}>{kickoff.message}</div>}
          <div style={{ fontWeight: 700 }}>Drive {d.driveIndexCurrent}</div>
          <div className="live-action-grid">
            <button data-testid="kickoff-kicking-a" onClick={() => kickoff.setKickingTeam("A")} style={{ padding: "12px 10px", borderRadius: 14, border: kickoff.kickingTeam === "A" ? "1px solid #111" : "1px solid #ddd", background: kickoff.kickingTeam === "A" ? "#111" : "#fafafa", color: kickoff.kickingTeam === "A" ? "white" : "#111", fontWeight: 900, minHeight: 44 }}>
              {d.teamNames.A} kicking
            </button>
            <button data-testid="kickoff-kicking-b" onClick={() => kickoff.setKickingTeam("B")} style={{ padding: "12px 10px", borderRadius: 14, border: kickoff.kickingTeam === "B" ? "1px solid #111" : "1px solid #ddd", background: kickoff.kickingTeam === "B" ? "#111" : "#fafafa", color: kickoff.kickingTeam === "B" ? "white" : "#111", fontWeight: 900, minHeight: 44 }}>
              {d.teamNames.B} kicking
            </button>
          </div>
          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontWeight: 800 }}>Kick-off event</div>
            <select
              data-testid="kickoff-roll"
              value={kickoff.roll}
              onChange={(e) => kickoff.setRoll(Number(e.target.value))}
              style={{ padding: 12, borderRadius: 14, border: "1px solid #ddd", minHeight: 44 }}
            >
              {kickoffOptions.map((option) => (
                <option key={option.roll} value={option.roll}>{option.label} · {option.roll}</option>
              ))}
            </select>
          </label>

          {kickoffMapped.key === "CHANGING_WEATHER" && (
            <label style={{ display: "grid", gap: 6 }}>
              <div style={{ fontWeight: 800 }}>New weather</div>
              <select value={kickoff.newWeather} onChange={(e) => kickoff.setNewWeather(e.target.value as Weather)} style={{ padding: 12, borderRadius: 14, border: "1px solid #ddd", minHeight: 44 }}>
                <option value="">Select weather</option>
                {WEATHERS.map((w) => (
                  <option key={w} value={w}>{prettyLabel(w)}</option>
                ))}
              </select>
            </label>
          )}

          {kickoffMapped.key === "TIME_OUT" && (
            <div style={{ padding: 10, borderRadius: 14, border: "1px solid #eee", fontWeight: 700 }}>
              {kickoff.timeOutEffectLabel}
            </div>
          )}

          {kickoffMapped.key === "THROW_A_ROCK" && (
            <div style={{ display: "grid", gap: 10, padding: 10, borderRadius: 14, border: "1px solid #eee" }}>
              <label style={{ display: "grid", gap: 6 }}>
                <div style={{ fontWeight: 800 }}>Target team</div>
                <select value={kickoff.rockTargetTeam} onChange={(e) => kickoff.setRockTargetTeam(e.target.value as TeamId)} style={{ padding: 12, borderRadius: 14, border: "1px solid #ddd", minHeight: 44 }}>
                  <option value="A">{d.teamNames.A}</option>
                  <option value="B">{d.teamNames.B}</option>
                </select>
              </label>
              <PlayerPicker label="Target player (optional)" value={kickoff.rockTargetPlayer} onChange={(value) => kickoff.setRockTargetPlayer(value)} />
              <label style={{ display: "grid", gap: 6 }}>
                <div style={{ fontWeight: 800 }}>Outcome (optional)</div>
                <select value={kickoff.rockOutcome} onChange={(e) => kickoff.setRockOutcome(e.target.value as (typeof throwRockOutcomes)[number] | "")} style={{ padding: 12, borderRadius: 14, border: "1px solid #ddd", minHeight: 44 }}>
                  <option value="">Unknown</option>
                  {throwRockOutcomes.map((outcome) => (
                    <option key={outcome} value={outcome}>{prettyLabel(outcome)}</option>
                  ))}
                </select>
              </label>
            </div>
          )}

          {kickoffMapped.key === "PITCH_INVASION" && (
            <div style={{ display: "grid", gap: 10, padding: 10, borderRadius: 14, border: "1px solid #eee" }}>
              <label style={{ display: "grid", gap: 6 }}>
                <div style={{ fontWeight: 800 }}>Affected on {d.teamNames.A}</div>
                <input type="number" inputMode="numeric" min={0} value={kickoff.pitchInvasionA} onChange={(e) => kickoff.setPitchInvasionA(e.target.value)} placeholder="0" style={{ padding: 12, borderRadius: 14, border: "1px solid #ddd", minHeight: 44 }} />
              </label>
              <label style={{ display: "grid", gap: 6 }}>
                <div style={{ fontWeight: 800 }}>Affected on {d.teamNames.B}</div>
                <input type="number" inputMode="numeric" min={0} value={kickoff.pitchInvasionB} onChange={(e) => kickoff.setPitchInvasionB(e.target.value)} placeholder="0" style={{ padding: 12, borderRadius: 14, border: "1px solid #ddd", minHeight: 44 }} />
              </label>
            </div>
          )}

          <BigButton label="Record Kick-off" onClick={kickoff.save} disabled={!kickoff.canRecord} testId="kickoff-confirm" />
        </div>
      </Modal>

    </div>
  );
}
