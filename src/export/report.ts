import type { ApothecaryOutcome, InjuryResult, MatchEvent } from "../domain/events";
import type { TeamId } from "../domain/enums";
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

export function buildTimeline(events: MatchEvent[], teamNames: TeamNames): string[] {
  return [...events]
    .sort((a, b) => a.createdAt - b.createdAt)
    .map((e) => {
      const team = e.team ? (e.team === "A" ? teamNames.A : teamNames.B) : "";
      const time = new Date(e.createdAt).toLocaleTimeString();
      const eventLabel = e.type === "injury" ? "Casualty" : e.type;
      const kickoffDetail = e.type === "kickoff_event" && e.payload ? formatKickoffExportDetail(e.payload) : undefined;
      const payloadText = e.payload ? JSON.stringify(e.payload) : "";
      return `[${time}] H${e.half} T${e.turn} ${eventLabel}${team ? ` · ${team}` : ""}${payloadText ? ` · ${payloadText}` : ""}${kickoffDetail ? ` · ${kickoffDetail}` : ""}`;
    });
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
        cause: String(e.payload?.cause ?? "OTHER"),
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
  const timeline = buildTimeline(events, teamNames);
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
  const timeline = buildTimeline(events, teamNames);
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

function buildVerySimplePdf(lines: string[]): string {
  const objects: string[] = [];
  const textOps: string[] = ["BT", "/F1 11 Tf", "50 792 Td", "14 TL"];

  lines.forEach((line, i) => {
    if (i > 0) textOps.push("T*");
    textOps.push(`(${escapePdfText(line)}) Tj`);
  });
  textOps.push("ET");

  const stream = textOps.join("\n");
  const obj1 = "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj";
  const obj2 = "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj";
  const obj3 = "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj";
  const obj4 = `4 0 obj << /Length ${stream.length} >> stream\n${stream}\nendstream endobj`;
  const obj5 = "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj";

  objects.push(obj1, obj2, obj3, obj4, obj5);

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
  const txt = buildTxtReport(params);
  const lines = txt.split("\n");
  return new Blob([buildVerySimplePdf(lines)], { type: "application/pdf" });
}
