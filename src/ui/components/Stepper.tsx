type StepperProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  testId?: string;
};

export function Stepper({ label, value, onChange, testId }: StepperProps) {
  const normalizedLabel = label.toLowerCase();

  return (
    <div
      className="flex items-center gap-2"
      style={{
        flexDirection: "row",
        alignItems: "center",
        width: "100%",
        minWidth: 0,
        display: "grid",
        gridTemplateColumns: "40px minmax(0, 1fr) 40px",
      }}
    >
      <button
        data-testid={testId ? `${testId}-decrease` : undefined}
        onClick={() => onChange(Math.max(0, value - 1))}
        disabled={value <= 0}
        aria-label={`decrease ${normalizedLabel}`}
        className="min-w-10 h-10 sm:h-11 px-3 sm:px-4 text-sm rounded-xl flex items-center justify-center whitespace-nowrap text-center"
        style={{
          flex: "0 0 auto",
          minWidth: 40,
          height: 40,
          border: "1px solid var(--border)",
          background: value <= 0 ? "var(--surface-2)" : "var(--surface)",
          fontWeight: 900,
          color: value <= 0 ? "var(--control-fg-muted)" : "var(--control-fg)",
          opacity: 1,
        }}
      >
        -
      </button>

      <div
        className="flex items-center justify-center gap-3 whitespace-nowrap text-center"
        style={{
          flex: "1 1 auto",
          textAlign: "center",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          lineHeight: 1.2,
          fontSize: 14,
          minHeight: 40,
          borderRadius: 12,
          border: "1px solid var(--border)",
          fontWeight: 800,
          background: "var(--surface-2)",
          padding: "0 10px",
          pointerEvents: "none",
          color: "var(--control-fg)",
        }}
      >
        {label} ({value})
      </div>

      <button
        data-testid={testId ? `${testId}-increase` : undefined}
        onClick={() => onChange(value + 1)}
        aria-label={`increase ${normalizedLabel}`}
        className="min-w-10 h-10 sm:h-11 px-3 sm:px-4 text-sm rounded-xl flex items-center justify-center whitespace-nowrap text-center"
        style={{
          flex: "0 0 auto",
          minWidth: 40,
          height: 40,
          border: "1px solid var(--border)",
          background: "var(--surface)",
          fontWeight: 900,
          color: "var(--control-fg)",
        }}
      >
        +
      </button>
    </div>
  );
}
