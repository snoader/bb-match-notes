import { teamLabel } from "../../store/matchStore";
import { Modal, BigButton } from "../components/Modal";
import type { ApothecaryOutcome, InjuryCause, InjuryResult, StatReduction } from "../../domain/events";
import type { TeamId } from "../../domain/enums";
import { PlayerPicker } from "../components/PlayerPicker";
import { ScoreBoard } from "../components/live/ScoreBoard";
import { KickoffBanner } from "../components/live/KickoffBanner";
import { ResourcesPanel } from "../components/live/ResourcesPanel";
import { TurnTracker } from "../components/live/TurnTracker";
import { ActionsPanel } from "../components/live/ActionsPanel";
import {
  apoOutcomes,
  causesWithCauser,
  injuryCauses,
  injuryResults,
  normalizeInjuryPayload,
  statReductions,
  useLiveMatch,
} from "../hooks/useLiveMatch";

export function LiveMatchScreen() {
  const live = useLiveMatch();
  const { isReady, events, d, hasMatch, turnButtons, kickoffOptions, kickoffMapped, rosters } = live;
  const { kickoffAllowed, touchdownAllowed, completionAllowed, interceptionAllowed, casualtyAllowed } = live.guards;
  const { undoLast, doNextTurn, setTurn, consumeResource, exportWithAction, shareJSONQuick } = live.actions;
  const { touchdown, completion, interception, injury, kickoff, exportState } = live;

  if (!isReady) return <div style={{ padding: 12, opacity: 0.7 }}>Loading…</div>;

  return (
    <div className="live-screen">
      <div className="live-header-row">
        <div style={{ fontWeight: 800, fontSize: 18, overflowWrap: "anywhere" }}>BB Match Notes</div>
        <div className="live-header-actions">
          <button
            onClick={shareJSONQuick}
            style={{ padding: "10px 12px", borderRadius: 14, border: "1px solid #ddd", background: "#fafafa", fontWeight: 700, minHeight: 44 }}
            disabled={!events.length}
          >
            Share JSON
          </button>
          <button
            onClick={() => exportState.setOpen(true)}
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

      <ScoreBoard teamNames={d.teamNames} score={d.score} half={d.half} turn={d.turn} weather={d.weather} />

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

      <Modal open={injury.open} title="Injury" onClose={() => injury.setOpen(false)}>
        <div style={{ display: "grid", gap: 10 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontWeight: 800 }}>Attacker team</div>
            <select
              value={injury.team}
              onChange={(e) => injury.setTeam(e.target.value as TeamId)}
              style={{ padding: 12, borderRadius: 14, border: "1px solid #ddd" }}
            >
              <option value="A">{d.teamNames.A}</option>
              <option value="B">{d.teamNames.B}</option>
            </select>
          </label>

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

          <PlayerPicker label="Victim player" value={injury.victimPlayerId} onChange={(v) => injury.setVictimPlayerId(v)} />

          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontWeight: 800 }}>Cause</div>
            <select value={injury.cause} onChange={(e) => injury.setCause(e.target.value as InjuryCause)} style={{ padding: 12, borderRadius: 14, border: "1px solid #ddd" }}>
              {injuryCauses.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </label>

          {causesWithCauser.has(injury.cause) && (
            <PlayerPicker label="Causer player" value={injury.causerPlayerId} onChange={(v) => injury.setCauserPlayerId(v)} />
          )}

          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontWeight: 800 }}>Injury result</div>
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
            label="Save Injury"
            onClick={injury.save}
            disabled={!injury.victimPlayerId || (causesWithCauser.has(injury.cause) && !injury.causerPlayerId)}
          />
        </div>
      </Modal>

      <Modal open={kickoff.open} title="Kick-off Event" onClose={() => kickoff.setOpen(false)}>
        <div data-testid="kickoff-modal" style={{ display: "grid", gap: 10 }}>
          {kickoff.message && <div style={{ color: "#b45309", fontWeight: 700 }}>{kickoff.message}</div>}
          <div style={{ fontWeight: 700 }}>Drive {d.driveIndexCurrent}</div>
          <div className="live-action-grid">
            <button data-testid="kickoff-kicking-a" onClick={() => kickoff.setKickingTeam("A")} style={{ padding: "12px 10px", borderRadius: 14, border: kickoff.kickingTeam === "A" ? "1px solid #111" : "1px solid #ddd", background: kickoff.kickingTeam === "A" ? "#111" : "#fafafa", color: kickoff.kickingTeam === "A" ? "white" : "#111", fontWeight: 900 }}>
              {d.teamNames.A} kicking
            </button>
            <button data-testid="kickoff-kicking-b" onClick={() => kickoff.setKickingTeam("B")} style={{ padding: "12px 10px", borderRadius: 14, border: kickoff.kickingTeam === "B" ? "1px solid #111" : "1px solid #ddd", background: kickoff.kickingTeam === "B" ? "#111" : "#fafafa", color: kickoff.kickingTeam === "B" ? "white" : "#111", fontWeight: 900 }}>
              {d.teamNames.B} kicking
            </button>
          </div>
          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontWeight: 800 }}>Kick-off event</div>
            <select
              data-testid="kickoff-roll"
              value={kickoff.roll}
              onChange={(e) => kickoff.setRoll(Number(e.target.value))}
              style={{ padding: 12, borderRadius: 14, border: "1px solid #ddd" }}
            >
              {kickoffOptions.map((option) => (
                <option key={option.roll} value={option.roll}>{option.label} ({option.roll})</option>
              ))}
            </select>
          </label>
          <div><strong>Result:</strong> {kickoffMapped.label} ({kickoffMapped.key})</div>
          <BigButton label="Confirm Kick-off" onClick={kickoff.save} disabled={!kickoffAllowed} testId="kickoff-confirm" />

        </div>
      </Modal>

      <Modal open={exportState.open} title="Export" onClose={() => exportState.setOpen(false)}>
        <div style={{ display: "grid", gap: 10 }}>
          <BigButton label="PDF" onClick={() => { exportState.setFormat("pdf"); exportState.setOpen(false); exportState.setMvpOpen(true); }} />
          <BigButton label="TXT" onClick={() => exportState.setFormat("txt")} secondary />
          <BigButton label="JSON" onClick={() => exportState.setFormat("json")} secondary />
        </div>
      </Modal>

      <Modal open={exportState.format === "txt" || exportState.format === "json"} title={`Export ${String(exportState.format).toUpperCase()}`} onClose={() => exportState.setFormat(null)}>
        <div style={{ display: "grid", gap: 10 }}>
          <BigButton label="Share" onClick={() => exportWithAction(exportState.format!, "share")} testId="export-share" />
          <BigButton label="Download" onClick={() => exportWithAction(exportState.format!, "download")} secondary testId="export-download" />
        </div>
      </Modal>

      <Modal open={exportState.mvpOpen} title="Select MVP (PDF only)" onClose={() => exportState.setMvpOpen(false)}>
        <div style={{ display: "grid", gap: 10 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontWeight: 800 }}>{d.teamNames.A} MVP</div>
            <select value={exportState.mvpA} onChange={(e) => exportState.setMvpA(e.target.value)} style={{ padding: 12, borderRadius: 14, border: "1px solid #ddd" }}>
              <option value="">— none —</option>
              {rosters.A.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontWeight: 800 }}>{d.teamNames.B} MVP</div>
            <select value={exportState.mvpB} onChange={(e) => exportState.setMvpB(e.target.value)} style={{ padding: 12, borderRadius: 14, border: "1px solid #ddd" }}>
              <option value="">— none —</option>
              {rosters.B.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>
          <BigButton label="Share PDF" onClick={() => exportWithAction("pdf", "share", { A: exportState.mvpA || undefined, B: exportState.mvpB || undefined })} testId="export-share" />
          <BigButton label="Download PDF" onClick={() => exportWithAction("pdf", "download", { A: exportState.mvpA || undefined, B: exportState.mvpB || undefined })} secondary testId="export-download" />
          <BigButton label="Print PDF" onClick={() => exportWithAction("pdf", "print", { A: exportState.mvpA || undefined, B: exportState.mvpB || undefined })} secondary testId="export-print" />
        </div>
      </Modal>
    </div>
  );
}
