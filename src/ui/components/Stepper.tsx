type StepperProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
};

export function Stepper({ label, value, onChange }: StepperProps) {
  const normalizedLabel = label.toLowerCase();

  return (
    <div
      className="flex items-center gap-2"
      style={{
        flexDirection: "row",
        alignItems: "center",
        width: "100%",
        minWidth: 0,
      }}
    >
      <button
        onClick={() => onChange(Math.max(0, value - 1))}
        disabled={value <= 0}
        aria-label={`decrease ${normalizedLabel}`}
        className="min-w-10 h-10 sm:h-11 px-3 sm:px-4 text-sm rounded-xl flex items-center justify-center whitespace-nowrap text-center"
        style={{
          flex: "0 0 auto",
          minWidth: 40,
          height: 40,
          border: "1px solid #ddd",
          background: value <= 0 ? "#f5f5f5" : "#fff",
          fontWeight: 900,
          opacity: value <= 0 ? 0.6 : 1,
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
          border: "1px solid #ddd",
          fontWeight: 800,
          background: "#fafafa",
          padding: "0 10px",
        }}
      >
        {label} ({value})
      </div>

      <button
        onClick={() => onChange(value + 1)}
        aria-label={`increase ${normalizedLabel}`}
        className="min-w-10 h-10 sm:h-11 px-3 sm:px-4 text-sm rounded-xl flex items-center justify-center whitespace-nowrap text-center"
        style={{
          flex: "0 0 auto",
          minWidth: 40,
          height: 40,
          border: "1px solid #ddd",
          background: "#fff",
          fontWeight: 900,
        }}
      >
        +
      </button>
    </div>
  );
}
