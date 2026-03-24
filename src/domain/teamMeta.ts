import type { TeamId } from "./enums";

export type TeamIdentity = {
  teamId?: string;
  teamName?: string;
  rosterId?: string;
  rosterName?: string;
};

export type TeamSppMeta = {
  profile?: string;
  flags?: string[];
  rosterTraits?: string[];
};

export type TeamMeta = {
  identity?: TeamIdentity;
  specialRules?: string[];
  canBuyApothecary?: boolean;
  spp?: TeamSppMeta;
};

export type MatchTeamMeta = Partial<Record<TeamId, TeamMeta>>;

const normalizeString = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
};

const normalizeStringList = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  const normalized = value
    .map((entry) => normalizeString(entry))
    .filter((entry): entry is string => Boolean(entry));
  return normalized.length ? normalized : undefined;
};

export function normalizeTeamMeta(teamMeta: unknown, fallbackName?: string): TeamMeta | undefined {
  if (!teamMeta || typeof teamMeta !== "object") {
    return fallbackName ? { identity: { teamName: fallbackName } } : undefined;
  }

  const raw = teamMeta as TeamMeta;
  const identity: TeamIdentity = {
    teamId: normalizeString(raw.identity?.teamId),
    teamName: normalizeString(raw.identity?.teamName) ?? normalizeString(fallbackName),
    rosterId: normalizeString(raw.identity?.rosterId),
    rosterName: normalizeString(raw.identity?.rosterName),
  };

  const normalized: TeamMeta = {
    identity: Object.values(identity).some(Boolean) ? identity : undefined,
    specialRules: normalizeStringList(raw.specialRules),
    canBuyApothecary: typeof raw.canBuyApothecary === "boolean" ? raw.canBuyApothecary : undefined,
    spp: raw.spp
      ? {
          profile: normalizeString(raw.spp.profile),
          flags: normalizeStringList(raw.spp.flags),
          rosterTraits: normalizeStringList(raw.spp.rosterTraits),
        }
      : undefined,
  };

  if (normalized.canBuyApothecary === undefined && typeof raw.canBuyApothecary !== "boolean") {
    delete normalized.canBuyApothecary;
  }
  if (normalized.spp && !normalized.spp.profile && !normalized.spp.flags?.length && !normalized.spp.rosterTraits?.length) {
    delete normalized.spp;
  }

  return Object.values(normalized).some(Boolean) ? normalized : undefined;
}

export function normalizeMatchTeamMeta(teamMeta: unknown, teamNames?: Partial<Record<TeamId, string>>): MatchTeamMeta {
  return {
    A: normalizeTeamMeta((teamMeta as MatchTeamMeta | undefined)?.A, teamNames?.A),
    B: normalizeTeamMeta((teamMeta as MatchTeamMeta | undefined)?.B, teamNames?.B),
  };
}
