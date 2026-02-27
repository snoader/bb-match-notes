const TURNS_PER_HALF = 8;
const TOTAL_TURNS = 16;

export function toTotalTurn(half: number, turn: number): number {
  return (half - 1) * TURNS_PER_HALF + turn;
}

export function hasReachedEndCondition(half: number, turn: number): boolean {
  return toTotalTurn(half, turn) >= TOTAL_TURNS;
}

