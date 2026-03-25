import { deriveDriveMeta } from "./drives";
import { getSppPlayerReference, type MatchEvent, type KickoffEventPayload, type TeamResourcesPayload } from "./events";
import { normalizeMatchTeamMeta, type MatchTeamMeta } from "./teamMeta";
import type { TeamId, InducementKind } from "./enums";
import { PLAYER_SLOTS } from "./enums";
import { deriveSppSummaryFromEvents, type Rosters, type SppSummary } from "./spp";

type Resources = { rerolls: number; hasApothecary: boolean; apothecaryUsed: boolean };
type TeamFans = { existingFans: number; fansRoll: number };
type MatchResult = "win" | "draw" | "loss";

type TeamTreasuryDeltaInputs = {
  touchdownsScored: number;
  touchdownsConceded: number;
  existingFans: number;
  fansRoll: number;
  stallingRollTotal: number;
  stallingEvents: number;
  matchResult: MatchResult;
};

type TeamTreasuryDelta = {
  winningsDelta: number;
  isProjected: true;
  inputs: TeamTreasuryDeltaInputs;
  breakdown: {
    fanFactorDelta: number;
    touchdownDelta: number;
    stallingDelta: number;
    resultDelta: number;
  };
};

type TeamFinalTreasuryDelta = {
  treasuryDelta: number;
  winningsDelta: number;
  isProjected: false;
  inputs: TeamTreasuryDeltaInputs;
  breakdown: {
    base: number;
    touchdownsContribution: number;
    stallingAdjustment: number;
  };
};

type InducementEntry = { team: TeamId; kind: InducementKind; detail?: string };

export type DerivedMatchState = {
  teamNames: { A: string; B: string };
  score: { A: number; B: number };
  half: number;
  turn: number;
  roundNumber: number;
  currentRoundNumber: number;
  activeTeamId?: TeamId;
  teamTurnIndex: number;
  teamTurnSequence: number;
  resources: { A: Resources; B: Resources };
  fans: { A: TeamFans; B: TeamFans };
  teamMeta: MatchTeamMeta;
  weather?: string;
  inducementsBought: InducementEntry[];
  driveIndexCurrent: number;
  kickoffPending: boolean;
  driveKickoff: KickoffEventPayload | null;
  kickoffByDrive: Map<number, KickoffEventPayload>;
  turnMarkers: { A: number; B: number };
  playerSpp: SppSummary;
  treasuryDelta: { A: TeamTreasuryDelta; B: TeamTreasuryDelta };
  finalTreasuryDelta: { A: TeamFinalTreasuryDelta; B: TeamFinalTreasuryDelta };
};

const defaultResources = (): Resources => ({ rerolls: 0, hasApothecary: false, apothecaryUsed: false });
const defaultTeamFans = (): TeamFans => ({ existingFans: 0, fansRoll: 0 });

function normalizeHasApothecary(resources?: TeamResourcesPayload) {
  if (!resources) return false;
  if (typeof resources.hasApothecary === "boolean") return resources.hasApothecary;
  return Number(resources.apothecary ?? 0) > 0;
}

const getChangingWeather = (payload: unknown): string | undefined => {
  if (!payload || typeof payload !== "object") return undefined;
  const kickoff = payload as Partial<KickoffEventPayload>;
  if (kickoff.kickoffKey !== "CHANGING_WEATHER") return undefined;
  const details = kickoff.details;
  if (!details || typeof details !== "object") return undefined;
  const newWeather = (details as { newWeather?: unknown }).newWeather;
  return typeof newWeather === "string" ? newWeather : undefined;
};

const clampTurnMarker = (turn: number): number => Math.max(1, Math.min(8, Math.round(turn)));
const getTimeOutDelta = (kickingTeamMarker: number): -1 | 1 => (kickingTeamMarker >= 6 ? -1 : 1);
const clampTeamTurnIndex = (index: number): number => Math.max(0, Math.round(index));
const normalizeRoundNumber = (roundNumber: number): number => clampTurnMarker(roundNumber);
const getNextActiveTeam = (teamId?: TeamId): TeamId | undefined =>
  teamId === "A" ? "B" : teamId === "B" ? "A" : undefined;
const deriveMatchResult = (team: TeamId, score: { A: number; B: number }): MatchResult => {
  const own = score[team];
  const opp = score[team === "A" ? "B" : "A"];
  if (own > opp) return "win";
  if (own < opp) return "loss";
  return "draw";
};
const TOUCHDOWN_DELTA = 10_000;
const FAN_FACTOR_DELTA = 10_000;
const STALLING_ROLL_DELTA = 1_000;
const MATCH_RESULT_DELTA: Record<MatchResult, number> = { win: 10_000, draw: 0, loss: -10_000 };

const normalizeStallingRoll = (rollResult: unknown): number => {
  const parsed = Number(rollResult);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.round(parsed);
};

const buildTeamProjectedWinningsDelta = (params: {
  team: TeamId;
  score: { A: number; B: number };
  fans: TeamFans;
  stallingRollTotal: number;
  stallingEvents: number;
}): TeamTreasuryDelta => {
  const { team, score, fans, stallingRollTotal, stallingEvents } = params;
  const touchdownsScored = score[team];
  const touchdownsConceded = score[team === "A" ? "B" : "A"];
  const matchResult = deriveMatchResult(team, score);
  const fanFactorDelta = (fans.existingFans + fans.fansRoll) * FAN_FACTOR_DELTA;
  const touchdownDelta = touchdownsScored * TOUCHDOWN_DELTA;
  const rawStallingDelta = -(stallingRollTotal * STALLING_ROLL_DELTA);
  const stallingDelta = Object.is(rawStallingDelta, -0) ? 0 : rawStallingDelta;
  const resultDelta = MATCH_RESULT_DELTA[matchResult];
  const winningsDelta = fanFactorDelta + touchdownDelta + stallingDelta + resultDelta;

  return {
    winningsDelta,
    isProjected: true,
    inputs: {
      touchdownsScored,
      touchdownsConceded,
      existingFans: fans.existingFans,
      fansRoll: fans.fansRoll,
      stallingRollTotal,
      stallingEvents,
      matchResult,
    },
    breakdown: {
      fanFactorDelta,
      touchdownDelta,
      stallingDelta,
      resultDelta,
    },
  };
};

const buildTreasuryDelta = (score: { A: number; B: number }, fans: { A: TeamFans; B: TeamFans }, stallingByTeam: { A: number; B: number }, stallingCountByTeam: { A: number; B: number }) => ({
  A: {
    ...buildTeamProjectedWinningsDelta({
      team: "A",
      score,
      fans: fans.A,
      stallingRollTotal: stallingByTeam.A,
      stallingEvents: stallingCountByTeam.A,
    }),
  },
  B: {
    ...buildTeamProjectedWinningsDelta({
      team: "B",
      score,
      fans: fans.B,
      stallingRollTotal: stallingByTeam.B,
      stallingEvents: stallingCountByTeam.B,
    }),
  },
});

const buildTeamFinalTreasuryDelta = (projected: TeamTreasuryDelta): TeamFinalTreasuryDelta => {
  const base = projected.breakdown.fanFactorDelta + projected.breakdown.resultDelta;
  const touchdownsContribution = projected.breakdown.touchdownDelta;
  const stallingAdjustment = projected.breakdown.stallingDelta;
  const winningsDelta = base + touchdownsContribution + stallingAdjustment;

  return {
    treasuryDelta: winningsDelta,
    winningsDelta,
    isProjected: false,
    inputs: { ...projected.inputs },
    breakdown: {
      base,
      touchdownsContribution,
      stallingAdjustment,
    },
  };
};

const buildFinalTreasuryDelta = (projected: { A: TeamTreasuryDelta; B: TeamTreasuryDelta }) => ({
  A: buildTeamFinalTreasuryDelta(projected.A),
  B: buildTeamFinalTreasuryDelta(projected.B),
});

const inferRostersFromEvents = (events: MatchEvent[], teamNames: { A: string; B: string }, teamMeta: MatchTeamMeta): Rosters => {
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
};

const syncSharedRoundState = (state: Pick<DerivedMatchState, "turn" | "roundNumber" | "currentRoundNumber" | "teamTurnIndex" | "teamTurnSequence">) => {
  state.roundNumber = normalizeRoundNumber(state.roundNumber);
  state.currentRoundNumber = state.roundNumber;
  state.turn = state.currentRoundNumber;
  state.teamTurnIndex = clampTeamTurnIndex(state.teamTurnIndex);
  state.teamTurnSequence = state.teamTurnIndex;
};

const advanceActiveTeamTurn = (
  state: Pick<DerivedMatchState, "half" | "turn" | "roundNumber" | "currentRoundNumber" | "activeTeamId" | "teamTurnIndex" | "teamTurnSequence" | "turnMarkers">,
  turnMarkersByHalf: Map<number, { A: number; B: number }>,
) => {
  const nextTeamTurnIndex = state.teamTurnSequence + 1;
  const shouldAdvanceRound = nextTeamTurnIndex > 1 && nextTeamTurnIndex % 2 === 1;
  let nextRoundNumber = state.currentRoundNumber + (shouldAdvanceRound ? 1 : 0);
  let nextHalf = state.half;

  if (nextRoundNumber > 8) {
    nextRoundNumber = 1;
    nextHalf = Math.min(2, nextHalf + 1);
  }

  state.half = nextHalf;
  state.teamTurnSequence = nextTeamTurnIndex;
  state.teamTurnIndex = nextTeamTurnIndex;
  state.activeTeamId = getNextActiveTeam(state.activeTeamId);
  state.roundNumber = nextRoundNumber;
  state.currentRoundNumber = nextRoundNumber;
  state.turn = nextRoundNumber;
  state.turnMarkers = { A: nextRoundNumber, B: nextRoundNumber };
  turnMarkersByHalf.set(state.half, { ...state.turnMarkers });
};

export function deriveMatchState(events: MatchEvent[]): DerivedMatchState {
  const d: DerivedMatchState = {
    teamNames: { A: "Team A", B: "Team B" },
    score: { A: 0, B: 0 },
    half: 1,
    turn: 1,
    roundNumber: 1,
    currentRoundNumber: 1,
    activeTeamId: undefined,
    teamTurnIndex: 0,
    teamTurnSequence: 0,
    resources: { A: defaultResources(), B: defaultResources() },
    fans: { A: defaultTeamFans(), B: defaultTeamFans() },
    teamMeta: normalizeMatchTeamMeta(undefined, { A: "Team A", B: "Team B" }),
    weather: undefined,
    inducementsBought: [],
    driveIndexCurrent: 1,
    kickoffPending: false,
    driveKickoff: null,
    kickoffByDrive: new Map(),
    turnMarkers: { A: 1, B: 1 },
    playerSpp: { players: {}, teams: { A: 0, B: 0 } },
    treasuryDelta: buildTreasuryDelta({ A: 0, B: 0 }, { A: defaultTeamFans(), B: defaultTeamFans() }, { A: 0, B: 0 }, { A: 0, B: 0 }),
    finalTreasuryDelta: {
      A: {
        treasuryDelta: 0,
        winningsDelta: 0,
        isProjected: false,
        inputs: {
          touchdownsScored: 0,
          touchdownsConceded: 0,
          existingFans: 0,
          fansRoll: 0,
          stallingRollTotal: 0,
          stallingEvents: 0,
          matchResult: "draw",
        },
        breakdown: {
          base: 0,
          touchdownsContribution: 0,
          stallingAdjustment: 0,
        },
      },
      B: {
        treasuryDelta: 0,
        winningsDelta: 0,
        isProjected: false,
        inputs: {
          touchdownsScored: 0,
          touchdownsConceded: 0,
          existingFans: 0,
          fansRoll: 0,
          stallingRollTotal: 0,
          stallingEvents: 0,
          matchResult: "draw",
        },
        breakdown: {
          base: 0,
          touchdownsContribution: 0,
          stallingAdjustment: 0,
        },
      },
    },
  };
  const stallingRollsByTeam: { A: number; B: number } = { A: 0, B: 0 };
  const stallingCountByTeam: { A: number; B: number } = { A: 0, B: 0 };
  const turnMarkersByHalf = new Map<number, { A: number; B: number }>();
  turnMarkersByHalf.set(1, { A: 1, B: 1 });

  for (const e of events) {
    if (e.type === "match_start") {
      const p = e.payload ?? {};
      if (p.teamAName) d.teamNames.A = String(p.teamAName);
      if (p.teamBName) d.teamNames.B = String(p.teamBName);
      if (p.weather) d.weather = String(p.weather);
      if (p.resources?.A) {
        d.resources.A = {
          ...d.resources.A,
          rerolls: p.resources.A.rerolls,
          hasApothecary: normalizeHasApothecary(p.resources.A),
          apothecaryUsed: false,
        };
      }
      if (p.resources?.B) {
        d.resources.B = {
          ...d.resources.B,
          rerolls: p.resources.B.rerolls,
          hasApothecary: normalizeHasApothecary(p.resources.B),
          apothecaryUsed: false,
        };
      }
      if (p.fans?.A) d.fans.A = { ...d.fans.A, ...p.fans.A };
      if (p.fans?.B) d.fans.B = { ...d.fans.B, ...p.fans.B };
      if (Array.isArray(p.inducements)) d.inducementsBought = p.inducements as InducementEntry[];
      d.teamMeta = normalizeMatchTeamMeta(p.teamMeta, { A: d.teamNames.A, B: d.teamNames.B });
      d.half = e.half ?? 1;
      d.turn = e.turn ?? 1;
      d.roundNumber = d.turn;
      d.activeTeamId = undefined;
      d.teamTurnIndex = 0;
      d.teamTurnSequence = 0;
      syncSharedRoundState(d);
      d.turnMarkers = { A: clampTurnMarker(d.turn), B: clampTurnMarker(d.turn) };
      turnMarkersByHalf.set(d.half, { ...d.turnMarkers });
    }

    if (e.type === "touchdown" && e.team) {
      d.score[e.team] += 1;
      d.activeTeamId = undefined;
      d.teamTurnIndex = 0;
      d.teamTurnSequence = 0;
    }
    if (e.type === "stalling" && e.team) {
      stallingCountByTeam[e.team] += 1;
      stallingRollsByTeam[e.team] += normalizeStallingRoll(e.payload?.rollResult);
    }

    if (e.type === "turn_set") {
      if (typeof e.payload?.half === "number") d.half = e.payload.half;
      if (typeof e.payload?.turn === "number") d.turn = e.payload.turn;
      d.roundNumber = typeof e.payload?.roundNumber === "number" ? e.payload.roundNumber : d.turn;
      if (e.payload?.activeTeamId === "A" || e.payload?.activeTeamId === "B") d.activeTeamId = e.payload.activeTeamId;
      if (typeof e.payload?.teamTurnIndex === "number") d.teamTurnIndex = clampTeamTurnIndex(e.payload.teamTurnIndex);
      d.teamTurnSequence = d.teamTurnIndex;
      syncSharedRoundState(d);
      d.turnMarkers = { A: clampTurnMarker(d.turn), B: clampTurnMarker(d.turn) };
      turnMarkersByHalf.set(d.half, { ...d.turnMarkers });
    }

    if (e.type === "next_turn") advanceActiveTeamTurn(d, turnMarkersByHalf);
    if (e.type === "half_changed") {
      if (typeof e.payload?.half === "number") d.half = e.payload.half;
      if (typeof e.payload?.turn === "number") d.turn = e.payload.turn;
      d.roundNumber = typeof e.payload?.roundNumber === "number" ? e.payload.roundNumber : d.turn;
      if (e.payload?.activeTeamId === "A" || e.payload?.activeTeamId === "B") d.activeTeamId = e.payload.activeTeamId;
      if (typeof e.payload?.teamTurnIndex === "number") d.teamTurnIndex = clampTeamTurnIndex(e.payload.teamTurnIndex);
      d.teamTurnSequence = d.teamTurnIndex;
      syncSharedRoundState(d);
      d.turnMarkers = { A: clampTurnMarker(d.turn), B: clampTurnMarker(d.turn) };
      turnMarkersByHalf.set(d.half, { ...d.turnMarkers });
    }

    if (e.type === "weather_set") {
      if (e.payload?.weather) d.weather = String(e.payload.weather);
    }

    if (e.type === "kickoff_event") {
      const newWeather = getChangingWeather(e.payload);
      if (newWeather) d.weather = newWeather;
      const kickoff = e.payload as KickoffEventPayload | undefined;
      if (kickoff) {
        d.activeTeamId = kickoff.receivingTeam;
        d.teamTurnIndex = 1;
        d.teamTurnSequence = 1;
        d.roundNumber = d.turn;
        syncSharedRoundState(d);
      }
      if (kickoff?.kickoffKey === "TIME_OUT") {
        const kickoffHalf = typeof e.half === "number" ? e.half : d.half;
        const kickoffHalfMarkers = turnMarkersByHalf.get(kickoffHalf) ?? d.turnMarkers;
        const kickingTeamMarker = kickoffHalfMarkers[kickoff.kickingTeam];
        const delta = getTimeOutDelta(kickingTeamMarker);
        d.turnMarkers = {
          A: clampTurnMarker(kickoffHalfMarkers.A + delta),
          B: clampTurnMarker(kickoffHalfMarkers.B + delta),
        };
        d.turn = d.turnMarkers[kickoff.kickingTeam];
        d.roundNumber = d.turn;
        d.currentRoundNumber = d.turn;
        turnMarkersByHalf.set(kickoffHalf, { ...d.turnMarkers });
      }
    }

    if (e.type === "turnover") advanceActiveTeamTurn(d, turnMarkersByHalf);
    if (e.type === "reroll_used" && e.team) d.resources[e.team].rerolls = Math.max(0, d.resources[e.team].rerolls - 1);
    if (e.type === "apothecary_used" && e.team && d.resources[e.team].hasApothecary) d.resources[e.team].apothecaryUsed = true;
  }

  const driveMeta = deriveDriveMeta(events);
  d.driveIndexCurrent = driveMeta.driveIndexCurrent;
  d.kickoffPending = driveMeta.kickoffPending;
  d.kickoffByDrive = driveMeta.kickoffByDrive;
  d.driveKickoff = driveMeta.kickoffByDrive.get(d.driveIndexCurrent) ?? null;
  const rosters = inferRostersFromEvents(events, d.teamNames, d.teamMeta);
  d.playerSpp = deriveSppSummaryFromEvents(events, { rosters, teamMeta: d.teamMeta });
  d.treasuryDelta = buildTreasuryDelta(d.score, d.fans, stallingRollsByTeam, stallingCountByTeam);
  d.finalTreasuryDelta = buildFinalTreasuryDelta(d.treasuryDelta);

  return d;
}
