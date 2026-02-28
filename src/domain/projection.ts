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

const getTimeOutDelta = (payload: unknown, kickingTeamMarker: number): -1 | 1 => {
  if (payload && typeof payload === "object") {
    const kickoff = payload as Partial<KickoffEventPayload>;
    if (kickoff.kickoffKey === "TIME_OUT" && kickoff.details && typeof kickoff.details === "object") {
      const appliedDelta = (kickoff.details as { appliedDelta?: unknown }).appliedDelta;
      if (appliedDelta === -1 || appliedDelta === 1) return appliedDelta;
    }
  }
  return kickingTeamMarker >= 6 ? -1 : 1;
};

export function deriveMatchState(events: MatchEvent[]): DerivedMatchState {
  const d: DerivedMatchState = {
    teamNames: { A: "Team A", B: "Team B" },
    score: { A: 0, B: 0 },
    half: 1,
    turn: 1,
    resources: { A: defaultResources(), B: defaultResources() },
    weather: undefined,
    inducementsBought: [],
    driveIndexCurrent: 1,
    kickoffPending: false,
    driveKickoff: null,
    kickoffByDrive: new Map(),
    turnMarkers: { A: 1, B: 1 },
  };

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
      d.turnMarkers = { A: clampTurnMarker(d.turn), B: clampTurnMarker(d.turn) };
    }

    if (e.type === "touchdown" && e.team) d.score[e.team] += 1;

    if (e.type === "turn_set") {
      if (typeof e.payload?.turn === "number") d.turn = e.payload.turn;
      if (typeof e.payload?.half === "number") d.half = e.payload.half;
      d.turnMarkers = { A: clampTurnMarker(d.turn), B: clampTurnMarker(d.turn) };
    }

    if (e.type === "next_turn") {
      let half = d.half;
      let turn = d.turn + 1;
      if (turn > 8) {
        turn = 1;
        half = Math.min(2, half + 1);
      }
      d.turn = turn;
      d.half = half;
      d.turnMarkers = { A: turn, B: turn };
    }

    if (e.type === "half_changed") {
      if (typeof e.payload?.half === "number") d.half = e.payload.half;
      if (typeof e.payload?.turn === "number") d.turn = e.payload.turn;
      d.turnMarkers = { A: clampTurnMarker(d.turn), B: clampTurnMarker(d.turn) };
    }

    if (e.type === "weather_set") {
      if (e.payload?.weather) d.weather = String(e.payload.weather);
    }

    if (e.type === "kickoff_event") {
      const newWeather = getChangingWeather(e.payload);
      if (newWeather) d.weather = newWeather;
      const kickoff = e.payload as KickoffEventPayload | undefined;
      if (kickoff?.kickoffKey === "TIME_OUT") {
        const kickingTeamMarker = d.turnMarkers[kickoff.kickingTeam];
        const delta = getTimeOutDelta(kickoff, kickingTeamMarker);
        d.turnMarkers = {
          A: clampTurnMarker(d.turnMarkers.A + delta),
          B: clampTurnMarker(d.turnMarkers.B + delta),
        };
        d.turn = d.turnMarkers[kickoff.kickingTeam];
      }
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
