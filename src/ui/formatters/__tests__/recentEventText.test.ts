import { describe, expect, it } from "vitest";
import type { MatchEvent } from "../../../domain/events";
import { formatRecentEventLines } from "../recentEventText";

const teamNames = { A: "Orcs", B: "Humans" };

const buildEvent = (overrides: Partial<MatchEvent> & Pick<MatchEvent, "type">): MatchEvent => ({
  id: overrides.id ?? "1",
  type: overrides.type,
  half: overrides.half ?? 1,
  turn: overrides.turn ?? 1,
  team: overrides.team,
  payload: overrides.payload,
  createdAt: overrides.createdAt ?? 1,
});

describe("formatRecentEventLines", () => {
  it("removes kickoff prefix when kickoff badge is present", () => {
    expect(
      formatRecentEventLines(
        buildEvent({
          type: "kickoff_event",
          payload: {
            driveIndex: 1,
            kickingTeam: "A",
            receivingTeam: "B",
            roll2d6: 12,
            kickoffKey: "CHANGING_WEATHER",
            kickoffLabel: "Changing Weather",
            details: { newWeather: "NICE" },
          },
        }),
        teamNames,
      ),
    ).toEqual(["Weather: Nice"]);

    expect(
      formatRecentEventLines(
        buildEvent({
          type: "kickoff_event",
          payload: {
            driveIndex: 2,
            kickingTeam: "A",
            receivingTeam: "B",
            roll2d6: 11,
            kickoffKey: "THROW_A_ROCK",
            kickoffLabel: "Throw a Rock",
            details: { targetTeam: "B", targetPlayer: 4, outcome: "ko" },
          },
        }),
        teamNames,
      ),
    ).toEqual(["Rock: Humans #4 KO"]);
  });

  it("keeps non-kickoff events unchanged", () => {
    expect(formatRecentEventLines(buildEvent({ type: "touchdown", team: "A", payload: { player: 4 } }), teamNames)).toEqual([
      "Touchdown · Orcs · Player 4 · SPP +3 (Touchdown)",
    ]);
    expect(formatRecentEventLines(buildEvent({ type: "stalling", team: "B", payload: { rollResult: 5 } }), teamNames)).toEqual([
      "Stalling · Humans: Roll 5",
    ]);
  });

  it("adds projected treasury delta lines for treasury-relevant events when snapshots are provided", () => {
    expect(
      formatRecentEventLines(
        buildEvent({ type: "touchdown", team: "A", payload: { player: 4 } }),
        teamNames,
        {
          A: { winningsDelta: 40_000 },
          B: { winningsDelta: 10_000 },
        },
      ),
    ).toEqual([
      "Touchdown · Orcs · Player 4 · SPP +3 (Touchdown)",
      "Projected treasury delta: Orcs +40k · Humans +10k",
    ]);

    expect(
      formatRecentEventLines(
        buildEvent({ type: "stalling", team: "B", payload: { rollResult: 5 } }),
        teamNames,
        {
          A: { winningsDelta: 30_000 },
          B: { winningsDelta: 25_000 },
        },
      ),
    ).toEqual([
      "Stalling · Humans: Roll 5",
      "Humans projected delta now +25k",
    ]);
  });
});
