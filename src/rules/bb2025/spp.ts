import type { MatchEvent } from "../../domain/events";
import type { TeamId } from "../../domain/enums";
import { isCasualtySppEligible, normalizeInjuryPayload } from "./injuries";

export const BB2025_SPP = {
  touchdown: 3,
  completion: 1,
  interception: 2,
  casualty: 2,
  mvp: 4,
} as const;

export function getEventSppAward(event: MatchEvent): { playerId: string; team: TeamId; spp: number } | null {
  if (event.type === "touchdown" && event.team && event.payload?.player) {
    return { playerId: String(event.payload.player), team: event.team, spp: BB2025_SPP.touchdown };
  }

  if (event.type === "completion" && event.team && event.payload?.passer) {
    return { playerId: String(event.payload.passer), team: event.team, spp: BB2025_SPP.completion };
  }

  if (event.type === "interception" && event.team && event.payload?.player) {
    return { playerId: String(event.payload.player), team: event.team, spp: BB2025_SPP.interception };
  }

  if (event.type === "injury" && event.team) {
    const injury = normalizeInjuryPayload(event.payload);
    if (isCasualtySppEligible(injury)) {
      return { playerId: String(injury.causerPlayerId), team: event.team, spp: BB2025_SPP.casualty };
    }
  }

  return null;
}
