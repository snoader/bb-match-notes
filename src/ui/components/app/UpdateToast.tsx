import { useAppStore } from "../../../store/appStore";

export function UpdateToast() {
  const updateAvailable = useAppStore((s) => s.updateAvailable);
  const updateToastDismissed = useAppStore((s) => s.updateToastDismissed);
  const dismissUpdateToast = useAppStore((s) => s.dismissUpdateToast);
  const applyUpdate = useAppStore((s) => s.applyUpdate);

  if (!updateAvailable || updateToastDismissed) return null;

  return (
    <div className="update-toast" role="status" aria-live="polite">
      <div className="update-toast-message">Update verfügbar</div>
      <div className="update-toast-actions">
        <button className="update-toast-button" onClick={() => void applyUpdate()}>
          Jetzt aktualisieren
        </button>
        <button className="update-toast-button update-toast-button-secondary" onClick={dismissUpdateToast}>
          Später
        </button>
      </div>
    </div>
  );
}
