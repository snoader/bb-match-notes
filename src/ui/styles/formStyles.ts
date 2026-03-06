import type { CSSProperties } from "react";

export const THEMED_INPUT_STYLE: CSSProperties = {
  padding: 12,
  borderRadius: 14,
  border: "1px solid var(--color-input-border)",
  background: "var(--color-input-bg)",
  color: "var(--color-input-text)",
};

export const THEMED_TALL_INPUT_STYLE: CSSProperties = {
  ...THEMED_INPUT_STYLE,
  minHeight: 44,
};
