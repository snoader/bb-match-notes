import { useMemo, useState } from "react";
import { useMatchStore } from "../../store/matchStore";
import { PlayerPicker } from "../components/PlayerPicker";
import { ExportSheet } from "../components/export/ExportSheet";
import { useIsSmallScreen } from "../hooks/useIsSmallScreen";
import { PLAYER_SLOTS, type PlayerSlot, type TeamId } from "../../domain/enums";
import { getSppPlayerReference } from "../../domain/events";
import { buildSppTeamView, deriveSppSummaryFromEvents } from "../../domain/spp";

const formatBreakdown = (value: number, label: string) => (value > 0 ? `${label} ${value}` : null);

export function EndGameScreen() {
  const events = useMatchStore((s) => s.events);
  const d = useMatchStore((s) => s.derived);
  const mvp = useMatchStore((s) => s.mvp);
  const setMvpForTeam = useMatchStore((s) => s.setMvpForTeam);
  const [exportOpen, setExportOpen] = useState(false);
  const isSmallScreen = useIsSmallScreen();

  const rosters = useMemo(() => {
    const known = { A: new Set<string>(), B: new Set<string>() };
    for (const e of events) {
      const sppPlayerRef = getSppPlayerReference(e);
      if (sppPlayerRef) known[sppPlayerRef.team].add(sppPlayerRef.playerId);
      if (e.type === "injury") {
        const victimTeamId = e.payload?.victimTeam === "A" || e.payload?.victimTeam === "B" ? (e.payload.victimTeam as TeamId) : undefined;
        if (victimTeamId && e.payload?.victimPlayerId) known[victimTeamId].add(String(e.payload.victimPlayerId));
      }
    }

    const defaults = PLAYER_SLOTS.map((slot) => String(slot));
    const toRoster = (team: TeamId, teamName: string) => {
      const ids = known[team].size ? [...known[team]] : defaults;
      return ids.map((id) => ({ id, team, name: `${teamName} #${id}`, teamMeta: d.teamMeta?.[team] }));
    };

    return { A: toRoster("A", d.teamNames.A), B: toRoster("B", d.teamNames.B) };
  }, [events, d.teamMeta, d.teamNames]);

  const sppSummary = useMemo(
    () =>
      deriveSppSummaryFromEvents(events, {
        rosters,
        teamMeta: d.teamMeta,
        mvpSelections: { A: mvp.A ?? undefined, B: mvp.B ?? undefined },
      }),
    [events, rosters, d.teamMeta, mvp.A, mvp.B],
  );

  const teamSppViews = useMemo(
    () => [
      { id: "A" as TeamId, name: d.teamNames.A, view: buildSppTeamView(sppSummary, "A") },
      { id: "B" as TeamId, name: d.teamNames.B, view: buildSppTeamView(sppSummary, "B") },
    ],
    [d.teamNames, sppSummary],
  );

  const totalMatchSpp = sppSummary.teams.A + sppSummary.teams.B;

  return (
    <div style={{ padding: 12, display: "grid", gap: 16 }}>
      <h2 style={{ margin: 0 }}>Game finished</h2>
      <div style={{ fontWeight: 700 }}>{d.teamNames.A} {d.score.A} : {d.score.B} {d.teamNames.B}</div>

      <div style={{ display: "grid", gap: 8 }}>
        <h3 style={{ margin: 0 }}>Post-Game SPP Summary</h3>
        <div style={{ fontWeight: 700 }}>Total Match SPP: {totalMatchSpp}</div>

        <div style={{ display: "grid", gap: 12 }}>
          {teamSppViews.map(({ id, name, view }) => (
            <section key={id} style={{ border: "1px solid var(--color-border)", borderRadius: 12, padding: 10, display: "grid", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontWeight: 700 }}>
                <span>{name}</span>
                <span>Team Total: {view.totalSPP} SPP</span>
              </div>

              {view.players.length === 0 ? (
                <div style={{ color: "var(--color-text-muted)" }}>No SPP recorded yet.</div>
              ) : (
                <div style={{ display: "grid", gap: 6 }}>
                  {view.players.map((player) => {
                    const breakdown = [
                      formatBreakdown(player.breakdown.touchdown, "TD"),
                      formatBreakdown(player.breakdown.completion, "Comp"),
                      formatBreakdown(player.breakdown.interception, "Int"),
                      formatBreakdown(player.breakdown.casualty, "Cas"),
                      formatBreakdown(player.breakdown.mvp, "MVP"),
                      formatBreakdown(player.breakdown.adjustment, "Adj"),
                    ].filter(Boolean);

                    return (
                      <div key={player.id} style={{ border: "1px solid var(--color-border)", borderRadius: 10, padding: "8px 10px", display: "grid", gap: 4 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                          <span style={{ fontWeight: 600 }}>{player.name}{player.mvp ? " (MVP)" : ""}</span>
                          <span style={{ fontWeight: 700 }}>{player.totalSPP} SPP</span>
                        </div>
                        {breakdown.length > 0 && <div style={{ color: "var(--color-text-muted)", fontSize: 13 }}>{breakdown.join(" · ")}</div>}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        <h3 style={{ margin: 0 }}>Select MVPs</h3>

        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ fontWeight: 700 }}>Team A MVP</div>
          <PlayerPicker
            label="Select Player"
            value={(mvp.A as PlayerSlot | null) ?? ""}
            onChange={(value) => setMvpForTeam("A", String(value))}
            allowEmpty
            onClear={() => setMvpForTeam("A", null)}
          />
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ fontWeight: 700 }}>Team B MVP</div>
          <PlayerPicker
            label="Select Player"
            value={(mvp.B as PlayerSlot | null) ?? ""}
            onChange={(value) => setMvpForTeam("B", String(value))}
            allowEmpty
            onClear={() => setMvpForTeam("B", null)}
          />
        </div>
      </div>

      <button
        onClick={() => setExportOpen(true)}
        style={{ minHeight: 44, borderRadius: 12, border: "1px solid var(--color-primary)", background: "var(--color-primary)", color: "var(--color-primary-contrast)", fontWeight: 800, padding: "10px 12px" }}
      >
        Export Match Report
      </button>

      <ExportSheet
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        events={events}
        derived={d}
        rosters={rosters}
        isSmallScreen={isSmallScreen}
        mvpSelections={{ A: mvp.A ?? undefined, B: mvp.B ?? undefined }}
      />
    </div>
  );
}
