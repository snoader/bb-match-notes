import { describe, expect, it } from "vitest";
import type { MatchEvent } from "../events";
import { deriveMatchState } from "../projection";

const buildEvent = (overrides: Partial<MatchEvent> & Pick<MatchEvent, "type">): MatchEvent => ({
  id: overrides.id ?? `e_${overrides.type}`,
  type: overrides.type,
  half: overrides.half ?? 1,
  turn: overrides.turn ?? 1,
  team: overrides.team,
  payload: overrides.payload,
  createdAt: overrides.createdAt ?? 1,
});

describe("treasury delta", () => {
  it("returns zero deltas in the baseline without touchdown or stalling", () => {
    const state = deriveMatchState([
      buildEvent({
        type: "match_start",
        payload: {
          fans: {
            A: { existingFans: 0, fansRoll: 0 },
            B: { existingFans: 0, fansRoll: 0 },
          },
        },
      }),
    ]);

    expect(state.treasuryDelta.A.winningsDelta).toBe(0);
    expect(state.treasuryDelta.B.winningsDelta).toBe(0);
    expect(state.treasuryDelta.A.breakdown).toEqual({
      fanFactorDelta: 0,
      touchdownDelta: 0,
      stallingDelta: 0,
      resultDelta: 0,
    });
    expect(state.treasuryDelta.B.breakdown).toEqual({
      fanFactorDelta: 0,
      touchdownDelta: 0,
      stallingDelta: 0,
      resultDelta: 0,
    });
  });

  it("updates deltas when touchdowns change the score and result", () => {
    const state = deriveMatchState([
      buildEvent({
        type: "match_start",
        payload: {
          fans: {
            A: { existingFans: 0, fansRoll: 0 },
            B: { existingFans: 0, fansRoll: 0 },
          },
        },
      }),
      buildEvent({ type: "touchdown", team: "A" }),
      buildEvent({ type: "touchdown", team: "A" }),
      buildEvent({ type: "touchdown", team: "B" }),
    ]);

    expect(state.score).toEqual({ A: 2, B: 1 });
    expect(state.treasuryDelta.A.winningsDelta).toBe(30_000);
    expect(state.treasuryDelta.A.breakdown.touchdownDelta).toBe(20_000);
    expect(state.treasuryDelta.A.breakdown.resultDelta).toBe(10_000);
    expect(state.treasuryDelta.B.winningsDelta).toBe(0);
    expect(state.treasuryDelta.B.breakdown.touchdownDelta).toBe(10_000);
    expect(state.treasuryDelta.B.breakdown.resultDelta).toBe(-10_000);
  });

  it("applies stalling as a negative adjustment for the acting team", () => {
    const state = deriveMatchState([
      buildEvent({ type: "match_start" }),
      buildEvent({ type: "stalling", team: "A", payload: { rollResult: 6 } }),
      buildEvent({ type: "stalling", team: "A", payload: { rollResult: 4 } }),
      buildEvent({ type: "stalling", team: "B", payload: { rollResult: 3 } }),
    ]);

    expect(state.treasuryDelta.A.inputs.stallingEvents).toBe(2);
    expect(state.treasuryDelta.A.inputs.stallingRollTotal).toBe(10);
    expect(state.treasuryDelta.A.breakdown.stallingDelta).toBe(-10_000);
    expect(state.treasuryDelta.A.winningsDelta).toBe(-10_000);

    expect(state.treasuryDelta.B.inputs.stallingEvents).toBe(1);
    expect(state.treasuryDelta.B.inputs.stallingRollTotal).toBe(3);
    expect(state.treasuryDelta.B.breakdown.stallingDelta).toBe(-3_000);
    expect(state.treasuryDelta.B.winningsDelta).toBe(-3_000);
  });

  it("stays robust with empty and minimal event data", () => {
    const empty = deriveMatchState([]);
    expect(empty.treasuryDelta.A.winningsDelta).toBe(0);
    expect(empty.treasuryDelta.B.winningsDelta).toBe(0);

    const minimal = deriveMatchState([
      buildEvent({ type: "match_start", payload: { fans: { A: {}, B: {} } } }),
      buildEvent({ type: "stalling", team: "A", payload: { rollResult: "invalid" } }),
    ]);

    expect(minimal.treasuryDelta.A.inputs.stallingEvents).toBe(1);
    expect(minimal.treasuryDelta.A.inputs.stallingRollTotal).toBe(0);
    expect(minimal.treasuryDelta.A.breakdown.stallingDelta).toBe(0);
    expect(minimal.treasuryDelta.A.winningsDelta).toBe(0);
    expect(minimal.treasuryDelta.B.winningsDelta).toBe(0);
  });
});
