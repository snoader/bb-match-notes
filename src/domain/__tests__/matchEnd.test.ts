import { describe, expect, it } from "vitest";
import { hasReachedEndCondition, toTotalTurn } from "../matchEnd";

describe("match end helpers", () => {
  it("maps half and turn into total turn number", () => {
    expect(toTotalTurn(1, 1)).toBe(1);
    expect(toTotalTurn(1, 8)).toBe(8);
    expect(toTotalTurn(2, 1)).toBe(9);
    expect(toTotalTurn(2, 8)).toBe(16);
  });

  it("returns false before total turn 16", () => {
    expect(hasReachedEndCondition(1, 8)).toBe(false);
    expect(hasReachedEndCondition(2, 7)).toBe(false);
  });

  it("returns true at or after total turn 16", () => {
    expect(hasReachedEndCondition(2, 8)).toBe(true);
    expect(hasReachedEndCondition(3, 1)).toBe(true);
  });
});

