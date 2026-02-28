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
            A: { rerolls: 3, apothecary: 1 },
            B: { rerolls: 2, apothecary: 0 },
          },
        },
      }),
    ]);

    expect(state.teamNames).toEqual({ A: "Orcs", B: "Humans" });
    expect(state.weather).toBe("Pouring Rain");
    expect(state.resources).toEqual({
      A: { rerolls: 3, apothecary: 1 },
      B: { rerolls: 2, apothecary: 0 },
    });
    expect(state.driveIndexCurrent).toBe(1);
    expect(state.kickoffPending).toBe(true);
  });

  it("records kickoff_selected via kickoff_event", () => {
    const state = deriveMatchState([
      buildEvent({ type: "match_start", id: "1", createdAt: 1 }),
      buildEvent({ type: "kickoff_event", id: "2", createdAt: 2, payload: kickoffPayload }),
    ]);

    expect(state.kickoffPending).toBe(false);
    expect(state.kickoffByDrive.get(1)).toEqual(kickoffPayload);
    expect(state.driveKickoff).toEqual(kickoffPayload);
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
  });
});
