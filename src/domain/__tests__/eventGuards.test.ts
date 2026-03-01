import { describe, expect, it } from "vitest";
import type { MatchEvent } from "../events";
import { deriveMatchState } from "../projection";
import {
  canRecordCasualty,
  canRecordCompletion,
  canRecordGameplayAction,
  canRecordInterception,
  canRecordTouchdown,
  canSelectKickoff,
  canStartDrive,
  canUseApothecary,
  canVictimUseApothecary,
} from "../eventGuards";

const buildEvent = (overrides: Partial<MatchEvent> & Pick<MatchEvent, "type">): MatchEvent => ({
  id: overrides.id ?? `e_${overrides.type}`,
  type: overrides.type,
  half: overrides.half ?? 1,
  turn: overrides.turn ?? 1,
  team: overrides.team,
  payload: overrides.payload,
  createdAt: overrides.createdAt ?? 1,
});

const getContext = (events: MatchEvent[]) => ({ state: deriveMatchState(events), recentEvents: events });

describe("event guards", () => {
  it("block all actions before match_start", () => {
    const context = getContext([]);

    expect(canStartDrive(context)).toBe(false);
    expect(canSelectKickoff(context)).toBe(false);
    expect(canRecordTouchdown(context)).toBe(false);
    expect(canRecordCompletion(context)).toBe(false);
    expect(canRecordInterception(context)).toBe(false);
    expect(canRecordCasualty(context)).toBe(false);
    expect(canRecordGameplayAction(context, "reroll_used")).toBe(false);
    expect(canRecordGameplayAction(context, "apothecary_used")).toBe(false);
    expect(canUseApothecary(context, "A")).toBe(false);
  });

  it("allow kickoff selection when a drive kickoff is pending", () => {
    const events = [buildEvent({ type: "match_start", id: "1", createdAt: 1 })];
    const context = getContext(events);

    expect(canStartDrive(context)).toBe(true);
    expect(canSelectKickoff(context)).toBe(true);
    expect(canRecordTouchdown(context)).toBe(false);
    expect(canRecordCompletion(context)).toBe(false);
    expect(canRecordInterception(context)).toBe(false);
    expect(canRecordCasualty(context)).toBe(false);
    expect(canRecordGameplayAction(context, "reroll_used")).toBe(false);
    expect(canRecordGameplayAction(context, "apothecary_used")).toBe(false);
    expect(canUseApothecary(context, "A")).toBe(false);
  });

  it("allow drive actions after kickoff_event", () => {
    const events = [
      buildEvent({ type: "match_start", id: "1", createdAt: 1 }),
      buildEvent({
        type: "kickoff_event",
        id: "2",
        createdAt: 2,
        payload: {
          driveIndex: 1,
          kickingTeam: "A",
          receivingTeam: "B",
          roll2d6: 7,
          kickoffKey: "HIGH_KICK",
          kickoffLabel: "High Kick",
        },
      }),
    ];
    const context = getContext(events);

    expect(canStartDrive(context)).toBe(false);
    expect(canSelectKickoff(context)).toBe(false);
    expect(canRecordTouchdown(context)).toBe(true);
    expect(canRecordCompletion(context)).toBe(true);
    expect(canRecordInterception(context)).toBe(true);
    expect(canRecordCasualty(context)).toBe(true);
    expect(canRecordGameplayAction(context, "reroll_used")).toBe(true);
    expect(canRecordGameplayAction(context, "apothecary_used")).toBe(true);
    expect(canUseApothecary(context, "A")).toBe(false);
    expect(canUseApothecary(context, "B")).toBe(false);
  });

  it("allows apothecary usage only when the selected team has one available", () => {
    const events = [
      buildEvent({
        type: "match_start",
        id: "1",
        createdAt: 1,
        payload: {
          teamA: "Team A",
          teamB: "Team B",
          resources: {
            A: { rerolls: 2, apothecary: 1 },
            B: { rerolls: 2, apothecary: 0 },
          },
        },
      }),
      buildEvent({
        type: "kickoff_event",
        id: "2",
        createdAt: 2,
        payload: {
          driveIndex: 1,
          kickingTeam: "A",
          receivingTeam: "B",
          roll2d6: 7,
          kickoffKey: "HIGH_KICK",
          kickoffLabel: "High Kick",
        },
      }),
    ];
    const context = getContext(events);

    expect(canUseApothecary(context, "A")).toBe(true);
    expect(canUseApothecary(context, "B")).toBe(false);
    expect(canVictimUseApothecary(context.state, "A")).toBe(true);
    expect(canVictimUseApothecary(context.state, "B")).toBe(false);
  });

  it("requires kickoff again after touchdown starts a new drive", () => {
    const events = [
      buildEvent({ type: "match_start", id: "1", createdAt: 1 }),
      buildEvent({
        type: "kickoff_event",
        id: "2",
        createdAt: 2,
        payload: {
          driveIndex: 1,
          kickingTeam: "A",
          receivingTeam: "B",
          roll2d6: 7,
          kickoffKey: "HIGH_KICK",
          kickoffLabel: "High Kick",
        },
      }),
      buildEvent({ type: "touchdown", id: "3", createdAt: 3, team: "A" }),
    ];
    const context = getContext(events);

    expect(canStartDrive(context)).toBe(true);
    expect(canSelectKickoff(context)).toBe(true);
    expect(canRecordTouchdown(context)).toBe(false);
    expect(canRecordCompletion(context)).toBe(false);
    expect(canRecordInterception(context)).toBe(false);
    expect(canRecordCasualty(context)).toBe(false);
  });

  it("re-opens kickoff gate if kickoff_event is undone", () => {
    const beforeUndo = [
      buildEvent({ type: "match_start", id: "1", createdAt: 1 }),
      buildEvent({
        type: "kickoff_event",
        id: "2",
        createdAt: 2,
        payload: {
          driveIndex: 1,
          kickingTeam: "A",
          receivingTeam: "B",
          roll2d6: 7,
          kickoffKey: "HIGH_KICK",
          kickoffLabel: "High Kick",
        },
      }),
    ];

    const afterUndo = [buildEvent({ type: "match_start", id: "1", createdAt: 1 })];

    expect(canRecordTouchdown(getContext(beforeUndo))).toBe(true);
    expect(canRecordTouchdown(getContext(afterUndo))).toBe(false);
    expect(canRecordGameplayAction(getContext(afterUndo), "reroll_used")).toBe(false);
  });
});
