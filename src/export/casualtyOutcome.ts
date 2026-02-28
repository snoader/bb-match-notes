import type { InjuryPayload, InjuryResult, StatReduction } from "../domain/events";

export type FinalInjuryResult = InjuryResult | "RECOVERED";

const FINAL_OUTCOMES = new Set<FinalInjuryResult>(["RECOVERED", "BH", "MNG", "STAT", "DEAD", "NIGGLING", "OTHER"]);

function mapLegacyOutcome(outcome: InjuryPayload["apothecaryOutcome"]): FinalInjuryResult | undefined {
  if (!outcome) return undefined;
  if (outcome === "SAVED") return "RECOVERED";
  if (outcome === "DIED_ANYWAY") return "DEAD";
  if (outcome === "CHANGED_RESULT" || outcome === "UNKNOWN") return undefined;
  return FINAL_OUTCOMES.has(outcome as FinalInjuryResult) ? (outcome as FinalInjuryResult) : undefined;
}

export function getFinalInjuryResult(payload: InjuryPayload): { result: FinalInjuryResult; stat?: StatReduction } {
  const baseResult = payload.injuryResult ?? "OTHER";
  const baseStat = payload.stat;

  if (!payload.apothecaryUsed) return { result: baseResult, stat: baseResult === "STAT" ? baseStat : undefined };

  const mapped = mapLegacyOutcome(payload.apothecaryOutcome);
  const result = mapped ?? baseResult;

  if (result !== "STAT") return { result };
  return { result, stat: payload.apothecaryStat ?? baseStat };
}

export function isFinalCasualty(payload: InjuryPayload): boolean {
  return getFinalInjuryResult(payload).result !== "RECOVERED";
}

export function formatApothecaryOutcome(payload: InjuryPayload): string | undefined {
  if (!payload.apothecaryUsed) return undefined;

  const { result, stat } = getFinalInjuryResult(payload);
  if (result === "RECOVERED") return "Recovered (no casualty)";
  if (result === "STAT") return `STAT${stat ? `(${stat})` : ""}`;
  return result;
}
