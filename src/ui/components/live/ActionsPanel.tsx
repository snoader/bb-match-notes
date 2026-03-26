import { memo } from "react";
import { BigButton } from "../Modal";

type ActionsPanelProps = {
  canRecordTouchdown: boolean;
  canRecordCompletion: boolean;
  canRecordInterception: boolean;
  canRecordStalling: boolean;
  canRecordCasualty: boolean;
  onTouchdown: () => void;
  onCompletion: () => void;
  onInterception: () => void;
  onStalling: () => void;
  onInjury: () => void;
  kickoffPending: boolean;
};

const sectionTitleStyle = { fontWeight: 900, marginBottom: 8 } as const;
const kickoffHelpTextStyle = { marginBottom: 8, opacity: 0.75 } as const;

export const ActionsPanel = memo(function ActionsPanel({
  canRecordTouchdown,
  canRecordCompletion,
  canRecordInterception,
  canRecordStalling,
  canRecordCasualty,
  onTouchdown,
  onCompletion,
  onInterception,
  onStalling,
  onInjury,
  kickoffPending,
}: ActionsPanelProps) {
  return (
    <div className="live-section">
      <div style={sectionTitleStyle}>Actions</div>
      {kickoffPending && <div style={kickoffHelpTextStyle}>Record Kick-off for this drive to enable gameplay actions.</div>}
      <div className="live-actions-panel" aria-label="Match actions">
        <div className="live-actions-panel-row live-actions-panel-row-primary">
          <BigButton label="Touchdown" onClick={onTouchdown} disabled={!canRecordTouchdown} testId="action-touchdown" />
          <BigButton label="Completion" onClick={onCompletion} disabled={!canRecordCompletion} testId="action-completion" />
          <BigButton label="Interception" onClick={onInterception} disabled={!canRecordInterception} testId="action-interception" />
        </div>
        <div className="live-actions-panel-row live-actions-panel-row-secondary">
          <BigButton label="Casualty" onClick={onInjury} disabled={!canRecordCasualty} testId="action-injury" className="live-actions-panel-button live-actions-panel-button-secondary" />
          <BigButton label="Stalling" onClick={onStalling} disabled={!canRecordStalling} testId="action-stalling" />
        </div>
      </div>
    </div>
  );
});
