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
          <div style={{ fontWeight: 700, fontSize: 18, overflowWrap: "anywhere" }}>{props.title}</div>
          <button
            onClick={props.onClose}
            style={{
              fontSize: 16,
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid #ddd",
              background: "#fafafa",
              minHeight: 44,
              flexShrink: 0,
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
}) {
  return (
    <button
      onClick={props.onClick}
      disabled={props.disabled}
      style={{
        width: "100%",
        padding: "12px",
        borderRadius: 16,
        border: props.secondary ? "1px solid #ddd" : "1px solid #111",
        background: props.secondary ? "#fafafa" : "#111",
        color: props.secondary ? "#111" : "white",
        fontWeight: 700,
        fontSize: 16,
        minHeight: 44,
        opacity: props.disabled ? 0.5 : 1,
      }}
    >
      {props.label}
    </button>
  );
}
