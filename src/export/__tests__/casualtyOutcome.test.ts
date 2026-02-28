import { describe, expect, it } from "vitest";
import { formatApothecaryOutcome, getFinalInjuryResult, isFinalCasualty } from "../casualtyOutcome";

describe("casualtyOutcome", () => {
  it("resolves recovered apothecary outcomes to non-casualty", () => {
    const payload = { injuryResult: "DEAD" as const, apothecaryUsed: true, apothecaryOutcome: "RECOVERED" as const };
    expect(getFinalInjuryResult(payload).result).toBe("RECOVERED");
    expect(isFinalCasualty(payload)).toBe(false);
    expect(formatApothecaryOutcome(payload)).toBe("Recovered (no casualty)");
  });

  it("uses apothecary stat when STAT is selected", () => {
    const payload = {
      injuryResult: "MNG" as const,
      apothecaryUsed: true,
      apothecaryOutcome: "STAT" as const,
      apothecaryStat: "AG" as const,
    };

    expect(getFinalInjuryResult(payload)).toEqual({ result: "STAT", stat: "AG" });
    expect(formatApothecaryOutcome(payload)).toBe("STAT(AG)");
  });

  it("keeps backward compatibility for legacy SAVED outcome", () => {
    const payload = { injuryResult: "BH" as const, apothecaryUsed: true, apothecaryOutcome: "SAVED" as const };
    expect(getFinalInjuryResult(payload).result).toBe("RECOVERED");
  });
});
