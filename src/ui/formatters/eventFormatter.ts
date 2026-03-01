import type { MatchEvent, ApothecaryOutcome, InjuryResult, KickoffEventPayload } from "../../domain/events";
import type { DerivedMatchState } from "../../domain/projection";

type TeamNames = DerivedMatchState["teamNames"];

const titleCase = (value: string) => value.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (x) => x.toUpperCase());

const injuryResultLabel = (result?: InjuryResult, stat?: string) => {
  const labels: Partial<Record<InjuryResult, string>> = {
    BH: "Badly Hurt",
    MNG: "Miss Next Game",
    NIGGLING: "Niggling Injury",
    STAT: "Characteristic Reduction",
    DEAD: "Dead",
    OTHER: "Other",
  };

  if (!result) return "Other";
  if (result === "STAT" && stat) return `${labels[result]} (${stat})`;
  return labels[result] ?? titleCase(result);
};

const apothecaryOutcomeLabel = (outcome?: ApothecaryOutcome, stat?: string) => {
  const labels: Record<ApothecaryOutcome, string> = {
    RECOVERED: "Recovered",
    BH: "Badly Hurt",
    MNG: "Miss Next Game",
    DEAD: "Dead",
    STAT: "Characteristic Reduction",
  };

  if (!outcome) return "Used";
  if (outcome === "STAT" && stat) return `${labels[outcome]} (${stat})`;
  return labels[outcome];
};

const playerLabel = (value: unknown) => (value ? `Player ${String(value)}` : "Player ?");

const formatKickoffName = (payload: unknown) => {
  if (!payload || typeof payload !== "object") return "Unknown";
  const p = payload as Partial<KickoffEventPayload> & { result?: string };
  if (typeof p.kickoffLabel === "string" && p.kickoffLabel.trim()) return p.kickoffLabel;
  if (typeof p.result === "string" && p.result.trim()) return titleCase(p.result);
  return "Unknown";
};

export function formatEvent(e: MatchEvent, teamNames: TeamNames, _derived: DerivedMatchState): string {
  const eventTeam = e.team;
  const teamName = eventTeam === "A" || eventTeam === "B" ? teamNames[eventTeam] : undefined;
  const eventType = e.type as string;

  if (eventType === "touchdown") {
    return `Touchdown · ${teamName ?? "Unknown team"} · ${playerLabel(e.payload?.player)}`;
  }

  if (eventType === "completion") {
    return `Completion · ${teamName ?? "Unknown team"} · ${playerLabel(e.payload?.passer)}`;
  }

  if (eventType === "interception") {
    return `Interception · ${teamName ?? "Unknown team"} · ${playerLabel(e.payload?.player)}`;
  }

  if (eventType === "injury") {
    const victimTeamId = e.payload?.victimTeam;
    const victimTeam = victimTeamId === "A" ? teamNames.A : victimTeamId === "B" ? teamNames.B : "Unknown team";
    const victim = playerLabel(e.payload?.victimPlayerId ?? e.payload?.victimName);
    const finalResult = injuryResultLabel(e.payload?.injuryResult, e.payload?.stat);
    const apoText = e.payload?.apothecaryUsed ? ` · Apo → ${apothecaryOutcomeLabel(e.payload?.apothecaryOutcome, e.payload?.apothecaryStat)}` : "";
    return `${victimTeam} ${victim} · Casualty: ${finalResult}${apoText}`;
  }

  if (eventType === "kickoff" || eventType === "kickoff_event") {
    return `Kick-off: ${formatKickoffName(e.payload)}`;
  }

  if (eventType === "drive_start") return "Drive start";
  if (eventType === "match_start") return "Match start";

  return titleCase(eventType);
}
