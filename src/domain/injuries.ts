import type { ApothecaryOutcome, InjuryCause, InjuryResult } from "./events";
import { INJURY_CAUSES } from "./events";
import { labelCause } from "./labels";

/**
 * Injury causes are intentionally grouped by common in-match usage.
 */
export const CAUSE_OPTIONS: readonly InjuryCause[] = [...INJURY_CAUSES, "OTHER"];

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

export const SORTED_CAUSE_OPTIONS: readonly InjuryCause[] = [...CAUSE_OPTIONS].sort((a, b) =>
  labelCause(a).localeCompare(labelCause(b))
);
