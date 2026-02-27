import type { KickoffEventPayload } from "../domain/events";

export function formatKickoffExportDetail(payload: KickoffEventPayload): string | undefined {
  if (payload.kickoffKey === "CHANGING_WEATHER") {
    return payload.details?.newWeather ? `New weather: ${payload.details.newWeather}` : undefined;
  }

  if (payload.kickoffKey === "THROW_A_ROCK") {
    const targetTeam = payload.details?.targetTeam ?? "?";
    const targetPlayer = payload.details?.targetPlayer ?? "?";
    const outcome = payload.details?.outcome ?? "?";
    return `Throw a Rock: Team ${targetTeam}, Player ${targetPlayer}, Outcome ${outcome}`;
  }

  if (payload.kickoffKey === "PITCH_INVASION") {
    const affectedA = payload.details?.affectedA ?? "?";
    const affectedB = payload.details?.affectedB ?? "?";
    return `Pitch Invasion: A affected ${affectedA}, B affected ${affectedB}`;
  }

  return undefined;
}

