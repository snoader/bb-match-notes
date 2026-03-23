import { memo } from "react";
import { teamLabel } from "../../../store/matchStore";
import type { TeamId } from "../../../domain/enums";

type TeamNames = { A: string; B: string };
type Resources = { rerolls: number; hasApothecary: boolean; apothecaryUsed: boolean };

type ResourcesPanelProps = {
  teamNames: TeamNames;
  resources: { A: Resources; B: Resources };
  startingRerolls: { A: number; B: number };
  hasMatch: boolean;
  canConsumeResources: boolean;
  canUseApothecary: { A: boolean; B: boolean };
  onConsumeResource: (team: TeamId, kind: "reroll" | "apothecary") => void;
};

const teams: TeamId[] = ["A", "B"];
const sectionTitleStyle = { fontWeight: 900, marginBottom: 8 } as const;
const teamCardStyle = { border: "1px solid var(--border)", borderRadius: 14, padding: 10, minWidth: 0 } as const;
const teamTitleStyle = { fontWeight: 800, marginBottom: 4 } as const;
const stackStyle = { display: "grid", gap: 8 } as const;
const apothecaryButtonStyle = {
  borderRadius: 14,
  border: "1px solid var(--border)",
  background: "var(--surface-2)",
  color: "var(--control-fg)",
  fontWeight: 800,
} as const;

function rerollTokenButtonStyle(isAvailable: boolean, canClick: boolean) {
  return {
    cursor: isAvailable && canClick ? "pointer" : "default",
  } as const;
}

export const ResourcesPanel = memo(function ResourcesPanel({ teamNames, resources, startingRerolls, hasMatch, canConsumeResources, canUseApothecary, onConsumeResource }: ResourcesPanelProps) {
  return (
    <div className="live-section">
      <div style={sectionTitleStyle}>Resources</div>
      <div className="live-resources-grid">
        {teams.map((team) => {
          const totalRerolls = Math.max(startingRerolls[team], resources[team].rerolls);
          const remainingRerolls = resources[team].rerolls;
          const usedRerolls = Math.max(0, totalRerolls - remainingRerolls);
          const canUseReroll = hasMatch && canConsumeResources && remainingRerolls > 0;

          return (
            <div key={team} style={teamCardStyle}>
              <div style={teamTitleStyle}>{teamLabel(team, teamNames)}</div>
              <div style={stackStyle}>
                <div className="live-reroll-card">
                  <div className="live-reroll-header">
                    <div>
                      <div className="live-reroll-label">Rerolls</div>
                      <div className="live-reroll-summary">{remainingRerolls} / {totalRerolls} übrig</div>
                    </div>
                    <div className="live-reroll-status" aria-label={`${remainingRerolls} of ${totalRerolls} rerolls remaining`}>
                      <span className="live-reroll-status-value">{remainingRerolls}</span>
                      <span className="live-reroll-status-total">/ {totalRerolls}</span>
                    </div>
                  </div>

                  <div className="live-reroll-meta" aria-label={`${usedRerolls} rerolls already used`}>
                    <span>{usedRerolls} benutzt</span>
                  </div>

                  <div className="live-reroll-tokens" role="list" aria-label={`Reroll status for ${teamLabel(team, teamNames)}`}>
                    {Array.from({ length: totalRerolls }, (_, index) => {
                      const isAvailable = index < remainingRerolls;
                      return (
                        <button
                          key={`${team}-reroll-token-${index}`}
                          type="button"
                          onClick={() => {
                            if (!isAvailable || !canUseReroll) return;
                            onConsumeResource(team, "reroll");
                          }}
                          aria-label={isAvailable ? `Use reroll ${index + 1}` : `Reroll ${index + 1} already used`}
                          className={`live-reroll-token-button ${isAvailable ? "is-available" : "is-used"}`}
                          style={rerollTokenButtonStyle(isAvailable, canUseReroll)}
                          disabled={!isAvailable || !canUseReroll}
                        >
                          <span className="live-reroll-token-count">{index + 1}</span>
                          <span aria-hidden="true" className={`live-reroll-token-dot ${isAvailable ? "is-available" : "is-used"}`} />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {resources[team].hasApothecary ? (
                  <div className="live-resource-controls">
                    <div
                      style={{
                        borderRadius: 14,
                        border: "1px solid var(--border)",
                        background: "var(--surface-2)",
                        padding: "10px 12px",
                        display: "grid",
                        gap: 8,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 900 }}>Apothecary</span>
                        <span style={{ fontWeight: 800, color: resources[team].apothecaryUsed ? "var(--text-muted)" : "var(--success, var(--text-primary))" }}>
                          {resources[team].apothecaryUsed ? "Used" : "Available"}
                        </span>
                      </div>

                      {canUseApothecary[team] && (
                        <button
                          onClick={() => onConsumeResource(team, "apothecary")}
                          className="live-resource-button"
                          style={apothecaryButtonStyle}
                          disabled={!hasMatch || !canConsumeResources}
                        >
                          Use Apothecary
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={{ borderRadius: 14, border: "1px solid var(--border)", background: "var(--surface-2)", padding: "10px 12px", fontWeight: 800, color: "var(--text-muted)" }}>
                    Apothecary: No
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
