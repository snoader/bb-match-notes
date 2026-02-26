import { create } from "zustand";
import { db } from "../db/db";
import type { MatchEvent, KickoffEventPayload } from "../domain/events";
import type { TeamId, InducementKind } from "../domain/enums";
import { liveQuery } from "dexie";
import { deriveDriveMeta } from "../domain/drives";

const uid = () =>
  (globalThis.crypto?.randomUUID?.() ??
    `e_${Date.now()}_${Math.random().toString(16).slice(2)}`);

type AppendEventInput =
  Omit<MatchEvent, "id" | "createdAt" | "half" | "turn"> &
  Partial<Pick<MatchEvent, "half" | "turn">>;

type Resources = { rerolls: number; apothecary: number };

type InducementEntry = { team: TeamId; kind: InducementKind; detail?: string };

type DerivedState = {
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
};

const defaultResources = (): Resources => ({ rerolls: 0, apothecary: 0 });

function deriveFromEvents(events: MatchEvent[]): DerivedState {
  const d: DerivedState = {
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
    }

    if (e.type === "touchdown" && e.team) d.score[e.team] += 1;

    if (e.type === "turn_set") {
      if (typeof e.payload?.turn === "number") d.turn = e.payload.turn;
      if (typeof e.payload?.half === "number") d.half = e.payload.half;
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
    }

    if (e.type === "half_changed") {
      if (typeof e.payload?.half === "number") d.half = e.payload.half;
      if (typeof e.payload?.turn === "number") d.turn = e.payload.turn;
    }

    if (e.type === "weather_set") {
      if (e.payload?.weather) d.weather = String(e.payload.weather);
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

type MatchStore = {
  events: MatchEvent[];
  derived: DerivedState;
  isReady: boolean;

  init: () => () => void;

  boughtInducementsFor: (team: TeamId) => InducementEntry[];
  appendEvent: (e: AppendEventInput) => Promise<void>;
  undoLast: () => Promise<void>;
  resetAll: () => Promise<void>;
};

export const useMatchStore = create<MatchStore>((set, get) => ({
  events: [],
  derived: deriveFromEvents([]),
  isReady: false,

  init: () => {
    const sub = liveQuery(() => db.events.orderBy("createdAt").toArray()).subscribe({
      next: (events) => {
        set({ events, derived: deriveFromEvents(events), isReady: true });
      },
      error: () => set({ isReady: true }),
    });
    return () => sub.unsubscribe();
  },

  boughtInducementsFor: (team) => {
    return get().derived.inducementsBought.filter((x) => x.team === team);
  },

  appendEvent: async (e) => {
    const current = get().derived;
    if (e.type === "kickoff_event") {
      const payload = e.payload as KickoffEventPayload | undefined;
      if (!payload || current.kickoffByDrive.has(payload.driveIndex)) return;
    }

    const ev: MatchEvent = {
      id: uid(),
      createdAt: Date.now(),
      type: e.type,
      team: e.team,
      payload: e.payload,
      half: e.half ?? current.half,
      turn: e.turn ?? current.turn,
    };
    await db.events.add(ev);
  },

  undoLast: async () => {
    const last = await db.events.orderBy("createdAt").last();
    if (last) await db.events.delete(last.id);
  },

  resetAll: async () => {
    await db.events.clear();
  },
}));

export function teamLabel(team: TeamId, names: { A: string; B: string }) {
  return team === "A" ? names.A : names.B;
}
