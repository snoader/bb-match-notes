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
  spacingBefore?: number;
  spacingAfter?: number;
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
  logLines.push({ text: "Match start", font: "F2" });
  logLines.push({ text: `Initial weather: ${initialWeather}`, x: 56 });

  let lastHalf: number | undefined;
  let lastTurn: number | undefined;
  for (const event of sorted) {
    if (event.type === "match_start") continue;

    if (event.half !== lastHalf) {
      logLines.push({ text: `━━━━━━━━━━ Half ${event.half} ━━━━━━━━━━`, font: "F2", spacingBefore: 4, spacingAfter: 2 });
      lastHalf = event.half;
      lastTurn = undefined;
    }

    if (event.turn !== lastTurn) {
      logLines.push({ text: `- - - - Turn ${displayTurn(event.half, event.turn)} - - - -`, spacingBefore: 2 });
      lastTurn = event.turn;
    }

    if (event.type === "kickoff" || event.type === "kickoff_event") {
      const kickoffKey = event.payload?.kickoffKey ?? event.payload?.result ?? event.payload?.kickoffLabel;
      logLines.push({ text: `Kick-off — ${kickoffKey ? labelKickoff(String(kickoffKey)) : "Unknown"}`, font: "F2" });

      if (event.payload?.kickoffKey === "CHANGING_WEATHER" && event.payload?.details?.newWeather) {
        logLines.push({ text: `Weather change: ${labelWeather(String(event.payload.details.newWeather))}`, x: 56 });
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

    const eventLines = wrapPdfText(formatEventText(event, teamNames), 92);
    logLines.push({ text: eventLines[0] ?? "", font: "F2" });
    for (const detail of eventLines.slice(1)) {
      logLines.push({ text: detail, x: 56 });
    }
  }

  const allLines: PdfLine[] = [
    { text: "BB Match Notes — Match Report", font: "F2", size: 16 },
    { text: `${teamNames.A} vs ${teamNames.B}`, font: "F2", size: 12, spacingAfter: 2 },
    { text: `Final score: ${score.A} - ${score.B}` },
    { text: `Weather: ${initialWeather}` },
    { text: `Match start: ${formatTimestamp(matchStart)}` },
    { text: `Match end: ${formatTimestamp(matchEnd)}` },
    { text: `Exported: ${formatTimestamp(exportAt)}`, spacingAfter: 5 },

    { text: "MATCH SUMMARY", font: "F2", size: 12 },
    { text: `Winner / draw: ${winner}` },
    { text: `Final score: ${score.A} - ${score.B}` },
    { text: `Weather: ${initialWeather}`, spacingAfter: 4 },

    { text: "SPP SUMMARY", font: "F2", size: 12 },
    ...sppBreakdown.flatMap((teamBlock) => {
      const lines: PdfLine[] = [
        { text: `${teamBlock.teamName} (Total SPP: ${teamBlock.total})`, font: "F2" },
        { text: "Player | TD | COMP | INT | CAS | MVP | TOTAL", x: 52 },
      ];
      if (!teamBlock.players.length) {
        lines.push({ text: "No SPP entries", x: 56, spacingAfter: 2 });
        return lines;
      }

      for (const row of teamBlock.players) {
        lines.push({ text: `${row.player} | ${row.td} | ${row.comp} | ${row.int} | ${row.cas} | ${row.mvp} | ${row.total}`, x: 56 });
      }
      lines.push({ text: "", spacingAfter: 1 });
      return lines;
    }),

    { text: "Post-game actions required", font: "F2", size: 12 },
    ...(postGameActions.length
      ? postGameActions.flatMap((action) => [
          { text: `• ${action.title}`, x: 52 },
          { text: `  ${action.detail}`, x: 56 },
          ...(action.hatred ? [{ text: "  Hatred roll required (casualty caused by Block)", x: 56 }] : []),
        ])
      : [{ text: "No casualty actions pending", x: 52 }]),

    { text: "", spacingAfter: 2 },
    { text: "CHRONOLOGICAL MATCH LOG", font: "F2", size: 12 },
    ...logLines,
  ];

  const textOps: string[] = [];
  const left = 42;
  const top = 802;
  const lineHeight = 13;
  let y = top;

  const pushLine = (line: PdfLine) => {
    y -= line.spacingBefore ?? 0;
    textOps.push("BT");
    textOps.push(`/${line.font ?? "F1"} ${line.size ?? 10} Tf`);
    textOps.push(`1 0 0 1 ${line.x ?? left} ${y} Tm`);
    textOps.push(`(${escapePdfText(line.text)}) Tj`);
    textOps.push("ET");
    y -= lineHeight + (line.spacingAfter ?? 0);
  };

  for (const line of allLines) {
    pushLine(line);
  }

  const stream = textOps.join("\n");
  const objects: string[] = [];
  const obj1 = "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj";
  const obj2 = "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj";
  const obj3 = "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >> endobj";
  const obj4 = `4 0 obj << /Length ${stream.length} >> stream\n${stream}\nendstream endobj`;
  const obj5 = "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj";
  const obj6 = "6 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> endobj";
  objects.push(obj1, obj2, obj3, obj4, obj5, obj6);

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
