import { HamburgerMenu } from "./HamburgerMenu";

export function AppHeader() {
  return (
    <header className="app-header">
      <div className="app-header-title">Blood Bowl Note Taker</div>
      <HamburgerMenu />
    </header>
  );
}
