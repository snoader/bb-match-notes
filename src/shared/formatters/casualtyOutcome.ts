import { normalizeInjuryPayload, type ApothecaryOutcome, type InjuryPayload, type InjuryResult, type StatReduction } from "../../domain/events";

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
  const normalized = normalizeInjuryPayload(payload);
  if (normalized.apothecaryUsed && normalized.apothecaryOutcome) return normalized.apothecaryOutcome;
  return normalized.injuryResult;
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
  if (!payload) return "";
  const normalized = normalizeInjuryPayload(payload);
  if (!normalized.apothecaryUsed) return "";
  const outcomeText = formatCasualtyResult(normalized.apothecaryOutcome, normalized.apothecaryStat);
  return ` (Apo: ${outcomeText})`;
}
