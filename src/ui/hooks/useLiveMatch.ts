import { useMemo, useState } from "react";
import { useMatchStore } from "../../store/matchStore";
import type { ApothecaryOutcome, InjuryCause, InjuryPayload, InjuryResult, StatReduction } from "../../domain/events";
import type { PlayerSlot, TeamId, Weather } from "../../domain/enums";
import { PLAYER_SLOTS } from "../../domain/enums";
import { BB2025_KICKOFF_TABLE, mapKickoffRoll } from "../../rules/bb2025/kickoff";
import { canRecordCasualty, canRecordCompletion, canRecordInterception, canRecordTouchdown, canSelectKickoff, canUseApothecary } from "../../domain/eventGuards";

export const injuryCauses: InjuryCause[] = ["BLOCK", "FOUL", "SECRET_WEAPON", "CROWD", "FAILED_DODGE", "FAILED_GFI", "FAILED_PICKUP", "OTHER"];
export const injuryResults: InjuryResult[] = ["BH", "MNG", "NIGGLING", "STAT", "DEAD", "OTHER"];
export const statReductions: StatReduction[] = ["MA", "AV", "AG", "PA", "ST"];
export const apoOutcomes: ApothecaryOutcome[] = ["SAVED", "CHANGED_RESULT", "DIED_ANYWAY", "UNKNOWN"];
export const throwRockOutcomes = ["stunned", "ko", "casualty", "unknown"] as const;
export const causesWithCauser = new Set<InjuryCause>(["BLOCK", "FOUL", "SECRET_WEAPON"]);

export const normalizeInjuryPayload = (payload: unknown): Required<Pick<InjuryPayload, "cause" | "injuryResult" | "apothecaryUsed">> & InjuryPayload => {
  const p = (payload ?? {}) as InjuryPayload;
  return {
    ...p,
    cause: p.cause ?? "OTHER",
    injuryResult: p.injuryResult ?? "OTHER",
    apothecaryUsed: p.apothecaryUsed ?? false,
  };
};

export function useLiveMatch() {
  const isReady = useMatchStore((s) => s.isReady);
  const events = useMatchStore((s) => s.events);
  const d = useMatchStore((s) => s.derived);
  const appendEvent = useMatchStore((s) => s.appendEvent);
  const undoLast = useMatchStore((s) => s.undoLast);

  const hasMatch = useMemo(() => events.some((e) => e.type === "match_start"), [events]);

  const [tdOpen, setTdOpen] = useState(false);
  const [tdTeam, setTdTeam] = useState<TeamId>("A");
  const [tdPlayer, setTdPlayer] = useState<PlayerSlot | "">("");

  const [completionOpen, setCompletionOpen] = useState(false);
  const [completionTeam, setCompletionTeam] = useState<TeamId>("A");
  const [completionPasser, setCompletionPasser] = useState<PlayerSlot | "">("");
  const [completionReceiver, setCompletionReceiver] = useState<PlayerSlot | "">("");

  const [interceptionOpen, setInterceptionOpen] = useState(false);
  const [interceptionTeam, setInterceptionTeam] = useState<TeamId>("A");
  const [interceptionPlayer, setInterceptionPlayer] = useState<PlayerSlot | "">("");

  const [injuryOpen, setInjuryOpen] = useState(false);
  const [victimTeam, setVictimTeam] = useState<TeamId>("B");
  const [victimPlayerId, setVictimPlayerId] = useState<PlayerSlot | "">("");
  const [cause, setCause] = useState<InjuryCause>("BLOCK");
  const [causerPlayerId, setCauserPlayerId] = useState<PlayerSlot | "">("");
  const [injuryResult, setInjuryResult] = useState<InjuryResult>("BH");
  const [injuryStat, setInjuryStat] = useState<StatReduction>("MA");
  const [apoUsed, setApoUsed] = useState(false);
  const [apoOutcome, setApoOutcome] = useState<ApothecaryOutcome>("SAVED");

  const [kickoffOpen, setKickoffOpen] = useState(false);
  const [kickoffKickingTeam, setKickoffKickingTeam] = useState<TeamId>("A");
  const [kickoffRoll, setKickoffRoll] = useState(7);
  const [kickoffMessage, setKickoffMessage] = useState("");
  const [kickoffNewWeather, setKickoffNewWeather] = useState<Weather | "">("");
  const [kickoffRockTargetTeam, setKickoffRockTargetTeam] = useState<TeamId>("A");
  const [kickoffRockTargetPlayer, setKickoffRockTargetPlayer] = useState<PlayerSlot | "">("");
  const [kickoffRockOutcome, setKickoffRockOutcome] = useState<(typeof throwRockOutcomes)[number] | "">("");
  const [kickoffPitchInvasionA, setKickoffPitchInvasionA] = useState<string>("");
  const [kickoffPitchInvasionB, setKickoffPitchInvasionB] = useState<string>("");
  const [kickoffPitchInvasionNotes, setKickoffPitchInvasionNotes] = useState("");

  const kickoffMapped = useMemo(() => mapKickoffRoll(kickoffRoll), [kickoffRoll]);
  const kickoffOptions = useMemo(() => Object.entries(BB2025_KICKOFF_TABLE).map(([roll, result]) => ({ roll: Number(roll), ...result })), []);
  const kickoffDetailRequirementsMet = useMemo(() => {
    if (kickoffMapped.key === "CHANGING_WEATHER") return !!kickoffNewWeather;
    return true;
  }, [kickoffMapped.key, kickoffNewWeather]);

  const timeOutDelta = useMemo<-1 | 1>(() => (d.turnMarkers[kickoffKickingTeam] >= 6 ? -1 : 1), [d.turnMarkers, kickoffKickingTeam]);

  const turnButtons = [1, 2, 3, 4, 5, 6, 7, 8];

  const guardContext = useMemo(() => ({ state: d, recentEvents: events }), [d, events]);
  const kickoffAllowed = canSelectKickoff(guardContext);
  const touchdownAllowed = canRecordTouchdown(guardContext);
  const completionAllowed = canRecordCompletion(guardContext);
  const interceptionAllowed = canRecordInterception(guardContext);
  const casualtyAllowed = canRecordCasualty(guardContext);
  const apothecaryAllowed = {
    A: canUseApothecary(guardContext, "A"),
    B: canUseApothecary(guardContext, "B"),
  };

  async function doKickoffEvent() {
    if (!kickoffAllowed) return;
    const clampedRoll = Math.max(2, Math.min(12, Math.round(kickoffRoll)));
    const mapped = mapKickoffRoll(clampedRoll);
    const receivingTeam = kickoffKickingTeam === "A" ? "B" : "A";
    const asNonNegativeInt = (value: string): number | undefined => {
      if (value.trim() === "") return undefined;
      const parsed = Number(value);
      if (!Number.isFinite(parsed)) return undefined;
      const rounded = Math.round(parsed);
      return rounded >= 0 ? rounded : undefined;
    };

    let details: Record<string, unknown> | undefined;
    if (mapped.key === "CHANGING_WEATHER") {
      if (!kickoffNewWeather) {
        setKickoffMessage("Select a new weather result.");
        return;
      }
      details = { newWeather: kickoffNewWeather };
    }
    if (mapped.key === "TIME_OUT") {
      details = { appliedDelta: timeOutDelta };
    }
    if (mapped.key === "THROW_A_ROCK") {
      details = {
        targetTeam: kickoffRockTargetTeam,
        targetPlayer: kickoffRockTargetPlayer || undefined,
        outcome: kickoffRockOutcome || undefined,
      };
    }
    if (mapped.key === "PITCH_INVASION") {
      details = {
        affectedA: asNonNegativeInt(kickoffPitchInvasionA),
        affectedB: asNonNegativeInt(kickoffPitchInvasionB),
        notes: kickoffPitchInvasionNotes.trim() || undefined,
      };
    }

    await appendEvent({
      type: "kickoff_event",
      payload: {
        driveIndex: d.driveIndexCurrent,
        kickingTeam: kickoffKickingTeam,
        receivingTeam,
        roll2d6: clampedRoll,
        kickoffKey: mapped.key,
        kickoffLabel: mapped.label,
        details,
      },
    });

    setKickoffMessage("");
    setKickoffNewWeather("");
    setKickoffRockTargetTeam("A");
    setKickoffRockTargetPlayer("");
    setKickoffRockOutcome("");
    setKickoffPitchInvasionA("");
    setKickoffPitchInvasionB("");
    setKickoffPitchInvasionNotes("");
    setKickoffOpen(false);
  }

  async function doTouchdown() {
    if (!tdPlayer || !touchdownAllowed) return;
    await appendEvent({ type: "touchdown", team: tdTeam, payload: { player: tdPlayer } });
    setTdOpen(false);
  }

  async function doCompletion() {
    if (!completionPasser || !completionAllowed) return;
    await appendEvent({ type: "completion", team: completionTeam, payload: { passer: completionPasser, receiver: completionReceiver || undefined } });
    setCompletionOpen(false);
  }

  async function doInterception() {
    if (!interceptionPlayer || !interceptionAllowed) return;
    await appendEvent({ type: "interception", team: interceptionTeam, payload: { player: interceptionPlayer } });
    setInterceptionOpen(false);
  }

  async function doInjury() {
    if (!casualtyAllowed) return;
    if (injuryResult === "STAT" && !injuryStat) return;
    const causerRequired = causesWithCauser.has(cause);
    if (causerRequired && !causerPlayerId) return;
    const derivedAttackerTeam: TeamId = victimTeam === "A" ? "B" : "A";

    await appendEvent({
      type: "injury",
      team: causerRequired ? derivedAttackerTeam : undefined,
      payload: {
        victimTeam,
        victimPlayerId: victimPlayerId || undefined,
        cause,
        causerPlayerId: causerRequired ? causerPlayerId : undefined,
        injuryResult,
        stat: injuryResult === "STAT" ? injuryStat : undefined,
        apothecaryUsed: apoUsed,
        apothecaryOutcome: apoUsed ? apoOutcome : undefined,
      },
    });

    setInjuryOpen(false);
  }

  async function doNextTurn() {
    await appendEvent({ type: "next_turn" });
  }

  async function setTurn(turn: number) {
    await appendEvent({ type: "turn_set", payload: { half: d.half, turn } });
  }

  async function consumeResource(team: TeamId, kind: "reroll" | "apothecary") {
    if (kind === "reroll") return appendEvent({ type: "reroll_used", team });
    if (!canUseApothecary(guardContext, team)) return;
    return appendEvent({ type: "apothecary_used", team });
  }

  const rosters = useMemo(() => {
    const known = { A: new Set<string>(), B: new Set<string>() };
    for (const e of events) {
      if (e.type === "touchdown" && e.team && e.payload?.player) known[e.team].add(String(e.payload.player));
      if (e.type === "completion" && e.team && e.payload?.passer) known[e.team].add(String(e.payload.passer));
      if (e.type === "interception" && e.team && e.payload?.player) known[e.team].add(String(e.payload.player));
      if (e.type === "injury") {
        if (e.team && e.payload?.causerPlayerId) known[e.team].add(String(e.payload.causerPlayerId));
        const victimTeamId = e.payload?.victimTeam === "A" || e.payload?.victimTeam === "B" ? (e.payload.victimTeam as TeamId) : undefined;
        if (victimTeamId && e.payload?.victimPlayerId) known[victimTeamId].add(String(e.payload.victimPlayerId));
      }
    }

    const defaults = PLAYER_SLOTS.map((slot) => String(slot));
    const toRoster = (team: TeamId, teamName: string) => {
      const ids = known[team].size ? [...known[team]] : defaults;
      return ids.map((id) => ({ id, team, name: `${teamName} #${id}` }));
    };

    return { A: toRoster("A", d.teamNames.A), B: toRoster("B", d.teamNames.B) };
  }, [events, d.teamNames]);

  return {
    isReady,
    events,
    d,
    hasMatch,
    turnButtons,
    kickoffOptions,
    kickoffMapped,
    rosters,
    guards: { kickoffAllowed, touchdownAllowed, completionAllowed, interceptionAllowed, casualtyAllowed, apothecaryAllowed },
    touchdown: { open: tdOpen, setOpen: setTdOpen, team: tdTeam, setTeam: setTdTeam, player: tdPlayer, setPlayer: setTdPlayer, save: doTouchdown },
    completion: {
      open: completionOpen,
      setOpen: setCompletionOpen,
      team: completionTeam,
      setTeam: setCompletionTeam,
      passer: completionPasser,
      setPasser: setCompletionPasser,
      receiver: completionReceiver,
      setReceiver: setCompletionReceiver,
      save: doCompletion,
    },
    interception: {
      open: interceptionOpen,
      setOpen: setInterceptionOpen,
      team: interceptionTeam,
      setTeam: setInterceptionTeam,
      player: interceptionPlayer,
      setPlayer: setInterceptionPlayer,
      save: doInterception,
    },
    injury: {
      open: injuryOpen,
      setOpen: setInjuryOpen,
      victimTeam,
      setVictimTeam,
      victimPlayerId,
      setVictimPlayerId,
      cause,
      setCause,
      causerPlayerId,
      setCauserPlayerId,
      injuryResult,
      setInjuryResult,
      injuryStat,
      setInjuryStat,
      apoUsed,
      setApoUsed,
      apoOutcome,
      setApoOutcome,
      save: doInjury,
    },
    kickoff: {
      open: kickoffOpen,
      setOpen: setKickoffOpen,
      kickingTeam: kickoffKickingTeam,
      setKickingTeam: setKickoffKickingTeam,
      roll: kickoffRoll,
      setRoll: setKickoffRoll,
      message: kickoffMessage,
      setMessage: setKickoffMessage,
      newWeather: kickoffNewWeather,
      setNewWeather: setKickoffNewWeather,
      timeOutDelta,
      rockTargetTeam: kickoffRockTargetTeam,
      setRockTargetTeam: setKickoffRockTargetTeam,
      rockTargetPlayer: kickoffRockTargetPlayer,
      setRockTargetPlayer: setKickoffRockTargetPlayer,
      rockOutcome: kickoffRockOutcome,
      setRockOutcome: setKickoffRockOutcome,
      pitchInvasionA: kickoffPitchInvasionA,
      setPitchInvasionA: setKickoffPitchInvasionA,
      pitchInvasionB: kickoffPitchInvasionB,
      setPitchInvasionB: setKickoffPitchInvasionB,
      pitchInvasionNotes: kickoffPitchInvasionNotes,
      setPitchInvasionNotes: setKickoffPitchInvasionNotes,
      canRecord: kickoffAllowed && kickoffDetailRequirementsMet,
      timeOutEffectLabel: `Both teams: turn marker ${timeOutDelta > 0 ? "moved forward (+1)" : "moved back (-1)"}`,
      save: doKickoffEvent,
    },
    actions: {
      undoLast,
      doNextTurn,
      setTurn,
      consumeResource,
    },
  };
}
