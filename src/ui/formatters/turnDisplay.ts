export function displayTurn(half: number, turn: number): number {
  if (half === 2) return turn + 8;
  return turn;
}
