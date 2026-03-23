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
          A: { rerolls: 2, hasApothecary: true },
          B: { rerolls: 3, hasApothecary: true },
        },
      },
      createdAt: 10,
    }),
    buildEvent({
      id: "td",
      type: "touchdown",
      half: 2,
      turn: 3,
      team: "A",
      payload: { player: "A1" },
      createdAt: 20,
    }),
    buildEvent({
      id: "stall",
      type: "stalling",
      half: 2,
      turn: 4,
      team: "B",
      payload: { rollResult: 7 },
      createdAt: 21,
    }),
  ];

  const derived = deriveMatchState(events);
  const rosters = {
    A: [{ id: "A1", team: "A" as const, name: "Orc Blitzer" }],
    B: [{ id: "B1", team: "B" as const, name: "Elf Thrower" }],
  };

  it("builds non-empty text and markdown reports and a pdf blob", async () => {
    const textPayload = getExportPayload({ format: "text", events, derived, rosters });
    const markdownPayload = getExportPayload({ format: "markdown", events, derived, rosters });
    const pdfPayload = getExportPayload({ format: "pdf", events, derived, rosters });

    expect(textPayload.filename).toBe("bb-match-report.txt");
    expect(markdownPayload.filename).toBe("bb-match-report.md");
    expect(pdfPayload.filename).toBe("bb-match-report.pdf");
    expect(textPayload.text.length).toBeGreaterThan(0);
    expect(markdownPayload.text.length).toBeGreaterThan(0);
    expect(markdownPayload.text).toContain("# Match:");
    expect(textPayload.text).toContain("[T11/H2] Touchdown");
    expect(textPayload.text).toContain("[T12/H2] Stalling · Elves: Roll 7");
    expect(markdownPayload.text).toContain("**T11/H2** — Touchdown");
    expect(markdownPayload.text).toContain("**T12/H2** — Stalling · Elves: Roll 7");
    expect(pdfPayload.blob).toBeDefined();
    expect(pdfPayload.mime).toBe("application/pdf");
    const pdfText = await pdfPayload.blob!.text();
    expect(pdfText).toContain("%PDF-1.4");
  });


  it("groups text and markdown timelines by half and active team within the shared turn", () => {
    const turnEvents: MatchEvent[] = [
      buildEvent({
        id: "match3",
        type: "match_start",
        payload: {
          teamAName: "Orcs",
          teamBName: "Elves",
          resources: {
            A: { rerolls: 2, hasApothecary: true },
            B: { rerolls: 2, hasApothecary: true },
          },
        },
        createdAt: 1,
      }),
      buildEvent({
        id: "ko1",
        type: "kickoff_event",
        half: 1,
        turn: 1,
        payload: {
          driveIndex: 1,
          kickingTeam: "B",
          receivingTeam: "A",
          roll2d6: 7,
          kickoffKey: "HIGH_KICK",
          kickoffLabel: "High Kick",
        },
        createdAt: 2,
      }),
      buildEvent({ id: "a_comp", type: "completion", team: "A", half: 1, turn: 1, payload: { passer: "A1" }, createdAt: 3 }),
      buildEvent({ id: "a_to", type: "turnover", team: "A", half: 1, turn: 1, createdAt: 4 }),
      buildEvent({ id: "b_comp", type: "completion", team: "B", half: 1, turn: 1, payload: { passer: "B1" }, createdAt: 5 }),
      buildEvent({ id: "next", type: "next_turn", half: 1, turn: 1, createdAt: 6 }),
      buildEvent({ id: "a_td", type: "touchdown", team: "A", half: 1, turn: 2, payload: { player: "A1" }, createdAt: 7 }),
    ];

    const turnDerived = deriveMatchState(turnEvents);

    const txt = getExportPayload({ format: "text", events: turnEvents, derived: turnDerived, rosters }).text;
    const md = getExportPayload({ format: "markdown", events: turnEvents, derived: turnDerived, rosters }).text;

    expect(txt).toContain("== Half 1 ==");
    expect(txt).toContain("-- Turn 1 — Orcs --");
    expect(txt).toContain("-- Turn 1 — Elves --");
    expect(txt).toContain("-- Turn 2 — Orcs --");
    expect(md).toContain("### Half 1");
    expect(md).toContain("- **Turn 1 — Orcs**");
    expect(md).toContain("- **Turn 1 — Elves**");
    expect(md).toContain("- **Turn 2 — Orcs**");
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
            A: { rerolls: 2, hasApothecary: true },
            B: { rerolls: 2, hasApothecary: true },
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

    expect(txt).toContain("Kick-off · Weather: Very Sunny");
    expect(txt).toContain("Kick-off · Rock: Orcs #A3 KO");
    expect(txt).toContain("Kick-off · Pitch Invasion: A2 B1");
    expect(md).toContain("Kick-off · Weather: Very Sunny");
    expect(md).toContain("Kick-off · Rock: Orcs #A3 KO");
    expect(md).toContain("Kick-off · Pitch Invasion: A2 B1");
    expect(parsed.events.find((event) => event.id === "cw")?.exportDetail).toBe("New weather: Very Sunny");
    expect(parsed.events.find((event) => event.id === "tar")?.exportDetail).toBe("Throw a Rock: Team A, Player A3, Outcome ko");
    expect(parsed.events.find((event) => event.id === "pi")?.exportDetail).toBe("Pitch Invasion: A affected 2, B affected 1");
  });
});
