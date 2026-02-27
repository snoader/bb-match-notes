import { create } from "zustand";
import { db } from "../db/db";
import type { MatchEvent, KickoffEventPayload } from "../domain/events";
import type { TeamId, InducementKind } from "../domain/enums";
import { liveQuery } from "dexie";
import { deriveMatchState, type DerivedMatchState } from "../domain/projection";
import { canRecordGameplayAction } from "../domain/eventGuards";

const uid = () =>
  (globalThis.crypto?.randomUUID?.() ??
    `e_${Date.now()}_${Math.random().toString(16).slice(2)}`);

type AppendEventInput =
  Omit<MatchEvent, "id" | "createdAt" | "half" | "turn"> &
  Partial<Pick<MatchEvent, "half" | "turn">>;

const getNextCreatedAt = async () => {
  const now = Date.now();
  const last = await db.events.orderBy("createdAt").last();
  if (!last) return now;
  return Math.max(now, last.createdAt + 1);
};

type InducementEntry = { team: TeamId; kind: InducementKind; detail?: string };

type MatchStore = {
  events: MatchEvent[];
  derived: DerivedMatchState;
  isReady: boolean;

  init: () => () => void;

  boughtInducementsFor: (team: TeamId) => InducementEntry[];
  appendEvent: (e: AppendEventInput) => Promise<void>;
  undoLast: () => Promise<void>;
  resetMatch: () => Promise<void>;
  resetAll: () => Promise<void>;
};

const matchInitialState = {
  events: [] as MatchEvent[],
  derived: deriveMatchState([]),
  isReady: false,
};

export const useMatchStore = create<MatchStore>((set, get) => ({
  ...matchInitialState,

  init: () => {
    const sub = liveQuery(() => db.events.orderBy("createdAt").toArray()).subscribe({
      next: (events) => {
        set({ events, derived: deriveMatchState(events), isReady: true });
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
    const context = { state: current, recentEvents: get().events };

    if (!canRecordGameplayAction(context, e.type)) return;

    if (e.type === "kickoff_event") {
      const payload = e.payload as KickoffEventPayload | undefined;
      if (!payload || current.kickoffByDrive.has(payload.driveIndex)) return;
    }

    const ev: MatchEvent = {
      id: uid(),
      createdAt: await getNextCreatedAt(),
      type: e.type,
      team: e.team,
      payload: e.payload,
      half: e.half ?? current.half,
      turn: e.turn ?? current.turn,
    };
    await db.events.add(ev);
  },

  undoLast: async () => {
    await db.transaction("rw", db.events, async () => {
      const last = await db.events.orderBy("createdAt").last();
      if (last) await db.events.delete(last.id);
    });
  },

  resetMatch: async () => {
    await db.transaction("rw", db.tables, async () => {
      await Promise.all(db.tables.map((table) => table.clear()));
    });

    set({ ...matchInitialState, isReady: true });
  },

  resetAll: async () => get().resetMatch(),
}));

export function teamLabel(team: TeamId, names: { A: string; B: string }) {
  return team === "A" ? names.A : names.B;
}
