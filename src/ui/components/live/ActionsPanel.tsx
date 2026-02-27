import { BigButton } from "../Modal";

type ActionsPanelProps = {
  canRecordTouchdown: boolean;
  canRecordCompletion: boolean;
  canRecordInterception: boolean;
  canRecordCasualty: boolean;
  onTouchdown: () => void;
  onCompletion: () => void;
  onInterception: () => void;
  onInjury: () => void;
};

export function ActionsPanel({
  canRecordTouchdown,
  canRecordCompletion,
  canRecordInterception,
  canRecordCasualty,
  onTouchdown,
  onCompletion,
  onInterception,
  onInjury,
}: ActionsPanelProps) {
  return (
    <div className="live-section">
      <div style={{ fontWeight: 900, marginBottom: 8 }}>Actions</div>
      <div className="live-action-grid">
        <BigButton label="Touchdown" onClick={onTouchdown} disabled={!canRecordTouchdown} testId="action-touchdown" />
        <BigButton label="Completion" onClick={onCompletion} disabled={!canRecordCompletion} testId="action-completion" />
        <BigButton label="Interception" onClick={onInterception} disabled={!canRecordInterception} testId="action-interception" />
        <BigButton label="Injury" onClick={onInjury} disabled={!canRecordCasualty} testId="action-injury" />
      </div>
    </div>
  );
}
