import type { InjuryPayload, MatchEvent } from "../domain/events";
import type { TeamId } from "../domain/enums";

export type MatchStats = {
  score: Record<TeamId, number>;
  touchdowns: Record<TeamId, number>;
  completions: Record<TeamId, number>;
  interceptions: Record<TeamId, number>;
  casualties: Record<TeamId, { BH: number; MNG: number; NIGGLING: number; STAT: number; DEAD: number; OTHER: number }>;
  ko: number;
  foul: number;
  turnover: number;
  kickoff: number;
  resourcesUsed: Record<TeamId, { reroll: number; apothecary: number }>;
};

export function computeStats(events: MatchEvent[]): MatchStats {
  const s: MatchStats = {
    score: { A: 0, B: 0 },
    touchdowns: { A: 0, B: 0 },
    completions: { A: 0, B: 0 },
    interceptions: { A: 0, B: 0 },
    casualties: {
      A: { BH: 0, MNG: 0, NIGGLING: 0, STAT: 0, DEAD: 0, OTHER: 0 },
      B: { BH: 0, MNG: 0, NIGGLING: 0, STAT: 0, DEAD: 0, OTHER: 0 },
    },
    ko: 0,
    foul: 0,
    turnover: 0,
    kickoff: 0,
    resourcesUsed: {
      A: { reroll: 0, apothecary: 0 },
      B: { reroll: 0, apothecary: 0 },
    },
  };

  for (const e of events) {
    if (e.type === "touchdown" && e.team) {
      s.touchdowns[e.team] += 1;
      s.score[e.team] += 1;
    }

    if (e.type === "completion" && e.team) {
      s.completions[e.team] += 1;
    }

    if (e.type === "interception" && e.team) {
      s.interceptions[e.team] += 1;
    }

    if (e.type === "casualty" && e.team) {
      const r = (e.payload as any)?.result as "BH" | "SI" | "Dead" | undefined;
      if (r === "BH") s.casualties[e.team].BH += 1;
      if (r === "SI") s.casualties[e.team].MNG += 1;
      if (r === "Dead") s.casualties[e.team].DEAD += 1;
    }

    if (e.type === "injury") {
      const p = normalizeInjuryPayload(e.payload);
      const attacker = e.team;
      if (attacker) s.casualties[attacker][p.injuryResult] += 1;
    }

    if (e.type === "ko") s.ko += 1;
    if (e.type === "foul") s.foul += 1;
    if (e.type === "turnover") s.turnover += 1;
    if (e.type === "kickoff") s.kickoff += 1;

    if (e.type === "reroll_used" && e.team) s.resourcesUsed[e.team].reroll += 1;
    if (e.type === "apothecary_used" && e.team) s.resourcesUsed[e.team].apothecary += 1;
  }

  return s;
}

function normalizeInjuryPayload(payload: unknown): Required<Pick<InjuryPayload, "cause" | "injuryResult" | "apothecaryUsed">> & InjuryPayload {
  const p = (payload ?? {}) as InjuryPayload;
  return {
    ...p,
    cause: p.cause ?? "OTHER",
    injuryResult: p.injuryResult ?? "OTHER",
    apothecaryUsed: p.apothecaryUsed ?? false,
  };
}

function fmtTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function toTimelineText(events: MatchEvent[], teamNames: { A: string; B: string }) {
  const sorted = [...events].sort((a, b) => a.createdAt - b.createdAt);

  const lines: string[] = [];
  let currentGroup = "";

  for (const e of sorted) {
    const group = `Half ${e.half} · Turn ${e.turn}`;
    if (group !== currentGroup) {
      currentGroup = group;
      lines.push("");
      lines.push(`== ${group} ==`);
    }

    const team = e.team ? (e.team === "A" ? teamNames.A : teamNames.B) : "";
    const time = fmtTime(e.createdAt);

    let detail = "";
    if (e.type === "touchdown") {
      detail = `scorer=${(e.payload as any)?.player ?? "?"}`;
    } else if (e.type === "completion") {
      detail = `passer=${(e.payload as any)?.passer ?? "?"}`;
    } else if (e.type === "interception") {
      detail = `interceptor=${(e.payload as any)?.player ?? "?"}`;
    } else if (e.type === "casualty") {
      const p = (e.payload as any) ?? {};
      detail = `att=${p.attackerPlayer ?? "?"} vic=${p.victimPlayer ?? "?"} res=${p.result ?? "?"}`;
    } else if (e.type === "injury") {
      const p = normalizeInjuryPayload(e.payload);
      detail = `victim=${p.victimPlayerId ?? p.victimName ?? "?"} res=${p.injuryResult}${p.stat ? `(${p.stat})` : ""} cause=${p.cause} apo=${p.apothecaryUsed ? "yes" : "no"}`;
    } else if (e.type === "kickoff") {
      detail = `result=${(e.payload as any)?.result ?? "?"}`;
    } else if (e.type === "weather_set") {
      detail = `weather=${(e.payload as any)?.weather ?? "?"}`;
    } else if (e.type === "turn_set") {
      detail = `set-> H${(e.payload as any)?.half ?? "?"} T${(e.payload as any)?.turn ?? "?"}`;
    }

    const right = [team, detail].filter(Boolean).join(" · ");
    lines.push(`[${time}] ${e.type}${right ? " · " + right : ""}`);
  }

  return lines.join("\n").trim();
}

export function toStatsText(stats: MatchStats, teamNames: { A: string; B: string }) {
  const a = teamNames.A;
  const b = teamNames.B;

  return [
    "== SCORE ==",
    `${a}: ${stats.score.A}   |   ${b}: ${stats.score.B}`,
    "",
    "== TOUCHDOWNS ==",
    `${a}: ${stats.touchdowns.A}`,
    `${b}: ${stats.touchdowns.B}`,
    "",
    "== PASSES ==",
    `${a}: Completions ${stats.completions.A}, Interceptions ${stats.interceptions.A}`,
    `${b}: Completions ${stats.completions.B}, Interceptions ${stats.interceptions.B}`,
    "",
    "== CASUALTIES (by attacker team) ==",
    `${a}: BH ${stats.casualties.A.BH} / MNG ${stats.casualties.A.MNG} / Niggling ${stats.casualties.A.NIGGLING} / Stat ${stats.casualties.A.STAT} / Dead ${stats.casualties.A.DEAD} / Other ${stats.casualties.A.OTHER}`,
    `${b}: BH ${stats.casualties.B.BH} / MNG ${stats.casualties.B.MNG} / Niggling ${stats.casualties.B.NIGGLING} / Stat ${stats.casualties.B.STAT} / Dead ${stats.casualties.B.DEAD} / Other ${stats.casualties.B.OTHER}`,
    "",
    "== OTHER ==",
    `Kickoffs: ${stats.kickoff}`,
    `KO: ${stats.ko}`,
    `Foul: ${stats.foul}`,
    `Turnover: ${stats.turnover}`,
    "",
    "== RESOURCES USED ==",
    `${a}: Reroll ${stats.resourcesUsed.A.reroll}, Apo ${stats.resourcesUsed.A.apothecary}`,
    `${b}: Reroll ${stats.resourcesUsed.B.reroll}, Apo ${stats.resourcesUsed.B.apothecary}`,
  ].join("\n");
}
