import { BigButton } from "../Modal";

type ActionsPanelProps = {
  hasMatch: boolean;
  onTouchdown: () => void;
  onCompletion: () => void;
  onInterception: () => void;
  onInjury: () => void;
};

export function ActionsPanel({ hasMatch, onTouchdown, onCompletion, onInterception, onInjury }: ActionsPanelProps) {
  return (
    <div className="live-section">
      <div style={{ fontWeight: 900, marginBottom: 8 }}>Actions</div>
      <div className="live-action-grid">
        <BigButton label="Touchdown" onClick={onTouchdown} disabled={!hasMatch} testId="action-touchdown" />
        <BigButton label="Completion" onClick={onCompletion} disabled={!hasMatch} testId="action-completion" />
        <BigButton label="Interception" onClick={onInterception} disabled={!hasMatch} testId="action-interception" />
        <BigButton label="Injury" onClick={onInjury} disabled={!hasMatch} testId="action-injury" />
      </div>
    </div>
  );
}
