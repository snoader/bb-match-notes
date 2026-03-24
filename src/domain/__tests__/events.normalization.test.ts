import { describe, expect, it } from "vitest";
import { normalizeInjuryPayload } from "../events";

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
