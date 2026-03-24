import { useCallback, useMemo, useState } from "react";
import { Modal, BigButton } from "../components/Modal";
import { ExportSheet } from "../components/export/ExportSheet";
import { useIsSmallScreen } from "../hooks/useIsSmallScreen";
import { useAppStore } from "../../store/appStore";
import { useMatchStore } from "../../store/matchStore";
import { useThemeStore } from "../../store/themeStore";
import { THEME_OPTIONS } from "../../theme/themes";
import { PLAYER_SLOTS, type TeamId } from "../../domain/enums";
import { getSppPlayerReference } from "../../domain/events";

const CONFIRM_STACK_STYLE = { display: "grid", gap: 12 } as const;
const LEFT_TEXT_STYLE = { textAlign: "left" } as const;

function themeOptionLabel(isActive: boolean, label: string) {
  return isActive ? `✔ ${label}` : label;
}

function getKnownRosters(events: ReturnType<typeof useMatchStore.getState>["events"], teamNames: { A: string; B: string }, teamMeta: ReturnType<typeof useMatchStore.getState>["derived"]["teamMeta"]) {
  const known = { A: new Set<string>(), B: new Set<string>() };
  for (const event of events) {
    const sppPlayerRef = getSppPlayerReference(event);
    if (sppPlayerRef) known[sppPlayerRef.team].add(sppPlayerRef.playerId);
    if (event.type === "injury") {
      const victimTeamId = event.payload?.victimTeam === "A" || event.payload?.victimTeam === "B" ? (event.payload.victimTeam as TeamId) : undefined;
      if (victimTeamId && event.payload?.victimPlayerId) known[victimTeamId].add(String(event.payload.victimPlayerId));
    }
  }

  const defaults = PLAYER_SLOTS.map((slot) => String(slot));
  const toRoster = (team: TeamId, teamName: string) => {
    const ids = known[team].size ? [...known[team]] : defaults;
    return ids.map((id) => ({ id, team, name: `${teamName} #${id}`, teamMeta: teamMeta?.[team] }));
  };

  return { A: toRoster("A", teamNames.A), B: toRoster("B", teamNames.B) };
}

export function HamburgerMenu() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [restartConfirmOpen, setRestartConfirmOpen] = useState(false);
  const [iosInstallHelpOpen, setIosInstallHelpOpen] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);
  const isSmallScreen = useIsSmallScreen();

  const events = useMatchStore((s) => s.events);
  const derived = useMatchStore((s) => s.derived);
  const mvp = useMatchStore((s) => s.mvp);
  const undoLast = useMatchStore((s) => s.undoLast);
  const resetMatch = useMatchStore((s) => s.resetAll);

  const setScreen = useAppStore((s) => s.setScreen);
  const installed = useAppStore((s) => s.installed);
  const canInstallPrompt = useAppStore((s) => s.canInstallPrompt);
  const canShowIosInstallHelp = useAppStore((s) => s.canShowIosInstallHelp);
  const promptInstall = useAppStore((s) => s.promptInstall);
  const updateAvailable = useAppStore((s) => s.updateAvailable);
  const applyUpdate = useAppStore((s) => s.applyUpdate);

  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);

  const appVersion = __APP_VERSION__ as string | undefined;

  const rosters = useMemo(() => getKnownRosters(events, derived.teamNames, derived.teamMeta), [events, derived.teamMeta, derived.teamNames]);

  async function confirmRestartMatch() {
    if (isRestarting) return;
    setIsRestarting(true);
    await resetMatch();
    setRestartConfirmOpen(false);
    setMenuOpen(false);
    setScreen("start");
    setIsRestarting(false);
  }

  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const closeExport = useCallback(() => setExportOpen(false), []);
  const closeRestartConfirm = useCallback(() => {
    if (!isRestarting) setRestartConfirmOpen(false);
  }, [isRestarting]);

  const handleMenuExport = useCallback(() => {
    setMenuOpen(false);
    setExportOpen(true);
  }, []);

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

  return (
    <>
      <button className="live-menu-trigger" onClick={() => setMenuOpen(true)} aria-label="Open match actions menu">
        ☰
      </button>

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
            <div className="live-menu-section-title">Appearance</div>
            <div className="live-menu-actions">
              {THEME_OPTIONS.map((option) => {
                const isActive = theme === option.value;
                return (
                  <button
                    key={option.value}
                    className={`live-menu-action-button ${isActive ? "live-menu-action-button-active" : ""}`}
                    onClick={() => setTheme(option.value)}
                    aria-pressed={isActive}
                  >
                    {themeOptionLabel(isActive, option.label)}
                  </button>
                );
              })}
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
              {appVersion && <div className="live-menu-version">Blood Bowl Note Taker — v{appVersion}</div>}
              {!updateAvailable && installed && !appVersion && <div className="live-menu-empty-state">Keine weiteren App-Aktionen verfügbar.</div>}
            </div>
          </div>
        </div>
      </Modal>

      <Modal open={iosInstallHelpOpen} title="App installieren (iOS)" onClose={() => setIosInstallHelpOpen(false)}>
        <div style={{ display: "grid", gap: 10 }}>
          <div style={LEFT_TEXT_STYLE}>1) In Safari auf Teilen tippen</div>
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

      <ExportSheet open={exportOpen} onClose={closeExport} events={events} derived={derived} rosters={rosters} isSmallScreen={isSmallScreen} mvpSelections={{ A: mvp.A ?? undefined, B: mvp.B ?? undefined }} />
    </>
  );
}
