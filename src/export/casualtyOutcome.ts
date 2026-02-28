import type { ApothecaryOutcome, InjuryPayload, InjuryResult } from "../domain/events";

const CASUALTY_RESULTS: InjuryResult[] = ["BH", "MNG", "NIGGLING", "STAT", "DEAD", "OTHER"];

export function getFinalInjuryResult(payload: InjuryPayload): InjuryResult | undefined {
  if (payload.apothecaryUsed && payload.apothecaryOutcome) {
    if (payload.apothecaryOutcome === "RECOVERED") return undefined;
    return payload.apothecaryOutcome;
  }

  return payload.injuryResult;
}

export function isFinalCasualty(payload: InjuryPayload): boolean {
  const finalResult = getFinalInjuryResult(payload);
  return finalResult ? CASUALTY_RESULTS.includes(finalResult) : false;
}

export function formatApothecaryOutcome(outcome: ApothecaryOutcome): string {
  const labels: Record<ApothecaryOutcome, string> = {
    RECOVERED: "Recovered",
    BH: "Badly Hurt",
    MNG: "Miss Next Game",
    DEAD: "Dead",
    STAT: "Characteristic Reduction",
  };

  return labels[outcome];
}
