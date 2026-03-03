import type { ApothecaryOutcome, InjuryResult } from "./events";

/**
 * Casualty outcomes are intentionally ordered by severity (mild → severe).
 */
export const INJURY_RESULT_OPTIONS: readonly InjuryResult[] = [
  "BH",
  "MNG",
  "NIGGLING",
  "STAT",
  "DEAD",
  "OTHER",
];

/**
 * Apothecary outcomes are intentionally ordered by severity (mild → severe).
 */
export const APOTHECARY_OUTCOME_OPTIONS: readonly ApothecaryOutcome[] = [
  "RECOVERED",
  "BH",
  "MNG",
  "STAT",
  "DEAD",
];
