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
