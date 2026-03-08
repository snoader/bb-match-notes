import type { ApothecaryOutcome, InjuryResult, MatchEvent } from "../domain/events";
import { PLAYER_CAUSED_INJURY_CAUSES, normalizeInjuryPayload } from "../domain/events";
import type { TeamId } from "../domain/enums";
import { labelKickoff, labelWeather } from "../domain/labels";
import { injuryCauseLabel, injuryResultLabel } from "../shared/formatters/labels";
import { displayTurn } from "../shared/formatters/turnDisplay";
import { formatEventText } from "../shared/formatters/formatEventText";
import { formatApothecaryOutcome, formatCasualtyResult, getFinalInjuryResult, isFinalCasualty } from "../shared/formatters/casualtyOutcome";
import type { SppSummary } from "./spp";
import { sortPlayersForTeam } from "./spp";

type TeamNames = { A: string; B: string };

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

type PdfLine = {
  text: string;
  font?: "F1" | "F2";
  size?: number;
  x?: number;
  gray?: number;
  spacingBefore?: number;
  spacingAfter?: number;
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

function buildTimelineRow(event: MatchEvent, teamNames: TeamNames): TimelineRow {
  const marker = buildTurnMarker(event);
  const details = formatEventText(event, teamNames);

  return { marker, details };
}

function buildTimelineLine(event: MatchEvent, teamNames: TeamNames, format: TimelineFormat): string {
  const { marker, details } = buildTimelineRow(event, teamNames);

  if (format === "markdown") {
    return `**${marker}** — ${details}`;
  }

  return `[${marker}] ${details}`;
}

export function buildTimeline(events: MatchEvent[], teamNames: TeamNames, format: TimelineFormat): string[] {
  return [...events]
    .sort((a, b) => a.createdAt - b.createdAt)
    .map((event) => buildTimelineLine(event, teamNames, format));
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
}): string {
  const { events, teamNames, score, summary } = params;
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
    ...(["A", "B"] as TeamId[]).flatMap((team) => {
      const teamName = teamNames[team];
      const players = sortPlayersForTeam(summary, team);
      return [
        `${teamName} (Total ${summary.teams[team]} SPP)`,
        ...(players.length ? players.map((p) => `- ${p.name}: ${p.spp}${p.mvp ? " (MVP)" : ""}`) : ["- no SPP entries"]),
      ];
    }),
  ].join("\n");
}

export function buildMarkdownReport(params: {
  events: MatchEvent[];
  teamNames: TeamNames;
  score: Record<TeamId, number>;
  summary: SppSummary;
}): string {
  const { events, teamNames, score, summary } = params;
  const timeline = buildTimeline(events, teamNames, "markdown");
  const casualties = buildCasualties(events);

  return [
    `# Match: ${teamNames.A} vs ${teamNames.B}`,
    "",
    `**Score:** ${score.A} - ${score.B}`,
    "",
    "## Timeline",
    ...(timeline.length ? timeline.map((line) => `- ${line}`) : ["- No events recorded"]),
    "",
    "## Casualties",
    ...(casualties.length
      ? casualties.map((c) => `- ${c.victim} | ${c.cause} | ${c.result} | Apo: ${c.apo}`)
      : ["- No casualties recorded"]),
    "",
    "## SPP Summary",
    ...(["A", "B"] as TeamId[]).flatMap((team) => {
      const teamName = teamNames[team];
      const players = sortPlayersForTeam(summary, team);
      return [
        `### ${teamName} (Total ${summary.teams[team]} SPP)`,
        ...(players.length ? players.map((p) => `- ${p.name}: ${p.spp}${p.mvp ? " (MVP)" : ""}`) : ["- no SPP entries"]),
      ];
    }),
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
}): string {
  const { events, teamNames, score, summary } = params;
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

  const postGameActions = sorted
    .filter((event) => event.type === "injury")
    .map((event) => {
      const payload = normalizeInjuryPayload(event.payload);
      if (!isFinalCasualty(payload)) return undefined;
      const finalResult = getFinalInjuryResult(payload);
      const finalStat = finalResult === "STAT" ? (payload.apothecaryUsed ? payload.apothecaryStat : payload.stat) : undefined;
      const player = payload.victimName ?? `#${String(payload.victimPlayerId ?? "?")}`;
      const teamName = payload.victimTeam ? teamNames[payload.victimTeam] : "Unknown team";
      const hatred = payload.cause === "BLOCK";
      return {
        title: `${player} — ${teamName}`,
        detail: `record casualty: ${formatCasualtyResult(finalResult, finalStat)}`,
        hatred,
      };
    })
    .filter((item): item is { title: string; detail: string; hatred: boolean } => Boolean(item));

  const logLines: PdfLine[] = [];
  logLines.push({ text: "[KO] Match start", font: "F2" });
  logLines.push({ text: `Weather: ${initialWeather}`, x: 56, gray: 0.35 });

  let lastHalf: number | undefined;
  let lastTurn: number | undefined;
  for (const event of sorted) {
    if (event.type === "match_start") continue;

    if (event.half !== lastHalf) {
      logLines.push({ text: `Half ${event.half}`, font: "F2", size: 12, spacingBefore: 8, spacingAfter: 2 });
      lastHalf = event.half;
      lastTurn = undefined;
    }

    if (event.turn !== lastTurn) {
      logLines.push({ text: `Turn ${displayTurn(event.half, event.turn)}`, font: "F2", size: 11, spacingBefore: 4, spacingAfter: 1 });
      lastTurn = event.turn;
    }

    if (event.type === "kickoff" || event.type === "kickoff_event") {
      const kickoffKey = event.payload?.kickoffKey ?? event.payload?.result ?? event.payload?.kickoffLabel;
      logLines.push({ text: `[KO] ${kickoffKey ? labelKickoff(String(kickoffKey)) : "Unknown"}`, font: "F2" });

      if (event.payload?.kickoffKey === "CHANGING_WEATHER" && event.payload?.details?.newWeather) {
        logLines.push({ text: `Weather: ${labelWeather(String(event.payload.details.newWeather))}`, x: 56 });
      }
      if (event.payload?.kickoffKey === "TIME_OUT" && typeof event.payload?.details?.appliedDelta === "number") {
        const delta = event.payload.details.appliedDelta;
        logLines.push({ text: `Time-Out shift: ${delta > 0 ? "+" : ""}${delta} turn`, x: 56 });
      }
      if (event.payload?.kickoffKey === "THROW_A_ROCK") {
        const target = event.payload?.details?.targetPlayer ? `#${event.payload.details.targetPlayer}` : "?";
        const targetTeam = event.payload?.details?.targetTeam as unknown;
        const team = targetTeam === "A" || targetTeam === "B" ? teamNames[targetTeam] : "Unknown team";
        logLines.push({ text: `Rock target: ${team} ${target}`, x: 56 });
      }
      if (event.payload?.kickoffKey === "PITCH_INVASION") {
        logLines.push({ text: `Pitch Invasion: A ${event.payload?.details?.affectedA ?? "?"}, B ${event.payload?.details?.affectedB ?? "?"}`, x: 56 });
      }
      continue;
    }

    const eventLines = wrapPdfText(`[${eventTag(event)}] ${formatEventText(event, teamNames)}`, 88);
    logLines.push({ text: eventLines[0] ?? "", font: "F2" });
    for (const detail of eventLines.slice(1)) {
      logLines.push({ text: detail, x: 56 });
    }
  }

  const pageWidth = 595;
  const pageHeight = 842;
  const left = 42;
  const right = pageWidth - 42;
  const top = 802;
  const bottom = 48;
  const lineHeight = 13;

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

  const box = (x: number, y: number, w: number, h: number, fillGray = 0.95) => {
    current().ops.push(`${fillGray} g`);
    current().ops.push(`${x} ${y - h} ${w} ${h} re f`);
    current().ops.push("0.45 G");
    current().ops.push("0.5 w");
    current().ops.push(`${x} ${y - h} ${w} ${h} re S`);
  };

  pushLine({ text: "HEADER", font: "F2", size: 15, spacingAfter: 2 });
  rule(0.3, 1);
  pushLine({ text: "BB Match Notes - Match Report", font: "F2", size: 14, spacingAfter: 3 });
  pushLine({ text: `Teams: ${teamNames.A} vs ${teamNames.B}`, font: "F2", size: 10.5 });
  pushLine({ text: `Final Score: ${score.A} - ${score.B}`, x: 310, size: 10.5 });
  pushLine({ text: `Weather: ${initialWeather}`, size: 10.5 });
  pushLine({ text: `Match Start: ${formatTimestamp(matchStart)}`, x: 310, size: 10.5 });
  pushLine({ text: `Match End: ${formatTimestamp(matchEnd)}`, size: 10.5 });
  pushLine({ text: `Exported: ${formatTimestamp(exportAt)}`, x: 310, size: 10.5, spacingAfter: 8 });

  pushLine({ text: "MATCH SUMMARY", font: "F2", size: 14, spacingAfter: 2 });
  rule();
  pushLine({ text: `Winner / draw: ${winner}` });
  pushLine({ text: `Final score: ${score.A} - ${score.B}` });
  pushLine({ text: `Starting weather: ${initialWeather}`, spacingAfter: 10 });

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
    pushLine({ text: `${teamBlock.teamName} (Total SPP: ${teamBlock.total})`, font: "F2", size: 11, spacingBefore: 4, spacingAfter: 2 });
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

  pushLine({ text: "POST-GAME ACTIONS", font: "F2", size: 14, spacingAfter: 2 });
  rule();
  const actionRows = Math.max(1, postGameActions.length * 2 + postGameActions.filter((a) => a.hatred).length);
  ensureSpace(18 + actionRows * 14);
  box(left, current().y + 4, right - left, 12 + actionRows * 14, 0.96);
  if (postGameActions.length) {
    for (const action of postGameActions) {
      pushLine({ text: `* ${action.title}`, x: left + 10, font: "F2", size: 10.5 });
      pushLine({ text: action.detail, x: left + 26, size: 10 });
      if (action.hatred) pushLine({ text: "! Hatred roll required (casualty caused by Block)", x: left + 26, size: 10, gray: 0.25 });
    }
  } else {
    pushLine({ text: "No casualty actions pending", x: left + 10, gray: 0.35 });
  }
  current().y -= 6;

  pushLine({ text: "CHRONOLOGICAL MATCH LOG", font: "F2", size: 14, spacingAfter: 2 });
  rule();
  for (const line of logLines) {
    if (line.text.startsWith("Half ")) {
      rule(0.45, 0.8);
    }
    if (line.text.startsWith("Turn ")) {
      current().ops.push("0.55 G");
      current().ops.push("0.5 w");
      current().ops.push(`${left} ${current().y + 4} m ${right} ${current().y + 4} l S`);
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
}): Blob {
  return new Blob([buildTimelinePdf(params)], { type: "application/pdf" });
}
