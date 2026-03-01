import { teamLabel } from "../../../store/matchStore";
import type { TeamId } from "../../../domain/enums";

type TeamNames = { A: string; B: string };
type Resources = { rerolls: number; apothecary: number };

type ResourcesPanelProps = {
  teamNames: TeamNames;
  resources: { A: Resources; B: Resources };
  startingRerolls: { A: number; B: number };
  hasMatch: boolean;
  canConsumeResources: boolean;
  canUseApothecary: { A: boolean; B: boolean };
  onConsumeResource: (team: TeamId, kind: "reroll" | "apothecary") => void;
};

export function ResourcesPanel({ teamNames, resources, startingRerolls, hasMatch, canConsumeResources, canUseApothecary, onConsumeResource }: ResourcesPanelProps) {
  return (
    <div className="live-section">
      <div style={{ fontWeight: 900, marginBottom: 8 }}>Resources</div>
      <div className="live-resources-grid">
        {(["A", "B"] as TeamId[]).map((team) => (
          <div key={team} style={{ border: "1px solid #f0f0f0", borderRadius: 14, padding: 10, minWidth: 0 }}>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>{teamLabel(team, teamNames)}</div>
            <div style={{ display: "grid", gap: 8 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 14 }}>Rerolls</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                  {Array.from({ length: Math.max(startingRerolls[team], resources[team].rerolls) }, (_, index) => {
                    const isFilled = index < resources[team].rerolls;
                    const canUseReroll = hasMatch && canConsumeResources && resources[team].rerolls > 0;
                    return (
                      <button
                        key={`${team}-reroll-token-${index}`}
                        type="button"
                        onClick={() => {
                          if (!isFilled || !canUseReroll) return;
                          onConsumeResource(team, "reroll");
                        }}
                        aria-label={isFilled ? `Use reroll ${index + 1}` : `Reroll ${index + 1} already used`}
                        style={{
                          width: 44,
                          height: 44,
                          border: "none",
                          borderRadius: 999,
                          background: "transparent",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: 0,
                          cursor: isFilled && canUseReroll ? "pointer" : "default",
                        }}
                        disabled={!isFilled || !canUseReroll}
                      >
                        <span
                          aria-hidden="true"
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: "50%",
                            background: isFilled ? "#000" : "#d9d9d9",
                          }}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              {canUseApothecary[team] && (
                <div className="live-resource-controls">
                  <button
                    onClick={() => onConsumeResource(team, "apothecary")}
                    className="live-resource-button"
                    style={{
                      borderRadius: 14,
                      border: "1px solid #ddd",
                      background: "#fafafa",
                      fontWeight: 800,
                    }}
                    disabled={!hasMatch || !canConsumeResources}
                  >
                    Use Apothecary ({resources[team].apothecary})
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
