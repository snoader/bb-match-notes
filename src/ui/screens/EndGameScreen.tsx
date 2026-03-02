import { useMemo, useState } from "react";
import { useMatchStore } from "../../store/matchStore";
import { PlayerPicker } from "../components/PlayerPicker";
import { ExportSheet } from "../components/export/ExportSheet";
import { useIsSmallScreen } from "../hooks/useIsSmallScreen";
import { PLAYER_SLOTS, type PlayerSlot, type TeamId } from "../../domain/enums";

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
      if (e.type === "touchdown" && e.team && e.payload?.player) known[e.team].add(String(e.payload.player));
      if (e.type === "completion" && e.team && e.payload?.passer) known[e.team].add(String(e.payload.passer));
      if (e.type === "interception" && e.team && e.payload?.player) known[e.team].add(String(e.payload.player));
      if (e.type === "injury") {
        if (e.team && e.payload?.causerPlayerId) known[e.team].add(String(e.payload.causerPlayerId));
        const victimTeamId = e.payload?.victimTeam === "A" || e.payload?.victimTeam === "B" ? (e.payload.victimTeam as TeamId) : undefined;
        if (victimTeamId && e.payload?.victimPlayerId) known[victimTeamId].add(String(e.payload.victimPlayerId));
      }
    }

    const defaults = PLAYER_SLOTS.map((slot) => String(slot));
    const toRoster = (team: TeamId, teamName: string) => {
      const ids = known[team].size ? [...known[team]] : defaults;
      return ids.map((id) => ({ id, team, name: `${teamName} #${id}` }));
    };

    return { A: toRoster("A", d.teamNames.A), B: toRoster("B", d.teamNames.B) };
  }, [events, d.teamNames]);

  return (
    <div style={{ padding: 12, display: "grid", gap: 16 }}>
      <h2 style={{ margin: 0 }}>Game finished</h2>
      <div style={{ fontWeight: 700 }}>{d.teamNames.A} {d.score.A} : {d.score.B} {d.teamNames.B}</div>

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
        style={{ minHeight: 44, borderRadius: 12, border: "1px solid #111", background: "#111", color: "#fff", fontWeight: 800, padding: "10px 12px" }}
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
