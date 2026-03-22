import { deriveDriveMeta } from "./drives";
import type { MatchEvent, KickoffEventPayload } from "./events";
import type { TeamId, InducementKind } from "./enums";

type Resources = { rerolls: number; apothecary: number };

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
  weather?: string;
  inducementsBought: InducementEntry[];
  driveIndexCurrent: number;
  kickoffPending: boolean;
  driveKickoff: KickoffEventPayload | null;
  kickoffByDrive: Map<number, KickoffEventPayload>;
  turnMarkers: { A: number; B: number };
};

const defaultResources = (): Resources => ({ rerolls: 0, apothecary: 0 });

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

const syncSharedRoundState = (state: Pick<DerivedMatchState, "turn" | "roundNumber" | "currentRoundNumber" | "teamTurnIndex" | "teamTurnSequence">) => {
  state.roundNumber = normalizeRoundNumber(state.roundNumber);
  state.currentRoundNumber = state.roundNumber;
  state.turn = state.currentRoundNumber;
  state.teamTurnIndex = clampTeamTurnIndex(state.teamTurnIndex);
  state.teamTurnSequence = state.teamTurnIndex;
};

// Advances the active team's turn while keeping the shared round marker aligned with the
// round/team-turn model introduced elsewhere in the app.
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
    weather: undefined,
    inducementsBought: [],
    driveIndexCurrent: 1,
    kickoffPending: false,
    driveKickoff: null,
    kickoffByDrive: new Map(),
    turnMarkers: { A: 1, B: 1 },
  };
  const turnMarkersByHalf = new Map<number, { A: number; B: number }>();
  turnMarkersByHalf.set(1, { A: 1, B: 1 });

  for (const e of events) {
    if (e.type === "match_start") {
      const p = e.payload ?? {};
      if (p.teamAName) d.teamNames.A = String(p.teamAName);
      if (p.teamBName) d.teamNames.B = String(p.teamBName);
      if (p.weather) d.weather = String(p.weather);
      if (p.resources?.A) d.resources.A = { ...d.resources.A, ...p.resources.A };
      if (p.resources?.B) d.resources.B = { ...d.resources.B, ...p.resources.B };
      if (Array.isArray(p.inducements)) d.inducementsBought = p.inducements as InducementEntry[];
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

    if (e.type === "next_turn") {
      advanceActiveTeamTurn(d, turnMarkersByHalf);
    }

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

    if (e.type === "turnover") {
      advanceActiveTeamTurn(d, turnMarkersByHalf);
    }

    if (e.type === "reroll_used" && e.team)
      d.resources[e.team].rerolls = Math.max(0, d.resources[e.team].rerolls - 1);
    if (e.type === "apothecary_used" && e.team)
      d.resources[e.team].apothecary = Math.max(0, d.resources[e.team].apothecary - 1);
  }

  const driveMeta = deriveDriveMeta(events);
  d.driveIndexCurrent = driveMeta.driveIndexCurrent;
  d.kickoffPending = driveMeta.kickoffPending;
  d.kickoffByDrive = driveMeta.kickoffByDrive;
  d.driveKickoff = driveMeta.kickoffByDrive.get(d.driveIndexCurrent) ?? null;

  return d;
}
