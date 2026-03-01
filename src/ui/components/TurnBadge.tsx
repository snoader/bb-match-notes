import { displayTurn } from "../formatters/turnDisplay";

type TurnBadgeProps = {
  half: number;
  turn: number;
};

export function TurnBadge({ half, turn }: TurnBadgeProps) {
  const shownTurn = displayTurn(half, turn);

  return (
    <span className="turn-badge" aria-label={`Half ${half}, Turn ${shownTurn}`}>
      <span className="turn-badge-half">H{half}</span>
      <span className="turn-badge-separator">·</span>
      <span className="turn-badge-turn">T{shownTurn}</span>
    </span>
  );
}
