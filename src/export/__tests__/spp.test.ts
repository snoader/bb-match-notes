import { describe, expect, it } from "vitest";
import type { MatchEvent } from "../../domain/events";
import { deriveSppFromEvents } from "../spp";

const event = (overrides: Partial<MatchEvent> & Pick<MatchEvent, "type">): MatchEvent => ({
  id: overrides.id ?? `${overrides.type}-id`,
  type: overrides.type,
  half: overrides.half ?? 1,
  turn: overrides.turn ?? 1,
  team: overrides.team,
  payload: overrides.payload,
  createdAt: overrides.createdAt ?? 1,
});

describe("deriveSppFromEvents", () => {
  it("does not award casualty SPP when apothecary outcome recovers victim", () => {
    const summary = deriveSppFromEvents(
      [
        event({
          type: "injury",
          team: "A",
          payload: {
            cause: "BLOCK",
            causerPlayerId: "A2",
            victimPlayerId: "B1",
            injuryResult: "DEAD",
            apothecaryUsed: true,
            apothecaryOutcome: "RECOVERED",
          },
        }),
      ],
      {
        A: [{ id: "A2", name: "Blitzer", team: "A" }],
        B: [{ id: "B1", name: "Lineman", team: "B" }],
      },
    );

    expect(summary.players["A2"]).toBeUndefined();
    expect(summary.teams.A).toBe(0);
  });
});
