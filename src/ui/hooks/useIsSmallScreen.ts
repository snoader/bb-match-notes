import { useEffect, useState } from "react";

const SMALL_SCREEN_QUERY = "(max-width: 767px)";

export function useIsSmallScreen() {
  const [isSmallScreen, setIsSmallScreen] = useState(() => window.matchMedia(SMALL_SCREEN_QUERY).matches);

  useEffect(() => {
    const query = window.matchMedia(SMALL_SCREEN_QUERY);
    const onChange = (event: MediaQueryListEvent) => setIsSmallScreen(event.matches);
    setIsSmallScreen(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return isSmallScreen;
}
