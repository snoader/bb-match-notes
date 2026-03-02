import { memo } from "react";

type KickoffBannerProps = {
  hasMatch: boolean;
  kickoffPending: boolean;
  driveIndexCurrent: number;
  driveKickoff: { kickoffLabel: string; roll2d6: number } | null;
  onRecordKickoff: () => void;
};

const noMatchStyle = { marginTop: 10, padding: 12, borderRadius: 16, border: "1px solid #eee", opacity: 0.8 } as const;
const kickoffPendingStyle = { marginTop: 10, padding: 12, borderRadius: 16, border: "1px solid #ffc107", background: "#fff8e1" } as const;
const kickoffTitleStyle = { fontWeight: 900 } as const;
const kickoffButtonWrapStyle = { marginTop: 8 } as const;
const kickoffButtonStyle = { padding: "10px 12px", borderRadius: 12, border: "1px solid #111", background: "#111", color: "#fff", fontWeight: 800 } as const;
const driveKickoffStyle = { marginTop: 10, padding: 12, borderRadius: 16, border: "1px solid #eee" } as const;

export const KickoffBanner = memo(function KickoffBanner({ hasMatch, kickoffPending, driveIndexCurrent, driveKickoff, onRecordKickoff }: KickoffBannerProps) {
  if (!hasMatch) {
    return (
      <div style={noMatchStyle}>
        No active match found. Start or resume a match from the Start screen.
      </div>
    );
  }

  return (
    <>
      {kickoffPending && (
        <div style={kickoffPendingStyle}>
          <div style={kickoffTitleStyle}>Kick-off required for this drive</div>
          <div style={kickoffButtonWrapStyle}>
            <button data-testid="kickoff-record" onClick={onRecordKickoff} style={kickoffButtonStyle}>
              Record Kick-off
            </button>
          </div>
        </div>
      )}

      {driveKickoff && (
        <div style={driveKickoffStyle}>
          <strong>Drive {driveIndexCurrent} Kick-off:</strong> {driveKickoff.kickoffLabel} ({driveKickoff.roll2d6})
        </div>
      )}
    </>
  );
});
