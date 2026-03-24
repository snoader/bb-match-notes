import { sortByLabel } from "../shared/sort";
import type { TeamMeta } from "./teamMeta";

type InducementCategory = "Standard" | "Team-specific" | "Variable price";

type CanonicalInducementKind =
  | "Prayers to Nuffle"
  | "Part-time Assistant Coaches"
  | "Temp Agency Cheerleaders"
  | "Team Mascot"
  | "Weather Mage"
  | "Blitzer’s Best Kegs"
  | "Bribes"
  | "Extra Team Training"
  | "Mortuary Assistant"
  | "Plague Doctor"
  | "Riotous Rookies"
  | "Wandering Apothecary"
  | "Halfling Master Chef"
  | "Biased Referee"
  | "Infamous Coaching Staff"
  | "Mercenary Players"
  | "Star Players";

type LegacyInducementKind = "Wizard" | "Apothecary" | "Bloodweiser Keg" | "Extra Training" | "Mascot" | "Bribe" | "Star Player";

export type InducementKind = CanonicalInducementKind | LegacyInducementKind;


type InducementRestriction =
  | { type: "specialRule"; value: "Masters of Undeath" | "Favoured of Nurgle" | "Low Cost Linemen" }
  | { type: "canBuyApothecary" };

export type InducementOption = {
  kind: CanonicalInducementKind;
  label: string;
  category: InducementCategory;
  restrictions?: readonly InducementRestriction[];
  allowsDetails?: boolean;
};

const CANONICAL_INDUCEMENT_OPTIONS: readonly InducementOption[] = [
  { kind: "Prayers to Nuffle", label: "Prayers to Nuffle", category: "Standard" },
  { kind: "Part-time Assistant Coaches", label: "Part-time Assistant Coaches", category: "Standard" },
  { kind: "Temp Agency Cheerleaders", label: "Temp Agency Cheerleaders", category: "Standard" },
  { kind: "Team Mascot", label: "Team Mascot", category: "Standard" },
  { kind: "Weather Mage", label: "Weather Mage", category: "Standard" },
  { kind: "Blitzer’s Best Kegs", label: "Blitzer’s Best Kegs", category: "Standard" },
  { kind: "Bribes", label: "Bribes", category: "Standard" },
  { kind: "Extra Team Training", label: "Extra Team Training", category: "Standard" },
  {
    kind: "Mortuary Assistant",
    label: "Mortuary Assistant",
    category: "Team-specific",
    restrictions: [{ type: "specialRule", value: "Masters of Undeath" }],
  },
  {
    kind: "Plague Doctor",
    label: "Plague Doctor",
    category: "Team-specific",
    restrictions: [{ type: "specialRule", value: "Favoured of Nurgle" }],
  },
  {
    kind: "Riotous Rookies",
    label: "Riotous Rookies",
    category: "Team-specific",
    restrictions: [{ type: "specialRule", value: "Low Cost Linemen" }],
  },
  {
    kind: "Wandering Apothecary",
    label: "Wandering Apothecary",
    category: "Team-specific",
    restrictions: [{ type: "canBuyApothecary" }],
  },
  { kind: "Halfling Master Chef", label: "Halfling Master Chef", category: "Standard" },
  { kind: "Biased Referee", label: "Biased Referee", category: "Variable price", allowsDetails: true },
  { kind: "Infamous Coaching Staff", label: "Infamous Coaching Staff", category: "Variable price", allowsDetails: true },
  { kind: "Mercenary Players", label: "Mercenary Players", category: "Variable price", allowsDetails: true },
  { kind: "Star Players", label: "Star Players", category: "Variable price", allowsDetails: true },
] as const;

const LEGACY_LABELS: Record<LegacyInducementKind, string> = {
  Wizard: "Wizard",
  Apothecary: "Apothecary",
  "Bloodweiser Keg": "Bloodweiser Keg",
  "Extra Training": "Extra Training",
  Mascot: "Mascot",
  Bribe: "Bribe",
  "Star Player": "Star Player",
};

export const INDUCEMENT_OPTIONS: readonly InducementOption[] = sortByLabel(CANONICAL_INDUCEMENT_OPTIONS, (option) => option.label);

const selectableKinds = new Set<InducementKind>(INDUCEMENT_OPTIONS.map((option) => option.kind));
const canonicalByKind = new Map<InducementKind, InducementOption>(INDUCEMENT_OPTIONS.map((option) => [option.kind, option]));

export function isSelectableInducement(kind: InducementKind): boolean {
  return selectableKinds.has(kind);
}

export function labelInducement(kind: InducementKind): string {
  const canonical = canonicalByKind.get(kind);
  if (canonical) return canonical.label;
  return LEGACY_LABELS[kind as LegacyInducementKind] ?? kind;
}

export function isInducementAllowed(kind: InducementKind, teamMeta?: TeamMeta): string | undefined {
  const option = canonicalByKind.get(kind);
  if (!option?.restrictions?.length) return undefined;

  const dependsOnRulesMessage = "Availability depends on your team’s special rules.";

  for (const restriction of option.restrictions) {
    if (restriction.type === "specialRule") {
      if (!teamMeta?.specialRules) return dependsOnRulesMessage;
      if (!teamMeta.specialRules.includes(restriction.value)) {
        return `Requires special rule: ${restriction.value}.`;
      }
    }

    if (restriction.type === "canBuyApothecary") {
      if (typeof teamMeta?.canBuyApothecary !== "boolean") return dependsOnRulesMessage;
      if (!teamMeta.canBuyApothecary) return "Not available for teams that cannot buy an apothecary.";
    }
  }

  return undefined;
}
