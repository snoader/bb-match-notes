import { render, screen } from "@testing-library/react";
import { MatchStartScreen } from "../ui/screens/MatchStartScreen";

describe("MatchStartScreen smoke", () => {
  it("shows team inputs and start button", () => {
    render(<MatchStartScreen />);

    expect(screen.getByTestId("start-team-a-name")).toBeInTheDocument();
    expect(screen.getByTestId("start-team-b-name")).toBeInTheDocument();
    expect(screen.getByTestId("start-begin-match")).toBeInTheDocument();
  });
});
