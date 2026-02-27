import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MatchEvent } from "../../domain/events";
import { deriveMatchState } from "../../domain/projection";
import { deriveSppFromEvents } from "../../export/spp";

const persistedEvents: MatchEvent[] = [];

const orderByCreatedAt = () => ({
  last: async () => {
    if (!persistedEvents.length) return undefined;
    return [...persistedEvents].sort((a, b) => a.createdAt - b.createdAt).at(-1);
  },
  toArray: async () => [...persistedEvents].sort((a, b) => a.createdAt - b.createdAt),
});

vi.mock("../../db/db", () => ({
  db: {
    events: {
      add: async (event: MatchEvent) => {
        persistedEvents.push(event);
      },
      delete: async (id: string) => {
        const idx = persistedEvents.findIndex((event) => event.id === id);
        if (idx >= 0) persistedEvents.splice(idx, 1);
      },
      clear: async () => {
        persistedEvents.length = 0;
      },
      orderBy: () => orderByCreatedAt(),
      toArray: async () => [...persistedEvents],
    },
    tables: [
      {
        clear: async () => {
          persistedEvents.length = 0;
        },
      },
    ],
    transaction: async (_mode: string, _table: unknown, cb: () => Promise<void>) => cb(),
  },
}));

import { useMatchStore } from "../matchStore";

const kickoffPayload = {
  driveIndex: 1,
  kickingTeam: "A" as const,
  receivingTeam: "B" as const,
  roll2d6: 7,
  kickoffKey: "HIGH_KICK" as const,
  kickoffLabel: "High Kick",
};

const syncStoreFromPersistence = () => {
  const ordered = [...persistedEvents].sort((a, b) => a.createdAt - b.createdAt);
  useMatchStore.setState({ events: ordered, derived: deriveMatchState(ordered), isReady: true });
};

describe("matchStore undo", () => {
  beforeEach(async () => {
    persistedEvents.length = 0;
    useMatchStore.setState({ events: [], derived: deriveMatchState([]), isReady: true });
    vi.restoreAllMocks();
  });

  it("undoes kickoff selection and restores kickoff gate", async () => {
    vi.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);

    await useMatchStore.getState().appendEvent({
      type: "match_start",
      payload: {
        teamAName: "A",
        teamBName: "B",
        resources: {
          A: { rerolls: 2, apothecary: 1 },
          B: { rerolls: 2, apothecary: 1 },
        },
      },
    });
    syncStoreFromPersistence();

    await useMatchStore.getState().appendEvent({ type: "kickoff_event", payload: kickoffPayload });
    syncStoreFromPersistence();

    expect(useMatchStore.getState().derived.kickoffPending).toBe(false);

    await useMatchStore.getState().undoLast();
    syncStoreFromPersistence();

    expect(useMatchStore.getState().events).toHaveLength(1);
    expect(useMatchStore.getState().derived.kickoffPending).toBe(true);
    expect(useMatchStore.getState().derived.driveKickoff).toBeNull();
  });


  it("undoes changing weather kickoff and restores prior weather", async () => {
    await useMatchStore.getState().appendEvent({
      type: "match_start",
      payload: {
        teamAName: "A",
        teamBName: "B",
        weather: "nice",
        resources: {
          A: { rerolls: 2, apothecary: 1 },
          B: { rerolls: 2, apothecary: 1 },
        },
      },
    });
    syncStoreFromPersistence();

    await useMatchStore.getState().appendEvent({
      type: "kickoff_event",
      payload: {
        driveIndex: 1,
        kickingTeam: "A",
        receivingTeam: "B",
        roll2d6: 8,
        kickoffKey: "CHANGING_WEATHER",
        kickoffLabel: "Changing Weather",
        details: { newWeather: "blizzard" },
      },
    });
    syncStoreFromPersistence();

    expect(useMatchStore.getState().derived.weather).toBe("blizzard");

    await useMatchStore.getState().undoLast();
    syncStoreFromPersistence();

    expect(useMatchStore.getState().derived.weather).toBe("nice");
  });

  it("undoes touchdown and reverts score + SPP", async () => {
    await useMatchStore.getState().appendEvent({
      type: "match_start",
      payload: {
        teamAName: "A",
        teamBName: "B",
        resources: {
          A: { rerolls: 2, apothecary: 1 },
          B: { rerolls: 2, apothecary: 1 },
        },
      },
    });
    syncStoreFromPersistence();
    await useMatchStore.getState().appendEvent({ type: "kickoff_event", payload: kickoffPayload });
    syncStoreFromPersistence();
    await useMatchStore.getState().appendEvent({ type: "touchdown", team: "A", payload: { player: "A1" } });
    syncStoreFromPersistence();

    expect(useMatchStore.getState().derived.score.A).toBe(1);
    const beforeUndoSpp = deriveSppFromEvents(useMatchStore.getState().events, { A: [{ id: "A1", name: "Blitzer", team: "A" }], B: [] });
    expect(beforeUndoSpp.teams.A).toBe(3);

    await useMatchStore.getState().undoLast();
    syncStoreFromPersistence();

    expect(useMatchStore.getState().derived.score.A).toBe(0);
    const afterUndoSpp = deriveSppFromEvents(useMatchStore.getState().events, { A: [{ id: "A1", name: "Blitzer", team: "A" }], B: [] });
    expect(afterUndoSpp.teams.A).toBe(0);
  });

  it("undoes reroll usage and remains stable across repeated undo", async () => {
    await useMatchStore.getState().appendEvent({
      type: "match_start",
      payload: {
        teamAName: "A",
        teamBName: "B",
        resources: {
          A: { rerolls: 2, apothecary: 1 },
          B: { rerolls: 2, apothecary: 1 },
        },
      },
    });
    syncStoreFromPersistence();
    await useMatchStore.getState().appendEvent({ type: "kickoff_event", payload: kickoffPayload });
    syncStoreFromPersistence();
    await useMatchStore.getState().appendEvent({ type: "reroll_used", team: "A" });
    syncStoreFromPersistence();

    expect(useMatchStore.getState().derived.resources.A.rerolls).toBe(1);

    await useMatchStore.getState().undoLast();
    syncStoreFromPersistence();
    expect(useMatchStore.getState().derived.resources.A.rerolls).toBe(2);

    await useMatchStore.getState().undoLast();
    await useMatchStore.getState().undoLast();
    await useMatchStore.getState().undoLast();
    syncStoreFromPersistence();

    expect(useMatchStore.getState().events).toHaveLength(0);
    expect(useMatchStore.getState().derived).toEqual(deriveMatchState([]));
  });

  it("resetMatch clears persisted events and in-memory match state", async () => {
    await useMatchStore.getState().appendEvent({
      type: "match_start",
      payload: {
        teamAName: "A",
        teamBName: "B",
        resources: {
          A: { rerolls: 2, apothecary: 1 },
          B: { rerolls: 2, apothecary: 1 },
        },
      },
    });
    syncStoreFromPersistence();
    await useMatchStore.getState().appendEvent({ type: "kickoff_event", payload: kickoffPayload });
    syncStoreFromPersistence();

    expect(persistedEvents).toHaveLength(2);
    expect(useMatchStore.getState().derived.score).toEqual({ A: 0, B: 0 });
    await useMatchStore.getState().resetMatch();

    expect(persistedEvents).toHaveLength(0);
    expect(useMatchStore.getState().events).toEqual([]);
    expect(useMatchStore.getState().derived).toEqual(deriveMatchState([]));
    expect(useMatchStore.getState().isReady).toBe(true);
  });
});
