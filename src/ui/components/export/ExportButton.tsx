import { useState } from "react";
import type { MatchEvent } from "../../../domain/events";
import type { DerivedMatchState } from "../../../domain/projection";
import type { Rosters } from "../../../export/spp";
import { useIsSmallScreen } from "../../hooks/useIsSmallScreen";
import { ExportSheet } from "./ExportSheet";

type Props = {
  events: MatchEvent[];
  derived: DerivedMatchState;
  rosters: Rosters;
};

export function ExportButton(props: Props) {
  const [open, setOpen] = useState(false);
  const isSmallScreen = useIsSmallScreen();

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{ padding: "10px 12px", borderRadius: 14, border: "1px solid #ddd", background: "#fafafa", fontWeight: 700, minHeight: 44 }}
        disabled={!props.events.length}
      >
        Export
      </button>
      <ExportSheet open={open} onClose={() => setOpen(false)} events={props.events} derived={props.derived} rosters={props.rosters} isSmallScreen={isSmallScreen} />
    </>
  );
}
