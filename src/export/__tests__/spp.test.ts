import { describe, expect, it } from "vitest";
import type { MatchEvent } from "../../domain/events";
import { deriveSppFromEvents } from "../spp";

const buildEvent = (overrides: Partial<MatchEvent> & Pick<MatchEvent, "type">): MatchEvent => ({
  id: overrides.id ?? `e_${overrides.type}`,
  type: overrides.type,
  half: overrides.half ?? 1,
  turn: overrides.turn ?? 1,
  team: overrides.team,
  payload: overrides.payload,
  createdAt: overrides.createdAt ?? 1,
});

const rosters = {
  A: [{ id: "A1", team: "A" as const, name: "A Blitzer" }],
  B: [{ id: "B1", team: "B" as const, name: "B Lineman" }],
};

describe("deriveSppFromEvents apothecary casualty outcome", () => {
  it("does not award casualty SPP when apothecary outcome is RECOVERED", () => {
    const events: MatchEvent[] = [
      buildEvent({
        id: "injury_recovered",
        type: "injury",
        team: "A",
        payload: {
          cause: "BLOCK",
          causerPlayerId: "A1",
          victimTeam: "B",
          victimPlayerId: "B1",
          injuryResult: "DEAD",
          apothecaryUsed: true,
          apothecaryOutcome: "RECOVERED",
        },
      }),
    ];

    const summary = deriveSppFromEvents(events, rosters);
    expect(summary.players.A1).toBeUndefined();
    expect(summary.teams.A).toBe(0);
  });

  it("awards casualty SPP when apothecary outcome remains a casualty", () => {
    const events: MatchEvent[] = [
      buildEvent({
        id: "injury_bh",
        type: "injury",
        team: "A",
        payload: {
          cause: "BLOCK",
          causerPlayerId: "A1",
          victimTeam: "B",
          victimPlayerId: "B1",
          injuryResult: "DEAD",
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
