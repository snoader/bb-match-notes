import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MatchEvent } from "../../../domain/events";
import type { DerivedMatchState } from "../../../domain/projection";
import { useLiveMatch } from "../useLiveMatch";

const appendEvent = vi.fn(async () => {});
const undoLast = vi.fn(async () => {});

let mockState: {
  isReady: boolean;
  events: MatchEvent[];
  derived: DerivedMatchState;
  appendEvent: typeof appendEvent;
  undoLast: typeof undoLast;
};

vi.mock("../../../store/matchStore", () => ({
  useMatchStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
}));

const baseDerived = (): DerivedMatchState => ({
  teamNames: { A: "Team A", B: "Team B" },
  score: { A: 0, B: 0 },
  half: 1,
  turn: 1,
  resources: { A: { rerolls: 0, apothecary: 0 }, B: { rerolls: 0, apothecary: 0 } },
  inducementsBought: [],
  driveIndexCurrent: 1,
  kickoffPending: true,
  driveKickoff: null,
  kickoffByDrive: new Map(),
});

describe("useLiveMatch", () => {
  beforeEach(() => {
    appendEvent.mockClear();
    undoLast.mockClear();
    mockState = {
      isReady: true,
      events: [
        {
          id: "m1",
          createdAt: 1,
          type: "match_start",
          payload: {},
          half: 1,
          turn: 1,
        },
      ],
      derived: baseDerived(),
      appendEvent,
      undoLast,
    };
  });

  it("dispatches touchdown and closes the modal when valid", async () => {
    mockState.derived.kickoffPending = false;
    const { result } = renderHook(() => useLiveMatch());

    await act(async () => {
      result.current.touchdown.setOpen(true);
      result.current.touchdown.setTeam("B");
      result.current.touchdown.setPlayer(3);
    });

    await act(async () => {
      await result.current.touchdown.save();
    });

    expect(appendEvent).toHaveBeenCalledWith({
      type: "touchdown",
      team: "B",
      payload: { player: 3 },
    });
    expect(result.current.touchdown.open).toBe(false);
  });

  it("does not dispatch injury if causer is required but missing", async () => {
    const { result } = renderHook(() => useLiveMatch());

    await act(async () => {
      result.current.injury.setVictimPlayerId(4);
      result.current.injury.setCause("BLOCK");
      result.current.injury.setCauserPlayerId("");
    });

    await act(async () => {
      await result.current.injury.save();
    });

    expect(appendEvent).not.toHaveBeenCalled();
  });

  it("requires new weather for changing weather kickoff", async () => {
    const { result } = renderHook(() => useLiveMatch());

    await act(async () => {
      result.current.kickoff.setRoll(7);
    });

    await act(async () => {
      await result.current.kickoff.save();
    });

    expect(appendEvent).not.toHaveBeenCalled();
    expect(result.current.kickoff.message).toContain("Select a new weather");
  });

  it("sends throw a rock details in kickoff payload", async () => {
    const { result } = renderHook(() => useLiveMatch());

    await act(async () => {
      result.current.kickoff.setRoll(11);
      result.current.kickoff.setKickingTeam("B");
      result.current.kickoff.setRockTargetTeam("A");
      result.current.kickoff.setRockTargetPlayer(6);
      result.current.kickoff.setRockOutcome("ko");
    });

    await act(async () => {
      await result.current.kickoff.save();
    });

    expect(appendEvent).toHaveBeenCalledWith({
      type: "kickoff_event",
      payload: {
        driveIndex: 1,
        kickingTeam: "B",
        receivingTeam: "A",
        roll2d6: 11,
        kickoffKey: "THROW_A_ROCK",
        kickoffLabel: "Throw a Rock",
        details: {
          targetTeam: "A",
          targetPlayer: 6,
          outcome: "ko",
        },
      },
    });
  });
});
