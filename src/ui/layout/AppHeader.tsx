import { HamburgerMenu } from "./HamburgerMenu";

export function AppHeader() {
  return (
    <header className="app-header">
      <div className="app-header-title">BB Match Notes</div>
      <HamburgerMenu />
    </header>
  );
}
