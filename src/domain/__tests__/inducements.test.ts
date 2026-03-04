import { describe, expect, it } from "vitest";
import { INDUCEMENT_OPTIONS, isInducementAllowed, isSelectableInducement, labelInducement } from "../inducements";

describe("inducements", () => {
  it("matches the official selectable inducements list in alphabetical order", () => {
    expect(INDUCEMENT_OPTIONS.map((option) => option.label)).toEqual([
      "Biased Referee",
      "Blitzer’s Best Kegs",
      "Bribes",
      "Extra Team Training",
      "Halfling Master Chef",
      "Infamous Coaching Staff",
      "Mercenary Players",
      "Mortuary Assistant",
      "Part-time Assistant Coaches",
      "Plague Doctor",
      "Prayers to Nuffle",
      "Riotous Rookies",
      "Star Players",
      "Team Mascot",
      "Temp Agency Cheerleaders",
      "Wandering Apothecary",
      "Weather Mage",
    ]);
  });

  it("keeps legacy inducements labelable but not selectable", () => {
    expect(labelInducement("Wizard")).toBe("Wizard");
    expect(isSelectableInducement("Wizard")).toBe(false);
  });

  it("returns informational message for team-specific entries when team metadata is missing", () => {
    expect(isInducementAllowed("Mortuary Assistant")).toBe("Availability depends on your team’s special rules.");
  });
});
