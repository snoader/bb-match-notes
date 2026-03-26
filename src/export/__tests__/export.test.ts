import { describe, expect, it } from "vitest";
import type { MatchEvent } from "../../domain/events";
import { computeStats, toTimelineText, toStatsText } from "../export";

const buildEvent = (overrides: Partial<MatchEvent> & Pick<MatchEvent, "type">): MatchEvent => ({
  id: overrides.id ?? `e_${overrides.type}`,
  type: overrides.type,
  half: overrides.half ?? 1,
  turn: overrides.turn ?? 1,
  team: overrides.team,
  payload: overrides.payload,
  createdAt: overrides.createdAt ?? 1,
});

const teamNames = { A: "Orcs", B: "Elves" };

// ---------------------------------------------------------------------------
// computeStats
// ---------------------------------------------------------------------------

describe("computeStats", () => {
  it("returns zero-filled stats for an empty match", () => {
    const stats = computeStats([]);

    expect(stats.score).toEqual({ A: 0, B: 0 });
    expect(stats.touchdowns).toEqual({ A: 0, B: 0 });
    expect(stats.completions).toEqual({ A: 0, B: 0 });
    expect(stats.interceptions).toEqual({ A: 0, B: 0 });
    expect(stats.ko).toBe(0);
    expect(stats.foul).toBe(0);
    expect(stats.turnover).toBe(0);
    expect(stats.kickoff).toBe(0);
    expect(stats.resourcesUsed).toEqual({ A: { reroll: 0, apothecary: 0 }, B: { reroll: 0, apothecary: 0 } });
  });

  it("counts one touchdown per team", () => {
    const events = [
      buildEvent({ type: "touchdown", team: "A" }),
      buildEvent({ type: "touchdown", team: "B" }),
    ];

    const stats = computeStats(events);

    expect(stats.touchdowns).toEqual({ A: 1, B: 1 });
    expect(stats.score).toEqual({ A: 1, B: 1 });
  });

  it("counts multiple touchdowns for one team correctly", () => {
    const events = [
      buildEvent({ type: "touchdown", team: "A" }),
      buildEvent({ type: "touchdown", team: "A" }),
      buildEvent({ type: "touchdown", team: "A" }),
    ];

    const stats = computeStats(events);

    expect(stats.touchdowns).toEqual({ A: 3, B: 0 });
    expect(stats.score).toEqual({ A: 3, B: 0 });
  });

  it("edge case: both teams have 0 touchdowns", () => {
    const events = [
      buildEvent({ type: "ko" }),
      buildEvent({ type: "turnover" }),
    ];

    const stats = computeStats(events);

    expect(stats.touchdowns).toEqual({ A: 0, B: 0 });
    expect(stats.score).toEqual({ A: 0, B: 0 });
  });

  it("counts casualties from legacy 'casualty' events", () => {
    const events = [
      buildEvent({ type: "casualty", team: "A", payload: { result: "BH" } }),
      buildEvent({ type: "casualty", team: "A", payload: { result: "SI" } }),
      buildEvent({ type: "casualty", team: "B", payload: { result: "Dead" } }),
    ];

    const stats = computeStats(events);

    expect(stats.casualties.A.BH).toBe(1);
    expect(stats.casualties.A.MNG).toBe(1);
    expect(stats.casualties.B.DEAD).toBe(1);
  });

  it("counts casualties from 'injury' events", () => {
    const events = [
      buildEvent({
        type: "injury",
        team: "A",
        payload: {
          cause: "BLOCK",
          injuryResult: "MNG",
          apothecaryUsed: false,
        },
      }),
      buildEvent({
        type: "injury",
        team: "A",
        payload: {
          cause: "BLOCK",
          injuryResult: "DEAD",
          apothecaryUsed: false,
        },
      }),
    ];

    const stats = computeStats(events);

    expect(stats.casualties.A.MNG).toBe(1);
    expect(stats.casualties.A.DEAD).toBe(1);
  });

  it("counts SPP-relevant events: completions and interceptions", () => {
    const events = [
      buildEvent({ type: "completion", team: "A" }),
      buildEvent({ type: "completion", team: "A" }),
      buildEvent({ type: "interception", team: "B" }),
    ];

    const stats = computeStats(events);

    expect(stats.completions).toEqual({ A: 2, B: 0 });
    expect(stats.interceptions).toEqual({ A: 0, B: 1 });
  });

  it("counts ko, foul, turnover and kickoff events", () => {
    const events = [
      buildEvent({ type: "ko" }),
      buildEvent({ type: "ko" }),
      buildEvent({ type: "foul" }),
      buildEvent({ type: "turnover" }),
      buildEvent({ type: "kickoff" }),
      buildEvent({ type: "kickoff" }),
      buildEvent({ type: "kickoff" }),
    ];

    const stats = computeStats(events);

    expect(stats.ko).toBe(2);
    expect(stats.foul).toBe(1);
    expect(stats.turnover).toBe(1);
    expect(stats.kickoff).toBe(3);
  });

  it("counts resource usage", () => {
    const events = [
      buildEvent({ type: "reroll_used", team: "A" }),
      buildEvent({ type: "reroll_used", team: "A" }),
      buildEvent({ type: "reroll_used", team: "B" }),
      buildEvent({ type: "apothecary_used", team: "B" }),
    ];

    const stats = computeStats(events);

    expect(stats.resourcesUsed.A.reroll).toBe(2);
    expect(stats.resourcesUsed.B.reroll).toBe(1);
    expect(stats.resourcesUsed.B.apothecary).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// toTimelineText
// ---------------------------------------------------------------------------

describe("toTimelineText", () => {
  it("does not crash on an empty event list and returns a string", () => {
    const result = toTimelineText([], teamNames);

    expect(typeof result).toBe("string");
  });

  it("contains no raw JSON objects in the output", () => {
    const events = [
      buildEvent({ type: "touchdown", team: "A", turn: 3, half: 1, createdAt: 100 }),
    ];

    const result = toTimelineText(events, teamNames);

    expect(result).not.toContain("{");
    expect(result).not.toContain("}");
  });

  it("uses 'Turn' labels, not 'Round'", () => {
    const events = [
      buildEvent({ type: "next_turn", team: "A", half: 1, turn: 1, createdAt: 10 }),
      buildEvent({ type: "touchdown", team: "A", half: 1, turn: 1, createdAt: 20 }),
    ];

    const result = toTimelineText(events, teamNames);

    expect(result).toContain("Turn");
    expect(result).not.toContain("Round");
  });

  it("separates half 1 and half 2 events with half labels", () => {
    // activeTeamId must be set (via kickoff_event) for half headers to appear
    const events = [
      buildEvent({
        type: "kickoff_event",
        half: 1,
        turn: 1,
        createdAt: 5,
        payload: { kickoffKey: "BLITZ", receivingTeam: "A", kickingTeam: "B", driveIndex: 0, roll2d6: 7, kickoffLabel: "Blitz!" },
      }),
      buildEvent({ type: "touchdown", team: "A", half: 1, turn: 1, createdAt: 20 }),
      buildEvent({
        type: "kickoff_event",
        half: 2,
        turn: 1,
        createdAt: 25,
        payload: { kickoffKey: "BLITZ", receivingTeam: "B", kickingTeam: "A", driveIndex: 1, roll2d6: 7, kickoffLabel: "Blitz!" },
      }),
      buildEvent({ type: "touchdown", team: "B", half: 2, turn: 1, createdAt: 40 }),
    ];

    const result = toTimelineText(events, teamNames);

    expect(result).toContain("Half 1");
    expect(result).toContain("Half 2");
  });

  it("includes team names in turn labels", () => {
    const events = [
      buildEvent({ type: "next_turn", team: "A", half: 1, turn: 1, createdAt: 10 }),
      buildEvent({ type: "touchdown", team: "A", half: 1, turn: 1, createdAt: 20 }),
    ];

    const result = toTimelineText(events, teamNames);

    expect(result).toContain("Orcs");
  });

  it("second half turn numbers are offset by 8", () => {
    const events = [
      buildEvent({ type: "next_turn", team: "A", half: 2, turn: 1, createdAt: 10 }),
      buildEvent({ type: "touchdown", team: "A", half: 2, turn: 1, createdAt: 20 }),
    ];

    const result = toTimelineText(events, teamNames);

    // Turn 1 in half 2 → displayTurn = 9
    expect(result).toContain("Turn 9");
  });
});

// ---------------------------------------------------------------------------
// toStatsText
// ---------------------------------------------------------------------------

describe("toStatsText", () => {
  it("smoke test: renders score and team names without crashing", () => {
    const stats = computeStats([
      buildEvent({ type: "touchdown", team: "A" }),
      buildEvent({ type: "touchdown", team: "B" }),
      buildEvent({ type: "touchdown", team: "B" }),
    ]);

    const result = toStatsText(stats, teamNames);

    expect(result).toContain("Orcs");
    expect(result).toContain("Elves");
    expect(result).toContain("== SCORE ==");
    expect(result).toContain("Orcs: 1");
    expect(result).toContain("Elves: 2");
  });

  it("includes all expected sections", () => {
    const result = toStatsText(computeStats([]), teamNames);

    expect(result).toContain("== TOUCHDOWNS ==");
    expect(result).toContain("== PASSES ==");
    expect(result).toContain("== CASUALTIES (by attacker team) ==");
    expect(result).toContain("== OTHER ==");
    expect(result).toContain("== RESOURCES USED ==");
  });

  it("contains no raw JSON in the output", () => {
    const result = toStatsText(computeStats([]), teamNames);

    expect(result).not.toContain("{");
    expect(result).not.toContain("}");
  });
});
