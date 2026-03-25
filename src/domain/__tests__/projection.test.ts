import { describe, expect, it } from "vitest";
import type { MatchEvent, KickoffEventPayload } from "../events";
import { deriveMatchState } from "../projection";

const buildEvent = (overrides: Partial<MatchEvent> & Pick<MatchEvent, "type">): MatchEvent => ({
  id: overrides.id ?? `e_${overrides.type}`,
  type: overrides.type,
  half: overrides.half ?? 1,
  turn: overrides.turn ?? 1,
  team: overrides.team,
  payload: overrides.payload,
  createdAt: overrides.createdAt ?? 1,
});

const kickoffPayload: KickoffEventPayload = {
  driveIndex: 1,
  kickingTeam: "A",
  receivingTeam: "B",
  roll2d6: 7,
  kickoffKey: "HIGH_KICK",
  kickoffLabel: "High Kick",
};

describe("deriveMatchState", () => {
  it("handles empty events", () => {
    const state = deriveMatchState([]);

    expect(state.score).toEqual({ A: 0, B: 0 });
    expect(state.half).toBe(1);
    expect(state.turn).toBe(1);
    expect(state.driveIndexCurrent).toBe(1);
    expect(state.kickoffPending).toBe(false);
    expect(state.driveKickoff).toBeNull();
    expect(state.roundNumber).toBe(1);
    expect(state.currentRoundNumber).toBe(1);
    expect(state.activeTeamId).toBeUndefined();
    expect(state.teamTurnIndex).toBe(0);
    expect(state.teamTurnSequence).toBe(0);
    expect(state.turnMarkers).toEqual({ A: 1, B: 1 });
    expect(state.treasuryDelta).toEqual({
      A: {
        winningsDelta: 0,
        isProjected: true,
        inputs: {
          touchdownsScored: 0,
          touchdownsConceded: 0,
          existingFans: 0,
          fansRoll: 0,
          stallingRollTotal: 0,
          stallingEvents: 0,
          matchResult: "draw",
        },
        breakdown: {
          fanFactorDelta: 0,
          touchdownDelta: 0,
          stallingDelta: 0,
          resultDelta: 0,
        },
      },
      B: {
        winningsDelta: 0,
        isProjected: true,
        inputs: {
          touchdownsScored: 0,
          touchdownsConceded: 0,
          existingFans: 0,
          fansRoll: 0,
          stallingRollTotal: 0,
          stallingEvents: 0,
          matchResult: "draw",
        },
        breakdown: {
          fanFactorDelta: 0,
          touchdownDelta: 0,
          stallingDelta: 0,
          resultDelta: 0,
        },
      },
    });
    expect(state.finalTreasuryDelta).toEqual({
      A: {
        treasuryDelta: 0,
        winningsDelta: 0,
        isProjected: false,
        inputs: {
          touchdownsScored: 0,
          touchdownsConceded: 0,
          existingFans: 0,
          fansRoll: 0,
          stallingRollTotal: 0,
          stallingEvents: 0,
          matchResult: "draw",
        },
        breakdown: {
          base: 0,
          touchdownsContribution: 0,
          stallingAdjustment: 0,
        },
      },
      B: {
        treasuryDelta: 0,
        winningsDelta: 0,
        isProjected: false,
        inputs: {
          touchdownsScored: 0,
          touchdownsConceded: 0,
          existingFans: 0,
          fansRoll: 0,
          stallingRollTotal: 0,
          stallingEvents: 0,
          matchResult: "draw",
        },
        breakdown: {
          base: 0,
          touchdownsContribution: 0,
          stallingAdjustment: 0,
        },
      },
    });
  });

  it("applies match_start", () => {
    const state = deriveMatchState([
      buildEvent({
        type: "match_start",
        payload: {
          teamAName: "Orcs",
          teamBName: "Humans",
          weather: "Pouring Rain",
          resources: {
            A: { rerolls: 3, hasApothecary: true },
            B: { rerolls: 2, hasApothecary: false },
          },
          fans: {
            A: { existingFans: 6, fansRoll: 3 },
            B: { existingFans: 4, fansRoll: 2 },
          },
        },
      }),
    ]);

    expect(state.teamNames).toEqual({ A: "Orcs", B: "Humans" });
    expect(state.weather).toBe("Pouring Rain");
    expect(state.resources).toEqual({
      A: { rerolls: 3, hasApothecary: true, apothecaryUsed: false },
      B: { rerolls: 2, hasApothecary: false, apothecaryUsed: false },
    });
    expect(state.fans).toEqual({
      A: { existingFans: 6, fansRoll: 3 },
      B: { existingFans: 4, fansRoll: 2 },
    });
    expect(state.treasuryDelta).toEqual({
      A: {
        winningsDelta: 90_000,
        isProjected: true,
        inputs: {
          touchdownsScored: 0,
          touchdownsConceded: 0,
          existingFans: 6,
          fansRoll: 3,
          stallingRollTotal: 0,
          stallingEvents: 0,
          matchResult: "draw",
        },
        breakdown: {
          fanFactorDelta: 90_000,
          touchdownDelta: 0,
          stallingDelta: 0,
          resultDelta: 0,
        },
      },
      B: {
        winningsDelta: 60_000,
        isProjected: true,
        inputs: {
          touchdownsScored: 0,
          touchdownsConceded: 0,
          existingFans: 4,
          fansRoll: 2,
          stallingRollTotal: 0,
          stallingEvents: 0,
          matchResult: "draw",
        },
        breakdown: {
          fanFactorDelta: 60_000,
          touchdownDelta: 0,
          stallingDelta: 0,
          resultDelta: 0,
        },
      },
    });
    expect(state.teamMeta).toEqual({
      A: { identity: { teamName: "Orcs" } },
      B: { identity: { teamName: "Humans" } },
    });
    expect(state.driveIndexCurrent).toBe(1);
    expect(state.kickoffPending).toBe(true);
    expect(state.roundNumber).toBe(1);
    expect(state.currentRoundNumber).toBe(1);
    expect(state.teamTurnIndex).toBe(0);
    expect(state.teamTurnSequence).toBe(0);
  });

  it("stores team-specific metadata from match_start for later SPP rule lookups", () => {
    const state = deriveMatchState([
      buildEvent({
        type: "match_start",
        payload: {
          teamAName: "Undead",
          teamBName: "Halflings",
          teamMeta: {
            A: {
              identity: { teamId: "team-a", rosterId: "shambling-undead", rosterName: "Shambling Undead" },
              specialRules: ["Masters of Undeath"],
              spp: { profile: "undead-default", flags: ["no-apothecary-spp"], rosterTraits: ["raise-dead"] },
            },
            B: {
              identity: { rosterId: "halfling" },
              specialRules: ["Low Cost Linemen"],
              canBuyApothecary: true,
              spp: { profile: "halfling-default", rosterTraits: ["cheap-bribes"] },
            },
          },
        },
      }),
    ]);

    expect(state.teamMeta).toEqual({
      A: {
        identity: { teamId: "team-a", teamName: "Undead", rosterId: "shambling-undead", rosterName: "Shambling Undead" },
        specialRules: ["Masters of Undeath"],
        spp: { profile: "undead-default", flags: ["no-apothecary-spp"], rosterTraits: ["raise-dead"] },
      },
      B: {
        identity: { teamName: "Halflings", rosterId: "halfling" },
        specialRules: ["Low Cost Linemen"],
        canBuyApothecary: true,
        spp: { profile: "halfling-default", rosterTraits: ["cheap-bribes"] },
      },
    });
    expect(state.finalTreasuryDelta.A.treasuryDelta).toBe(0);
    expect(state.finalTreasuryDelta.B.treasuryDelta).toBe(0);
  });


  it("tracks active SPP-relevant prayers per team with game and drive durations", () => {
    const state = deriveMatchState([
      buildEvent({ type: "match_start", id: "m1", createdAt: 1 }),
      buildEvent({
        id: "p1",
        createdAt: 2,
        type: "prayer_result",
        team: "A",
        payload: { result: "perfect_passing" },
      }),
      buildEvent({
        id: "p2",
        createdAt: 3,
        type: "prayer_result",
        team: "A",
        payload: { result: "fan_interaction" },
      }),
      buildEvent({
        id: "p3",
        createdAt: 4,
        type: "prayer_result",
        team: "B",
        payload: { result: "necessary_violence" },
      }),
    ]);

    expect(state.driveIndexCurrent).toBe(1);
    expect(state.activeSppPrayersByTeam.A).toEqual([
      {
        prayer: "perfect_passing",
        duration: "until_end_of_game",
        sourceEventId: "p1",
        sourceDriveIndex: 1,
      },
      {
        prayer: "fan_interaction",
        duration: "until_end_of_drive",
        sourceEventId: "p2",
        sourceDriveIndex: 1,
      },
    ]);
    expect(state.activeSppPrayersByTeam.B).toEqual([
      {
        prayer: "necessary_violence",
        duration: "until_end_of_drive",
        sourceEventId: "p3",
        sourceDriveIndex: 1,
      },
    ]);
  });

  it("expires drive-limited prayers after a new drive starts but keeps game-limited prayers", () => {
    const state = deriveMatchState([
      buildEvent({ type: "match_start", id: "m1", createdAt: 1 }),
      buildEvent({
        id: "p1",
        createdAt: 2,
        type: "prayer_result",
        team: "A",
        payload: { result: "perfect_passing" },
      }),
      buildEvent({
        id: "p2",
        createdAt: 3,
        type: "prayer_result",
        team: "A",
        payload: { result: "fouling_frenzy" },
      }),
      buildEvent({ id: "td1", createdAt: 4, type: "touchdown", team: "B" }),
    ]);

    expect(state.driveIndexCurrent).toBe(2);
    expect(state.activeSppPrayersByTeam.A).toEqual([
      {
        prayer: "perfect_passing",
        duration: "until_end_of_game",
        sourceEventId: "p1",
        sourceDriveIndex: 1,
      },
    ]);
    expect(state.activeSppPrayersByTeam.B).toEqual([]);
  });
  it("derives player SPP breakdown from recorded events", () => {
    const state = deriveMatchState([
      buildEvent({
        type: "match_start",
        payload: {
          teamAName: "Orcs",
          teamBName: "Humans",
        },
      }),
      buildEvent({ type: "touchdown", team: "A", payload: { player: "7", playerTeam: "A" } }),
      buildEvent({ type: "completion", team: "A", payload: { passer: "7", passerTeam: "A" } }),
      buildEvent({ type: "interception", team: "A", payload: { player: "7", playerTeam: "A" } }),
      buildEvent({
        type: "injury",
        team: "A",
        payload: {
          cause: "BLOCK",
          causerPlayerId: "7",
          victimTeam: "B",
          victimPlayerId: "3",
          injuryResult: "BH",
          apothecaryUsed: false,
        },
      }),
    ]);

    expect(state.playerSpp.players["7"]).toMatchObject({
      totalSPP: 8,
      breakdown: {
        touchdown: 3,
        completion: 1,
        interception: 2,
        casualty: 2,
        mvp: 0,
        adjustment: 0,
      },
    });
    expect(state.playerSpp.teams.A).toBe(8);
  });

  it("respects team spp flag no-apothecary-spp in derived casualty calculation", () => {
    const state = deriveMatchState([
      buildEvent({
        type: "match_start",
        payload: {
          teamAName: "Undead",
          teamBName: "Humans",
          teamMeta: {
            A: {
              spp: { flags: ["no-apothecary-spp"] },
            },
          },
        },
      }),
      buildEvent({
        type: "injury",
        team: "A",
        payload: {
          cause: "BLOCK",
          causerPlayerId: "9",
          victimTeam: "B",
          victimPlayerId: "1",
          injuryResult: "DEAD",
          apothecaryUsed: true,
          apothecaryOutcome: "MNG",
        },
      }),
    ]);

    expect(state.playerSpp.players["9"]).toBeUndefined();
    expect(state.playerSpp.teams.A).toBe(0);
  });

  it("records kickoff_selected via kickoff_event", () => {
    const state = deriveMatchState([
      buildEvent({ type: "match_start", id: "1", createdAt: 1 }),
      buildEvent({ type: "kickoff_event", id: "2", createdAt: 2, payload: kickoffPayload }),
    ]);

    expect(state.kickoffPending).toBe(false);
    expect(state.kickoffByDrive.get(1)).toEqual(kickoffPayload);
    expect(state.driveKickoff).toEqual(kickoffPayload);
    expect(state.activeTeamId).toBe("B");
    expect(state.teamTurnIndex).toBe(1);
    expect(state.teamTurnSequence).toBe(1);
    expect(state.roundNumber).toBe(1);
    expect(state.currentRoundNumber).toBe(1);
  });

  it("applies time out as -1 when kicking marker is 6 to 8", () => {
    const state = deriveMatchState([
      buildEvent({ type: "match_start", id: "1", createdAt: 1 }),
      buildEvent({ type: "turn_set", id: "2", createdAt: 2, payload: { half: 1, turn: 6 } }),
      buildEvent({
        type: "kickoff_event",
        id: "3",
        createdAt: 3,
        payload: {
          driveIndex: 1,
          kickingTeam: "A",
          receivingTeam: "B",
          roll2d6: 3,
          kickoffKey: "TIME_OUT",
          kickoffLabel: "Time Out",
          details: { appliedDelta: -1 },
        },
      }),
    ]);

    expect(state.turnMarkers).toEqual({ A: 5, B: 5 });
  });

  it("applies time out as +1 when kicking marker is 1 to 5 and undo is implicit by projection", () => {
    const events: MatchEvent[] = [
      buildEvent({ type: "match_start", id: "1", createdAt: 1 }),
      buildEvent({ type: "turn_set", id: "2", createdAt: 2, payload: { half: 1, turn: 5 } }),
      buildEvent({
        type: "kickoff_event",
        id: "3",
        createdAt: 3,
        payload: {
          driveIndex: 1,
          kickingTeam: "B",
          receivingTeam: "A",
          roll2d6: 3,
          kickoffKey: "TIME_OUT",
          kickoffLabel: "Time Out",
          details: { appliedDelta: 1 },
        },
      }),
    ];

    expect(deriveMatchState(events).turnMarkers).toEqual({ A: 6, B: 6 });
    expect(deriveMatchState(events.slice(0, -1)).turnMarkers).toEqual({ A: 5, B: 5 });
  });

  it("uses the kickoff event half marker for the kicking team, not a persisted delta", () => {
    const state = deriveMatchState([
      buildEvent({ type: "match_start", id: "1", createdAt: 1 }),
      buildEvent({ type: "turn_set", id: "2", createdAt: 2, payload: { half: 1, turn: 5 } }),
      buildEvent({ type: "turn_set", id: "3", createdAt: 3, payload: { half: 2, turn: 7 } }),
      buildEvent({
        type: "kickoff_event",
        id: "4",
        half: 1,
        turn: 5,
        createdAt: 4,
        payload: {
          driveIndex: 1,
          kickingTeam: "A",
          receivingTeam: "B",
          roll2d6: 3,
          kickoffKey: "TIME_OUT",
          kickoffLabel: "Time Out",
          details: { appliedDelta: -1 },
        },
      }),
    ]);

    expect(state.turnMarkers).toEqual({ A: 6, B: 6 });
  });

  it("updates weather from a changing weather kickoff event", () => {
    const state = deriveMatchState([
      buildEvent({
        type: "match_start",
        payload: {
          teamAName: "Orcs",
          teamBName: "Humans",
          weather: "nice",
        },
      }),
      buildEvent({
        type: "kickoff_event",
        payload: {
          driveIndex: 1,
          kickingTeam: "A",
          receivingTeam: "B",
          roll2d6: 8,
          kickoffKey: "CHANGING_WEATHER",
          kickoffLabel: "Changing Weather",
          details: { newWeather: "blizzard" },
        },
      }),
    ]);

    expect(state.weather).toBe("blizzard");
  });

  it("starts a new drive after touchdown", () => {
    const state = deriveMatchState([
      buildEvent({ type: "match_start", id: "1", createdAt: 1 }),
      buildEvent({ type: "touchdown", id: "2", createdAt: 2, team: "A" }),
    ]);

    expect(state.score).toEqual({ A: 1, B: 0 });
    expect(state.driveIndexCurrent).toBe(2);
    expect(state.kickoffPending).toBe(true);
    expect(state.roundNumber).toBe(1);
    expect(state.currentRoundNumber).toBe(1);
    expect(state.teamTurnIndex).toBe(0);
    expect(state.teamTurnSequence).toBe(0);
  });

  it("prepares per-team treasury delta inputs from final match state", () => {
    const state = deriveMatchState([
      buildEvent({
        type: "match_start",
        payload: {
          teamAName: "Orcs",
          teamBName: "Humans",
          fans: {
            A: { existingFans: 8, fansRoll: 5 },
            B: { existingFans: 6, fansRoll: 2 },
          },
        },
      }),
      buildEvent({ type: "touchdown", team: "A" }),
      buildEvent({ type: "touchdown", team: "A" }),
      buildEvent({ type: "touchdown", team: "B" }),
    ]);

    expect(state.treasuryDelta).toEqual({
      A: {
        winningsDelta: 160_000,
        isProjected: true,
        inputs: {
          touchdownsScored: 2,
          touchdownsConceded: 1,
          existingFans: 8,
          fansRoll: 5,
          stallingRollTotal: 0,
          stallingEvents: 0,
          matchResult: "win",
        },
        breakdown: {
          fanFactorDelta: 130_000,
          touchdownDelta: 20_000,
          stallingDelta: 0,
          resultDelta: 10_000,
        },
      },
      B: {
        winningsDelta: 80_000,
        isProjected: true,
        inputs: {
          touchdownsScored: 1,
          touchdownsConceded: 2,
          existingFans: 6,
          fansRoll: 2,
          stallingRollTotal: 0,
          stallingEvents: 0,
          matchResult: "loss",
        },
        breakdown: {
          fanFactorDelta: 80_000,
          touchdownDelta: 10_000,
          stallingDelta: 0,
          resultDelta: -10_000,
        },
      },
    });
    expect(state.finalTreasuryDelta).toEqual({
      A: {
        treasuryDelta: 160_000,
        winningsDelta: 160_000,
        isProjected: false,
        inputs: {
          touchdownsScored: 2,
          touchdownsConceded: 1,
          existingFans: 8,
          fansRoll: 5,
          stallingRollTotal: 0,
          stallingEvents: 0,
          matchResult: "win",
        },
        breakdown: {
          base: 140_000,
          touchdownsContribution: 20_000,
          stallingAdjustment: 0,
        },
      },
      B: {
        treasuryDelta: 80_000,
        winningsDelta: 80_000,
        isProjected: false,
        inputs: {
          touchdownsScored: 1,
          touchdownsConceded: 2,
          existingFans: 6,
          fansRoll: 2,
          stallingRollTotal: 0,
          stallingEvents: 0,
          matchResult: "loss",
        },
        breakdown: {
          base: 70_000,
          touchdownsContribution: 10_000,
          stallingAdjustment: 0,
        },
      },
    });
  });

  it("updates projected treasury delta for touchdown and stalling events", () => {
    const state = deriveMatchState([
      buildEvent({
        type: "match_start",
        payload: {
          fans: {
            A: { existingFans: 5, fansRoll: 2 },
            B: { existingFans: 3, fansRoll: 1 },
          },
        },
      }),
      buildEvent({ type: "touchdown", team: "A" }),
      buildEvent({ type: "stalling", team: "A", payload: { rollResult: 6 } }),
      buildEvent({ type: "stalling", team: "B", payload: { rollResult: 4 } }),
    ]);

    expect(state.treasuryDelta.A.winningsDelta).toBe(84_000);
    expect(state.treasuryDelta.A.inputs).toMatchObject({
      touchdownsScored: 1,
      stallingRollTotal: 6,
      stallingEvents: 1,
      matchResult: "win",
    });
    expect(state.treasuryDelta.B.winningsDelta).toBe(26_000);
    expect(state.treasuryDelta.B.inputs).toMatchObject({
      touchdownsScored: 0,
      stallingRollTotal: 4,
      stallingEvents: 1,
      matchResult: "loss",
    });
  });

  it("tracks team turns separately from the shared round number", () => {
    const state = deriveMatchState([
      buildEvent({ type: "match_start", id: "1", createdAt: 1 }),
      buildEvent({ type: "kickoff_event", id: "2", createdAt: 2, payload: kickoffPayload }),
      buildEvent({ type: "turnover", id: "3", createdAt: 3, team: "B" }),
    ]);

    expect(state.roundNumber).toBe(1);
    expect(state.currentRoundNumber).toBe(1);
    expect(state.turn).toBe(1);
    expect(state.activeTeamId).toBe("A");
    expect(state.teamTurnIndex).toBe(2);
    expect(state.teamTurnSequence).toBe(2);
  });


  it("allows alternating active teams within the same shared round", () => {
    const state = deriveMatchState([
      buildEvent({ type: "match_start", id: "1", createdAt: 1 }),
      buildEvent({ type: "kickoff_event", id: "2", createdAt: 2, payload: kickoffPayload }),
      buildEvent({ type: "next_turn", id: "3", createdAt: 3 }),
    ]);

    expect(state.currentRoundNumber).toBe(1);
    expect(state.roundNumber).toBe(1);
    expect(state.turn).toBe(1);
    expect(state.activeTeamId).toBe("A");
    expect(state.teamTurnSequence).toBe(2);
  });

  it("advances the shared round only after both team turns are completed", () => {
    const state = deriveMatchState([
      buildEvent({ type: "match_start", id: "1", createdAt: 1 }),
      buildEvent({ type: "kickoff_event", id: "2", createdAt: 2, payload: kickoffPayload }),
      buildEvent({ type: "turnover", id: "3", createdAt: 3, team: "B" }),
      buildEvent({ type: "next_turn", id: "4", createdAt: 4, team: "A" }),
    ]);

    expect(state.roundNumber).toBe(2);
    expect(state.currentRoundNumber).toBe(2);
    expect(state.turn).toBe(2);
    expect(state.activeTeamId).toBe("B");
    expect(state.teamTurnIndex).toBe(3);
    expect(state.teamTurnSequence).toBe(3);
  });

  it("allows turn_set to persist explicit round/team-turn metadata", () => {
    const state = deriveMatchState([
      buildEvent({ type: "match_start", id: "1", createdAt: 1 }),
      buildEvent({
        type: "turn_set",
        id: "2",
        createdAt: 2,
        payload: { half: 1, turn: 3, roundNumber: 3, activeTeamId: "B", teamTurnIndex: 6 },
      }),
    ]);

    expect(state.roundNumber).toBe(3);
    expect(state.currentRoundNumber).toBe(3);
    expect(state.turn).toBe(3);
    expect(state.activeTeamId).toBe("B");
    expect(state.teamTurnIndex).toBe(6);
    expect(state.teamTurnSequence).toBe(6);
  });
});
