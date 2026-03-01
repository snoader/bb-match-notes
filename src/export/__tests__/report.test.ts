import { describe, expect, it } from "vitest";
import type { MatchEvent } from "../../domain/events";
import { buildPdfBlob } from "../report";

const buildEvent = (overrides: Partial<MatchEvent> & Pick<MatchEvent, "type">): MatchEvent => ({
  id: overrides.id ?? `e_${overrides.type}`,
  type: overrides.type,
  half: overrides.half ?? 1,
  turn: overrides.turn ?? 1,
  team: overrides.team,
  payload: overrides.payload,
  createdAt: overrides.createdAt ?? 1,
});

describe("buildPdfBlob", () => {
  it("renders timeline badges in bold using Txx/Hx notation", async () => {
    const blob = buildPdfBlob({
      events: [
        buildEvent({ type: "match_start", createdAt: 1, payload: { teamAName: "Orcs", teamBName: "Elves" } }),
        buildEvent({ type: "touchdown", team: "A", half: 2, turn: 3, createdAt: 2 }),
      ],
      teamNames: { A: "Orcs", B: "Elves" },
      score: { A: 1, B: 0 },
      summary: {
        teams: { A: 0, B: 0 },
        players: {},
      },
    });

    const pdfText = await blob.text();

    expect(pdfText).toContain("/BaseFont /Helvetica-Bold");
    expect(pdfText).toContain("(T11/H2) Tj");
  });
});
