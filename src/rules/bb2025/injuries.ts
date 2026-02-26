import type { InjuryCause, InjuryPayload, InjuryResult, StatReduction } from "../../domain/events";

export const injuryCauses: InjuryCause[] = [
  "BLOCK",
  "FOUL",
  "SECRET_WEAPON",
  "CROWD",
  "FAILED_DODGE",
  "FAILED_GFI",
  "FAILED_PICKUP",
  "OTHER",
];

export const injuryResults: InjuryResult[] = ["BH", "MNG", "NIGGLING", "STAT", "DEAD", "OTHER"];

export const statReductions: StatReduction[] = ["MA", "AV", "AG", "PA", "ST"];

export const causesRequiringCauser = new Set<InjuryCause>(["BLOCK", "FOUL", "SECRET_WEAPON", "CROWD"]);

export const casualtySppResults = new Set<InjuryResult>(["BH", "MNG", "NIGGLING", "STAT", "DEAD"]);

export const nonSppCauses = new Set<InjuryCause>(["FAILED_DODGE", "FAILED_GFI", "FAILED_PICKUP"]);

export function normalizeInjuryPayload(payload: unknown): Required<Pick<InjuryPayload, "cause" | "injuryResult" | "apothecaryUsed">> & InjuryPayload {
  const p = (payload ?? {}) as InjuryPayload;
  return {
    ...p,
    cause: p.cause ?? "OTHER",
    injuryResult: p.injuryResult ?? "OTHER",
    apothecaryUsed: p.apothecaryUsed ?? false,
  };
}

export function isCasualtySppEligible(payload: InjuryPayload): boolean {
  const normalized = normalizeInjuryPayload(payload);
  if (!normalized.causerPlayerId) return false;
  if (nonSppCauses.has(normalized.cause)) return false;
  return casualtySppResults.has(normalized.injuryResult);
}
