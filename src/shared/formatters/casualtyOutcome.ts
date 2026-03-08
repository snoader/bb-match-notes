import { labelApothecaryOutcome, labelInjuryOutcome } from "../../domain/labels";
import { normalizeInjuryPayload, type ApothecaryOutcome, type InjuryPayload, type InjuryResult, type StatReduction } from "../../domain/events";

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
    const statLabel = labelInjuryOutcome("STAT");
    return statPart ? `${statLabel} ${statPart}` : statLabel;
  }

  if (result in { BH: true, MNG: true, NIGGLING: true, DEAD: true }) return labelInjuryOutcome(result);
  return labelApothecaryOutcome(result) ?? String(result);
}

export function formatApothecaryOutcome(payload: InjuryPayload | undefined): string {
  if (!payload) return "";
  const normalized = normalizeInjuryPayload(payload);
  if (!normalized.apothecaryUsed) return "";
  const outcomeText = formatCasualtyResult(normalized.apothecaryOutcome, normalized.apothecaryStat);
  return ` (Apo: ${outcomeText})`;
}

export function isFinalCasualty(payload: InjuryPayload | undefined): boolean {
  const finalResult = getFinalInjuryResult(payload);
  return Boolean(finalResult && finalResult !== "RECOVERED");
}
