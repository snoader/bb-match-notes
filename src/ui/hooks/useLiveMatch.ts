import { useMemo, useState } from "react";
import { useMatchStore } from "../../store/matchStore";
import type {
  ApothecaryOutcome,
  InjuryCause,
  InjuryPayload,
  InjuryResult,
  StatReduction,
} from "../../domain/events";
import type { PlayerSlot, TeamId } from "../../domain/enums";
import { PLAYER_SLOTS } from "../../domain/enums";
import { buildPdfBlob, buildTxtReport } from "../../export/report";
import { deriveSppFromEvents } from "../../export/spp";
import { exportMatchJSON } from "../../export/json";
import { BB2025_KICKOFF_TABLE, mapKickoffRoll } from "../../rules/bb2025/kickoff";
import {
  canRecordCasualty,
  canRecordCompletion,
  canRecordInterception,
  canRecordTouchdown,
  canSelectKickoff,
} from "../../domain/eventGuards";

export const injuryCauses: InjuryCause[] = ["BLOCK", "FOUL", "SECRET_WEAPON", "CROWD", "FAILED_DODGE", "FAILED_GFI", "FAILED_PICKUP", "OTHER"];
export const injuryResults: InjuryResult[] = ["BH", "MNG", "NIGGLING", "STAT", "DEAD", "OTHER"];
export const statReductions: StatReduction[] = ["MA", "AV", "AG", "PA", "ST"];
export const apoOutcomes: ApothecaryOutcome[] = ["SAVED", "CHANGED_RESULT", "DIED_ANYWAY", "UNKNOWN"];
export const causesWithCauser = new Set<InjuryCause>(["BLOCK", "FOUL", "SECRET_WEAPON", "CROWD"]);

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
  const [injuryTeam, setInjuryTeam] = useState<TeamId>("A");
  const [victimTeam, setVictimTeam] = useState<TeamId>("B");
  const [victimPlayerId, setVictimPlayerId] = useState<PlayerSlot | "">("");
  const [cause, setCause] = useState<InjuryCause>("BLOCK");
  const [causerPlayerId, setCauserPlayerId] = useState<PlayerSlot | "">("");
  const [injuryResult, setInjuryResult] = useState<InjuryResult>("BH");
  const [injuryStat, setInjuryStat] = useState<StatReduction>("MA");
  const [apoUsed, setApoUsed] = useState(false);
  const [apoOutcome, setApoOutcome] = useState<ApothecaryOutcome>("SAVED");

  const [exportOpen, setExportOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<"txt" | "json" | "pdf" | null>(null);
  const [mvpOpen, setMvpOpen] = useState(false);
  const [mvpA, setMvpA] = useState("");
  const [mvpB, setMvpB] = useState("");

  const [kickoffOpen, setKickoffOpen] = useState(false);
  const [kickoffKickingTeam, setKickoffKickingTeam] = useState<TeamId>("A");
  const [kickoffRoll, setKickoffRoll] = useState(7);
  const [kickoffMessage, setKickoffMessage] = useState("");

  const kickoffMapped = useMemo(() => mapKickoffRoll(kickoffRoll), [kickoffRoll]);
  const kickoffOptions = useMemo(
    () =>
      Object.entries(BB2025_KICKOFF_TABLE).map(([roll, result]) => ({
        roll: Number(roll),
        ...result,
      })),
    [],
  );

  const turnButtons = [1, 2, 3, 4, 5, 6, 7, 8];

  const guardContext = useMemo(() => ({ state: d, recentEvents: events }), [d, events]);
  const kickoffAllowed = canSelectKickoff(guardContext);
  const touchdownAllowed = canRecordTouchdown(guardContext);
  const completionAllowed = canRecordCompletion(guardContext);
  const interceptionAllowed = canRecordInterception(guardContext);
  const casualtyAllowed = canRecordCasualty(guardContext);

  async function doKickoffEvent() {
    if (!kickoffAllowed) return;
    const clampedRoll = Math.max(2, Math.min(12, Math.round(kickoffRoll)));
    const mapped = mapKickoffRoll(clampedRoll);
    const receivingTeam = kickoffKickingTeam === "A" ? "B" : "A";

    await appendEvent({
      type: "kickoff_event",
      payload: {
        driveIndex: d.driveIndexCurrent,
        kickingTeam: kickoffKickingTeam,
        receivingTeam,
        roll2d6: clampedRoll,
        kickoffKey: mapped.key,
        kickoffLabel: mapped.label,
      },
    });

    setKickoffMessage("");
    setKickoffOpen(false);
  }

  async function doTouchdown() {
    if (!tdPlayer || !touchdownAllowed) return;
    await appendEvent({
      type: "touchdown",
      team: tdTeam,
      payload: { player: tdPlayer },
    });
    setTdOpen(false);
  }

  async function doCompletion() {
    if (!completionPasser || !completionAllowed) return;
    await appendEvent({
      type: "completion",
      team: completionTeam,
      payload: {
        passer: completionPasser,
        receiver: completionReceiver || undefined,
      },
    });
    setCompletionOpen(false);
  }

  async function doInterception() {
    if (!interceptionPlayer || !interceptionAllowed) return;
    await appendEvent({
      type: "interception",
      team: interceptionTeam,
      payload: { player: interceptionPlayer },
    });
    setInterceptionOpen(false);
  }

  async function doInjury() {
    if (!victimPlayerId || !casualtyAllowed) return;
    if (injuryResult === "STAT" && !injuryStat) return;
    const causerRequired = causesWithCauser.has(cause);
    if (causerRequired && !causerPlayerId) return;

    await appendEvent({
      type: "injury",
      team: injuryTeam,
      payload: {
        victimTeam,
        victimPlayerId,
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
    return appendEvent({ type: "apothecary_used", team });
  }

  function downloadBlob(filename: string, blob: Blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function shareOnly(filename: string, blob: Blob, title: string) {
    const file = new File([blob], filename, { type: blob.type });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ title, files: [file] });
      return;
    }
    downloadBlob(filename, blob);
  }

  function printBlob(blob: Blob) {
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank");
    if (win) {
      win.addEventListener("load", () => win.print());
    }
    setTimeout(() => URL.revokeObjectURL(url), 2000);
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

  async function buildExport(format: "txt" | "json" | "pdf", mvpSelections: Partial<Record<TeamId, string>> = {}) {
    const spp = deriveSppFromEvents(events, rosters, mvpSelections);

    if (format === "txt") {
      const txt = buildTxtReport({ events, teamNames: d.teamNames, score: d.score, summary: spp });
      return { filename: "bb-match-report.txt", blob: new Blob([txt], { type: "text/plain" }), title: "BB Match Notes TXT" };
    }

    if (format === "json") {
      const json = JSON.stringify(
        exportMatchJSON({
          events,
          derived: d,
          rosters,
          mvpSelections,
        }),
        null,
        2,
      );
      return { filename: "bb-match-report.json", blob: new Blob([json], { type: "application/json" }), title: "BB Match Notes JSON" };
    }

    const pdf = buildPdfBlob({ events, teamNames: d.teamNames, score: d.score, summary: spp });
    return { filename: "bb-match-report.pdf", blob: pdf, title: "BB Match Notes PDF" };
  }

  async function exportWithAction(format: "txt" | "json" | "pdf", action: "share" | "download" | "print", mvpSelections: Partial<Record<TeamId, string>> = {}) {
    const artifact = await buildExport(format, mvpSelections);
    if (action === "download") {
      downloadBlob(artifact.filename, artifact.blob);
      return;
    }
    if (action === "print") {
      printBlob(artifact.blob);
      return;
    }
    await shareOnly(artifact.filename, artifact.blob, artifact.title);
  }

  async function shareJSONQuick() {
    await exportWithAction("json", "share");
  }

  return {
    isReady,
    events,
    d,
    hasMatch,
    turnButtons,
    kickoffOptions,
    kickoffMapped,
    rosters,
    guards: { kickoffAllowed, touchdownAllowed, completionAllowed, interceptionAllowed, casualtyAllowed },
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
      team: injuryTeam,
      setTeam: setInjuryTeam,
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
      save: doKickoffEvent,
    },
    exportState: {
      open: exportOpen,
      setOpen: setExportOpen,
      format: exportFormat,
      setFormat: setExportFormat,
      mvpOpen,
      setMvpOpen,
      mvpA,
      setMvpA,
      mvpB,
      setMvpB,
    },
    actions: {
      undoLast,
      doNextTurn,
      setTurn,
      consumeResource,
      exportWithAction,
      shareJSONQuick,
    },
  };
}
