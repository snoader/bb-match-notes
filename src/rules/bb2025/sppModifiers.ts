import type { KickoffKey } from "./kickoff";

export type DriveSppModifier = {
  completionSpp?: number;
  casualtySpp?: number;
  allowCrowdCasualtySpp?: boolean;
};

export function getDriveSppModifierFromKickoff(kickoffKey: KickoffKey): DriveSppModifier | null {
  void kickoffKey;
  return null;
}
