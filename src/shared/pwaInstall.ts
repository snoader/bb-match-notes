export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;

  const displayModeStandalone = window.matchMedia?.("(display-mode: standalone)")?.matches ?? false;
  const navigatorStandalone = ((window.navigator as Navigator & { standalone?: boolean }).standalone ?? false) === true;
  return displayModeStandalone || navigatorStandalone;
}

export function isIOS(): boolean {
  if (typeof window === "undefined") return false;

  const userAgent = window.navigator.userAgent;
  const platform = window.navigator.platform;
  const maxTouchPoints = window.navigator.maxTouchPoints ?? 0;

  const iosDevice = /iPad|iPhone|iPod/.test(userAgent);
  const iPadOsDesktop = platform === "MacIntel" && maxTouchPoints > 1;
  return iosDevice || iPadOsDesktop;
}
