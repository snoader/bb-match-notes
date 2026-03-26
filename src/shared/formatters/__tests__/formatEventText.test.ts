import { describe, expect, it } from "vitest";
import type { MatchEvent } from "../../../domain/events";
import { formatEventText, type TeamNames } from "../formatEventText";

const teamNames: TeamNames = { A: "Orcs", B: "Humans" };

const evt = (overrides: Partial<MatchEvent> & Pick<MatchEvent, "type">): MatchEvent => ({
  id: "1",
  type: overrides.type,
  half: overrides.half ?? 1,
  turn: overrides.turn ?? 1,
  team: overrides.team,
  payload: overrides.payload,
  createdAt: 1,
});

// ---------------------------------------------------------------------------
// Priority: event types with NO coverage in eventFormatter.test.ts
// ---------------------------------------------------------------------------

describe("half_changed", () => {
  it("includes labelled half when payload provides one", () => {
    expect(formatEventText(evt({ type: "half_changed", payload: { half: 2 } }), teamNames)).toBe("Half changed: Half 2");
  });

  it("omits detail when payload is empty", () => {
    expect(formatEventText(evt({ type: "half_changed", payload: {} }), teamNames)).toBe("Half changed");
  });

  it("omits detail when payload is absent", () => {
    expect(formatEventText(evt({ type: "half_changed" }), teamNames)).toBe("Half changed");
  });
});

describe("reroll_used", () => {
  it("includes team name for team A", () => {
    expect(formatEventText(evt({ type: "reroll_used", team: "A" }), teamNames)).toBe("Re-roll used · Orcs");
  });

  it("includes team name for team B", () => {
    expect(formatEventText(evt({ type: "reroll_used", team: "B" }), teamNames)).toBe("Re-roll used · Humans");
  });
});

describe("apothecary_used", () => {
  it("includes team name", () => {
    expect(formatEventText(evt({ type: "apothecary_used", team: "A" }), teamNames)).toBe("Apothecary used · Orcs");
  });

  it("falls back to unknown team when team is absent", () => {
    expect(formatEventText(evt({ type: "apothecary_used" }), teamNames)).toBe("Apothecary used · Unknown team");
  });
});

describe("prayer_result", () => {
  it("appends labelled prayer result with roll number", () => {
    // iron_man → roll 3
    expect(formatEventText(evt({ type: "prayer_result", team: "A", payload: { result: "iron_man" } }), teamNames)).toBe(
      "Prayer · Orcs: Iron Man (3)",
    );
  });

  it("appends labelled prayer result without roll number", () => {
    // blessed_statue has no roll entry in PRAYER_D6_ROLL_BY_KEY
    expect(formatEventText(evt({ type: "prayer_result", team: "B", payload: { result: "blessed_statue" } }), teamNames)).toBe(
      "Prayer · Humans: Blessed Statue",
    );
  });

  it("omits detail when result is absent", () => {
    expect(formatEventText(evt({ type: "prayer_result", team: "A", payload: {} }), teamNames)).toBe("Prayer · Orcs");
  });
});

describe("drive_start", () => {
  it("returns static label", () => {
    // drive_start is handled explicitly in formatEventText even though it is not in EventType
    const e = { ...evt({ type: "match_start" }), type: "drive_start" } as unknown as MatchEvent;
    expect(formatEventText(e, teamNames)).toBe("Drive start");
  });
});

describe("unknown type fallback", () => {
  it("title-cases unknown snake_case type", () => {
    const e = { ...evt({ type: "match_start" }), type: "foul_penalty" } as unknown as MatchEvent;
    expect(formatEventText(e, teamNames)).toBe("Foul Penalty");
  });

  it("title-cases single-word unknown type", () => {
    const e = { ...evt({ type: "match_start" }), type: "turnover" } as unknown as MatchEvent;
    expect(formatEventText(e, teamNames)).toBe("Turnover");
  });
});

// ---------------------------------------------------------------------------
// Edge cases for partially covered types
// ---------------------------------------------------------------------------

describe("interception – sppEligible edge cases", () => {
  it("excludes SPP when sppEligible is false", () => {
    expect(
      formatEventText(evt({ type: "interception", team: "A", payload: { player: 1, sppEligible: false } }), teamNames),
    ).toBe("Interception · Orcs · Player 1 · SPP 0 (Interception excluded)");
  });
});

describe("stalling – without rollResult", () => {
  it("omits roll detail when no rollResult in payload", () => {
    expect(formatEventText(evt({ type: "stalling", team: "A", payload: {} }), teamNames)).toBe("Stalling · Orcs");
  });

  it("omits roll detail when payload is absent", () => {
    expect(formatEventText(evt({ type: "stalling", team: "B" }), teamNames)).toBe("Stalling · Humans");
  });
});

describe("note – without text", () => {
  it("returns bare 'Note' when text payload is absent", () => {
    expect(formatEventText(evt({ type: "note", payload: {} }), teamNames)).toBe("Note");
  });

  it("returns bare 'Note' when text is an empty string", () => {
    expect(formatEventText(evt({ type: "note", payload: { text: "   " } }), teamNames)).toBe("Note");
  });
});

describe("weather_set – without weather value", () => {
  it("returns bare label when weather is absent", () => {
    expect(formatEventText(evt({ type: "weather_set", payload: {} }), teamNames)).toBe("Weather changed");
  });
});

describe("legacy kickoff type", () => {
  it("formats using result field as kickoff label", () => {
    expect(formatEventText(evt({ type: "kickoff", payload: { result: "high_kick" } }), teamNames)).toBe("Kick-off · High Kick");
  });

  it("formats blitz result", () => {
    expect(formatEventText(evt({ type: "kickoff", payload: { result: "blitz" } }), teamNames)).toBe("Kick-off · Blitz");
  });

  it("returns 'Kick-off' alone when payload is absent", () => {
    expect(formatEventText(evt({ type: "kickoff" }), teamNames)).toBe("Kick-off");
  });
});

describe("kickoff_event – additional variants", () => {
  it("PITCH_INVASION appends freeform notes", () => {
    expect(
      formatEventText(
        evt({
          type: "kickoff_event",
          payload: {
            driveIndex: 0,
            kickingTeam: "A",
            receivingTeam: "B",
            roll2d6: 12,
            kickoffKey: "PITCH_INVASION",
            kickoffLabel: "Pitch Invasion",
            details: { notes: "All stunned" },
          },
        }),
        teamNames,
      ),
    ).toBe("Kick-off · Pitch Invasion: All stunned");
  });

  it("TIME_OUT formats negative delta without plus sign", () => {
    expect(
      formatEventText(
        evt({
          type: "kickoff_event",
          payload: {
            driveIndex: 0,
            kickingTeam: "B",
            receivingTeam: "A",
            roll2d6: 3,
            kickoffKey: "TIME_OUT",
            kickoffLabel: "Time-Out",
            details: { appliedDelta: -1 },
          },
        }),
        teamNames,
      ),
    ).toBe("Kick-off · Time-Out: -1 Turn");
  });

  it("uses kickoffLabel when kickoffKey and roll2d6 are absent", () => {
    expect(
      formatEventText(
        evt({
          type: "kickoff_event",
          payload: {
            driveIndex: 0,
            kickingTeam: "A",
            receivingTeam: "B",
            kickoffLabel: "Brilliant Coaching",
          },
        }),
        teamNames,
      ),
    ).toBe("Kick-off · Brilliant Coaching");
  });
});

describe("turn_set – without half in payload", () => {
  it("shows only turn when payload contains only turn", () => {
    expect(
      formatEventText(
        evt({
          type: "turn_set",
          half: 1,
          turn: 3,
          payload: { turn: 3 },
        }),
        teamNames,
      ),
    ).toBe("Turn adjusted: Turn 3");
  });
});

describe("spp_adjustment – team-level target", () => {
  it("omits player reference when target is team", () => {
    expect(
      formatEventText(
        evt({
          type: "spp_adjustment",
          payload: { target: "team", team: "A", category: "touchdown", delta: 1 },
        }),
        teamNames,
      ),
    ).toBe("SPP Adjustment · Orcs · Touchdown +1");
  });

  it("omits reason suffix when reason is absent", () => {
    expect(
      formatEventText(
        evt({
          type: "spp_adjustment",
          payload: { target: "player", team: "B", player: 3, category: "mvp", delta: 4 },
        }),
        teamNames,
      ),
    ).toBe("SPP Adjustment · Humans · Player 3 · Mvp +4");
  });
});

// ---------------------------------------------------------------------------
// Smoke tests for already-covered types (guard against direct-import regressions)
// ---------------------------------------------------------------------------

describe("smoke – types fully covered in eventFormatter.test.ts", () => {
  it("touchdown", () => {
    expect(formatEventText(evt({ type: "touchdown", team: "A", payload: { player: 4 } }), teamNames)).toBe(
      "Touchdown · Orcs · Player 4 · SPP +3 (Touchdown)",
    );
  });

  it("completion", () => {
    expect(formatEventText(evt({ type: "completion", team: "B", payload: { passer: 2 } }), teamNames)).toBe(
      "Completion · Humans · Player 2 · SPP +1 (Completion)",
    );
  });

  it("match_start", () => {
    expect(formatEventText(evt({ type: "match_start" }), teamNames)).toBe("Match start");
  });

  it("next_turn second half", () => {
    expect(formatEventText(evt({ type: "next_turn", half: 2, turn: 2 }), teamNames)).toBe("Turn 10");
  });

  it("mvp_awarded", () => {
    expect(formatEventText(evt({ type: "mvp_awarded", team: "A", payload: { player: 5 } }), teamNames)).toBe(
      "MVP · Orcs · Player 5 · SPP +4 (MVP)",
    );
  });
});
