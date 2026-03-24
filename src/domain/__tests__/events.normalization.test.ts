import { describe, expect, it } from "vitest";
import type { MatchEvent } from "../events";
import { getSppPlayerReference, normalizeInjuryPayload } from "../events";

describe("normalizeInjuryPayload", () => {
  it("normalizes empty and malformed payloads", () => {
    expect(normalizeInjuryPayload(undefined)).toMatchObject({
      cause: "OTHER",
      injuryResult: "OTHER",
      apothecaryUsed: false,
    });

    expect(normalizeInjuryPayload({ cause: 42, injuryResult: "NOPE", apothecaryUsed: "yes" })).toMatchObject({
      cause: "OTHER",
      injuryResult: "OTHER",
      apothecaryUsed: false,
    });
  });

  it("supports legacy aliases for casualty/apothecary payload fields", () => {
    expect(
      normalizeInjuryPayload({
        cause: "BLOCK",
        result: "STAT",
        characteristic: "ST",
        apothecaryResult: "MNG",
        apothecaryCharacteristic: "MA",
      }),
    ).toMatchObject({
      cause: "BLOCK",
      injuryResult: "STAT",
      stat: "ST",
      apothecaryUsed: true,
      apothecaryOutcome: "MNG",
      apothecaryStat: "MA",
      finalOutcome: "MNG",
      sppEligible: true,
    });
  });

  it("derives final casualty outcome fields and SPP eligibility from apothecary outcome", () => {
    expect(
      normalizeInjuryPayload({
        cause: "BLOCK",
        injuryResult: "DEAD",
        apothecaryUsed: true,
        apothecaryOutcome: "RECOVERED",
      }),
    ).toMatchObject({
      finalOutcome: "RECOVERED",
      sppEligible: false,
    });
  });
});

describe("getSppPlayerReference", () => {
  const baseEvent = (overrides: Partial<MatchEvent> & Pick<MatchEvent, "type">): MatchEvent => ({
    id: overrides.id ?? "e1",
    type: overrides.type,
    half: 1,
    turn: 1,
    createdAt: 1,
    team: overrides.team,
    payload: overrides.payload,
  });

  it("maps touchdown/completion/interception with payload team fallback", () => {
    expect(getSppPlayerReference(baseEvent({ type: "touchdown", payload: { player: "A1", playerTeam: "A" } }))).toEqual({ team: "A", playerId: "A1" });
    expect(getSppPlayerReference(baseEvent({ type: "completion", payload: { passer: "B2", passerTeam: "B" } }))).toEqual({ team: "B", playerId: "B2" });
    expect(getSppPlayerReference(baseEvent({ type: "interception", payload: { player: "A3", playerTeam: "A" } }))).toEqual({ team: "A", playerId: "A3" });
  });

  it("maps injury causer and infers causer team from victim team when event team is missing", () => {
    expect(
      getSppPlayerReference(
        baseEvent({
          type: "injury",
          payload: { cause: "BLOCK", causerPlayerId: "A4", victimTeam: "B", victimPlayerId: "B1", injuryResult: "BH" },
        }),
      ),
    ).toEqual({ team: "A", playerId: "A4" });
  });

  it("maps mvp and player-targeted spp adjustments", () => {
    expect(getSppPlayerReference(baseEvent({ type: "mvp_awarded", payload: { player: "B7", playerTeam: "B" } }))).toEqual({ team: "B", playerId: "B7" });
    expect(getSppPlayerReference(baseEvent({ type: "spp_adjustment", payload: { target: "player", team: "A", player: "A9", category: "other", delta: 1, reason: "test" } }))).toEqual({
      team: "A",
      playerId: "A9",
    });
  });
});
