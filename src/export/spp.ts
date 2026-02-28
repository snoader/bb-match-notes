import type { MatchEvent } from "../domain/events";
import type { TeamId } from "../domain/enums";
import { deriveDriveMeta } from "../domain/drives";
import { getDriveSppModifierFromKickoff } from "../rules/bb2025/sppModifiers";
import { isFinalCasualty } from "./casualtyOutcome";

export type RosterPlayer = { id: string; name: string; team: TeamId };
export type Rosters = { A: RosterPlayer[]; B: RosterPlayer[] };

export type SppPlayerSummary = {
  id: string;
  name: string;
  team: TeamId;
  spp: number;
  mvp?: boolean;
};

export type SppSummary = {
  players: Record<string, SppPlayerSummary>;
  teams: Record<TeamId, number>;
};

const ensurePlayer = (players: Record<string, SppPlayerSummary>, rosterMap: Map<string, RosterPlayer>, playerId: string, team: TeamId) => {
  if (!players[playerId]) {
    const fromRoster = rosterMap.get(playerId);
    players[playerId] = {
      id: playerId,
      name: fromRoster?.name ?? `Player ${playerId}`,
      team: fromRoster?.team ?? team,
      spp: 0,
    };
  }

  return players[playerId];
};

export function deriveSppFromEvents(events: MatchEvent[], rosters: Rosters, mvpSelections: Partial<Record<TeamId, string>> = {}): SppSummary {
  const players: Record<string, SppPlayerSummary> = {};
  const rosterMap = new Map<string, RosterPlayer>();
  [...rosters.A, ...rosters.B].forEach((p) => rosterMap.set(p.id, p));

  const driveMeta = deriveDriveMeta(events);

  for (const e of events) {
    const drive = driveMeta.eventDriveIndex.get(e.id) ?? 1;
    const kickoff = driveMeta.kickoffByDrive.get(drive);
    const modifier = kickoff ? getDriveSppModifierFromKickoff(kickoff.kickoffKey) : null;

    if (e.type === "touchdown" && e.team && e.payload?.player) {
      ensurePlayer(players, rosterMap, String(e.payload.player), e.team).spp += 3;
    }

    if (e.type === "completion" && e.team && e.payload?.passer) {
      ensurePlayer(players, rosterMap, String(e.payload.passer), e.team).spp += modifier?.completionSpp ?? 1;
    }

    if (e.type === "interception" && e.team && e.payload?.player) {
      ensurePlayer(players, rosterMap, String(e.payload.player), e.team).spp += 2;
    }

    if (e.type === "injury" && e.team && e.payload?.causerPlayerId) {
      if (isFinalCasualty(e.payload) && (e.payload?.cause !== "CROWD" || modifier?.allowCrowdCasualtySpp)) {
        ensurePlayer(players, rosterMap, String(e.payload.causerPlayerId), e.team).spp += modifier?.casualtySpp ?? 2;
      }
    }
  }

  (["A", "B"] as TeamId[]).forEach((team) => {
    const mvpPlayerId = mvpSelections[team];
    if (!mvpPlayerId) return;
    const entry = ensurePlayer(players, rosterMap, mvpPlayerId, team);
    entry.spp += 4;
    entry.mvp = true;
  });

  const teams: Record<TeamId, number> = { A: 0, B: 0 };
  Object.values(players).forEach((player) => {
    teams[player.team] += player.spp;
  });

  return { players, teams };
}

export function sortPlayersForTeam(summary: SppSummary, team: TeamId): SppPlayerSummary[] {
  return Object.values(summary.players)
    .filter((p) => p.team === team)
    .sort((a, b) => b.spp - a.spp || a.name.localeCompare(b.name));
}
