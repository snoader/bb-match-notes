import type { CSSProperties } from "react";

export const THEMED_INPUT_STYLE: CSSProperties = {
  padding: 12,
  borderRadius: "var(--radius-control)",
  border: "var(--border-width-strong) solid var(--input-border)",
  background: "var(--input-bg)",
  color: "var(--input-text)",
};

export const THEMED_TALL_INPUT_STYLE: CSSProperties = {
  ...THEMED_INPUT_STYLE,
  minHeight: 44,
};
