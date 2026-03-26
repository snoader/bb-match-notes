import { describe, expect, it } from "vitest";
import { mapKickoffRoll, BB2025_KICKOFF_TABLE } from "../kickoff";

describe("mapKickoffRoll – normalization (boundary tests)", () => {
  it("roll = -1 (below minimum) → clamped to 2 → GET_THE_REF", () => {
    expect(mapKickoffRoll(-1)).toEqual(BB2025_KICKOFF_TABLE[2]);
  });

  it("roll = 0 (extreme below minimum) → clamped to 2 → GET_THE_REF", () => {
    expect(mapKickoffRoll(0)).toEqual(BB2025_KICKOFF_TABLE[2]);
  });

  it("roll = 1 (one below valid minimum) → clamped to 2 → GET_THE_REF", () => {
    expect(mapKickoffRoll(1)).toEqual(BB2025_KICKOFF_TABLE[2]);
  });

  it("roll = 1.5 (rounds to 2 via Math.round) → GET_THE_REF", () => {
    expect(mapKickoffRoll(1.5)).toEqual(BB2025_KICKOFF_TABLE[2]);
  });

  it("roll = 2 (valid lower boundary) → GET_THE_REF", () => {
    expect(mapKickoffRoll(2)).toEqual(BB2025_KICKOFF_TABLE[2]);
  });

  it("roll = 7 (middle value) → CHANGING_WEATHER", () => {
    expect(mapKickoffRoll(7)).toEqual(BB2025_KICKOFF_TABLE[7]);
  });

  it("roll = 12 (valid upper boundary) → PITCH_INVASION", () => {
    expect(mapKickoffRoll(12)).toEqual(BB2025_KICKOFF_TABLE[12]);
  });

  it("roll = 13 (one above valid maximum) → clamped to 12 → PITCH_INVASION", () => {
    expect(mapKickoffRoll(13)).toEqual(BB2025_KICKOFF_TABLE[12]);
  });
});

describe("mapKickoffRoll – mapping (all valid rolls 2–12)", () => {
  it("roll = 2 → key GET_THE_REF, label 'Get the Ref'", () => {
    const result = mapKickoffRoll(2);
    expect(result.key).toBe("GET_THE_REF");
    expect(result.label).toBe("Get the Ref");
  });

  it("roll = 3 → key TIME_OUT, label 'Time-Out: clock adjustment'", () => {
    const result = mapKickoffRoll(3);
    expect(result.key).toBe("TIME_OUT");
    expect(result.label).toBe("Time-Out: clock adjustment");
  });

  it("roll = 4 → key PERFECT_DEFENCE, label 'Perfect Defence'", () => {
    const result = mapKickoffRoll(4);
    expect(result.key).toBe("PERFECT_DEFENCE");
    expect(result.label).toBe("Perfect Defence");
  });

  it("roll = 5 → key HIGH_KICK, label 'High Kick'", () => {
    const result = mapKickoffRoll(5);
    expect(result.key).toBe("HIGH_KICK");
    expect(result.label).toBe("High Kick");
  });

  it("roll = 6 → key CHEERING_FANS, label 'Cheering Fans'", () => {
    const result = mapKickoffRoll(6);
    expect(result.key).toBe("CHEERING_FANS");
    expect(result.label).toBe("Cheering Fans");
  });

  it("roll = 7 → key CHANGING_WEATHER, label 'Changing Weather'", () => {
    const result = mapKickoffRoll(7);
    expect(result.key).toBe("CHANGING_WEATHER");
    expect(result.label).toBe("Changing Weather");
  });

  it("roll = 8 → key BRILLIANT_COACHING, label 'Brilliant Coaching'", () => {
    const result = mapKickoffRoll(8);
    expect(result.key).toBe("BRILLIANT_COACHING");
    expect(result.label).toBe("Brilliant Coaching");
  });

  it("roll = 9 → key QUICK_SNAP, label 'Quick Snap'", () => {
    const result = mapKickoffRoll(9);
    expect(result.key).toBe("QUICK_SNAP");
    expect(result.label).toBe("Quick Snap");
  });

  it("roll = 10 → key BLITZ, label 'Blitz'", () => {
    const result = mapKickoffRoll(10);
    expect(result.key).toBe("BLITZ");
    expect(result.label).toBe("Blitz");
  });

  it("roll = 11 → key THROW_A_ROCK, label 'Throw a Rock'", () => {
    const result = mapKickoffRoll(11);
    expect(result.key).toBe("THROW_A_ROCK");
    expect(result.label).toBe("Throw a Rock");
  });

  it("roll = 12 → key PITCH_INVASION, label 'Pitch Invasion'", () => {
    const result = mapKickoffRoll(12);
    expect(result.key).toBe("PITCH_INVASION");
    expect(result.label).toBe("Pitch Invasion");
  });
});
