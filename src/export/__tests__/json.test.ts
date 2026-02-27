import { describe, expect, it } from "vitest";
import type { MatchEvent } from "../../domain/events";
import { deriveMatchState } from "../../domain/projection";
import { exportMatchJSON, MATCH_JSON_SCHEMA_VERSION } from "../json";

const buildEvent = (overrides: Partial<MatchEvent> & Pick<MatchEvent, "type">): MatchEvent => ({
  id: overrides.id ?? `e_${overrides.type}`,
  type: overrides.type,
  half: overrides.half ?? 1,
  turn: overrides.turn ?? 1,
  team: overrides.team,
  payload: overrides.payload,
  createdAt: overrides.createdAt ?? 1,
});

describe("exportMatchJSON", () => {
  it("exports expected schema and stable event ordering", () => {
    const events = [
      buildEvent({
        id: "3",
        type: "touchdown",
        team: "A",
        payload: { player: "A1" },
        createdAt: 30,
      }),
      buildEvent({
        id: "1",
        type: "match_start",
        payload: {
          teamAName: "Orcs",
          teamBName: "Elves",
          resources: {
            A: { rerolls: 2, apothecary: 1 },
            B: { rerolls: 3, apothecary: 1 },
          },
        },
        createdAt: 10,
      }),
      buildEvent({
        id: "2",
        type: "completion",
        team: "B",
        payload: { passer: "B2", receiver: "B3" },
        createdAt: 20,
      }),
    ];

    const derived = deriveMatchState(events);
    const rosters = {
      A: [{ id: "A1", team: "A" as const, name: "A Blitzer" }],
      B: [{ id: "B2", team: "B" as const, name: "B Thrower" }],
    };

    const exported = exportMatchJSON({
      events,
      derived,
      rosters,
      generatedAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    expect(exported.schemaVersion).toBe(MATCH_JSON_SCHEMA_VERSION);
    expect(exported.generatedAt).toBe("2026-01-01T00:00:00.000Z");

    expect(Object.keys(exported)).toEqual(["schemaVersion", "generatedAt", "match", "events", "derived"]);
    expect(Object.keys(exported.derived)).toEqual(["score", "half", "turn", "resources", "sppSummary"]);

    expect(exported.events.map((event) => event.id)).toEqual(["1", "2", "3"]);
    expect(exported.derived.score).toEqual({ A: 1, B: 0 });
    expect(exported.derived.sppSummary.teams).toEqual({ A: 3, B: 1 });
  });
});
