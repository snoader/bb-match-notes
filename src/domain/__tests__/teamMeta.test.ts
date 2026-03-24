import { describe, expect, it } from "vitest";
import { normalizeMatchTeamMeta, normalizeTeamMeta } from "../teamMeta";

describe("teamMeta normalization", () => {
  it("keeps identity and optional spp metadata when provided", () => {
    expect(
      normalizeTeamMeta({
        identity: { teamId: "team-undead", teamName: "  Shambling Dead ", rosterId: "shambling-undead", rosterName: " Shambling Undead " },
        specialRules: ["Masters of Undeath", "  "],
        canBuyApothecary: false,
        spp: {
          profile: "undead-default",
          flags: ["no-prayer-completion-bonus"],
          rosterTraits: ["raise-dead", " "],
        },
      }),
    ).toEqual({
      identity: {
        teamId: "team-undead",
        teamName: "Shambling Dead",
        rosterId: "shambling-undead",
        rosterName: "Shambling Undead",
      },
      specialRules: ["Masters of Undeath"],
      canBuyApothecary: false,
      spp: {
        profile: "undead-default",
        flags: ["no-prayer-completion-bonus"],
        rosterTraits: ["raise-dead"],
      },
    });
  });

  it("falls back to team names when no explicit meta exists", () => {
    expect(normalizeMatchTeamMeta(undefined, { A: "Orcs", B: "Humans" })).toEqual({
      A: { identity: { teamName: "Orcs" } },
      B: { identity: { teamName: "Humans" } },
    });
  });
});
