type KickoffBannerProps = {
  hasMatch: boolean;
  kickoffPending: boolean;
  driveIndexCurrent: number;
  driveKickoff: { kickoffLabel: string; roll2d6: number } | null;
  onRecordKickoff: () => void;
};

export function KickoffBanner({ hasMatch, kickoffPending, driveIndexCurrent, driveKickoff, onRecordKickoff }: KickoffBannerProps) {
  if (!hasMatch) {
    return (
      <div style={{ marginTop: 10, padding: 12, borderRadius: 16, border: "1px solid #eee", opacity: 0.8 }}>
        No active match found. Start or resume a match from the Start screen.
      </div>
    );
  }

  return (
    <>
      {kickoffPending && (
        <div style={{ marginTop: 10, padding: 12, borderRadius: 16, border: "1px solid #ffc107", background: "#fff8e1" }}>
          <div style={{ fontWeight: 900 }}>Kick-off required for this drive</div>
          <div style={{ marginTop: 8 }}>
            <button data-testid="kickoff-record" onClick={onRecordKickoff} style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #111", background: "#111", color: "#fff", fontWeight: 800 }}>
              Record Kick-off
            </button>
          </div>
        </div>
      )}

      {driveKickoff && (
        <div style={{ marginTop: 10, padding: 12, borderRadius: 16, border: "1px solid #eee" }}>
          <strong>Drive {driveIndexCurrent} Kick-off:</strong> {driveKickoff.kickoffLabel} ({driveKickoff.roll2d6})
        </div>
      )}
    </>
  );
}
