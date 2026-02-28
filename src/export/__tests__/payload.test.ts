import { describe, expect, it } from "vitest";
import type { MatchEvent } from "../../domain/events";
import { deriveMatchState } from "../../domain/projection";
import { getExportPayload } from "../payload";

const buildEvent = (overrides: Partial<MatchEvent> & Pick<MatchEvent, "type">): MatchEvent => ({
  id: overrides.id ?? `e_${overrides.type}`,
  type: overrides.type,
  half: overrides.half ?? 1,
  turn: overrides.turn ?? 1,
  team: overrides.team,
  payload: overrides.payload,
  createdAt: overrides.createdAt ?? 1,
});

describe("getExportPayload", () => {
  const events = [
    buildEvent({
      id: "match",
      type: "match_start",
      payload: {
        teamAName: "Orcs",
        teamBName: "Elves",
        resources: {
          A: { rerolls: 2, apothecary: 1 },
          B: { rerolls: 3, apothecary: 1 },
        },
      },
      createdAt: 10,
    }),
    buildEvent({
      id: "td",
      type: "touchdown",
      team: "A",
      payload: { player: "A1" },
      createdAt: 20,
    }),
  ];

  const derived = deriveMatchState(events);
  const rosters = {
    A: [{ id: "A1", team: "A" as const, name: "Orc Blitzer" }],
    B: [{ id: "B1", team: "B" as const, name: "Elf Thrower" }],
  };

  it("builds non-empty text and markdown reports", () => {
    const textPayload = getExportPayload({ format: "text", events, derived, rosters });
    const markdownPayload = getExportPayload({ format: "markdown", events, derived, rosters });

    expect(textPayload.filename).toBe("bb-match-report.txt");
    expect(markdownPayload.filename).toBe("bb-match-report.md");
    expect(textPayload.text.length).toBeGreaterThan(0);
    expect(markdownPayload.text.length).toBeGreaterThan(0);
    expect(markdownPayload.text).toContain("# Match:");
  });

  it("builds json payload with required schema keys", () => {
    const payload = getExportPayload({ format: "json", events, derived, rosters });
    const parsed = JSON.parse(payload.text) as Record<string, unknown>;

    expect(payload.filename).toBe("bb-match-notes.json");
    expect(Object.keys(parsed)).toEqual(["schemaVersion", "generatedAt", "match", "events", "derived"]);
    expect(parsed.schemaVersion).toBeTypeOf("string");
    expect((parsed.schemaVersion as string).length).toBeGreaterThan(0);
    expect(Array.isArray(parsed.events)).toBe(true);
    expect((parsed.events as unknown[]).length).toBeGreaterThan(0);
    expect(parsed.derived).toBeTypeOf("object");
  });

  it("includes concise kickoff details in text/markdown/json exports", () => {
    const kickoffEvents: MatchEvent[] = [
      buildEvent({
        id: "match2",
        type: "match_start",
        payload: {
          teamAName: "Orcs",
          teamBName: "Elves",
          resources: {
            A: { rerolls: 2, apothecary: 1 },
            B: { rerolls: 2, apothecary: 1 },
          },
        },
        createdAt: 1,
      }),
      buildEvent({
        id: "cw",
        type: "kickoff_event",
        payload: {
          driveIndex: 1,
          kickingTeam: "A",
          receivingTeam: "B",
          roll2d6: 7,
          kickoffKey: "CHANGING_WEATHER",
          kickoffLabel: "Changing Weather",
          details: { newWeather: "Very Sunny" },
        },
        createdAt: 2,
      }),
      buildEvent({
        id: "tar",
        type: "kickoff_event",
        payload: {
          driveIndex: 2,
          kickingTeam: "B",
          receivingTeam: "A",
          roll2d6: 11,
          kickoffKey: "THROW_A_ROCK",
          kickoffLabel: "Throw a Rock",
          details: { targetTeam: "A", targetPlayer: "A3", outcome: "ko" },
        },
        createdAt: 3,
      }),
      buildEvent({
        id: "pi",
        type: "kickoff_event",
        payload: {
          driveIndex: 3,
          kickingTeam: "A",
          receivingTeam: "B",
          roll2d6: 12,
          kickoffKey: "PITCH_INVASION",
          kickoffLabel: "Pitch Invasion",
          details: { affectedA: 2, affectedB: 1 },
        },
        createdAt: 4,
      }),
    ];

    const kickoffDerived = deriveMatchState(kickoffEvents);

    const txt = getExportPayload({ format: "text", events: kickoffEvents, derived: kickoffDerived, rosters }).text;
    const md = getExportPayload({ format: "markdown", events: kickoffEvents, derived: kickoffDerived, rosters }).text;
    const jsonText = getExportPayload({ format: "json", events: kickoffEvents, derived: kickoffDerived, rosters }).text;
    const parsed = JSON.parse(jsonText) as { events: Array<{ id: string; exportDetail?: string }> };

    expect(txt).toContain("New weather: Very Sunny");
    expect(txt).toContain("Throw a Rock: Team A, Player A3, Outcome ko");
    expect(txt).toContain("Pitch Invasion: A affected 2, B affected 1");
    expect(md).toContain("New weather: Very Sunny");
    expect(md).toContain("Throw a Rock: Team A, Player A3, Outcome ko");
    expect(md).toContain("Pitch Invasion: A affected 2, B affected 1");
    expect(parsed.events.find((event) => event.id === "cw")?.exportDetail).toBe("New weather: Very Sunny");
    expect(parsed.events.find((event) => event.id === "tar")?.exportDetail).toBe("Throw a Rock: Team A, Player A3, Outcome ko");
    expect(parsed.events.find((event) => event.id === "pi")?.exportDetail).toBe("Pitch Invasion: A affected 2, B affected 1");
  });

  it("shows apothecary final outcome wording and recovered status in reports", () => {
    const casualtyEvents: MatchEvent[] = [
      buildEvent({
        id: "match3",
        type: "match_start",
        payload: {
          teamAName: "Orcs",
          teamBName: "Elves",
          resources: {
            A: { rerolls: 2, apothecary: 1 },
            B: { rerolls: 2, apothecary: 1 },
          },
        },
        createdAt: 1,
      }),
      buildEvent({
        id: "inj1",
        type: "injury",
        team: "A",
        payload: {
          victimPlayerId: "B3",
          cause: "BLOCK",
          causerPlayerId: "A1",
          injuryResult: "MNG",
          apothecaryUsed: true,
          apothecaryOutcome: "RECOVERED",
        },
        createdAt: 2,
      }),
    ];

    const casualtyDerived = deriveMatchState(casualtyEvents);

    const txt = getExportPayload({ format: "text", events: casualtyEvents, derived: casualtyDerived, rosters }).text;
    const md = getExportPayload({ format: "markdown", events: casualtyEvents, derived: casualtyDerived, rosters }).text;

    expect(txt).toContain("Final: Recovered (Saved by Apothecary)");
    expect(txt).toContain("Apo: Yes (Apo -> Recovered)");
    expect(md).toContain("Final: Recovered (Saved by Apothecary)");
    expect(md).toContain("Apo: Yes (Apo -> Recovered)");
  });

});
