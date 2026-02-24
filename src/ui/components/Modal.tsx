import React from "react";

export function Modal(props: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  if (!props.open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        padding: 12,
        zIndex: 50,
      }}
      onClick={props.onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          background: "white",
          borderRadius: 16,
          padding: 14,
          boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <div style={{ fontWeight: 700, fontSize: 18 }}>{props.title}</div>
          <button
            onClick={props.onClose}
            style={{ fontSize: 16, padding: "8px 10px", borderRadius: 12, border: "1px solid #ddd", background: "#fafafa" }}
          >
            Close
          </button>
        </div>
        <div style={{ marginTop: 12 }}>{props.children}</div>
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
        padding: "14px 12px",
        borderRadius: 16,
        border: props.secondary ? "1px solid #ddd" : "1px solid #111",
        background: props.secondary ? "#fafafa" : "#111",
        color: props.secondary ? "#111" : "white",
        fontWeight: 700,
        fontSize: 16,
        opacity: props.disabled ? 0.5 : 1,
      }}
    >
      {props.label}
    </button>
  );
}
