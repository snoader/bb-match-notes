import { sortByLabel } from "../shared/sort";
import { labelInducement } from "./labels";

const INDUCEMENT_VALUES = [
  "Wizard",
  "Bribe",
  "Bloodweiser Keg",
  "Extra Training",
  "Apothecary",
  "Star Player",
  "Riotous Rookies",
  "Prayers to Nuffle",
  "Mascot",
] as const;

export type InducementKind = (typeof INDUCEMENT_VALUES)[number];

export const INDUCEMENT_OPTIONS: readonly InducementKind[] = sortByLabel(INDUCEMENT_VALUES, (kind) => labelInducement(kind));
