import { describe, expect, it } from "vitest";
import type { MatchEvent } from "../events";
import type { MatchTeamMeta } from "../teamMeta";
import { deriveSppSummaryFromEvents } from "../spp";

const rosters = {
  A: [
    { id: "A1", team: "A" as const, name: "A Blitzer" },
    { id: "A2", team: "A" as const, name: "A Thrower" },
  ],
  B: [{ id: "B1", team: "B" as const, name: "B Lineman" }],
};

const buildEvent = (overrides: Partial<MatchEvent> & Pick<MatchEvent, "type">): MatchEvent => ({
  id: overrides.id ?? `event_${overrides.type}`,
  type: overrides.type,
  half: overrides.half ?? 1,
  turn: overrides.turn ?? 1,
  team: overrides.team,
  payload: overrides.payload,
  createdAt: overrides.createdAt ?? 1,
});

describe("deriveSppSummaryFromEvents", () => {
  it("awards standard SPP for touchdown, completion and interception", () => {
    const summary = deriveSppSummaryFromEvents(
      [
        buildEvent({ type: "touchdown", team: "A", payload: { player: "A1", playerTeam: "A" } }),
        buildEvent({ id: "completion", type: "completion", team: "A", payload: { passer: "A1", passerTeam: "A" } }),
        buildEvent({ id: "interception", type: "interception", team: "A", payload: { player: "A1", playerTeam: "A" } }),
      ],
      { rosters },
    );

    expect(summary.players.A1?.breakdown.touchdown).toBe(3);
    expect(summary.players.A1?.breakdown.completion).toBe(1);
    expect(summary.players.A1?.breakdown.interception).toBe(2);
    expect(summary.players.A1?.totalSPP).toBe(6);
  });

  it("awards casualty SPP only for the final casualty outcome", () => {
    const summary = deriveSppSummaryFromEvents(
      [
        buildEvent({
          type: "injury",
          team: "A",
          payload: {
            cause: "BLOCK",
            causerPlayerId: "A1",
            victimTeam: "B",
            victimPlayerId: "B1",
            injuryResult: "DEAD",
            apothecaryUsed: true,
            apothecaryOutcome: "BH",
          },
        }),
      ],
      { rosters },
    );

    expect(summary.players.A1?.breakdown.casualty).toBe(2);
    expect(summary.players.A1?.totalSPP).toBe(2);
  });

  it("keeps default SPP values for teams without special SPP rule overrides", () => {
    const summary = deriveSppSummaryFromEvents(
      [
        buildEvent({ type: "touchdown", team: "A", payload: { player: "A1", playerTeam: "A" } }),
        buildEvent({
          id: "a_cas",
          type: "injury",
          team: "A",
          payload: {
            cause: "BLOCK",
            causerPlayerId: "A1",
            victimTeam: "B",
            victimPlayerId: "B1",
            injuryResult: "DEAD",
          },
        }),
      ],
      { rosters },
    );

    expect(summary.players.A1?.breakdown.touchdown).toBe(3);
    expect(summary.players.A1?.breakdown.casualty).toBe(2);
    expect(summary.players.A1?.totalSPP).toBe(5);
  });

  it("uses Brawlin' Brutes SPP overrides (TD=2, CAS=3)", () => {
    const teamMeta: MatchTeamMeta = {
      A: { specialRules: ["Brawlin’ Brutes"] },
    };

    const summary = deriveSppSummaryFromEvents(
      [
        buildEvent({ type: "touchdown", team: "A", payload: { player: "A1", playerTeam: "A" } }),
        buildEvent({
          id: "a_brutes_cas",
          type: "injury",
          team: "A",
          payload: {
            cause: "BLOCK",
            causerPlayerId: "A1",
            victimTeam: "B",
            victimPlayerId: "B1",
            injuryResult: "DEAD",
          },
        }),
      ],
      { rosters, teamMeta },
    );

    expect(summary.players.A1?.breakdown.touchdown).toBe(2);
    expect(summary.players.A1?.breakdown.casualty).toBe(3);
    expect(summary.players.A1?.totalSPP).toBe(5);
  });

  it("awards no casualty SPP when apothecary final result is RECOVERED", () => {
    const summary = deriveSppSummaryFromEvents(
      [
        buildEvent({
          type: "injury",
          team: "A",
          payload: {
            cause: "BLOCK",
            causerPlayerId: "A1",
            victimTeam: "B",
            victimPlayerId: "B1",
            injuryResult: "DEAD",
            apothecaryUsed: true,
            apothecaryOutcome: "RECOVERED",
          },
        }),
      ],
      { rosters },
    );

    expect(summary.players.A1).toBeUndefined();
    expect(summary.teams.A).toBe(0);
  });

  it("awards no casualty SPP for non-player-caused injuries", () => {
    const summary = deriveSppSummaryFromEvents(
      [
        buildEvent({
          type: "injury",
          team: "A",
          payload: {
            cause: "FAILED_PICKUP",
            causerPlayerId: "A1",
            victimTeam: "B",
            victimPlayerId: "B1",
            injuryResult: "DEAD",
          },
        }),
      ],
      { rosters },
    );

    expect(summary.players.A1).toBeUndefined();
    expect(summary.teams.A).toBe(0);
  });

  it("aggregates multiple events for one player and distributes totals across players", () => {
    const summary = deriveSppSummaryFromEvents(
      [
        buildEvent({ type: "touchdown", team: "A", payload: { player: "A1", playerTeam: "A" } }),
        buildEvent({ id: "a1_comp", type: "completion", team: "A", payload: { passer: "A1", passerTeam: "A" } }),
        buildEvent({ id: "a2_int", type: "interception", team: "A", payload: { player: "A2", playerTeam: "A" } }),
      ],
      { rosters },
    );

    expect(summary.players.A1?.totalSPP).toBe(4);
    expect(summary.players.A2?.totalSPP).toBe(2);
    expect(summary.teams.A).toBe(6);
    expect(summary.teams.B).toBe(0);
  });

  it("applies team/roster-specific SPP rule flags", () => {
    const teamMeta: MatchTeamMeta = {
      A: { spp: { flags: ["no-completion-spp"] } },
      B: { spp: { rosterTraits: ["extra-completion-spp"] } },
    };

    const summary = deriveSppSummaryFromEvents(
      [
        buildEvent({ type: "completion", team: "A", payload: { passer: "A1", passerTeam: "A" } }),
        buildEvent({ id: "b_completion", type: "completion", team: "B", payload: { passer: "B1", passerTeam: "B" } }),
      ],
      { rosters, teamMeta },
    );

    expect(summary.players.A1).toBeUndefined();
    expect(summary.players.B1?.breakdown.completion).toBe(2);
    expect(summary.teams.A).toBe(0);
    expect(summary.teams.B).toBe(2);
  });

  it("returns zero totals when there are no events", () => {
    const summary = deriveSppSummaryFromEvents([], { rosters });

    expect(summary.players).toEqual({});
    expect(summary.teams).toEqual({ A: 0, B: 0 });
  });

  it("awards completion SPP=2 while Perfect Passing is active", () => {
    const summary = deriveSppSummaryFromEvents(
      [
        buildEvent({ id: "pp_a", type: "prayer_result", team: "A", payload: { result: "perfect_passing" } }),
        buildEvent({ id: "comp_a", type: "completion", team: "A", payload: { passer: "A1", passerTeam: "A" } }),
        buildEvent({ id: "comp_b", type: "completion", team: "B", payload: { passer: "B1", passerTeam: "B" } }),
      ],
      { rosters },
    );

    expect(summary.players.A1?.breakdown.completion).toBe(2);
    expect(summary.players.B1?.breakdown.completion).toBe(1);
  });

  it("awards crowd-push casualty SPP only while Fan Interaction is active in the same drive", () => {
    const summary = deriveSppSummaryFromEvents(
      [
        buildEvent({ id: "start", type: "match_start" }),
        buildEvent({ id: "fan_a", type: "prayer_result", team: "A", payload: { result: "fan_interaction" } }),
        buildEvent({
          id: "crowd_in_drive",
          type: "injury",
          team: "A",
          payload: {
            cause: "CROWD",
            causerPlayerId: "A1",
            victimTeam: "B",
            victimPlayerId: "B1",
            injuryResult: "BH",
          },
        }),
        buildEvent({ id: "td1", type: "touchdown", team: "B", payload: { player: "B1", playerTeam: "B" } }),
        buildEvent({
          id: "crowd_next_drive",
          type: "injury",
          team: "A",
          payload: {
            cause: "CROWD",
            causerPlayerId: "A1",
            victimTeam: "B",
            victimPlayerId: "B1",
            injuryResult: "BH",
          },
        }),
      ],
      { rosters },
    );

    expect(summary.players.A1?.breakdown.casualty).toBe(2);
    expect(summary.players.A1?.totalSPP).toBe(2);
  });

  it("applies Necessary Violence and Fouling Frenzy casualty modifiers for the praying team", () => {
    const summary = deriveSppSummaryFromEvents(
      [
        buildEvent({ id: "nv_a", type: "prayer_result", team: "A", payload: { result: "necessary_violence" } }),
        buildEvent({ id: "ff_a", type: "prayer_result", team: "A", payload: { result: "fouling_frenzy" } }),
        buildEvent({
          id: "block_cas",
          type: "injury",
          team: "A",
          payload: {
            cause: "BLOCK",
            causerPlayerId: "A1",
            victimTeam: "B",
            victimPlayerId: "B1",
            injuryResult: "DEAD",
          },
        }),
        buildEvent({
          id: "foul_cas",
          type: "injury",
          team: "A",
          payload: {
            cause: "FOUL",
            causerPlayerId: "A1",
            victimTeam: "B",
            victimPlayerId: "B1",
            injuryResult: "BH",
          },
        }),
        buildEvent({
          id: "other_team_block",
          type: "injury",
          team: "B",
          payload: {
            cause: "BLOCK",
            causerPlayerId: "B1",
            victimTeam: "A",
            victimPlayerId: "A1",
            injuryResult: "BH",
          },
        }),
      ],
      { rosters },
    );

    expect(summary.players.A1?.breakdown.casualty).toBe(5);
    expect(summary.players.B1?.breakdown.casualty).toBe(2);
  });

  it("ignores events without an SPP player reference instead of crashing", () => {
    const summary = deriveSppSummaryFromEvents(
      [
        buildEvent({ type: "touchdown", team: "A", payload: {} }),
        buildEvent({ id: "apo", type: "apothecary_used", team: "A" }),
      ],
      { rosters },
    );

    expect(summary.players).toEqual({});
    expect(summary.teams).toEqual({ A: 0, B: 0 });
  });

  it("handles unknown players robustly by creating a fallback player entry", () => {
    const summary = deriveSppSummaryFromEvents(
      [buildEvent({ type: "touchdown", team: "A", payload: { player: "A99", playerTeam: "A" } })],
      { rosters },
    );

    expect(summary.players.A99).toMatchObject({
      id: "A99",
      name: "Player A99",
      team: "A",
      totalSPP: 3,
    });
    expect(summary.teams.A).toBe(3);
  });
});
