import type { ApothecaryOutcome, InjuryPayload, InjuryResult, StatReduction } from "../../domain/events";

const casualtyLabels: Record<Exclude<InjuryResult, "OTHER">, string> = {
  BH: "Badly Hurt",
  MNG: "Miss Next Game",
  NIGGLING: "Niggling Injury",
  STAT: "Characteristic Reduction",
  DEAD: "Dead",
};

const apothecaryLabels: Record<ApothecaryOutcome, string> = {
  RECOVERED: "Recovered",
  BH: "Badly Hurt",
  MNG: "Miss Next Game",
  DEAD: "Dead",
  STAT: "Characteristic Reduction",
};

const formatStatReduction = (stat?: StatReduction) => (stat ? `(-${stat})` : "");

export function getFinalInjuryResult(payload: InjuryPayload | undefined): InjuryResult | ApothecaryOutcome | undefined {
  if (!payload) return undefined;
  if (payload.apothecaryUsed && payload.apothecaryOutcome) return payload.apothecaryOutcome;
  return payload.injuryResult;
}

export function formatCasualtyResult(result?: InjuryResult | ApothecaryOutcome, stat?: StatReduction): string {
  if (!result || result === "OTHER") return "Other";
  if (result === "STAT") {
    const statPart = formatStatReduction(stat);
    return statPart ? `${casualtyLabels.STAT} ${statPart}` : casualtyLabels.STAT;
  }

  if (result in casualtyLabels) return casualtyLabels[result as Exclude<InjuryResult, "OTHER">];
  return apothecaryLabels[result as ApothecaryOutcome] ?? String(result);
}

export function formatApothecaryOutcome(payload: InjuryPayload | undefined): string {
  if (!payload?.apothecaryUsed) return "";
  const outcomeText = formatCasualtyResult(payload.apothecaryOutcome, payload.apothecaryStat);
  return ` (Apo: ${outcomeText})`;
}
