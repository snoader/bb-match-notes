import { teamLabel } from "../../../store/matchStore";
import type { TeamId } from "../../../domain/enums";

type TeamNames = { A: string; B: string };
type Resources = { rerolls: number; apothecary: number };

type ResourcesPanelProps = {
  teamNames: TeamNames;
  resources: { A: Resources; B: Resources };
  hasMatch: boolean;
  canConsumeResources: boolean;
  canUseApothecary: { A: boolean; B: boolean };
  onConsumeResource: (team: TeamId, kind: "reroll" | "apothecary") => void;
};

export function ResourcesPanel({ teamNames, resources, hasMatch, canConsumeResources, canUseApothecary, onConsumeResource }: ResourcesPanelProps) {
  return (
    <div className="live-section">
      <div style={{ fontWeight: 900, marginBottom: 8 }}>Resources</div>
      <div className="live-resources-grid">
        {(["A", "B"] as TeamId[]).map((team) => (
          <div key={team} style={{ border: "1px solid #f0f0f0", borderRadius: 14, padding: 10, minWidth: 0 }}>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>{teamLabel(team, teamNames)}</div>
            <div className="live-resource-controls">
              {[
                { k: "reroll" as const, label: `Use Reroll (${resources[team].rerolls})`, show: true },
                { k: "apothecary" as const, label: `Use Apothecary (${resources[team].apothecary})`, show: canUseApothecary[team] },
              ]
                .filter((x) => x.show)
                .map((x) => (
                  <button
                    key={x.k}
                    onClick={() => onConsumeResource(team, x.k)}
                    className="live-resource-button"
                    style={{
                      borderRadius: 14,
                      border: "1px solid #ddd",
                      background: "#fafafa",
                      fontWeight: 800,
                    }}
                    disabled={!hasMatch || !canConsumeResources}
                  >
                    {x.label}
                  </button>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
