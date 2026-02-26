import type { InjuryPayload } from "../../domain/events";
import { causesRequiringCauser, normalizeInjuryPayload } from "./injuries";

export type ValidationResult = { valid: boolean; errors: string[] };

export function validateInjuryPayload(payload: InjuryPayload): ValidationResult {
  const p = normalizeInjuryPayload(payload);
  const errors: string[] = [];

  if (!p.victimPlayerId && !p.victimName) {
    errors.push("Injury must include a victim.");
  }

  if (causesRequiringCauser.has(p.cause) && !p.causerPlayerId) {
    errors.push(`Cause ${p.cause} requires a causer.`);
  }

  if (p.injuryResult === "STAT" && !p.stat) {
    errors.push("STAT injuries must include a subtype: MA, AV, AG, PA, or ST.");
  }

  return { valid: errors.length === 0, errors };
}
