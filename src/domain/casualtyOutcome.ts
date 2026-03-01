import type { ApothecaryOutcome, InjuryPayload, InjuryResult, StatReduction } from "./events";

type CasualtyResult = InjuryResult | ApothecaryOutcome | undefined;

const formatResultLabel = (result: CasualtyResult, stat?: StatReduction) => {
  switch (result) {
    case "BH":
      return "Badly Hurt";
    case "MNG":
      return "Miss Next Game";
    case "DEAD":
      return "Dead";
    case "STAT":
      return `Characteristic Reduction${stat ? ` (-${stat})` : ""}`;
    case "RECOVERED":
      return "Recovered";
    default:
      return String(result ?? "OTHER");
  }
};

export function getFinalInjuryResult(payload: InjuryPayload | undefined): CasualtyResult {
  if (!payload) return undefined;
  if (payload.apothecaryUsed && payload.apothecaryOutcome) {
    return payload.apothecaryOutcome;
  }
  return payload.injuryResult;
}

export function formatInjuryResult(result: InjuryResult | undefined, stat?: StatReduction): string {
  return formatResultLabel(result, stat);
}

export function formatApothecaryOutcome(outcome: ApothecaryOutcome | undefined, stat?: StatReduction): string {
  return formatResultLabel(outcome, stat);
}
