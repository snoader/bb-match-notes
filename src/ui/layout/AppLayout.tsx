import type { ReactNode } from "react";
import { AppHeader } from "./AppHeader";

type AppLayoutProps = {
  children: ReactNode;
};

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="app-layout">
      <div className="app-layout-shell">
        <AppHeader />
        <main className="app-layout-content">{children}</main>
      </div>
    </div>
  );
}
