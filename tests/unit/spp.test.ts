import { describe, expect, it } from "vitest";
import type { MatchEvent } from "../../src/domain/events";
import { deriveSppFromEvents } from "../../src/export/spp";

const rosters = {
  A: [
    { id: "1", name: "A1", team: "A" as const },
    { id: "2", name: "A2", team: "A" as const },
  ],
  B: [{ id: "3", name: "B3", team: "B" as const }],
};

describe("deriveSppFromEvents", () => {
  it("awards SPP for touchdown/completion/interception/injury with causer", () => {
    const events: MatchEvent[] = [
      { id: "1", createdAt: 1, type: "touchdown", team: "A", half: 1, turn: 1, payload: { player: "1" } },
      { id: "2", createdAt: 2, type: "completion", team: "A", half: 1, turn: 1, payload: { passer: "1" } },
      { id: "3", createdAt: 3, type: "interception", team: "B", half: 1, turn: 1, payload: { player: "3" } },
      {
        id: "4",
        createdAt: 4,
        type: "injury",
        team: "A",
        half: 1,
        turn: 1,
        payload: { victimTeam: "B", victimPlayerId: "3", cause: "BLOCK", injuryResult: "MNG", causerPlayerId: "2" },
      },
    ];

    const summary = deriveSppFromEvents(events, rosters);

    expect(summary.players["1"].spp).toBe(4);
    expect(summary.players["2"].spp).toBe(2);
    expect(summary.players["3"].spp).toBe(2);
  });

  it("does not grant injury SPP without causer and ignores STAT for SPP", () => {
    const events: MatchEvent[] = [
      {
        id: "5",
        createdAt: 5,
        type: "injury",
        team: "A",
        half: 1,
        turn: 1,
        payload: { victimTeam: "B", victimPlayerId: "3", cause: "FAILED_DODGE", injuryResult: "STAT", stat: "AG" },
      },
    ];

    const summary = deriveSppFromEvents(events, rosters);
    expect(summary.players["2"]).toBeUndefined();
    expect(summary.teams.A).toBe(0);
    expect(summary.teams.B).toBe(0);
  });
});
