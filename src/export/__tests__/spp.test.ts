import { describe, expect, it } from "vitest";
import type { MatchEvent } from "../../domain/events";
import { buildSppTeamView, deriveSppFromEvents, validateSppSummary } from "../spp";

const buildEvent = (overrides: Partial<MatchEvent> & Pick<MatchEvent, "type">): MatchEvent => ({
  id: overrides.id ?? `e_${overrides.type}`,
  type: overrides.type,
  half: overrides.half ?? 1,
  turn: overrides.turn ?? 1,
  team: overrides.team,
  payload: overrides.payload,
  createdAt: overrides.createdAt ?? 1,
});

const rosters = {
  A: [{ id: "A1", team: "A" as const, name: "A Blitzer" }],
  B: [{ id: "B1", team: "B" as const, name: "B Lineman" }],
};

describe("deriveSppFromEvents apothecary casualty outcome", () => {
  it("does not award casualty SPP when apothecary outcome is RECOVERED", () => {
    const events: MatchEvent[] = [
      buildEvent({
        id: "injury_recovered",
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
    ];

    const summary = deriveSppFromEvents(events, rosters);
    expect(summary.players.A1).toBeUndefined();
    expect(summary.teams.A).toBe(0);
  });

  it("awards casualty SPP when apothecary outcome remains a casualty", () => {
    const events: MatchEvent[] = [
      buildEvent({
        id: "injury_bh",
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
    ];

    const summary = deriveSppFromEvents(events, rosters);
    expect(summary.players.A1?.spp).toBe(2);
    expect(summary.teams.A).toBe(2);
  });

  it("does not award casualty SPP for legacy FAILED_PICKUP causes", () => {
    const events: MatchEvent[] = [
      buildEvent({
        id: "injury_legacy_failed_pickup",
        type: "injury",
        team: "A",
        payload: {
          cause: "FAILED_PICKUP",
          causerPlayerId: "A1",
          victimTeam: "B",
          victimPlayerId: "B1",
          injuryResult: "BH",
          apothecaryUsed: false,
        },
      }),
    ];

    const summary = deriveSppFromEvents(events, rosters);
    expect(summary.players.A1).toBeUndefined();
    expect(summary.teams.A).toBe(0);
  });

  it("supports legacy injury payload aliases for outcome fields", () => {
    const events: MatchEvent[] = [
      buildEvent({
        id: "injury_legacy_aliases",
        type: "injury",
        team: "A",
        payload: {
          cause: "BLOCK",
          causerPlayerId: "A1",
          victimTeam: "B",
          victimPlayerId: "B1",
          result: "DEAD",
          apothecaryResult: "MNG",
        },
      }),
    ];

    const summary = deriveSppFromEvents(events, rosters);
    expect(summary.players.A1?.spp).toBe(2);
    expect(summary.teams.A).toBe(2);
  });

});

describe("SPP team/debug helpers", () => {
  it("builds a team view with total and sorted players", () => {
    const events: MatchEvent[] = [
      buildEvent({
        id: "completion_a1",
        type: "completion",
        team: "A",
        payload: { passer: "A1" },
      }),
      buildEvent({
        id: "mvp_b1",
        type: "mvp_awarded",
        team: "B",
        payload: { player: "B1" },
      }),
    ];

    const summary = deriveSppFromEvents(events, rosters);
    const teamA = buildSppTeamView(summary, "A");
    const teamB = buildSppTeamView(summary, "B");

    expect(teamA.totalSPP).toBe(1);
    expect(teamA.players.map((p) => p.id)).toEqual(["A1"]);
    expect(teamB.totalSPP).toBe(4);
    expect(teamB.players.map((p) => p.id)).toEqual(["B1"]);
  });

  it("validates summary totals and detects inconsistencies", () => {
    const summary = deriveSppFromEvents([], rosters);
    const ok = validateSppSummary(summary);
    expect(ok.isValid).toBe(true);
    expect(ok.issues).toEqual([]);
    expect(ok.teamTotalsByPlayers).toEqual({ A: 0, B: 0 });

    summary.teams.A = -1;
    const broken = validateSppSummary(summary);
    expect(broken.isValid).toBe(false);
    expect(broken.issues.some((issue) => issue.includes("negative total SPP"))).toBe(true);
    expect(broken.issues.some((issue) => issue.includes("total mismatch"))).toBe(true);
  });
});
