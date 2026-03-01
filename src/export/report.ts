import { formatInjuryCauseForDisplay, type ApothecaryOutcome, type InjuryResult, type MatchEvent } from "../domain/events";
import type { TeamId } from "../domain/enums";
import { displayTurn } from "../ui/formatters/turnDisplay";
import type { SppSummary } from "./spp";
import { formatKickoffExportDetail } from "./kickoffDetails";
import { finalInjuryOutcome, sortPlayersForTeam } from "./spp";

type TeamNames = { A: string; B: string };

export type CasualtyRow = {
  victim: string;
  cause: string;
  result: string;
  apo: string;
};

const outcomeLabel = (outcome: InjuryResult | ApothecaryOutcome | undefined) => {
  const labels: Partial<Record<InjuryResult | ApothecaryOutcome, string>> = {
    RECOVERED: "Recovered",
    BH: "Badly Hurt",
    MNG: "Miss Next Game",
    DEAD: "Dead",
    STAT: "Characteristic Reduction",
  };

  if (!outcome) return "OTHER";
  return labels[outcome] ?? String(outcome);
};

type TimelineFormat = "text" | "markdown";

type TimelineRow = {
  marker: string;
  details: string;
};

function formatEventLabel(type: MatchEvent["type"]): string {
  if (type === "injury") return "Casualty";
  return type
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildTurnMarker(event: MatchEvent): string {
  return `T${displayTurn(event.half, event.turn)}/H${event.half}`;
}

function buildTimelineRow(event: MatchEvent, teamNames: TeamNames): TimelineRow {
  const team = event.team ? (event.team === "A" ? teamNames.A : teamNames.B) : "";
  const eventLabel = formatEventLabel(event.type);
  const kickoffDetail = event.type === "kickoff_event" && event.payload ? formatKickoffExportDetail(event.payload) : undefined;
  const payloadText =
    event.type === "injury"
      ? JSON.stringify({
          ...(event.payload ?? {}),
          cause: formatInjuryCauseForDisplay(event.payload?.cause),
        })
      : event.payload
        ? JSON.stringify(event.payload)
        : "";
  const marker = buildTurnMarker(event);
  const details = [eventLabel, team, payloadText, kickoffDetail].filter(Boolean).join(" · ");

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
      const finalOutcome = finalInjuryOutcome(e.payload);
      const baseOutcome = outcomeLabel(e.payload?.injuryResult);
      const apoSummary = e.payload?.apothecaryUsed
        ? e.payload?.apothecaryOutcome === "RECOVERED"
          ? "Saved by Apothecary"
          : `Apo -> ${outcomeLabel(e.payload?.apothecaryOutcome)}`
        : "No";

      return {
        victim: String(e.payload?.victimPlayerId ?? e.payload?.victimName ?? "?"),
        cause: formatInjuryCauseForDisplay(e.payload?.cause),
        result: outcomeLabel(finalOutcome) + (e.payload?.apothecaryUsed ? ` (base: ${baseOutcome})` : ""),
        apo: apoSummary,
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
  const timelineRows = sorted.map((event) => buildTimelineRow(event, teamNames));
  const casualties = buildCasualties(events);

  const textOps: string[] = [];
  const left = 42;
  const top = 802;
  const lineHeight = 14;
  const badgeWidth = 68;
  const detailsX = left + badgeWidth + 10;
  let y = top;

  const pushLine = (font: "F1" | "F2", size: number, x: number, text: string) => {
    textOps.push("BT");
    textOps.push(`/${font} ${size} Tf`);
    textOps.push(`1 0 0 1 ${x} ${y} Tm`);
    textOps.push(`(${escapePdfText(text)}) Tj`);
    textOps.push("ET");
    y -= lineHeight;
  };

  pushLine("F2", 14, left, `Match: ${teamNames.A} vs ${teamNames.B}`);
  pushLine("F1", 11, left, `Score: ${score.A} - ${score.B}`);
  y -= 4;
  pushLine("F2", 12, left, "Timeline");

  for (const row of timelineRows) {
    pushLine("F2", 10, left, row.marker);
    const detailsLines = wrapPdfText(row.details, 75);
    for (const [index, detailLine] of detailsLines.entries()) {
      pushLine("F1", 10, detailsX, detailLine);
      if (index === detailsLines.length - 1) {
        y -= 1;
      }
    }
  }

  y -= 4;
  pushLine("F2", 12, left, "Casualties");
  if (casualties.length === 0) {
    pushLine("F1", 10, left, "No casualties recorded");
  } else {
    for (const casualty of casualties) {
      const line = `${casualty.victim} | ${casualty.cause} | ${casualty.result} | Apo: ${casualty.apo}`;
      for (const wrapped of wrapPdfText(line, 92)) {
        pushLine("F1", 10, left, wrapped);
      }
    }
  }

  y -= 4;
  pushLine("F2", 12, left, "SPP Summary");
  for (const team of ["A", "B"] as TeamId[]) {
    const teamName = teamNames[team];
    const players = sortPlayersForTeam(summary, team);
    pushLine("F2", 10, left, `${teamName} (Total ${summary.teams[team]} SPP)`);
    if (!players.length) {
      pushLine("F1", 10, left + 12, "- no SPP entries");
      continue;
    }

    for (const player of players) {
      pushLine("F1", 10, left + 12, `- ${player.name}: ${player.spp}${player.mvp ? " (MVP)" : ""}`);
    }
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
