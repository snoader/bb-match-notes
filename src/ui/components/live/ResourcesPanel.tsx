import { memo } from "react";
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

const teams: TeamId[] = ["A", "B"];
const sectionTitleStyle = { fontWeight: 900, marginBottom: 8 } as const;
const teamCardStyle = { border: "1px solid var(--color-border-muted)", borderRadius: 14, padding: 10, minWidth: 0 } as const;
const teamTitleStyle = { fontWeight: 800, marginBottom: 6 } as const;
const stackStyle = { display: "grid", gap: 8 } as const;
const labelStyle = { fontWeight: 800, fontSize: 14 } as const;
const rerollTokensWrapStyle = { display: "flex", alignItems: "center", gap: 6, marginTop: 4, flexWrap: "wrap" } as const;
const rerollTokenButtonBaseStyle = {
  width: 44,
  height: 44,
  border: "none",
  borderRadius: 999,
  background: "transparent",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 0,
} as const;
const rerollTokenStyle = { width: 18, height: 18, borderRadius: "50%" } as const;
const apothecaryButtonStyle = {
  borderRadius: 14,
  border: "1px solid var(--color-border)",
  background: "var(--color-surface-soft)",
  fontWeight: 800,
} as const;

function rerollTokenButtonStyle(canClick: boolean) {
  return { ...rerollTokenButtonBaseStyle, cursor: canClick ? "pointer" : "default" };
}

function rerollTokenStyleForState(isFilled: boolean) {
  return { ...rerollTokenStyle, background: isFilled ? "var(--color-primary)" : "var(--color-border)" };
}

export const ResourcesPanel = memo(function ResourcesPanel({ teamNames, resources, startingRerolls, hasMatch, canConsumeResources, canUseApothecary, onConsumeResource }: ResourcesPanelProps) {
  return (
    <div className="live-section">
      <div style={sectionTitleStyle}>Resources</div>
      <div className="live-resources-grid">
        {teams.map((team) => (
          <div key={team} style={teamCardStyle}>
            <div style={teamTitleStyle}>{teamLabel(team, teamNames)}</div>
            <div style={stackStyle}>
              <div>
                <div style={labelStyle}>Rerolls</div>
                <div style={rerollTokensWrapStyle}>
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
                        style={rerollTokenButtonStyle(isFilled && canUseReroll)}
                        disabled={!isFilled || !canUseReroll}
                      >
                        <span aria-hidden="true" style={rerollTokenStyleForState(isFilled)} />
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
                    style={apothecaryButtonStyle}
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
});
