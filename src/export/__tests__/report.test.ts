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
        buildEvent({ type: "kickoff_event", createdAt: 1500, payload: { kickoffKey: "TIME_OUT", receivingTeam: "B", kickingTeam: "A", details: { appliedDelta: 1 } } }),
        buildEvent({ type: "touchdown", team: "A", half: 2, turn: 3, createdAt: 2000, payload: { player: "7" } }),
      ],
      teamNames: { A: "Orcs", B: "Elves" },
      score: { A: 1, B: 0 },
      summary: {
        teams: { A: 3, B: 0 },
        players: {
          "7": {
            id: "7",
            name: "#7 Blitzer",
            team: "A",
            spp: 3,
            totalSPP: 3,
            breakdown: { touchdown: 3, completion: 0, interception: 0, casualty: 0, mvp: 0, adjustment: 0 },
          },
        },
      },
    });

    const pdfText = await blob.text();

    expect(pdfText).toContain("(BB Match Notes) Tj");
    expect(pdfText).toContain("(Match Report) Tj");
    expect(pdfText).toContain("(MATCH SUMMARY) Tj");
    expect(pdfText).toContain("(SPP SUMMARY) Tj");
    expect(pdfText).toContain("(POST-GAME ADMINISTRATION) Tj");
    expect(pdfText).toContain("(SPP ASSIGNMENT) Tj");
    expect(pdfText).toContain("(CASUALTIES TO RECORD) Tj");
    expect(pdfText).toContain("(HATRED ROLLS REQUIRED) Tj");
    expect(pdfText).toContain("(MVP ASSIGNMENT) Tj");
    expect(pdfText).toContain("(POST-GAME CHECKLIST) Tj");
    expect(pdfText).toContain("(CHRONOLOGICAL MATCH LOG) Tj");
    expect(pdfText).toContain("(Match Start) Tj");
    expect(pdfText).toContain("(1970-01-01 00:00) Tj");
    expect(pdfText).toContain("(Report Generated) Tj");
    expect(pdfText).toContain("(2026-03-08 19:32) Tj");
    expect(pdfText).toContain("(Half 1) Tj");
    expect(pdfText).toContain("(Turn 1 - Elves) Tj");
    expect(pdfText).toContain("([KO] Kick-off ? Time-Out: +1 Turn) Tj");
    expect(pdfText).not.toContain("â");

    vi.useRealTimers();
  });

  it("records only final casualties and marks hatred only for block casualties", async () => {
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
            causerPlayerId: "77",
            cause: "BLOCK",
            injuryResult: "MNG",
            apothecaryUsed: false,
          },
        }),
        buildEvent({
          id: "cas_non_block",
          type: "injury",
          team: "A",
          createdAt: 150,
          payload: {
            victimTeam: "B",
            victimPlayerId: "44",
            causerPlayerId: "9",
            cause: "FOUL",
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
      summary: {
        teams: { A: 2, B: 0 },
        players: {
          "1": {
            id: "1",
            name: "#1",
            team: "A",
            spp: 2,
            totalSPP: 2,
            breakdown: { touchdown: 0, completion: 0, interception: 0, casualty: 2, mvp: 0, adjustment: 0 },
          },
        },
      },
    });

    const pdfText = await blob.text();

    expect(pdfText).toContain("(#12 | Elves | #77 | Miss Next Game) Tj");
    expect(pdfText).toContain("(#44 | Elves | #9 | Miss Next Game) Tj");
    expect(pdfText).toContain("(#77 caused casualty by BLOCK) Tj");
    expect(pdfText).not.toContain("(#9 caused casualty by BLOCK) Tj");
    expect(pdfText).not.toContain("(#3 |");
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
