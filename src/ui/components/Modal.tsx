import React, { useEffect } from "react";

export function Modal(props: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!props.open) return;

    const originalOverflow = document.body.style.overflow;
    const originalOverscrollBehavior = document.body.style.overscrollBehavior;

    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.overscrollBehavior = originalOverscrollBehavior;
    };
  }, [props.open]);

  if (!props.open) return null;

  return (
    <div
      className="modal-backdrop"
      onClick={props.onClose}
    >
      <div
        className="modal-sheet"
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", minWidth: 0 }}>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 18, overflowWrap: "anywhere", letterSpacing: "0.01em" }}>{props.title}</div>
          <button
            onClick={props.onClose}
            style={{
              fontSize: 16,
              padding: "10px 12px",
              borderRadius: "var(--radius-control)",
              border: "var(--border-width-strong) solid var(--border)",
              background: "var(--surface-2)",
              minHeight: 44,
              flexShrink: 0,
              color: "var(--control-fg)",
            }}
          >
            Close
          </button>
        </div>
        <div className="modal-content">{props.children}</div>
      </div>
    </div>
  );
}

export function BigButton(props: {
  label: string;
  onClick: () => void;
  secondary?: boolean;
  disabled?: boolean;
  testId?: string;
}) {
  return (
    <button
      onClick={props.onClick}
      disabled={props.disabled}
      data-testid={props.testId}
      className={props.secondary ? "bb-btn bb-btn-secondary" : "bb-btn bb-btn-primary"}
      style={{
        width: "100%",
        padding: "12px",
        borderRadius: "var(--radius-control)",
        border: props.secondary ? "var(--border-width-strong) solid var(--btn-border)" : "var(--border-width-strong) solid var(--btn-border)",
        background: props.secondary ? "var(--btn-bg)" : "var(--accent)",
        fontWeight: 700,
        fontSize: 16,
        minHeight: 44,
        color: props.disabled ? "var(--btn-text-muted)" : "var(--btn-text)",
        opacity: 1,
      }}
    >
      {props.label}
    </button>
  );
}
