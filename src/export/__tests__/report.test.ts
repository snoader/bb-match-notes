import { describe, expect, it, vi } from "vitest";
import type { MatchEvent } from "../../domain/events";
import { buildCasualties, buildPdfBlob } from "../report";

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
  it("renders the redesigned report sections with derived timestamps", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-08T19:32:00Z"));

    const blob = buildPdfBlob({
      events: [
        buildEvent({ type: "match_start", createdAt: 1000, payload: { teamAName: "Orcs", teamBName: "Elves", weather: "nice" } }),
        buildEvent({ type: "kickoff_event", createdAt: 1500, payload: { kickoffKey: "TIME_OUT", details: { appliedDelta: 1 } } }),
        buildEvent({ type: "touchdown", team: "A", half: 2, turn: 3, createdAt: 2000, payload: { player: "7" } }),
      ],
      teamNames: { A: "Orcs", B: "Elves" },
      score: { A: 1, B: 0 },
      summary: {
        teams: { A: 3, B: 0 },
        players: {
          "7": { id: "7", name: "#7 Blitzer", team: "A", spp: 3 },
        },
      },
    });

    const pdfText = await blob.text();

    expect(pdfText).toContain("(HEADER) Tj");
    expect(pdfText).toContain("(BB Match Notes - Match Report) Tj");
    expect(pdfText).toContain("(MATCH SUMMARY) Tj");
    expect(pdfText).toContain("(SPP SUMMARY) Tj");
    expect(pdfText).toContain("(POST-GAME ACTIONS) Tj");
    expect(pdfText).toContain("(CHRONOLOGICAL MATCH LOG) Tj");
    expect(pdfText).toContain("(Match Start: 1970-01-01 00:00) Tj");
    expect(pdfText).toContain("(Match End: 1970-01-01 00:00) Tj");
    expect(pdfText).toContain("(Exported: 2026-03-08 19:32) Tj");
    expect(pdfText).toContain("([KO] Time-Out) Tj");
    expect(pdfText).toContain("(Time-Out shift: +1 turn) Tj");
    expect(pdfText).not.toContain("â");

    vi.useRealTimers();
  });

  it("flags post-game block casualties and excludes recovered apothecary outcomes", async () => {
    const blob = buildPdfBlob({
      events: [
        buildEvent({
          id: "cas_kept",
          type: "injury",
          team: "A",
          createdAt: 100,
          payload: {
            victimTeam: "B",
            victimPlayerId: "12",
            cause: "BLOCK",
            injuryResult: "MNG",
            apothecaryUsed: false,
          },
        }),
        buildEvent({
          id: "cas_removed",
          type: "injury",
          team: "A",
          createdAt: 200,
          payload: {
            victimTeam: "B",
            victimPlayerId: "3",
            cause: "BLOCK",
            injuryResult: "MNG",
            apothecaryUsed: true,
            apothecaryOutcome: "RECOVERED",
          },
        }),
      ],
      teamNames: { A: "Orcs", B: "Elves" },
      score: { A: 0, B: 0 },
      summary: { teams: { A: 2, B: 0 }, players: { "1": { id: "1", name: "#1", team: "A", spp: 2 } } },
    });

    const pdfText = await blob.text();

    expect(pdfText).toContain("(* #12 - Elves) Tj");
    expect(pdfText).toContain("Hatred roll required");
    expect(pdfText).not.toContain("(* #3");
  });

  it("labels legacy FAILED_PICKUP injury causes as unknown", () => {
    const casualties = buildCasualties([
      buildEvent({
        id: "legacy_failed_pickup",
        type: "injury",
        payload: {
          victimPlayerId: "7",
          cause: "FAILED_PICKUP",
          injuryResult: "BH",
          apothecaryUsed: false,
        },
      }),
    ]);

    expect(casualties[0]?.cause).toBe("Unknown (legacy)");
  });

  it("labels FAILED_GFI injury causes as Failed Rush", () => {
    const casualties = buildCasualties([
      buildEvent({
        id: "failed_gfi",
        type: "injury",
        payload: {
          victimPlayerId: "5",
          cause: "FAILED_GFI",
          injuryResult: "BH",
          apothecaryUsed: false,
        },
      }),
    ]);

    expect(casualties[0]?.cause).toBe("Failed Rush");
  });
});
