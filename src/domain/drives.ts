import type { MatchEvent, KickoffEventPayload } from "./events";

export type DriveMeta = {
  driveIndexCurrent: number;
  kickoffPending: boolean;
  kickoffByDrive: Map<number, KickoffEventPayload>;
  eventDriveIndex: Map<string, number>;
};

const isKickoffPayload = (payload: unknown): payload is KickoffEventPayload => {
  const p = payload as Partial<KickoffEventPayload>;
  return !!p && typeof p.driveIndex === "number" && (p.kickingTeam === "A" || p.kickingTeam === "B") && (p.receivingTeam === "A" || p.receivingTeam === "B") && (p.roll2d6 === undefined || typeof p.roll2d6 === "number") && typeof p.kickoffKey === "string" && typeof p.kickoffLabel === "string";
};

export function deriveDriveMeta(events: MatchEvent[]): DriveMeta {
  let driveIndexCurrent = 0;
  let kickoffPending = false;
  let lastHalf: number | null = null;
  const kickoffByDrive = new Map<number, KickoffEventPayload>();
  const eventDriveIndex = new Map<string, number>();

  for (const e of events) {
    if (e.type === "match_start") {
      driveIndexCurrent = 1;
      kickoffPending = true;
    }

    if (lastHalf === 1 && e.half === 2 && driveIndexCurrent > 0) {
      driveIndexCurrent += 1;
      kickoffPending = true;
    }

    eventDriveIndex.set(e.id, Math.max(1, driveIndexCurrent || 1));

    if (e.type === "kickoff_event" && isKickoffPayload(e.payload)) {
      const p = e.payload;
      if (!kickoffByDrive.has(p.driveIndex)) {
        kickoffByDrive.set(p.driveIndex, p);
      }
      if (p.driveIndex === driveIndexCurrent) kickoffPending = false;
    }

    if (e.type === "touchdown" && driveIndexCurrent > 0) {
      driveIndexCurrent += 1;
      kickoffPending = true;
    }

    lastHalf = e.half;
  }

  if (driveIndexCurrent === 0) {
    driveIndexCurrent = 1;
    kickoffPending = false;
  }

  return { driveIndexCurrent, kickoffPending, kickoffByDrive, eventDriveIndex };
}
