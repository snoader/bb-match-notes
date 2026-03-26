import { describe, it, expect } from "vitest";
import type { MatchEvent, KickoffEventPayload } from "../events";
import { deriveDriveMeta } from "../drives";

let _idCounter = 0;
const buildEvent = (overrides: Partial<MatchEvent> & Pick<MatchEvent, "type">): MatchEvent => ({
  id: overrides.id ?? `e_${overrides.type}_${++_idCounter}`,
  type: overrides.type,
  half: overrides.half ?? 1,
  turn: overrides.turn ?? 1,
  team: overrides.team,
  payload: overrides.payload,
  createdAt: overrides.createdAt ?? 1,
});

const kickoffPayload = (driveIndex: number): KickoffEventPayload => ({
  driveIndex,
  kickingTeam: "A",
  receivingTeam: "B",
  roll2d6: 7,
  kickoffKey: "HIGH_KICK",
  kickoffLabel: "High Kick",
});

describe("deriveDriveMeta", () => {
  it("leere Event-Liste liefert driveIndex 1, kickoffPending false und leere Maps", () => {
    const result = deriveDriveMeta([]);

    expect(result.driveIndexCurrent).toBe(1);
    expect(result.kickoffPending).toBe(false);
    expect(result.kickoffByDrive.size).toBe(0);
    expect(result.eventDriveIndex.size).toBe(0);
  });

  it("nach match_start ist kickoffPending true und driveIndex ist 1", () => {
    const events = [buildEvent({ type: "match_start", id: "e1" })];

    const result = deriveDriveMeta(events);

    expect(result.driveIndexCurrent).toBe(1);
    expect(result.kickoffPending).toBe(true);
    expect(result.eventDriveIndex.get("e1")).toBe(1);
  });

  it("Happy Path: kickoff_event löst kickoffPending auf, kickoffByDrive wird befüllt", () => {
    const events = [
      buildEvent({ type: "match_start", id: "start" }),
      buildEvent({ type: "kickoff_event", id: "ko1", payload: kickoffPayload(1) }),
    ];

    const result = deriveDriveMeta(events);

    expect(result.driveIndexCurrent).toBe(1);
    expect(result.kickoffPending).toBe(false);
    expect(result.kickoffByDrive.get(1)).toEqual(kickoffPayload(1));
  });

  it("Happy Path: normaler Drive-Ablauf – Touchdown erhöht driveIndex und setzt kickoffPending", () => {
    const events = [
      buildEvent({ type: "match_start", id: "start" }),
      buildEvent({ type: "kickoff_event", id: "ko1", payload: kickoffPayload(1) }),
      buildEvent({ type: "next_turn", id: "turn1" }),
      buildEvent({ type: "touchdown", id: "td1" }),
    ];

    const result = deriveDriveMeta(events);

    expect(result.driveIndexCurrent).toBe(2);
    expect(result.kickoffPending).toBe(true);
    // Das Touchdown-Event selbst gehört noch zu Drive 1
    expect(result.eventDriveIndex.get("td1")).toBe(1);
  });

  it("Drive ohne Touchdown: driveIndex bleibt 1, kickoffPending bleibt false nach Kickoff", () => {
    const events = [
      buildEvent({ type: "match_start", id: "start" }),
      buildEvent({ type: "kickoff_event", id: "ko1", payload: kickoffPayload(1) }),
      buildEvent({ type: "turnover", id: "to1" }),
      buildEvent({ type: "injury", id: "inj1" }),
    ];

    const result = deriveDriveMeta(events);

    expect(result.driveIndexCurrent).toBe(1);
    expect(result.kickoffPending).toBe(false);
  });

  it("Mehrere Touchdowns: jeder Touchdown erhöht driveIndex um 1", () => {
    const events = [
      buildEvent({ type: "match_start", id: "start" }),
      buildEvent({ type: "kickoff_event", id: "ko1", payload: kickoffPayload(1) }),
      buildEvent({ type: "touchdown", id: "td1" }),
      buildEvent({ type: "kickoff_event", id: "ko2", payload: kickoffPayload(2) }),
      buildEvent({ type: "touchdown", id: "td2" }),
    ];

    const result = deriveDriveMeta(events);

    expect(result.driveIndexCurrent).toBe(3);
    expect(result.kickoffPending).toBe(true);
    expect(result.eventDriveIndex.get("td1")).toBe(1);
    expect(result.eventDriveIndex.get("td2")).toBe(2);
  });

  it("Mehrere Touchdowns: kickoffByDrive enthält Kickoffs für alle Drives", () => {
    const events = [
      buildEvent({ type: "match_start", id: "start" }),
      buildEvent({ type: "kickoff_event", id: "ko1", payload: kickoffPayload(1) }),
      buildEvent({ type: "touchdown", id: "td1" }),
      buildEvent({ type: "kickoff_event", id: "ko2", payload: kickoffPayload(2) }),
      buildEvent({ type: "touchdown", id: "td2" }),
      buildEvent({ type: "kickoff_event", id: "ko3", payload: kickoffPayload(3) }),
    ];

    const result = deriveDriveMeta(events);

    expect(result.kickoffByDrive.size).toBe(3);
    expect(result.kickoffByDrive.get(1)).toEqual(kickoffPayload(1));
    expect(result.kickoffByDrive.get(2)).toEqual(kickoffPayload(2));
    expect(result.kickoffByDrive.get(3)).toEqual(kickoffPayload(3));
    expect(result.kickoffPending).toBe(false);
  });

  it("Halbzeit-Grenze: erstes Event in Halbzeit 2 erhöht driveIndex und setzt kickoffPending", () => {
    const events = [
      buildEvent({ type: "match_start", id: "start", half: 1 }),
      buildEvent({ type: "kickoff_event", id: "ko1", half: 1, payload: kickoffPayload(1) }),
      buildEvent({ type: "next_turn", id: "last_h1", half: 1 }),
      buildEvent({ type: "next_turn", id: "first_h2", half: 2 }),
    ];

    const result = deriveDriveMeta(events);

    expect(result.driveIndexCurrent).toBe(2);
    expect(result.kickoffPending).toBe(true);
    // Das erste H2-Event gehört bereits zu Drive 2
    expect(result.eventDriveIndex.get("first_h2")).toBe(2);
    // Das letzte H1-Event gehört noch zu Drive 1
    expect(result.eventDriveIndex.get("last_h1")).toBe(1);
  });

  it("Halbzeit-Grenze: zweiter Halbzeit-Wechsel wird nicht nochmals gezählt", () => {
    const events = [
      buildEvent({ type: "match_start", id: "start", half: 1 }),
      buildEvent({ type: "kickoff_event", id: "ko1", half: 1, payload: kickoffPayload(1) }),
      buildEvent({ type: "next_turn", id: "h2a", half: 2 }),
      buildEvent({ type: "next_turn", id: "h2b", half: 2 }),
    ];

    const result = deriveDriveMeta(events);

    // Nur ein Increment durch den Halbzeit-Übergang, nicht für jedes H2-Event
    expect(result.driveIndexCurrent).toBe(2);
  });

  it("Touchdown im letzten Event: kickoffPending ist true, driveIndex ist erhöht", () => {
    const events = [
      buildEvent({ type: "match_start", id: "start" }),
      buildEvent({ type: "kickoff_event", id: "ko1", payload: kickoffPayload(1) }),
      buildEvent({ type: "touchdown", id: "last_td" }),
    ];

    const result = deriveDriveMeta(events);

    expect(result.driveIndexCurrent).toBe(2);
    expect(result.kickoffPending).toBe(true);
    // Das Touchdown-Event selbst gehört zu Drive 1
    expect(result.eventDriveIndex.get("last_td")).toBe(1);
  });

  describe("kickoffPending – Regression: Touchdown blockiert Next Team Turn", () => {
    it("Test 1: leere Events → kickoffPending = false", () => {
      const result = deriveDriveMeta([]);
      expect(result.kickoffPending).toBe(false);
    });

    it("Test 2: Touchdown als letztes Event → kickoffPending = true", () => {
      const events = [
        buildEvent({ type: "match_start", id: "start" }),
        buildEvent({ type: "kickoff_event", id: "ko1", payload: kickoffPayload(1) }),
        buildEvent({ type: "touchdown", id: "td1" }),
      ];
      const result = deriveDriveMeta(events);
      expect(result.kickoffPending).toBe(true);
    });

    it("Test 3: Touchdown gefolgt von Kickoff → kickoffPending = false", () => {
      const events = [
        buildEvent({ type: "match_start", id: "start" }),
        buildEvent({ type: "kickoff_event", id: "ko1", payload: kickoffPayload(1) }),
        buildEvent({ type: "touchdown", id: "td1" }),
        buildEvent({ type: "kickoff_event", id: "ko2", payload: kickoffPayload(2) }),
      ];
      const result = deriveDriveMeta(events);
      expect(result.kickoffPending).toBe(false);
    });

    it("Test 4: zwei Touchdowns, nur ein Kickoff → kickoffPending = true", () => {
      const events = [
        buildEvent({ type: "match_start", id: "start" }),
        buildEvent({ type: "kickoff_event", id: "ko1", payload: kickoffPayload(1) }),
        buildEvent({ type: "touchdown", id: "td1" }),
        buildEvent({ type: "kickoff_event", id: "ko2", payload: kickoffPayload(2) }),
        buildEvent({ type: "touchdown", id: "td2" }),
      ];
      const result = deriveDriveMeta(events);
      expect(result.kickoffPending).toBe(true);
    });
  });

  it("kickoff_event mit ungültigem Payload wird ignoriert (kein Eintrag in kickoffByDrive)", () => {
    const events = [
      buildEvent({ type: "match_start", id: "start" }),
      buildEvent({ type: "kickoff_event", id: "ko_bad", payload: { driveIndex: 1 } }), // unvollständig
    ];

    const result = deriveDriveMeta(events);

    expect(result.kickoffByDrive.size).toBe(0);
    // kickoffPending bleibt true, da Kickoff nicht als gültig erkannt wurde
    expect(result.kickoffPending).toBe(true);
  });

  it("Edge Case: Event ohne half-Feld (half fehlt zur Laufzeit) verursacht keinen Fehler", () => {
    const events = [
      buildEvent({ type: "match_start", id: "start" }),
      // half wird als undefined übergeben – simuliert fehlende Daten
      { id: "no_half", type: "next_turn", half: undefined as unknown as number, turn: 1, createdAt: 1 } as MatchEvent,
    ];

    expect(() => deriveDriveMeta(events)).not.toThrow();

    const result = deriveDriveMeta(events);
    expect(result.driveIndexCurrent).toBe(1);
    expect(result.eventDriveIndex.has("no_half")).toBe(true);
  });

  it("eventDriveIndex enthält alle Event-IDs korrekt gemappt", () => {
    const events = [
      buildEvent({ type: "match_start", id: "e1" }),
      buildEvent({ type: "kickoff_event", id: "e2", payload: kickoffPayload(1) }),
      buildEvent({ type: "next_turn", id: "e3" }),
      buildEvent({ type: "touchdown", id: "e4" }),
      buildEvent({ type: "kickoff_event", id: "e5", payload: kickoffPayload(2) }),
    ];

    const result = deriveDriveMeta(events);

    expect(result.eventDriveIndex.get("e1")).toBe(1);
    expect(result.eventDriveIndex.get("e2")).toBe(1);
    expect(result.eventDriveIndex.get("e3")).toBe(1);
    expect(result.eventDriveIndex.get("e4")).toBe(1);
    expect(result.eventDriveIndex.get("e5")).toBe(2);
  });
});
