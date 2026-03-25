import { PLAYER_CAUSED_INJURY_CAUSES, getSppPlayerReference, normalizeInjuryCause, normalizeInjuryPayload, type ApothecaryOutcome, type InjuryPayload, type InjuryResult, type MatchEvent } from "./events";
import type { TeamId } from "./enums";
import { deriveDriveMeta } from "./drives";
import { getDriveSppModifierFromKickoff } from "../rules/bb2025/sppModifiers";
import type { MatchTeamMeta, TeamMeta } from "./teamMeta";
import { getSppPrayerDuration, isSppRelevantPrayer, type ActiveSppPrayer, type SppRelevantPrayer } from "./prayers";

export type RosterPlayer = { id: string; name: string; team: TeamId; teamMeta?: TeamMeta };
export type Rosters = { A: RosterPlayer[]; B: RosterPlayer[] };

export type SppReason = "touchdown" | "completion" | "interception" | "casualty" | "mvp" | "adjustment";

export type SppPlayerSummary = {
  id: string;
  name: string;
  team: TeamId;
  spp: number;
  totalSPP: number;
  mvp?: boolean;
  breakdown: Record<SppReason, number>;
};

export type SppSummary = {
  players: Record<string, SppPlayerSummary>;
  teams: Record<TeamId, number>;
};

export type SppTeamView = {
  team: TeamId;
  totalSPP: number;
  players: SppPlayerSummary[];
};

export type SppSummaryDebug = {
  isValid: boolean;
  teamTotalsByPlayers: Record<TeamId, number>;
  issues: string[];
};

export type SppDerivationOptions = {
  rosters: Rosters;
  teamMeta?: MatchTeamMeta;
  mvpSelections?: Partial<Record<TeamId, string>>;
};

type TeamSppReason = Exclude<SppReason, "adjustment">;

const emptyBreakdown = (): Record<SppReason, number> => ({
  touchdown: 0,
  completion: 0,
  interception: 0,
  casualty: 0,
  mvp: 0,
  adjustment: 0,
});

const ensurePlayer = (players: Record<string, SppPlayerSummary>, rosterMap: Map<string, RosterPlayer>, playerId: string, team: TeamId) => {
  if (!players[playerId]) {
    const fromRoster = rosterMap.get(playerId);
    players[playerId] = {
      id: playerId,
      name: fromRoster?.name ?? `Player ${playerId}`,
      team: fromRoster?.team ?? team,
      spp: 0,
      totalSPP: 0,
      breakdown: emptyBreakdown(),
    };
  }

  return players[playerId];
};

const addSpp = (player: SppPlayerSummary, reason: SppReason, delta: number) => {
  if (!Number.isFinite(delta) || delta === 0) return;
  player.breakdown[reason] += delta;
  player.spp += delta;
  player.totalSPP = player.spp;
};

const isCasualtyOutcome = (outcome: InjuryResult | ApothecaryOutcome | undefined) => outcome !== undefined && outcome !== "RECOVERED";
const playerCausedInjuryCauses = new Set(PLAYER_CAUSED_INJURY_CAUSES);

export const finalInjuryOutcome = (payload: InjuryPayload | undefined): InjuryResult | ApothecaryOutcome | undefined => {
  if (!payload) return undefined;
  const normalized = normalizeInjuryPayload(payload);
  if (normalized.apothecaryUsed && normalized.apothecaryOutcome) return normalized.apothecaryOutcome;
  return normalized.injuryResult;
};

const teamHasFlag = (meta: MatchTeamMeta | undefined, team: TeamId, flag: string) => Boolean(meta?.[team]?.spp?.flags?.includes(flag));
const teamHasTrait = (meta: MatchTeamMeta | undefined, team: TeamId, trait: string) => Boolean(meta?.[team]?.spp?.rosterTraits?.includes(trait));
const normalizeSpecialRuleName = (value: string) => value.trim().toLowerCase().replace(/[’']/g, "'");
const teamHasSpecialRule = (meta: MatchTeamMeta | undefined, team: TeamId, rule: string) =>
  Boolean(meta?.[team]?.specialRules?.some((specialRule) => normalizeSpecialRuleName(specialRule) === normalizeSpecialRuleName(rule)));

const getTeamSppOverrides = (teamMeta: MatchTeamMeta | undefined, team: TeamId): Partial<Record<TeamSppReason, number>> => {
  if (teamHasTrait(teamMeta, team, "brawlin-brutes") || teamHasSpecialRule(teamMeta, team, "Brawlin' Brutes")) {
    return {
      touchdown: 2,
      casualty: 3,
    };
  }
  return {};
};

const getTeamSppForReason = (base: number, teamMeta: MatchTeamMeta | undefined, team: TeamId, reason: TeamSppReason) =>
  getTeamSppOverrides(teamMeta, team)[reason] ?? base;

const getCompletionSpp = (base: number, teamMeta: MatchTeamMeta | undefined, team: TeamId) => {
  if (teamHasFlag(teamMeta, team, "no-completion-spp")) return 0;
  if (teamHasTrait(teamMeta, team, "extra-completion-spp")) return base + 1;
  return base;
};

const getCasualtySpp = (base: number, payload: ReturnType<typeof normalizeInjuryPayload>, teamMeta: MatchTeamMeta | undefined, team: TeamId) => {
  if (payload.apothecaryUsed && teamHasFlag(teamMeta, team, "no-apothecary-spp")) return 0;
  if (teamHasTrait(teamMeta, team, "extra-casualty-spp")) return base + 1;
  return base;
};

type TeamSppResolutionContext = {
  base: number;
  prayerBoostedBase: number;
  reason: TeamSppReason;
  payload?: ReturnType<typeof normalizeInjuryPayload>;
  teamMeta: MatchTeamMeta | undefined;
  team: TeamId;
};

const resolveTeamSppValue = ({ base, prayerBoostedBase, reason, payload, teamMeta, team }: TeamSppResolutionContext): number => {
  // Priority (explicit and deterministic):
  // 1) kickoff / standard base
  // 2) prayer floor (cannot stack as duplicate modifiers, only strongest floor applies)
  // 3) team/roster absolute overrides (e.g. Brawlin' Brutes) override base values
  // 4) team flags/traits as final gating/additive adjustment
  const withPrayer = Math.max(base, prayerBoostedBase);
  const withTeamOverrides = getTeamSppForReason(withPrayer, teamMeta, team, reason);
  if (reason === "completion") return getCompletionSpp(withTeamOverrides, teamMeta, team);
  return payload ? getCasualtySpp(withTeamOverrides, payload, teamMeta, team) : withTeamOverrides;
};

const buildPrayerAwareSppValues = (params: {
  activePrayers: SppRelevantPrayer[];
  completionBase: number;
  casualtyBase: number;
  injuryCause?: ReturnType<typeof normalizeInjuryCause>;
}) => {
  const { activePrayers, completionBase, casualtyBase, injuryCause } = params;

  const hasPrayer = (prayer: SppRelevantPrayer) => activePrayers.includes(prayer);
  const completionSpp = hasPrayer("perfect_passing") ? Math.max(completionBase, 2) : completionBase;

  const casualtyPrayerCandidates = [
    casualtyBase,
    injuryCause === "CROWD" && hasPrayer("fan_interaction") ? 2 : casualtyBase,
    injuryCause === "FOUL" && hasPrayer("fouling_frenzy") ? 2 : casualtyBase,
    (injuryCause === "BLOCK" || injuryCause === "FOUL") && hasPrayer("necessary_violence") ? 3 : casualtyBase,
  ];
  const casualtySppFromPrayer = Math.max(...casualtyPrayerCandidates);

  return {
    completionSpp,
    casualtySpp: casualtySppFromPrayer,
    allowCrowdCasualtySpp: injuryCause === "CROWD" && hasPrayer("fan_interaction"),
  };
};

export function deriveSppSummaryFromEvents(events: MatchEvent[], options: SppDerivationOptions): SppSummary {
  const { rosters, teamMeta, mvpSelections = {} } = options;
  const players: Record<string, SppPlayerSummary> = {};
  const rosterMap = new Map<string, RosterPlayer>();
  [...rosters.A, ...rosters.B].forEach((p) => rosterMap.set(p.id, p));

  const driveMeta = deriveDriveMeta(events);
  const latestSppPrayersByTeam: Record<TeamId, Partial<Record<SppRelevantPrayer, ActiveSppPrayer>>> = { A: {}, B: {} };

  const getActiveSppPrayersForTeam = (team: TeamId, driveIndex: number): SppRelevantPrayer[] =>
    Object.values(latestSppPrayersByTeam[team])
      .filter((entry): entry is ActiveSppPrayer => Boolean(entry))
      .filter((entry) => entry.duration === "until_end_of_game" || entry.sourceDriveIndex === driveIndex)
      .map((entry) => entry.prayer);

  for (const e of events) {
    const drive = driveMeta.eventDriveIndex.get(e.id) ?? 1;
    const kickoff = driveMeta.kickoffByDrive.get(drive);
    const modifier = kickoff ? getDriveSppModifierFromKickoff(kickoff.kickoffKey) : null;
    const activePrayersByTeam = {
      A: getActiveSppPrayersForTeam("A", drive),
      B: getActiveSppPrayersForTeam("B", drive),
    };

    if (e.type === "prayer_result" && (e.team === "A" || e.team === "B")) {
      const prayer = e.payload?.result;
      if (isSppRelevantPrayer(prayer)) {
        latestSppPrayersByTeam[e.team][prayer] = {
          prayer,
          duration: getSppPrayerDuration(prayer),
          sourceEventId: e.id,
          sourceDriveIndex: drive,
        };
      }
      continue;
    }

    if (e.type === "touchdown") {
      const playerRef = getSppPlayerReference(e);
      if (!playerRef) continue;
      const value = getTeamSppForReason(3, teamMeta, playerRef.team, "touchdown");
      addSpp(ensurePlayer(players, rosterMap, playerRef.playerId, playerRef.team), "touchdown", value);
      continue;
    }

    if (e.type === "completion") {
      const playerRef = getSppPlayerReference(e);
      if (!playerRef) continue;
      const base = modifier?.completionSpp ?? 1;
      const prayerAware = buildPrayerAwareSppValues({
        activePrayers: activePrayersByTeam[playerRef.team],
        completionBase: base,
        casualtyBase: modifier?.casualtySpp ?? 2,
      });
      const value = resolveTeamSppValue({
        base,
        prayerBoostedBase: prayerAware.completionSpp,
        reason: "completion",
        teamMeta,
        team: playerRef.team,
      });
      if (value === 0) continue;
      addSpp(ensurePlayer(players, rosterMap, playerRef.playerId, playerRef.team), "completion", value);
      continue;
    }

    if (e.type === "interception") {
      const playerRef = getSppPlayerReference(e);
      if (!playerRef) continue;
      addSpp(ensurePlayer(players, rosterMap, playerRef.playerId, playerRef.team), "interception", 2);
      continue;
    }

    if (e.type === "injury") {
      const playerRef = getSppPlayerReference(e);
      if (!playerRef) continue;
      const payload = normalizeInjuryPayload(e.payload);
      const outcome = finalInjuryOutcome(payload);
      if (!isCasualtyOutcome(outcome)) continue;
      const normalizedCause = normalizeInjuryCause(payload.cause);
      const prayerAware = buildPrayerAwareSppValues({
        activePrayers: activePrayersByTeam[playerRef.team],
        completionBase: modifier?.completionSpp ?? 1,
        casualtyBase: modifier?.casualtySpp ?? 2,
        injuryCause: normalizedCause,
      });
      if (!playerCausedInjuryCauses.has(normalizedCause) && !prayerAware.allowCrowdCasualtySpp) continue;
      const base = modifier?.casualtySpp ?? 2;
      const value = resolveTeamSppValue({
        base,
        prayerBoostedBase: prayerAware.casualtySpp,
        reason: "casualty",
        payload,
        teamMeta,
        team: playerRef.team,
      });
      if (value === 0) continue;
      addSpp(ensurePlayer(players, rosterMap, playerRef.playerId, playerRef.team), "casualty", value);
      continue;
    }

    if (e.type === "mvp_awarded") {
      const playerRef = getSppPlayerReference(e);
      if (!playerRef) continue;
      const entry = ensurePlayer(players, rosterMap, playerRef.playerId, playerRef.team);
      addSpp(entry, "mvp", 4);
      entry.mvp = true;
      continue;
    }

    if (e.type === "spp_adjustment") {
      if (e.payload?.target !== "player") continue;
      const playerRef = getSppPlayerReference(e);
      if (!playerRef) continue;
      const delta = Number(e.payload?.delta ?? 0);
      if (delta === 0) continue;
      addSpp(ensurePlayer(players, rosterMap, playerRef.playerId, playerRef.team), "adjustment", delta);
    }
  }

  (["A", "B"] as TeamId[]).forEach((team) => {
    const mvpPlayerId = mvpSelections[team];
    if (!mvpPlayerId) return;
    const entry = ensurePlayer(players, rosterMap, mvpPlayerId, team);
    addSpp(entry, "mvp", 4);
    entry.mvp = true;
  });

  const teams: Record<TeamId, number> = { A: 0, B: 0 };
  Object.values(players).forEach((player) => {
    teams[player.team] += player.totalSPP;
  });

  return { players, teams };
}

export function sortPlayersForTeam(summary: SppSummary, team: TeamId): SppPlayerSummary[] {
  return Object.values(summary.players)
    .filter((p) => p.team === team)
    .sort((a, b) => b.totalSPP - a.totalSPP || a.name.localeCompare(b.name));
}

export function buildSppTeamView(summary: SppSummary, team: TeamId): SppTeamView {
  return {
    team,
    totalSPP: summary.teams[team],
    players: sortPlayersForTeam(summary, team),
  };
}

export function validateSppSummary(summary: SppSummary): SppSummaryDebug {
  const teams: TeamId[] = ["A", "B"];
  const issues: string[] = [];

  const teamTotalsByPlayers: Record<TeamId, number> = { A: 0, B: 0 };

  for (const player of Object.values(summary.players)) {
    if (player.totalSPP < 0) issues.push(`Player ${player.id} has negative totalSPP (${player.totalSPP})`);
    if (player.spp < 0) issues.push(`Player ${player.id} has negative spp (${player.spp})`);
    teamTotalsByPlayers[player.team] += player.totalSPP;
  }

  for (const team of teams) {
    if (summary.teams[team] < 0) issues.push(`Team ${team} has negative total SPP (${summary.teams[team]})`);
    if (teamTotalsByPlayers[team] !== summary.teams[team]) {
      issues.push(`Team ${team} total mismatch: team=${summary.teams[team]}, players=${teamTotalsByPlayers[team]}`);
    }
  }

  return {
    isValid: issues.length === 0,
    teamTotalsByPlayers,
    issues,
  };
}
