import { describe, expect, it } from "vitest";
import type { MatchEvent } from "../../domain/events";
import { deriveSppFromEvents, type Rosters } from "../spp";

const rosters: Rosters = {
  A: [{ id: "A1", team: "A", name: "A Blitzer" }],
  B: [{ id: "B1", team: "B", name: "B Lineman" }],
};

const buildEvent = (overrides: Partial<MatchEvent> & Pick<MatchEvent, "type">): MatchEvent => ({
  id: overrides.id ?? `e_${overrides.type}`,
  type: overrides.type,
  half: overrides.half ?? 1,
  turn: overrides.turn ?? 1,
  team: overrides.team,
  payload: overrides.payload,
  createdAt: overrides.createdAt ?? 1,
});

describe("deriveSppFromEvents apothecary outcomes", () => {
  it("does not award casualty SPP when apothecary recovers the victim", () => {
    const events: MatchEvent[] = [
      buildEvent({
        type: "injury",
        id: "injury_recovered",
        team: "A",
        payload: {
          cause: "BLOCK",
          causerPlayerId: "A1",
          injuryResult: "MNG",
          apothecaryUsed: true,
          apothecaryOutcome: "RECOVERED",
        },
      }),
    ];

    const summary = deriveSppFromEvents(events, rosters);

    expect(summary.teams.A).toBe(0);
    expect(summary.players.A1).toBeUndefined();
  });

  it("awards casualty SPP when apothecary final outcome remains a casualty", () => {
    const events: MatchEvent[] = [
      buildEvent({
        type: "injury",
        id: "injury_bh",
        team: "A",
        payload: {
          cause: "BLOCK",
          causerPlayerId: "A1",
          injuryResult: "MNG",
          apothecaryUsed: true,
          apothecaryOutcome: "BH",
        },
      }),
    ];

    const summary = deriveSppFromEvents(events, rosters);

    expect(summary.players.A1?.spp).toBe(2);
    expect(summary.teams.A).toBe(2);
  });
});
