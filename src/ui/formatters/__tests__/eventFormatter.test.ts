import { describe, expect, it } from "vitest";
import type { MatchEvent } from "../../../domain/events";
import type { DerivedMatchState } from "../../../domain/projection";
import { formatEvent } from "../eventFormatter";

const derived = {
  teamNames: { A: "Orcs", B: "Humans" },
} as DerivedMatchState;

const buildEvent = (overrides: Partial<MatchEvent> & Pick<MatchEvent, "type">): MatchEvent => ({
  id: overrides.id ?? "1",
  type: overrides.type,
  half: overrides.half ?? 1,
  turn: overrides.turn ?? 1,
  team: overrides.team,
  payload: overrides.payload,
  createdAt: overrides.createdAt ?? 1,
});

describe("formatEvent", () => {
  it("formats touchdown, completion and interception", () => {
    expect(formatEvent(buildEvent({ type: "touchdown", team: "A", payload: { player: 4 } }), derived.teamNames, derived)).toBe("Touchdown · Orcs · Player 4");
    expect(formatEvent(buildEvent({ type: "completion", team: "B", payload: { passer: 2 } }), derived.teamNames, derived)).toBe("Completion · Humans · Player 2");
    expect(formatEvent(buildEvent({ type: "interception", team: "A", payload: { player: 1 } }), derived.teamNames, derived)).toBe("Interception · Orcs · Player 1");
  });

  it("formats injury with apothecary outcome", () => {
    const event = buildEvent({
      type: "injury",
      payload: {
        victimTeam: "B",
        victimPlayerId: 7,
        injuryResult: "MNG",
        apothecaryUsed: true,
        apothecaryOutcome: "BH",
      },
    });

    expect(formatEvent(event, derived.teamNames, derived)).toBe("Humans Player 7 · Casualty: Miss Next Game · Apo → Badly Hurt");
  });

  it("formats kickoff and match start lines", () => {
    expect(
      formatEvent(
        buildEvent({
          type: "kickoff_event",
          payload: {
            driveIndex: 1,
            kickingTeam: "A",
            receivingTeam: "B",
            roll2d6: 8,
            kickoffKey: "HIGH_KICK",
            kickoffLabel: "High Kick",
          },
        }),
        derived.teamNames,
        derived,
      ),
    ).toBe("Kick-off: High Kick");

    expect(formatEvent(buildEvent({ type: "match_start" }), derived.teamNames, derived)).toBe("Match start");
  });
});
