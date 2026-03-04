import type { KickoffEventPayload } from "../domain/events";
import { labelKickoff, labelWeather } from "../domain/labels";

export function formatKickoffExportDetail(payload: KickoffEventPayload): string | undefined {
  if (payload.kickoffKey === "CHANGING_WEATHER") {
    return payload.details?.newWeather ? `New weather: ${labelWeather(payload.details.newWeather)}` : undefined;
  }

  if (payload.kickoffKey === "THROW_A_ROCK") {
    const targetTeam = payload.details?.targetTeam ?? "?";
    const targetPlayer = payload.details?.targetPlayer ?? "?";
    const outcome = payload.details?.outcome ?? "?";
    return `${labelKickoff(payload.kickoffKey)}: Team ${targetTeam}, Player ${targetPlayer}, Outcome ${outcome}`;
  }

  if (payload.kickoffKey === "PITCH_INVASION") {
    const affectedA = payload.details?.affectedA ?? "?";
    const affectedB = payload.details?.affectedB ?? "?";
    return `${labelKickoff(payload.kickoffKey)}: A affected ${affectedA}, B affected ${affectedB}`;
  }

  return undefined;
}
