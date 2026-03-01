import { describe, expect, it } from "vitest";
import type { MatchEvent } from "../../../domain/events";
import type { DerivedMatchState } from "../../../domain/projection";
import { formatEvent } from "../eventFormatter";

const derived = {
  teamNames: { A: "Orcs", B: "Humans" },
} as DerivedMatchState;

const buildEvent = (overrides: Partial<MatchEvent> & Pick<MatchEvent, "type">): MatchEvent => ({
  id: overrides.id ?? "1",
  type: overrides.type,
  half: overrides.half ?? 1,
  turn: overrides.turn ?? 1,
  team: overrides.team,
  payload: overrides.payload,
  createdAt: overrides.createdAt ?? 1,
});

describe("formatEvent", () => {
  it("formats touchdown, completion and interception", () => {
    expect(formatEvent(buildEvent({ type: "touchdown", team: "A", payload: { player: 4 } }), derived.teamNames)).toBe(
      "Touchdown · Orcs · Player 4",
    );
    expect(formatEvent(buildEvent({ type: "completion", team: "B", payload: { passer: 2 } }), derived.teamNames)).toBe(
      "Completion · Humans · Player 2",
    );
    expect(formatEvent(buildEvent({ type: "interception", team: "A", payload: { player: 1 } }), derived.teamNames)).toBe(
      "Interception · Orcs · Player 1",
    );
  });

  it("formats injury with casualty outcome", () => {
    const event = buildEvent({
      type: "injury",
      payload: {
        victimTeam: "B",
        victimPlayerId: 7,
        injuryResult: "DEAD",
      },
    });

    expect(formatEvent(event, derived.teamNames)).toBe("Humans Player 7 · Casualty: Dead");
  });

  it("formats stat reductions in casualty outcomes", () => {
    const event = buildEvent({
      type: "injury",
      payload: {
        victimTeam: "A",
        victimPlayerId: 4,
        injuryResult: "STAT",
        stat: "MA",
      },
    });

    expect(formatEvent(event, derived.teamNames)).toBe("Orcs Player 4 · Casualty: Characteristic Reduction (-MA)");
  });

  it("formats apothecary casualty outcomes concisely", () => {
    const event = buildEvent({
      type: "injury",
      payload: {
        victimTeam: "A",
        victimPlayerId: 4,
        injuryResult: "DEAD",
        apothecaryUsed: true,
        apothecaryOutcome: "RECOVERED",
      },
    });

    expect(formatEvent(event, derived.teamNames)).toBe("Orcs Player 4 · Casualty: Dead (Apo: Recovered)");
  });

  it("formats kickoff details on one line", () => {
    expect(
      formatEvent(
        buildEvent({
          type: "kickoff_event",
          payload: {
            driveIndex: 1,
            kickingTeam: "A",
            receivingTeam: "B",
            roll2d6: 8,
            kickoffKey: "HIGH_KICK",
            kickoffLabel: "High Kick",
          },
        }),
        derived.teamNames,
      ),
    ).toBe("Kick-off · High Kick");

    expect(
      formatEvent(
        buildEvent({
          type: "kickoff_event",
          payload: {
            driveIndex: 1,
            kickingTeam: "A",
            receivingTeam: "B",
            roll2d6: 12,
            kickoffKey: "CHANGING_WEATHER",
            kickoffLabel: "Changing Weather",
            details: { newWeather: "BLIZZARD" },
          },
        }),
        derived.teamNames,
      ),
    ).toBe("Kick-off · Weather: Blizzard");

    expect(formatEvent(buildEvent({ type: "match_start" }), derived.teamNames)).toBe("Match start");
  });


  it("formats compact kickoff detail variants", () => {
    expect(
      formatEvent(
        buildEvent({
          type: "kickoff_event",
          payload: {
            driveIndex: 1,
            kickingTeam: "A",
            receivingTeam: "B",
            roll2d6: 3,
            kickoffKey: "TIME_OUT",
            kickoffLabel: "Time-Out",
            details: { appliedDelta: 1 },
          },
        }),
        derived.teamNames,
      ),
    ).toBe("Kick-off · Time-Out: +1 Turn");

    expect(
      formatEvent(
        buildEvent({
          type: "kickoff_event",
          payload: {
            driveIndex: 1,
            kickingTeam: "A",
            receivingTeam: "B",
            roll2d6: 11,
            kickoffKey: "THROW_A_ROCK",
            kickoffLabel: "Throw a Rock",
            details: { targetTeam: "B", targetPlayer: 4, outcome: "ko" },
          },
        }),
        derived.teamNames,
      ),
    ).toBe("Kick-off · Rock: Humans #4 KO");

    expect(
      formatEvent(
        buildEvent({
          type: "kickoff_event",
          payload: {
            driveIndex: 1,
            kickingTeam: "A",
            receivingTeam: "B",
            roll2d6: 12,
            kickoffKey: "PITCH_INVASION",
            kickoffLabel: "Pitch Invasion",
            details: { affectedA: 2, affectedB: 1 },
          },
        }),
        derived.teamNames,
      ),
    ).toBe("Kick-off · Pitch Invasion: A2 B1");
  });

  it("formats weather changes with user-friendly labels", () => {
    expect(formatEvent(buildEvent({ type: "weather_set", payload: { weather: "VERY_SUNNY" } }), derived.teamNames)).toBe(
      "Weather changed: Very Sunny",
    );
    expect(formatEvent(buildEvent({ type: "weather_set", payload: { weather: "POURING_RAIN" } }), derived.teamNames)).toBe(
      "Weather changed: Pouring Rain",
    );
    expect(
      formatEvent(buildEvent({ type: "weather_set", payload: { weather: "SWELTERING_HEAT" } }), derived.teamNames),
    ).toBe("Weather changed: Sweltering Heat");
    expect(formatEvent(buildEvent({ type: "weather_set", payload: { weather: "BLIZZARD" } }), derived.teamNames)).toBe(
      "Weather changed: Blizzard",
    );
    expect(formatEvent(buildEvent({ type: "weather_set", payload: { weather: "NICE" } }), derived.teamNames)).toBe(
      "Weather changed: Nice",
    );
  });


  it("formats turn adjustments with second-half display turns", () => {
    expect(
      formatEvent(
        buildEvent({
          type: "turn_set",
          half: 2,
          turn: 3,
          payload: { half: 2, turn: 3 },
        }),
        derived.teamNames,
      ),
    ).toBe("Turn adjusted: Half 2 · Turn 11");
  });


  it("formats turn-advance markers with displayed turn numbers", () => {
    expect(formatEvent(buildEvent({ type: "next_turn", half: 1, turn: 5 }), derived.teamNames)).toBe("Turn 5");
    expect(formatEvent(buildEvent({ type: "next_turn", half: 2, turn: 2 }), derived.teamNames)).toBe("Turn 10");
  });

  it("never dumps payload JSON for free-form notes", () => {
    const event = buildEvent({
      type: "note",
      payload: { text: "Wizard used" },
    });

    expect(formatEvent(event, derived.teamNames)).toBe("Note: Wizard used");
  });
});
