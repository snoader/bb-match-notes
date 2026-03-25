import type { ApothecaryOutcome, InjuryCause, InjuryResult, MatchEvent } from "../domain/events";
import { PLAYER_CAUSED_INJURY_CAUSES, normalizeInjuryPayload } from "../domain/events";
import type { TeamId } from "../domain/enums";
import { labelWeather } from "../domain/labels";
import { injuryCauseLabel, injuryResultLabel } from "../shared/formatters/labels";
import { displayTurn } from "../shared/formatters/turnDisplay";
import { formatEventText } from "../shared/formatters/formatEventText";
import { formatApothecaryOutcome, formatCasualtyResult, getFinalInjuryResult, isFinalCasualty } from "../shared/formatters/casualtyOutcome";
import type { SppPlayerSummary, SppSummary } from "./spp";
import { sortPlayersForTeam } from "./spp";

type TeamNames = { A: string; B: string };
type TeamFinalTreasuryDelta = {
  treasuryDelta: number;
  winningsDelta: number;
  breakdown: {
    base: number;
    touchdownsContribution: number;
    stallingAdjustment: number;
  };
};
type FinalTreasuryDelta = { A: TeamFinalTreasuryDelta; B: TeamFinalTreasuryDelta };

export type CasualtyRow = {
  victim: string;
  cause: string;
  result: string;
  apo: string;
};

const outcomeLabel = (outcome: InjuryResult | ApothecaryOutcome | undefined) => {
  if (!outcome) return "OTHER";
  if (outcome === "RECOVERED") return "Recovered";
  return injuryResultLabel(outcome);
};

type TimelineFormat = "text" | "markdown";

type TimelineRow = {
  marker: string;
  details: string;
};

type TimelineHeader =
  | { kind: "half"; text: string }
  | { kind: "turn"; text: string };

type TimelineEntry =
  | TimelineHeader
  | ({ kind: "event"; teamTurnKey?: string; event: MatchEvent } & TimelineRow);

type TimelineState = {
  half: number;
  turn: number;
  activeTeamId?: TeamId;
  teamTurnIndex: number;
  teamTurnSequence: number;
};

type PdfLine = {
  text: string;
  font?: "F1" | "F2";
  size?: number;
  x?: number;
  gray?: number;
  spacingBefore?: number;
  spacingAfter?: number;
  kind?: "half" | "turn" | "event";
};

type PdfTextStyle = {
  font?: "F1" | "F2";
  size?: number;
  gray?: number;
};

type PdfPageState = {
  ops: string[];
  y: number;
};

type SppSectionFormat = "text" | "markdown";

const SPP_REASON_ORDER = ["touchdown", "completion", "interception", "casualty", "mvp", "adjustment"] as const;

const SPP_REASON_LABEL: Record<(typeof SPP_REASON_ORDER)[number], string> = {
  touchdown: "TD",
  completion: "COMP",
  interception: "INT",
  casualty: "CAS",
  mvp: "MVP",
  adjustment: "ADJ",
};

function formatTimestamp(ts: number | undefined): string {
  if (typeof ts !== "number" || !Number.isFinite(ts)) return "—";
  const d = new Date(ts);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hour = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${min}`;
}

function buildTurnMarker(event: MatchEvent): string {
  return `T${displayTurn(event.half, event.turn)}/H${event.half}`;
}

function cloneTimelineState(state: TimelineState): TimelineState {
  return { ...state };
}

function nextActiveTeam(teamId?: TeamId): TeamId | undefined {
  return teamId === "A" ? "B" : teamId === "B" ? "A" : undefined;
}

function applyTimelineState(event: MatchEvent, state: TimelineState): TimelineState {
  const next = cloneTimelineState(state);

  if (event.type === "match_start") {
    next.half = event.half ?? 1;
    next.turn = event.turn ?? 1;
    next.activeTeamId = undefined;
    next.teamTurnIndex = 0;
    next.teamTurnSequence = 0;
    return next;
  }

  if (event.type === "turn_set" || event.type === "half_changed") {
    if (typeof event.payload?.half === "number") next.half = event.payload.half;
    if (typeof event.payload?.turn === "number") next.turn = event.payload.turn;
    if (event.payload?.activeTeamId === "A" || event.payload?.activeTeamId === "B") next.activeTeamId = event.payload.activeTeamId;
    if (typeof event.payload?.teamTurnIndex === "number") {
      next.teamTurnIndex = Math.max(0, Math.round(event.payload.teamTurnIndex));
      next.teamTurnSequence = next.teamTurnIndex;
    }
    return next;
  }

  if (event.type === "kickoff_event") {
    next.half = event.half;
    next.turn = event.turn;
    if (event.payload?.receivingTeam === "A" || event.payload?.receivingTeam === "B") {
      next.activeTeamId = event.payload.receivingTeam;
      next.teamTurnIndex = 1;
      next.teamTurnSequence = 1;
    }
    return next;
  }

  if (event.type === "next_turn") {
    next.teamTurnSequence += 1;
    next.teamTurnIndex = next.teamTurnSequence;
    const shouldAdvanceRound = next.teamTurnSequence > 1 && next.teamTurnSequence % 2 === 1;
    next.turn = shouldAdvanceRound ? Math.min(8, next.turn + 1) : next.turn;
    next.activeTeamId = nextActiveTeam(next.activeTeamId);
    return next;
  }

  if (event.type === "turnover") {
    next.teamTurnSequence += 1;
    next.teamTurnIndex = next.teamTurnSequence;
    const shouldAdvanceRound = next.teamTurnSequence > 1 && next.teamTurnSequence % 2 === 1;
    if (shouldAdvanceRound) {
      if (next.turn >= 8 && next.half < 2) {
        next.half += 1;
        next.turn = 1;
      } else {
        next.turn = Math.min(8, next.turn + 1);
      }
    }
    next.activeTeamId = nextActiveTeam(next.activeTeamId);
    return next;
  }

  if (event.type === "touchdown") {
    next.activeTeamId = undefined;
    next.teamTurnIndex = 0;
    next.teamTurnSequence = 0;
  }

  return next;
}

function timelineStateForEvent(event: MatchEvent, stateBefore: TimelineState): TimelineState {
  if (event.type === "kickoff_event" || event.type === "next_turn" || event.type === "turn_set" || event.type === "half_changed") {
    return applyTimelineState(event, stateBefore);
  }

  return stateBefore;
}

function buildTeamTurnLabel(state: TimelineState, teamNames: TeamNames): string | undefined {
  if (!state.activeTeamId) return undefined;
  return `Turn ${displayTurn(state.half, state.turn)} — ${teamNames[state.activeTeamId]}`;
}

function buildTimelineRow(event: MatchEvent, teamNames: TeamNames): TimelineRow {
  const marker = buildTurnMarker(event);
  const details = formatEventText(event, teamNames);

  return { marker, details };
}

function buildTimelineEntries(events: MatchEvent[], teamNames: TeamNames): TimelineEntry[] {
  const sorted = [...events].sort((a, b) => a.createdAt - b.createdAt);
  const entries: TimelineEntry[] = [];
  let state: TimelineState = { half: 1, turn: 1, activeTeamId: undefined, teamTurnIndex: 0, teamTurnSequence: 0 };
  let lastHalf: number | undefined;
  let lastTeamTurnKey: string | undefined;

  for (const event of sorted) {
    if (event.type === "match_start") {
      entries.push({ kind: "event", event, ...buildTimelineRow(event, teamNames) });
      state = applyTimelineState(event, state);
      continue;
    }

    const timelineState = timelineStateForEvent(event, state);
    const halfText = `Half ${timelineState.half}`;
    if (timelineState.activeTeamId && lastHalf !== timelineState.half) {
      entries.push({ kind: "half", text: halfText });
      lastHalf = timelineState.half;
      lastTeamTurnKey = undefined;
    }

    const teamTurnLabel = buildTeamTurnLabel(timelineState, teamNames);
    const teamTurnKey = teamTurnLabel ? `${timelineState.half}-${timelineState.turn}-${timelineState.activeTeamId}` : undefined;
    if (teamTurnLabel && teamTurnKey !== lastTeamTurnKey) {
      entries.push({ kind: "turn", text: teamTurnLabel });
      lastTeamTurnKey = teamTurnKey;
    }

    entries.push({ kind: "event", event, teamTurnKey, ...buildTimelineRow(event, teamNames) });
    state = applyTimelineState(event, state);
  }

  return entries;
}

function buildTimelineLine(entry: TimelineEntry, format: TimelineFormat): string {
  if (entry.kind === "half") {
    return format === "markdown" ? `### ${entry.text}` : `== ${entry.text} ==`;
  }

  if (entry.kind === "turn") {
    return format === "markdown" ? `- **${entry.text}**` : `-- ${entry.text} --`;
  }

  if (format === "markdown") {
    return `  - **${entry.marker}** — ${entry.details}`;
  }

  return `  [${entry.marker}] ${entry.details}`;
}

function formatSppSources(player: SppPlayerSummary): string {
  const parts = SPP_REASON_ORDER.flatMap((reason) => {
    const value = player.breakdown[reason];
    if (!value) return [];
    return `${SPP_REASON_LABEL[reason]} ${value}`;
  });

  return parts.join(", ");
}

function buildSppSectionLines(summary: SppSummary, teamNames: TeamNames, format: SppSectionFormat): string[] {
  return (["A", "B"] as TeamId[]).flatMap((team) => {
    const teamName = teamNames[team];
    const players = sortPlayersForTeam(summary, team);
    const heading = format === "markdown" ? `### ${teamName}` : `-- ${teamName} --`;
    const teamTotal = format === "markdown" ? `- **Team Total:** ${summary.teams[team]} SPP` : `Team Total: ${summary.teams[team]} SPP`;

    return [
      heading,
      teamTotal,
      ...(players.length
        ? players.map((player) => {
            const sources = formatSppSources(player);
            const suffix = sources ? ` [${sources}]` : "";
            return `- ${player.name}: ${player.spp} SPP${suffix}`;
          })
        : ["- no SPP entries"]),
      "",
    ];
  });
}

function formatSignedGold(delta: number): string {
  const sign = delta >= 0 ? "+" : "-";
  return `${sign}${Math.abs(Math.trunc(delta)).toLocaleString("en-US")} gp`;
}

function buildTreasuryDeltaSectionLines(finalTreasuryDelta: FinalTreasuryDelta, teamNames: TeamNames, format: SppSectionFormat): string[] {
  const heading = format === "markdown" ? "## Treasury Delta (Match Change Only)" : "== Treasury Delta (Match Change Only) ==";
  const subline =
    "Shows only the treasury change caused by this match (not the absolute treasury total).";

  return [
    heading,
    ...(format === "markdown" ? [`_${subline}_`] : [subline]),
    ...(format === "markdown" ? [""] : []),
    ...(["A", "B"] as TeamId[]).flatMap((team) => {
      const teamName = teamNames[team];
      const delta = finalTreasuryDelta[team];
      const teamHeader = format === "markdown" ? `### ${teamName}` : `-- ${teamName} --`;
      const totalLine =
        format === "markdown"
          ? `- **Final treasury delta:** ${formatSignedGold(delta.treasuryDelta)}`
          : `Final treasury delta: ${formatSignedGold(delta.treasuryDelta)}`;
      const winningsLine =
        format === "markdown"
          ? `- **Winnings delta:** ${formatSignedGold(delta.winningsDelta)}`
          : `Winnings delta: ${formatSignedGold(delta.winningsDelta)}`;
      const breakdownPrefix = format === "markdown" ? "- Breakdown:" : "Breakdown:";
      const baseLine = `base ${formatSignedGold(delta.breakdown.base)}`;
      const tdLine = `TD contribution ${formatSignedGold(delta.breakdown.touchdownsContribution)}`;
      const stallingLine = `stalling ${formatSignedGold(delta.breakdown.stallingAdjustment)}`;

      return [
        teamHeader,
        totalLine,
        winningsLine,
        breakdownPrefix,
        ...(format === "markdown" ? [`  - ${baseLine}`, `  - ${tdLine}`, `  - ${stallingLine}`] : [`- ${baseLine}`, `- ${tdLine}`, `- ${stallingLine}`]),
        "",
      ];
    }),
  ];
}

export function buildTimeline(events: MatchEvent[], teamNames: TeamNames, format: TimelineFormat): string[] {
  return buildTimelineEntries(events, teamNames).map((entry) => buildTimelineLine(entry, format));
}

export function buildCasualties(events: MatchEvent[]): CasualtyRow[] {
  return events
    .filter((e) => e.type === "injury")
    .map((e) => {
      const payload = normalizeInjuryPayload(e.payload);
      const finalOutcome = getFinalInjuryResult(payload);
      const baseOutcome = outcomeLabel(payload.injuryResult);

      return {
        victim: String(payload.victimPlayerId ?? payload.victimName ?? "?"),
        cause: injuryCauseLabel(e.payload?.cause),
        result: outcomeLabel(finalOutcome) + (payload.apothecaryUsed ? ` (base: ${baseOutcome})` : ""),
        apo: payload.apothecaryUsed ? formatApothecaryOutcome(payload).replace(/^\s+/, "") : "No",
      };
    });
}

export function buildTxtReport(params: {
  events: MatchEvent[];
  teamNames: TeamNames;
  score: Record<TeamId, number>;
  summary: SppSummary;
  finalTreasuryDelta: FinalTreasuryDelta;
}): string {
  const { events, teamNames, score, summary, finalTreasuryDelta } = params;
  const timeline = buildTimeline(events, teamNames, "text");
  const casualties = buildCasualties(events);

  return [
    `Match: ${teamNames.A} vs ${teamNames.B}`,
    `Score: ${score.A} - ${score.B}`,
    "",
    "== Timeline ==",
    ...timeline,
    "",
    "== Casualties ==",
    ...(casualties.length
      ? casualties.map((c) => `${c.victim} | ${c.cause} | ${c.result} | Apo: ${c.apo}`)
      : ["No casualties recorded"]),
    "",
    "== SPP Summary ==",
    ...buildSppSectionLines(summary, teamNames, "text"),
    "",
    ...buildTreasuryDeltaSectionLines(finalTreasuryDelta, teamNames, "text"),
  ].join("\n");
}

export function buildMarkdownReport(params: {
  events: MatchEvent[];
  teamNames: TeamNames;
  score: Record<TeamId, number>;
  summary: SppSummary;
  finalTreasuryDelta: FinalTreasuryDelta;
}): string {
  const { events, teamNames, score, summary, finalTreasuryDelta } = params;
  const timeline = buildTimeline(events, teamNames, "markdown");
  const casualties = buildCasualties(events);

  return [
    `# Match: ${teamNames.A} vs ${teamNames.B}`,
    "",
    `**Score:** ${score.A} - ${score.B}`,
    "",
    "## Timeline",
    ...(timeline.length ? timeline : ["No events recorded"]),
    "",
    "## Casualties",
    ...(casualties.length
      ? casualties.map((c) => `- ${c.victim} | ${c.cause} | ${c.result} | Apo: ${c.apo}`)
      : ["- No casualties recorded"]),
    "",
    "## SPP Summary",
    ...buildSppSectionLines(summary, teamNames, "markdown"),
    "",
    ...buildTreasuryDeltaSectionLines(finalTreasuryDelta, teamNames, "markdown"),
  ].join("\n");
}

function escapePdfText(input: string) {
  return input.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
}

function sanitizePdfText(input: string): string {
  const normalized = input
    .replaceAll("\u2014", "-")
    .replaceAll("\u2013", "-")
    .replaceAll("\u2022", "*")
    .replaceAll("\u271A", "+")
    .replaceAll("\u26A0", "!")
    .replaceAll("\u2026", "...");

  return normalized.replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "?");
}

function wrapPdfText(input: string, maxChars: number): string[] {
  if (input.length <= maxChars) return [input];

  const words = input.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }

  if (current) lines.push(current);
  return lines.length ? lines : [input];
}

function eventTag(event: MatchEvent): string {
  switch (event.type) {
    case "touchdown":
      return "TD";
    case "completion":
      return "COMP";
    case "interception":
      return "INT";
    case "injury":
      return "CAS";
    case "kickoff":
    case "kickoff_event":
      return "KO";
    case "weather_set":
      return "WEATHER";
    default:
      return "EVT";
  }
}

function buildTimelinePdf(params: {
  events: MatchEvent[];
  teamNames: TeamNames;
  score: Record<TeamId, number>;
  summary: SppSummary;
  finalTreasuryDelta: FinalTreasuryDelta;
}): string {
  const { events, teamNames, score, summary, finalTreasuryDelta } = params;
  const sorted = [...events].sort((a, b) => a.createdAt - b.createdAt);
  const matchStart = sorted.find((event) => event.type === "match_start")?.createdAt ?? sorted[0]?.createdAt;
  const matchEnd = sorted[sorted.length - 1]?.createdAt;
  const exportAt = Date.now();

  const initialWeather = (() => {
    const fromStart = sorted.find((event) => event.type === "match_start")?.payload?.weather;
    if (fromStart) return labelWeather(String(fromStart));
    const firstWeatherSet = sorted.find((event) => event.type === "weather_set")?.payload?.weather;
    return firstWeatherSet ? labelWeather(String(firstWeatherSet)) : "—";
  })();

  const winner = score.A === score.B ? "Draw" : score.A > score.B ? teamNames.A : teamNames.B;

  const sppBreakdown = (() => {
    const byPlayer = new Map<string, { td: number; comp: number; int: number; cas: number }>();
    const ensure = (id: string) => {
      if (!byPlayer.has(id)) byPlayer.set(id, { td: 0, comp: 0, int: 0, cas: 0 });
      return byPlayer.get(id)!;
    };

    for (const event of sorted) {
      if (event.type === "touchdown" && event.payload?.player) ensure(String(event.payload.player)).td += 1;
      if (event.type === "completion" && event.payload?.passer) ensure(String(event.payload.passer)).comp += 1;
      if (event.type === "interception" && event.payload?.player) ensure(String(event.payload.player)).int += 1;
      if (event.type === "injury" && event.payload?.causerPlayerId) {
        const payload = normalizeInjuryPayload(event.payload);
        if (!isFinalCasualty(payload)) continue;
        if (!PLAYER_CAUSED_INJURY_CAUSES.includes(payload.cause)) continue;
        ensure(String(payload.causerPlayerId)).cas += 1;
      }
    }

    return (["A", "B"] as TeamId[]).map((team) => {
      const players = sortPlayersForTeam(summary, team)
        .map((p) => {
          const stats = byPlayer.get(p.id) ?? { td: 0, comp: 0, int: 0, cas: 0 };
          return {
            player: p.name,
            td: stats.td,
            comp: stats.comp,
            int: stats.int,
            cas: stats.cas,
            mvp: p.mvp ? 1 : 0,
            total: p.spp,
          };
        })
        .filter((row) => row.total > 0);

      return { team, teamName: teamNames[team], total: summary.teams[team], players };
    });
  })();

  const postGameSppRows = sppBreakdown.flatMap((teamBlock) =>
    teamBlock.players.map((row) => ({
      player: row.player,
      teamName: teamBlock.teamName,
      td: row.td,
      comp: row.comp,
      int: row.int,
      cas: row.cas,
      mvp: row.mvp,
      total: row.total,
    })),
  );

  const casualtiesToRecord: { victim: string; teamName: string; causedBy: string; result: string; cause: InjuryCause }[] = sorted
    .filter((event) => event.type === "injury")
    .flatMap((event) => {
      const payload = normalizeInjuryPayload(event.payload);
      if (!isFinalCasualty(payload)) return [];
      const finalResult = getFinalInjuryResult(payload);
      const finalStat = finalResult === "STAT" ? (payload.apothecaryUsed ? payload.apothecaryStat : payload.stat) : undefined;
      return [
        {
          victim: payload.victimName ?? `#${String(payload.victimPlayerId ?? "?")}`,
          teamName: payload.victimTeam ? teamNames[payload.victimTeam] : "Unknown team",
          causedBy: payload.causerName ?? `#${String(payload.causerPlayerId ?? "?")}`,
          result: formatCasualtyResult(finalResult, finalStat),
          cause: payload.cause,
        },
      ];
    });

  const hatredRequired = casualtiesToRecord.filter((row) => row.cause === "BLOCK");
  const assignedMvpByTeam = (["A", "B"] as TeamId[])
    .map((team) => ({ teamName: teamNames[team], players: sortPlayersForTeam(summary, team).filter((p) => Boolean(p.mvp)) }))
    .filter((row) => row.players.length > 0);

  const logLines: PdfLine[] = [];
  for (const entry of buildTimelineEntries(sorted, teamNames)) {
    if (entry.kind === "half") {
      logLines.push({ text: entry.text, font: "F2", size: 12, spacingBefore: 8, spacingAfter: 2, kind: "half" });
      continue;
    }

    if (entry.kind === "turn") {
      logLines.push({ text: entry.text, font: "F2", size: 11, spacingBefore: 4, spacingAfter: 1, kind: "turn" });
      continue;
    }

    const prefix = `[${eventTag(entry.event)}] `;
    const eventLines = wrapPdfText(`${prefix}${entry.details}`, 88);
    logLines.push({ text: eventLines[0] ?? "", font: "F2", kind: "event" });
    for (const detail of eventLines.slice(1)) {
      logLines.push({ text: detail, x: 56, kind: "event" });
    }
  }

  const pageWidth = 595;
  const pageHeight = 842;
  const left = 42;
  const right = pageWidth - 42;
  const top = 802;
  const bottom = 48;
  const lineHeight = 13;
  const sectionGap = 22;

  const pages: PdfPageState[] = [{ ops: [], y: top }];
  const current = () => pages[pages.length - 1]!;
  const ensureSpace = (heightNeeded: number) => {
    if (current().y - heightNeeded < bottom) {
      pages.push({ ops: [], y: top });
    }
  };

  const pushText = (text: string, x: number, style: PdfTextStyle = {}) => {
    const pg = current();
    const cleanText = sanitizePdfText(text);
    pg.ops.push("BT");
    pg.ops.push(`/${style.font ?? "F1"} ${style.size ?? 10} Tf`);
    pg.ops.push(`${style.gray ?? 0} g`);
    pg.ops.push(`1 0 0 1 ${x} ${pg.y} Tm`);
    pg.ops.push(`(${escapePdfText(cleanText)}) Tj`);
    pg.ops.push("ET");
  };

  const textWidth = (text: string, size = 10) => sanitizePdfText(text).length * (size * 0.5);

  const pushCenteredText = (text: string, x: number, width: number, style: PdfTextStyle = {}) => {
    const size = style.size ?? 10;
    const offset = Math.max(0, (width - textWidth(text, size)) / 2);
    pushText(text, x + offset, style);
  };

  const pushLine = (line: PdfLine) => {
    const spacingBefore = line.spacingBefore ?? 0;
    const spacingAfter = line.spacingAfter ?? 0;
    const size = line.size ?? 10;
    const rowHeight = lineHeight + spacingBefore + spacingAfter;
    ensureSpace(rowHeight + (size > 11 ? 3 : 0));
    current().y -= spacingBefore;
    pushText(line.text, line.x ?? left, { font: line.font, size, gray: line.gray });
    current().y -= lineHeight + spacingAfter;
  };

  const rule = (gray = 0.35, width = 0.7) => {
    ensureSpace(8);
    const y = current().y;
    current().ops.push(`${gray} G`);
    current().ops.push(`${width} w`);
    current().ops.push(`${left} ${y} m ${right} ${y} l S`);
    current().y -= 10;
  };

  const dashedRule = (gray = 0.5, width = 0.6, dash = "[3 2]") => {
    ensureSpace(6);
    const y = current().y;
    current().ops.push(`${gray} G`);
    current().ops.push(`${width} w`);
    current().ops.push(`${dash} 0 d`);
    current().ops.push(`${left} ${y} m ${right} ${y} l S`);
    current().ops.push("[] 0 d");
    current().y -= 8;
  };

  const box = (x: number, y: number, w: number, h: number, fillGray = 0.95) => {
    current().ops.push(`${fillGray} g`);
    current().ops.push(`${x} ${y - h} ${w} ${h} re f`);
    current().ops.push("0.45 G");
    current().ops.push("0.5 w");
    current().ops.push(`${x} ${y - h} ${w} ${h} re S`);
  };

  ensureSpace(220);
  pushLine({ text: "BB Match Notes", font: "F2", size: 18, spacingAfter: 1 });
  pushLine({ text: "Match Report", font: "F2", size: 14, spacingAfter: 2 });
  rule(0.32, 0.9);

  const metaLabelX = left + 6;
  const metaValueX = left + 96;
  const metaLabelX2 = left + 286;
  const metaValueX2 = left + 386;
  pushLine({ text: "Teams", x: metaLabelX, font: "F2", size: 10.5 });
  pushLine({ text: `${teamNames.A} vs ${teamNames.B}`, x: metaValueX, size: 10.5 });
  pushLine({ text: "Final Score", x: metaLabelX2, font: "F2", size: 10.5, spacingBefore: -lineHeight });
  pushLine({ text: `${score.A} - ${score.B}`, x: metaValueX2, size: 10.5 });
  pushLine({ text: "Weather", x: metaLabelX, font: "F2", size: 10.5, spacingBefore: -lineHeight });
  pushLine({ text: initialWeather, x: metaValueX, size: 10.5 });
  pushLine({ text: "Match Start", x: metaLabelX2, font: "F2", size: 10.5, spacingBefore: -lineHeight });
  pushLine({ text: formatTimestamp(matchStart), x: metaValueX2, size: 10.5 });
  pushLine({ text: "Match End", x: metaLabelX, font: "F2", size: 10.5, spacingBefore: -lineHeight });
  pushLine({ text: formatTimestamp(matchEnd), x: metaValueX, size: 10.5 });
  pushLine({ text: "Report Generated", x: metaLabelX2, font: "F2", size: 10.5, spacingBefore: -lineHeight });
  pushLine({ text: formatTimestamp(exportAt), x: metaValueX2, size: 10.5, spacingAfter: 10 });

  pushLine({ text: "MATCH SUMMARY", font: "F2", size: 14, spacingAfter: 2 });
  rule();
  ensureSpace(72);
  box(left, current().y + 4, right - left, 56, 0.96);
  pushLine({ text: `Winner: ${winner}`, x: left + 10, font: "F2", size: 10.5 });
  pushLine({ text: `Final Score: ${score.A} - ${score.B}`, x: left + 10, size: 10.5 });
  pushLine({ text: `Weather: ${initialWeather}`, x: left + 10, size: 10.5, spacingAfter: sectionGap });

  pushLine({ text: "TREASURY DELTA (MATCH CHANGE ONLY)", font: "F2", size: 14, spacingAfter: 2 });
  rule();
  ensureSpace(108);
  box(left, current().y + 4, right - left, 92, 0.96);
  pushLine(
    {
      text: "Shows only the treasury change caused by this match (not absolute treasury totals).",
      x: left + 10,
      size: 9.5,
    },
  );
  (["A", "B"] as TeamId[]).forEach((team, index) => {
    const teamDelta = finalTreasuryDelta[team];
    const teamLineYBump = index === 0 ? 0 : 1;
    pushLine({ text: `${teamNames[team]}`, x: left + 10, font: "F2", size: 10, spacingBefore: teamLineYBump });
    pushLine({ text: `Final treasury delta: ${formatSignedGold(teamDelta.treasuryDelta)}`, x: left + 24, size: 9.5 });
    pushLine({ text: `Winnings delta: ${formatSignedGold(teamDelta.winningsDelta)}`, x: left + 24, size: 9.5 });
    pushLine(
      {
        text: `Base ${formatSignedGold(teamDelta.breakdown.base)} | TD ${formatSignedGold(teamDelta.breakdown.touchdownsContribution)} | Stalling ${formatSignedGold(teamDelta.breakdown.stallingAdjustment)}`,
        x: left + 24,
        size: 9.5,
        spacingAfter: 1,
      },
    );
  });
  current().y -= sectionGap - 8;

  pushLine({ text: "SPP SUMMARY", font: "F2", size: 14, spacingAfter: 2 });
  rule();

  const tableCols = [
    { x: left + 6, width: 230 },
    { x: left + 240, width: 40 },
    { x: left + 280, width: 50 },
    { x: left + 330, width: 40 },
    { x: left + 370, width: 40 },
    { x: left + 410, width: 40 },
    { x: left + 450, width: 56 },
  ];
  const drawSppTable = (teamBlock: { teamName: string; total: number; players: { player: string; td: number; comp: number; int: number; cas: number; mvp: number; total: number }[] }) => {
    const rowCount = Math.max(1, teamBlock.players.length);
    const tableHeight = 46 + rowCount * 14;
    ensureSpace(tableHeight + 8);
    pushLine({ text: `Team: ${teamBlock.teamName} (Total SPP: ${teamBlock.total})`, font: "F2", size: 11, spacingBefore: 4, spacingAfter: 2 });
    ensureSpace(24);
    const headerTop = current().y + 3;
    box(left, headerTop, right - left, 16, 0.9);
    pushText("Player", tableCols[0].x, { font: "F2", size: 10 });
    pushCenteredText("TD", tableCols[1].x, tableCols[1].width, { font: "F2", size: 10 });
    pushCenteredText("COMP", tableCols[2].x, tableCols[2].width, { font: "F2", size: 10 });
    pushCenteredText("INT", tableCols[3].x, tableCols[3].width, { font: "F2", size: 10 });
    pushCenteredText("CAS", tableCols[4].x, tableCols[4].width, { font: "F2", size: 10 });
    pushCenteredText("MVP", tableCols[5].x, tableCols[5].width, { font: "F2", size: 10 });
    pushCenteredText("TOTAL", tableCols[6].x, tableCols[6].width, { font: "F2", size: 10 });
    current().y -= 18;

    if (!teamBlock.players.length) {
      pushLine({ text: "No SPP entries", x: left + 10, gray: 0.4, spacingAfter: 3 });
      return;
    }

    for (const [index, row] of teamBlock.players.entries()) {
      ensureSpace(16);
      if (index % 2 === 1) {
        box(left, current().y + 2, right - left, 14, 0.97);
      }
      pushText(row.player, tableCols[0].x, { size: 10 });
      pushCenteredText(String(row.td), tableCols[1].x, tableCols[1].width, { size: 10 });
      pushCenteredText(String(row.comp), tableCols[2].x, tableCols[2].width, { size: 10 });
      pushCenteredText(String(row.int), tableCols[3].x, tableCols[3].width, { size: 10 });
      pushCenteredText(String(row.cas), tableCols[4].x, tableCols[4].width, { size: 10 });
      pushCenteredText(String(row.mvp), tableCols[5].x, tableCols[5].width, { size: 10 });
      pushCenteredText(String(row.total), tableCols[6].x, tableCols[6].width, { font: "F2", size: 10 });
      current().ops.push("0.85 G");
      current().ops.push("0.4 w");
      current().ops.push(`${left} ${current().y - 3} m ${right} ${current().y - 3} l S`);
      current().y -= 14;
    }
    pushLine({ text: "", spacingAfter: 2 });
  };

  sppBreakdown.forEach(drawSppTable);
  current().y -= sectionGap - 6;

  pushLine({ text: "POST-GAME ADMINISTRATION", font: "F2", size: 14, spacingAfter: 2 });
  rule();
  const sectionPaddingX = left + 10;

  pushLine({ text: "SPP ASSIGNMENT", x: sectionPaddingX, font: "F2", size: 11, spacingBefore: 4, spacingAfter: 1 });
  const adminSppCols = [
    { x: left + 12, width: 165 },
    { x: left + 178, width: 95 },
    { x: left + 273, width: 28 },
    { x: left + 301, width: 44 },
    { x: left + 345, width: 28 },
    { x: left + 373, width: 31 },
    { x: left + 404, width: 31 },
    { x: left + 435, width: 72 },
  ];
  const adminSppRowCount = Math.max(1, postGameSppRows.length);
  ensureSpace(40 + adminSppRowCount * 14);
  box(left + 6, current().y + 4, right - left - 12, 18 + adminSppRowCount * 14, 0.97);
  pushText("Player", adminSppCols[0].x, { font: "F2", size: 9.5 });
  pushText("Team", adminSppCols[1].x, { font: "F2", size: 9.5 });
  pushCenteredText("TD", adminSppCols[2].x, adminSppCols[2].width, { font: "F2", size: 9.5 });
  pushCenteredText("COMP", adminSppCols[3].x, adminSppCols[3].width, { font: "F2", size: 9.5 });
  pushCenteredText("INT", adminSppCols[4].x, adminSppCols[4].width, { font: "F2", size: 9.5 });
  pushCenteredText("CAS", adminSppCols[5].x, adminSppCols[5].width, { font: "F2", size: 9.5 });
  pushCenteredText("MVP", adminSppCols[6].x, adminSppCols[6].width, { font: "F2", size: 9.5 });
  pushCenteredText("TOTAL SPP", adminSppCols[7].x, adminSppCols[7].width, { font: "F2", size: 9.5 });
  current().y -= 16;
  if (!postGameSppRows.length) {
    pushLine({ text: "No SPP earned", x: sectionPaddingX, gray: 0.35, spacingAfter: 2 });
  } else {
    for (const row of postGameSppRows) {
      ensureSpace(15);
      pushText(row.player, adminSppCols[0].x, { size: 9.5 });
      pushText(row.teamName, adminSppCols[1].x, { size: 9.5 });
      pushCenteredText(String(row.td), adminSppCols[2].x, adminSppCols[2].width, { size: 9.5 });
      pushCenteredText(String(row.comp), adminSppCols[3].x, adminSppCols[3].width, { size: 9.5 });
      pushCenteredText(String(row.int), adminSppCols[4].x, adminSppCols[4].width, { size: 9.5 });
      pushCenteredText(String(row.cas), adminSppCols[5].x, adminSppCols[5].width, { size: 9.5 });
      pushCenteredText(String(row.mvp), adminSppCols[6].x, adminSppCols[6].width, { size: 9.5 });
      pushCenteredText(String(row.total), adminSppCols[7].x, adminSppCols[7].width, { font: "F2", size: 9.5 });
      current().y -= 14;
    }
  }

  pushLine({ text: "CASUALTIES TO RECORD", x: sectionPaddingX, font: "F2", size: 11, spacingBefore: 4, spacingAfter: 1 });
  ensureSpace(24 + Math.max(1, casualtiesToRecord.length) * 12);
  box(left + 6, current().y + 4, right - left - 12, 12 + Math.max(1, casualtiesToRecord.length) * 12, 0.97);
  if (!casualtiesToRecord.length) {
    pushLine({ text: "No casualties to record", x: sectionPaddingX, gray: 0.35, spacingAfter: 2 });
  } else {
    for (const row of casualtiesToRecord) {
      pushLine({ text: `${row.victim} | ${row.teamName} | ${row.causedBy} | ${row.result}`, x: sectionPaddingX, size: 9.5 });
    }
  }

  pushLine({ text: "HATRED ROLLS REQUIRED", x: sectionPaddingX, font: "F2", size: 11, spacingBefore: 4, spacingAfter: 1 });
  ensureSpace(24 + Math.max(1, hatredRequired.length) * 12);
  box(left + 6, current().y + 4, right - left - 12, 12 + Math.max(1, hatredRequired.length) * 12, 0.97);
  if (!hatredRequired.length) {
    pushLine({ text: "No hatred rolls required", x: sectionPaddingX, gray: 0.35, spacingAfter: 2 });
  } else {
    for (const row of hatredRequired) {
      pushLine({ text: `${row.causedBy} caused casualty by BLOCK`, x: sectionPaddingX, size: 9.5 });
    }
  }

  pushLine({ text: "MVP ASSIGNMENT", x: sectionPaddingX, font: "F2", size: 11, spacingBefore: 4, spacingAfter: 1 });
  const assignedMvpRows = assignedMvpByTeam.reduce((count, team) => count + 1 + team.players.length, 0);
  ensureSpace(24 + Math.max(1, assignedMvpRows) * 12);
  box(left + 6, current().y + 4, right - left - 12, 12 + Math.max(1, assignedMvpRows) * 12, 0.97);
  if (!assignedMvpByTeam.length) {
    pushLine({ text: "MVP to be assigned", x: sectionPaddingX, gray: 0.35, spacingAfter: 2 });
  } else {
    for (const teamRow of assignedMvpByTeam) {
      pushLine({ text: `Team ${teamRow.teamName}`, x: sectionPaddingX, font: "F2", size: 9.5 });
      for (const player of teamRow.players) {
        pushLine({ text: player.name, x: sectionPaddingX + 14, size: 9.5 });
      }
    }
  }

  pushLine({ text: "POST-GAME CHECKLIST", x: sectionPaddingX, font: "F2", size: 11, spacingBefore: 4, spacingAfter: 1 });
  ensureSpace(84);
  box(left + 6, current().y + 4, right - left - 12, 70, 0.96);
  pushLine({ text: "[ ] Record casualties", x: sectionPaddingX, size: 10 });
  pushLine({ text: "[ ] Apply SPP", x: sectionPaddingX, size: 10 });
  pushLine({ text: "[ ] Roll hatred (if required)", x: sectionPaddingX, size: 10 });
  pushLine({ text: "[ ] Assign MVP", x: sectionPaddingX, size: 10 });
  pushLine({ text: "[ ] Update roster", x: sectionPaddingX, size: 10, spacingAfter: 3 });
  current().y -= sectionGap - 12;

  pushLine({ text: "CHRONOLOGICAL MATCH LOG", font: "F2", size: 14, spacingAfter: 2 });
  rule();
  for (const line of logLines) {
    if (line.kind === "half") {
      rule(0.45, 0.8);
    }
    if (line.kind === "turn") {
      dashedRule();
    }
    pushLine(line);
  }

  const streams = pages.map((p) => p.ops.join("\n"));
  const objects: string[] = [];

  objects.push("1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj");
  objects.push("2 0 obj << /Type /Pages /Kids __KIDS__ /Count __COUNT__ >> endobj");
  objects.push("3 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj");
  objects.push("4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> endobj");

  const pageObjectNumbers: number[] = [];
  let nextObj = 5;
  for (const stream of streams) {
    const pageObj = nextObj;
    const contentObj = nextObj + 1;
    pageObjectNumbers.push(pageObj);
    objects.push(`${pageObj} 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents ${contentObj} 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> >> endobj`);
    objects.push(`${contentObj} 0 obj << /Length ${stream.length} >> stream\n${stream}\nendstream endobj`);
    nextObj += 2;
  }

  objects[1] = objects[1]
    .replace("__KIDS__", `[${pageObjectNumbers.map((n) => `${n} 0 R`).join(" ")}]`)
    .replace("__COUNT__", String(pageObjectNumbers.length));

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += `${obj}\n`;
  }
  const xrefPos = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i < offsets.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;
  return pdf;
}

export function buildPdfBlob(params: {
  events: MatchEvent[];
  teamNames: TeamNames;
  score: Record<TeamId, number>;
  summary: SppSummary;
  finalTreasuryDelta: FinalTreasuryDelta;
}): Blob {
  return new Blob([buildTimelinePdf(params)], { type: "application/pdf" });
}
