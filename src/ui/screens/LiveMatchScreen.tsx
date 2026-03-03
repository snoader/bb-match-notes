import { useCallback, useMemo, useState, type CSSProperties } from "react";
import { Modal, BigButton } from "../components/Modal";
import type { ApothecaryOutcome, InjuryCause, InjuryResult, MatchEvent, StatReduction } from "../../domain/events";
import type { TeamId } from "../../domain/enums";
import { WEATHER_OPTIONS, type Weather } from "../../domain/weather";
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
  statReductions,
  throwRockOutcomes,
  useLiveMatch,
} from "../hooks/useLiveMatch";
import { displayTurn } from "../formatters/turnDisplay";
import { weatherLabel, injuryCauseLabel, injuryResultLabel, titleCase } from "../formatters/labels";
import { formatEventText } from "../../shared/formatters/formatEventText";


const APOTHECARY_OUTCOME_LABELS: Record<ApothecaryOutcome, string> = {
  RECOVERED: "Recovered (no casualty)",
  BH: "Badly Hurt",
  MNG: "Miss Next Game",
  DEAD: "Dead",
  STAT: "Characteristic Reduction",
};

const PRIMARY_INJURY_CAUSES: InjuryCause[] = ["BLOCK", "FOUL", "SECRET_WEAPON", "FAILED_DODGE", "FAILED_GFI", "CROWD"];
const LOADING_STYLE = { padding: 12, opacity: 0.7 } as const;
const SCREEN_TITLE_STYLE = { fontWeight: 800, fontSize: 18, overflowWrap: "anywhere" } as const;
const SECTION_TITLE_STYLE = { fontWeight: 900, marginBottom: 8 } as const;
const EMPTY_STATE_STYLE = { opacity: 0.7 } as const;
const CONFIRM_STACK_STYLE = { display: "grid", gap: 12 } as const;
const LEFT_TEXT_STYLE = { textAlign: "left" } as const;
const MODAL_GRID_STYLE = { display: "grid", gap: 10 } as const;
const FIELD_LABEL_STYLE = { display: "grid", gap: 6 } as const;
const FIELD_TITLE_STYLE = { fontWeight: 800 } as const;
const SELECT_STYLE = { padding: 12, borderRadius: 14, border: "1px solid #ddd" } as const;
const SELECT_TALL_STYLE = { ...SELECT_STYLE, minHeight: 44 } as const;
const INFO_TEXT_STYLE = { fontSize: 13, color: "#4b5563" } as const;
const KICKOFF_MESSAGE_STYLE = { color: "#b45309", fontWeight: 700 } as const;
const KICKOFF_DRIVE_STYLE = { fontWeight: 700 } as const;
const TWO_COLUMN_GRID_STYLE = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 } as const;
const PANEL_STYLE = { display: "grid", gap: 10, padding: 10, borderRadius: 14, border: "1px solid #eee" } as const;
const TEAM_BUTTON_BASE_STYLE = {
  padding: "12px 10px",
  borderRadius: 14,
  fontWeight: 900,
  minHeight: 44,
  overflowWrap: "anywhere",
} as const;
const CAUSE_BUTTON_BASE_STYLE = {
  padding: "12px 10px",
  borderRadius: 14,
  fontWeight: 800,
  minHeight: 44,
} as const;
const APOTHECARY_TOGGLE_STYLE = {
  minHeight: 48,
  padding: "12px 14px",
  borderRadius: 14,
  fontWeight: 900,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
} as const;
const APOTHECARY_STATUS_STYLE = { fontSize: 12, opacity: 0.9 } as const;
const INFO_PANEL_STYLE = { padding: 10, borderRadius: 14, border: "1px solid #eee", fontWeight: 700 } as const;

function getSelectedButtonStyle(isSelected: boolean, base: CSSProperties, textColor = "white"): CSSProperties {
  return {
    ...base,
    border: isSelected ? "1px solid #111" : "1px solid #ddd",
    background: isSelected ? "#111" : "#fafafa",
    color: isSelected ? textColor : "#111",
  };
}

function formatRecentEventLines(event: MatchEvent, teamNames: { A: string; B: string }): string[] {
  const formatted = formatEventText(event, teamNames);
  if (!formatted) return [];
  if (event.type === "weather_set") return [];
  return [formatted];
}


function recentEventCategory(event: MatchEvent): "KICKOFF" | "TD" | "COMP" | "INT" | "CAS" | null {
  if (event.type === "kickoff" || event.type === "kickoff_event") return "KICKOFF";
  if (event.type === "touchdown") return "TD";
  if (event.type === "completion") return "COMP";
  if (event.type === "interception") return "INT";
  if (event.type === "injury") return "CAS";
  return null;
}

export function LiveMatchScreen() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [restartConfirmOpen, setRestartConfirmOpen] = useState(false);
  const [iosInstallHelpOpen, setIosInstallHelpOpen] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);
  const isSmallScreen = useIsSmallScreen();
  const resetMatch = useMatchStore((s) => s.resetAll);
  const mvp = useMatchStore((s) => s.mvp);
  const setScreen = useAppStore((s) => s.setScreen);
  const installed = useAppStore((s) => s.installed);
  const canInstallPrompt = useAppStore((s) => s.canInstallPrompt);
  const canShowIosInstallHelp = useAppStore((s) => s.canShowIosInstallHelp);
  const promptInstall = useAppStore((s) => s.promptInstall);
  const updateAvailable = useAppStore((s) => s.updateAvailable);
  const applyUpdate = useAppStore((s) => s.applyUpdate);
  const appVersion = import.meta.env.VITE_APP_VERSION as string | undefined;
  const live = useLiveMatch();
  const { isReady, events, d, hasMatch, turnButtons, kickoffOptions, kickoffMapped, rosters } = live;
  const { kickoffAllowed, touchdownAllowed, completionAllowed, interceptionAllowed, casualtyAllowed, apothecaryAllowed } = live.guards;
  const { undoLast, doNextTurn, setTurn, consumeResource } = live.actions;
  const { touchdown, completion, interception, injury, kickoff } = live;
  const otherInjuryCauses = useMemo(
    () => injuryCauses.filter((injuryCause) => !PRIMARY_INJURY_CAUSES.includes(injuryCause)),
    [],
  );
  const usingOtherCause = Boolean(injury.cause) && !PRIMARY_INJURY_CAUSES.includes(injury.cause);
  const matchStartEvent = events.find((event) => event.type === "match_start");
  const startingRerolls = {
    A: Number(matchStartEvent?.payload?.resources?.A?.rerolls ?? 0),
    B: Number(matchStartEvent?.payload?.resources?.B?.rerolls ?? 0),
  };
  const recentEvents = useMemo(() => events.filter((event) => event.type !== "match_start").slice(-20), [events]);
  const initialWeather = weatherLabel(matchStartEvent?.payload?.weather ?? d.weather);
  const recentRows = useMemo(() => recentEvents.reduce<
    Array<{
      event: MatchEvent;
      showHalfHeader: boolean;
      showTurnHeader: boolean;
      showDriveLabel: boolean;
      drive: number;
      shownTurn: number;
      lines: string[];
      category: "KICKOFF" | "TD" | "COMP" | "INT" | "CAS" | null;
    }>
  >((rows, event) => {
    const previous = rows[rows.length - 1];
    const previousRenderedHalf = previous ? previous.event.half : null;
    const payloadDriveIndex = typeof event.payload?.driveIndex === "number" ? event.payload.driveIndex : undefined;
    const previousDrive = previous?.drive ?? d.driveIndexCurrent;
    const drive = payloadDriveIndex ?? previousDrive;
    const showHalfHeader = previousRenderedHalf !== event.half;
    const showTurnHeader =
      showHalfHeader ||
      (previous ? previous.event.turn !== event.turn : true) ||
      event.type === "next_turn" ||
      event.type === "turn_set";
    const showDriveLabel = showTurnHeader && drive !== previousDrive;

    rows.push({
      event,
      showHalfHeader,
      showTurnHeader,
      showDriveLabel,
      drive,
      shownTurn: displayTurn(event.half, event.turn),
      lines: formatRecentEventLines(event, d.teamNames),
      category: recentEventCategory(event),
    });
    return rows;
  }, []), [recentEvents, d.driveIndexCurrent, d.teamNames]);

  async function confirmRestartMatch() {
    if (isRestarting) return;
    setIsRestarting(true);
    await resetMatch();
    setRestartConfirmOpen(false);
    setMenuOpen(false);
    setScreen("start");
    setIsRestarting(false);
  }

  const openMenu = useCallback(() => setMenuOpen(true), []);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const openExport = useCallback(() => setExportOpen(true), []);
  const closeExport = useCallback(() => setExportOpen(false), []);
  const closeTouchdown = useCallback(() => touchdown.setOpen(false), [touchdown]);
  const closeCompletion = useCallback(() => completion.setOpen(false), [completion]);
  const closeInterception = useCallback(() => interception.setOpen(false), [interception]);
  const closeInjury = useCallback(() => injury.setOpen(false), [injury]);
  const closeKickoff = useCallback(() => kickoff.setOpen(false), [kickoff]);
  const closeRestartConfirm = useCallback(() => {
    if (!isRestarting) setRestartConfirmOpen(false);
  }, [isRestarting]);
  const handleMenuExport = useCallback(() => {
    setMenuOpen(false);
    openExport();
  }, [openExport]);
  const handleMenuUndo = useCallback(() => {
    undoLast();
    setMenuOpen(false);
  }, [undoLast]);
  const handleMenuRestart = useCallback(() => {
    setMenuOpen(false);
    setRestartConfirmOpen(true);
  }, []);
  const handleMenuInstall = useCallback(async () => {
    if (canInstallPrompt) {
      await promptInstall();
      closeMenu();
      return;
    }

    if (canShowIosInstallHelp) {
      setIosInstallHelpOpen(true);
      return;
    }

    closeMenu();
  }, [canInstallPrompt, canShowIosInstallHelp, promptInstall, closeMenu]);
  const handleMenuApplyUpdate = useCallback(async () => {
    setMenuOpen(false);
    await applyUpdate();
  }, [applyUpdate]);
  const openTouchdown = useCallback(() => { if (touchdownAllowed) touchdown.setOpen(true); }, [touchdownAllowed, touchdown]);
  const openCompletion = useCallback(() => { if (completionAllowed) completion.setOpen(true); }, [completionAllowed, completion]);
  const openInterception = useCallback(() => { if (interceptionAllowed) interception.setOpen(true); }, [interceptionAllowed, interception]);
  const openInjury = useCallback(() => { if (casualtyAllowed) injury.setOpen(true); }, [casualtyAllowed, injury]);
  const openKickoff = useCallback(() => { if (kickoffAllowed) kickoff.setOpen(true); }, [kickoffAllowed, kickoff]);

  if (!isReady) return <div style={LOADING_STYLE}>Loading…</div>;

  return (
    <div className="live-screen">
      <div className="live-header-row">
        <div style={SCREEN_TITLE_STYLE}>BB Match Notes</div>
        <button className="live-menu-trigger" onClick={openMenu} aria-label="Open match actions menu">
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
        onRecordKickoff={openKickoff}
      />

      <ResourcesPanel
        teamNames={d.teamNames}
        resources={d.resources}
        startingRerolls={startingRerolls}
        hasMatch={hasMatch}
        canConsumeResources={!d.kickoffPending}
        canUseApothecary={apothecaryAllowed}
        onConsumeResource={consumeResource}
      />

      <TurnTracker turnButtons={turnButtons} currentTurn={d.turn} half={d.half} hasMatch={hasMatch} onSetTurn={setTurn} onNextTurn={doNextTurn} />

      <ActionsPanel
        canRecordTouchdown={touchdownAllowed}
        canRecordCompletion={completionAllowed}
        canRecordInterception={interceptionAllowed}
        canRecordCasualty={casualtyAllowed}
        onTouchdown={openTouchdown}
        onCompletion={openCompletion}
        onInterception={openInterception}
        onInjury={openInjury}
        kickoffPending={d.kickoffPending}
      />

      <div className="live-section">
        <div style={SECTION_TITLE_STYLE}>Recent</div>
        <div className="recent-drive-list">
          {matchStartEvent && (
            <div className="recent-drive-group">
              <div className="recent-drive-events">
                <div className="recent-event-row recent-event-row-muted">
                  <div className="recent-event-line recent-event-line-muted">Match start</div>
                  <div className="recent-event-line recent-event-line-muted">Weather: {initialWeather}</div>
                </div>
              </div>
            </div>
          )}

          <div className="recent-drive-group">
            <div className="recent-drive-events">
              {recentRows.map(({ event, showHalfHeader, showTurnHeader, showDriveLabel, drive, shownTurn, lines, category }) => (
                <div key={event.id} className="recent-event-row">
                  {showHalfHeader && (
                    <div className="recent-separator recent-separator-half">
                      <span className="recent-separator-line" aria-hidden="true" />
                      <span className="recent-separator-label">Half {event.half}</span>
                      <span className="recent-separator-line" aria-hidden="true" />
                    </div>
                  )}

                  {showTurnHeader && (
                    <div className="recent-turn-block">
                      {showDriveLabel && <div className="recent-drive-inline">Drive {drive}</div>}
                      <div className="recent-separator recent-separator-turn">
                        <span className="recent-separator-label">Turn {shownTurn}</span>
                        <span className="recent-separator-line" aria-hidden="true" />
                      </div>
                    </div>
                  )}

                  {lines.map((line, index) => (
                    <div key={`${event.id}-${index}`} className="recent-event-line-with-badge">
                      {index === 0 && category ? <span className="recent-event-badge">{category}</span> : <span className="recent-event-badge-spacer" aria-hidden="true" />}
                      <div className="recent-event-line">
                        {line}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
              {!recentRows.length && !matchStartEvent && (
                <div style={EMPTY_STATE_STYLE}>
                  No events yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Modal open={menuOpen} title="Match actions" onClose={closeMenu}>
        <div className="live-menu-sections">
          <div className="live-menu-section">
            <div className="live-menu-section-title">Match</div>
            <div className="live-menu-actions">
              <button className="live-menu-action-button" onClick={handleMenuExport} disabled={!events.length}>
                Export
              </button>
              <button className="live-menu-action-button" onClick={handleMenuUndo} disabled={!events.length}>
                Undo
              </button>
              <button className="live-menu-action-button live-menu-action-button-danger" onClick={handleMenuRestart}>
                Restart match
              </button>
            </div>
          </div>

          <div className="live-menu-divider" role="separator" aria-hidden="true" />

          <div className="live-menu-section">
            <div className="live-menu-section-title">App</div>
            <div className="live-menu-actions">
              {!installed && (
                <button className="live-menu-action-button" onClick={handleMenuInstall} disabled={!canInstallPrompt && !canShowIosInstallHelp}>
                  {canInstallPrompt || canShowIosInstallHelp ? "App installieren" : "Installation nicht verfügbar (nutze Chrome/Edge)"}
                </button>
              )}
              {updateAvailable && (
                <button className="live-menu-action-button" onClick={handleMenuApplyUpdate}>
                  Update anwenden
                </button>
              )}
              {appVersion && <div className="live-menu-version">v{appVersion}</div>}
            </div>
          </div>
        </div>
      </Modal>



      <Modal open={iosInstallHelpOpen} title="App installieren" onClose={() => setIosInstallHelpOpen(false)}>
        <div style={MODAL_GRID_STYLE}>
          <div style={LEFT_TEXT_STYLE}>1) Teilen</div>
          <div style={LEFT_TEXT_STYLE}>2) Zum Home-Bildschirm</div>
          <BigButton label="Schließen" onClick={() => setIosInstallHelpOpen(false)} secondary />
        </div>
      </Modal>

      <Modal open={restartConfirmOpen} title="Restart match?" onClose={closeRestartConfirm}>
        <div style={CONFIRM_STACK_STYLE}>
          <div style={LEFT_TEXT_STYLE}>This will delete the current match on this device. This cannot be undone.</div>
          <div className="live-confirm-actions">
            <BigButton label="Cancel" onClick={() => setRestartConfirmOpen(false)} secondary disabled={isRestarting} />
            <BigButton label={isRestarting ? "Restarting…" : "Restart"} onClick={confirmRestartMatch} disabled={isRestarting} />
          </div>
        </div>
      </Modal>

      <ExportSheet open={exportOpen} onClose={closeExport} events={events} derived={d} rosters={rosters} isSmallScreen={isSmallScreen} mvpSelections={{ A: mvp.A ?? undefined, B: mvp.B ?? undefined }} />

      <Modal open={touchdown.open} title="Touchdown" onClose={closeTouchdown}>
        <div style={MODAL_GRID_STYLE}>
          <div className="live-action-grid">
            <button
              onClick={() => touchdown.setTeam("A")}
              style={getSelectedButtonStyle(touchdown.team === "A", TEAM_BUTTON_BASE_STYLE)}
            >
              {d.teamNames.A}
            </button>
            <button
              onClick={() => touchdown.setTeam("B")}
              style={getSelectedButtonStyle(touchdown.team === "B", TEAM_BUTTON_BASE_STYLE)}
            >
              {d.teamNames.B}
            </button>
          </div>

          <PlayerPicker label="Scorer" value={touchdown.player} onChange={(v) => touchdown.setPlayer(v)} />

          <BigButton label="Save TD" onClick={touchdown.save} disabled={!touchdown.player} />
        </div>
      </Modal>

      <Modal open={completion.open} title="Completion" onClose={closeCompletion}>
        <div style={MODAL_GRID_STYLE}>
          <label style={FIELD_LABEL_STYLE}>
            <div style={FIELD_TITLE_STYLE}>Team</div>
            <select
              value={completion.team}
              onChange={(e) => completion.setTeam(e.target.value as TeamId)}
              style={SELECT_STYLE}
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

      <Modal open={interception.open} title="Interception" onClose={closeInterception}>
        <div style={MODAL_GRID_STYLE}>
          <label style={FIELD_LABEL_STYLE}>
            <div style={FIELD_TITLE_STYLE}>Team</div>
            <select
              value={interception.team}
              onChange={(e) => interception.setTeam(e.target.value as TeamId)}
              style={SELECT_STYLE}
            >
              <option value="A">{d.teamNames.A}</option>
              <option value="B">{d.teamNames.B}</option>
            </select>
          </label>

          <PlayerPicker label="Interceptor" value={interception.player} onChange={(v) => interception.setPlayer(v)} />

          <BigButton label="Save Interception" onClick={interception.save} disabled={!interception.player} />
        </div>
      </Modal>

      <Modal open={injury.open} title="Casualty" onClose={closeInjury}>
        <div style={MODAL_GRID_STYLE}>
          <div style={FIELD_LABEL_STYLE}>
            <div style={FIELD_TITLE_STYLE}>Cause</div>
            <div style={TWO_COLUMN_GRID_STYLE}>
              {PRIMARY_INJURY_CAUSES.map((cause) => (
                <button
                  key={cause}
                  type="button"
                  onClick={() => injury.setCause(cause)}
                  style={getSelectedButtonStyle(injury.cause === cause, CAUSE_BUTTON_BASE_STYLE, "#fff")}
                >
                  {injuryCauseLabel(cause)}
                </button>
              ))}
              {otherInjuryCauses.length > 0 && (
                <button
                  type="button"
                  onClick={() => injury.setCause(otherInjuryCauses[0])}
                  style={{
                    ...getSelectedButtonStyle(usingOtherCause, CAUSE_BUTTON_BASE_STYLE, "#fff"),
                    gridColumn: "span 2",
                  }}
                >
                  Other…
                </button>
              )}
            </div>

            {usingOtherCause && (
              <select value={injury.cause} onChange={(e) => injury.setCause(e.target.value as InjuryCause)} style={SELECT_TALL_STYLE}>
                {otherInjuryCauses.map((x) => (
                  <option key={x} value={x}>
                    {titleCase(x, true)}
                  </option>
                ))}
              </select>
            )}
          </div>

          <label style={FIELD_LABEL_STYLE}>
            <div style={FIELD_TITLE_STYLE}>Victim team</div>
            <select
              value={injury.victimTeam}
              onChange={(e) => injury.setVictimTeam(e.target.value as TeamId)}
              style={SELECT_STYLE}
            >
              <option value="A">{d.teamNames.A}</option>
              <option value="B">{d.teamNames.B}</option>
            </select>
          </label>

          <PlayerPicker label="Victim player (optional)" value={injury.victimPlayerId} onChange={(v) => injury.setVictimPlayerId(v)} allowEmpty onClear={() => injury.setVictimPlayerId("")} />

          {causesWithCauser.has(injury.cause) && (
            <>
              <PlayerPicker label="Causer player" value={injury.causerPlayerId} onChange={(v) => injury.setCauserPlayerId(v)} />
              <div style={INFO_TEXT_STYLE}>Attacker team is derived as {injury.victimTeam === "A" ? d.teamNames.B : d.teamNames.A}.</div>
            </>
          )}

          <label style={FIELD_LABEL_STYLE}>
            <div style={FIELD_TITLE_STYLE}>Casualty result</div>
            <select
              value={injury.injuryResult}
              onChange={(e) => injury.setInjuryResult(e.target.value as InjuryResult)}
              style={SELECT_STYLE}
            >
              {injuryResults.map((x) => (
                <option key={x} value={x}>
                  {injuryResultLabel(x)}
                </option>
              ))}
            </select>
          </label>

          {injury.injuryResult === "STAT" && (
            <label style={FIELD_LABEL_STYLE}>
              <div style={FIELD_TITLE_STYLE}>Characteristic reduction</div>
              <select
                value={injury.injuryStat}
                onChange={(e) => injury.setInjuryStat(e.target.value as StatReduction)}
                style={SELECT_STYLE}
              >
                {statReductions.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>
            </label>
          )}

          {injury.victimTeamHasApothecary && (
            <button
              type="button"
              aria-pressed={injury.apoUsed}
              onClick={() => injury.setApoUsed(!injury.apoUsed)}
              style={{
                ...APOTHECARY_TOGGLE_STYLE,
                border: injury.apoUsed ? "1px solid #111" : "1px solid #d1d5db",
                background: injury.apoUsed ? "#111" : "#f9fafb",
                color: injury.apoUsed ? "#fff" : "#111",
              }}
            >
              <span>Use Apothecary</span>
              <span style={APOTHECARY_STATUS_STYLE}>{injury.apoUsed ? "Selected" : "Not selected"}</span>
            </button>
          )}

          {injury.victimTeamHasApothecary && injury.apoUsed && (
            <label style={FIELD_LABEL_STYLE}>
              <div style={FIELD_TITLE_STYLE}>Apothecary outcome</div>
              <select
                value={injury.apoOutcome}
                onChange={(e) => injury.setApoOutcome(e.target.value as ApothecaryOutcome)}
                style={SELECT_STYLE}
              >
                {apoOutcomes.map((x) => (
                  <option key={x} value={x}>
                    {APOTHECARY_OUTCOME_LABELS[x]}
                  </option>
                ))}
              </select>
            </label>
          )}

          {injury.victimTeamHasApothecary && injury.apoUsed && injury.apoOutcome === "STAT" && (
            <label style={FIELD_LABEL_STYLE}>
              <div style={FIELD_TITLE_STYLE}>Apothecary characteristic reduction</div>
              <select
                value={injury.apoStat}
                onChange={(e) => injury.setApoStat(e.target.value as StatReduction)}
                style={SELECT_STYLE}
              >
                {statReductions.map((x) => (
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

      <Modal open={kickoff.open} title="Kick-off" onClose={closeKickoff}>
        <div data-testid="kickoff-modal" style={MODAL_GRID_STYLE}>
          {kickoff.message && <div style={KICKOFF_MESSAGE_STYLE}>{kickoff.message}</div>}
          <div style={KICKOFF_DRIVE_STYLE}>Drive {d.driveIndexCurrent}</div>
          <div className="live-action-grid">
            <button data-testid="kickoff-kicking-a" onClick={() => kickoff.setKickingTeam("A")} style={getSelectedButtonStyle(kickoff.kickingTeam === "A", TEAM_BUTTON_BASE_STYLE)}>
              {d.teamNames.A} kicking
            </button>
            <button data-testid="kickoff-kicking-b" onClick={() => kickoff.setKickingTeam("B")} style={getSelectedButtonStyle(kickoff.kickingTeam === "B", TEAM_BUTTON_BASE_STYLE)}>
              {d.teamNames.B} kicking
            </button>
          </div>
          <label style={FIELD_LABEL_STYLE}>
              <div style={FIELD_TITLE_STYLE}>Kick-off event</div>
            <select
              data-testid="kickoff-roll"
              value={kickoff.roll}
              onChange={(e) => kickoff.setRoll(Number(e.target.value))}
              style={SELECT_TALL_STYLE}
            >
              {kickoffOptions.map((option) => (
                <option key={option.roll} value={option.roll}>{option.label} · {option.roll}</option>
              ))}
            </select>
          </label>

          {kickoffMapped.key === "CHANGING_WEATHER" && (
            <label style={FIELD_LABEL_STYLE}>
              <div style={FIELD_TITLE_STYLE}>New weather</div>
              <select value={kickoff.newWeather} onChange={(e) => kickoff.setNewWeather(e.target.value as Weather)} style={SELECT_TALL_STYLE}>
                <option value="">Select weather</option>
                {WEATHER_OPTIONS.map((w) => (
                  <option key={w} value={w}>{weatherLabel(w)}</option>
                ))}
              </select>
            </label>
          )}

          {kickoffMapped.key === "TIME_OUT" && (
            <div style={INFO_PANEL_STYLE}>
              {kickoff.timeOutEffectLabel}
            </div>
          )}

          {kickoffMapped.key === "THROW_A_ROCK" && (
            <div style={PANEL_STYLE}>
              <label style={FIELD_LABEL_STYLE}>
                <div style={FIELD_TITLE_STYLE}>Target team</div>
                <select value={kickoff.rockTargetTeam} onChange={(e) => kickoff.setRockTargetTeam(e.target.value as TeamId)} style={SELECT_TALL_STYLE}>
                  <option value="A">{d.teamNames.A}</option>
                  <option value="B">{d.teamNames.B}</option>
                </select>
              </label>
              <PlayerPicker label="Target player (optional)" value={kickoff.rockTargetPlayer} onChange={(value) => kickoff.setRockTargetPlayer(value)} />
              <label style={FIELD_LABEL_STYLE}>
                <div style={FIELD_TITLE_STYLE}>Outcome (optional)</div>
                <select value={kickoff.rockOutcome} onChange={(e) => kickoff.setRockOutcome(e.target.value as (typeof throwRockOutcomes)[number] | "")} style={SELECT_TALL_STYLE}>
                  <option value="">Unknown</option>
                  {throwRockOutcomes.map((outcome) => (
                    <option key={outcome} value={outcome}>{titleCase(outcome, true)}</option>
                  ))}
                </select>
              </label>
            </div>
          )}

          {kickoffMapped.key === "PITCH_INVASION" && (
            <div style={PANEL_STYLE}>
              <label style={FIELD_LABEL_STYLE}>
                <div style={FIELD_TITLE_STYLE}>Affected on {d.teamNames.A}</div>
                <input type="number" inputMode="numeric" min={0} value={kickoff.pitchInvasionA} onChange={(e) => kickoff.setPitchInvasionA(e.target.value)} placeholder="0" style={SELECT_TALL_STYLE} />
              </label>
              <label style={FIELD_LABEL_STYLE}>
                <div style={FIELD_TITLE_STYLE}>Affected on {d.teamNames.B}</div>
                <input type="number" inputMode="numeric" min={0} value={kickoff.pitchInvasionB} onChange={(e) => kickoff.setPitchInvasionB(e.target.value)} placeholder="0" style={SELECT_TALL_STYLE} />
              </label>
            </div>
          )}

          <BigButton label="Record Kick-off" onClick={kickoff.save} disabled={!kickoff.canRecord} testId="kickoff-confirm" />
        </div>
      </Modal>

    </div>
  );
}
