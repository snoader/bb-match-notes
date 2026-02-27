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
    expect(parsed.events).toBeTypeOf("object");
    expect(parsed.derived).toBeTypeOf("object");
  });
});
