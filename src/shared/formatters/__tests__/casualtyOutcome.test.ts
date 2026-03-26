import { describe, expect, it } from "vitest";
import { isFinalCasualty, getFinalInjuryResult, formatCasualtyResult } from "../casualtyOutcome";

// ---------------------------------------------------------------------------
// isFinalCasualty
// ---------------------------------------------------------------------------

describe("isFinalCasualty", () => {
  it("returns false for undefined payload", () => {
    expect(isFinalCasualty(undefined)).toBe(false);
  });

  it("returns false for empty payload (no injury result)", () => {
    expect(isFinalCasualty({})).toBe(false);
  });

  it("returns true when there is no apothecary and injury result is DEAD", () => {
    expect(isFinalCasualty({ injuryResult: "DEAD" })).toBe(true);
  });

  it("returns true when there is no apothecary and injury result is MNG", () => {
    expect(isFinalCasualty({ injuryResult: "MNG" })).toBe(true);
  });

  it("returns true when there is no apothecary and injury result is BH", () => {
    expect(isFinalCasualty({ injuryResult: "BH" })).toBe(true);
  });

  it("returns true when apothecary is not used (apothecaryUsed: false)", () => {
    expect(isFinalCasualty({ injuryResult: "DEAD", apothecaryUsed: false })).toBe(true);
  });

  it("returns false when apothecary outcome is RECOVERED (player saved)", () => {
    expect(
      isFinalCasualty({ injuryResult: "DEAD", apothecaryUsed: true, apothecaryOutcome: "RECOVERED" }),
    ).toBe(false);
  });

  it("returns true when apothecary outcome is BH (still a casualty for SPP)", () => {
    expect(
      isFinalCasualty({ injuryResult: "DEAD", apothecaryUsed: true, apothecaryOutcome: "BH" }),
    ).toBe(true);
  });

  it("returns true when apothecary outcome is DEAD", () => {
    expect(
      isFinalCasualty({ injuryResult: "MNG", apothecaryUsed: true, apothecaryOutcome: "DEAD" }),
    ).toBe(true);
  });

  it("returns true when apothecary outcome is MNG", () => {
    expect(
      isFinalCasualty({ injuryResult: "DEAD", apothecaryUsed: true, apothecaryOutcome: "MNG" }),
    ).toBe(true);
  });

  it("returns true when apothecary outcome is STAT", () => {
    expect(
      isFinalCasualty({ injuryResult: "DEAD", apothecaryUsed: true, apothecaryOutcome: "STAT" }),
    ).toBe(true);
  });

  it("respects explicit sppEligible=false override in payload", () => {
    expect(isFinalCasualty({ injuryResult: "DEAD", sppEligible: false })).toBe(false);
  });

  it("respects explicit sppEligible=true override even for OTHER result", () => {
    expect(isFinalCasualty({ injuryResult: "OTHER", sppEligible: true })).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// getFinalInjuryResult
// ---------------------------------------------------------------------------

describe("getFinalInjuryResult", () => {
  it("returns undefined for undefined payload", () => {
    expect(getFinalInjuryResult(undefined)).toBeUndefined();
  });

  it("returns the original injury result when no apothecary is used", () => {
    expect(getFinalInjuryResult({ injuryResult: "DEAD" })).toBe("DEAD");
  });

  it("returns MNG when no apothecary and injury is MNG", () => {
    expect(getFinalInjuryResult({ injuryResult: "MNG" })).toBe("MNG");
  });

  it("returns BH when no apothecary and injury is BH", () => {
    expect(getFinalInjuryResult({ injuryResult: "BH" })).toBe("BH");
  });

  it("returns STAT when no apothecary and injury is STAT", () => {
    expect(getFinalInjuryResult({ injuryResult: "STAT" })).toBe("STAT");
  });

  it("returns apothecary outcome BH when apo overrides DEAD", () => {
    expect(
      getFinalInjuryResult({ injuryResult: "DEAD", apothecaryUsed: true, apothecaryOutcome: "BH" }),
    ).toBe("BH");
  });

  it("returns RECOVERED when apothecary saves the player", () => {
    expect(
      getFinalInjuryResult({ injuryResult: "DEAD", apothecaryUsed: true, apothecaryOutcome: "RECOVERED" }),
    ).toBe("RECOVERED");
  });

  it("returns DEAD when apothecary outcome is DEAD", () => {
    expect(
      getFinalInjuryResult({ injuryResult: "MNG", apothecaryUsed: true, apothecaryOutcome: "DEAD" }),
    ).toBe("DEAD");
  });

  it("returns apo STAT when apothecary outcome is STAT", () => {
    expect(
      getFinalInjuryResult({ injuryResult: "DEAD", apothecaryUsed: true, apothecaryOutcome: "STAT" }),
    ).toBe("STAT");
  });

  it("returns apo MNG when apothecary outcome is MNG", () => {
    expect(
      getFinalInjuryResult({ injuryResult: "DEAD", apothecaryUsed: true, apothecaryOutcome: "MNG" }),
    ).toBe("MNG");
  });
});

// ---------------------------------------------------------------------------
// formatCasualtyResult
// ---------------------------------------------------------------------------

describe("formatCasualtyResult", () => {
  it("returns 'Other' for undefined result", () => {
    expect(formatCasualtyResult(undefined)).toBe("Other");
  });

  it("returns 'Other' for result 'OTHER'", () => {
    expect(formatCasualtyResult("OTHER")).toBe("Other");
  });

  it("formats BH", () => {
    expect(formatCasualtyResult("BH")).toBe("Badly Hurt");
  });

  it("formats MNG", () => {
    expect(formatCasualtyResult("MNG")).toBe("Miss Next Game");
  });

  it("formats NIGGLING", () => {
    expect(formatCasualtyResult("NIGGLING")).toBe("Niggling Injury");
  });

  it("formats DEAD", () => {
    expect(formatCasualtyResult("DEAD")).toBe("Dead");
  });

  it("formats STAT without stat reduction", () => {
    expect(formatCasualtyResult("STAT")).toBe("Characteristic Reduction");
  });

  it("formats STAT with a stat reduction", () => {
    expect(formatCasualtyResult("STAT", "MA")).toBe("Characteristic Reduction (-MA)");
  });

  it("formats apothecary-only outcome RECOVERED", () => {
    expect(formatCasualtyResult("RECOVERED")).toBe("Recovered");
  });
});
