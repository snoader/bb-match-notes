import { beforeEach, describe, expect, it } from "vitest";
import { useAppStore } from "../appStore";

describe("appStore update toast", () => {
  beforeEach(() => {
    useAppStore.setState({ updateAvailable: false, updateToastDismissed: false });
  });

  it("shows toast for a fresh update and allows dismiss", () => {
    useAppStore.getState().setUpdateAvailable(true);
    expect(useAppStore.getState().updateToastDismissed).toBe(false);

    useAppStore.getState().dismissUpdateToast();
    expect(useAppStore.getState().updateToastDismissed).toBe(true);
  });

  it("resets dismissed toast state when another update arrives", () => {
    useAppStore.setState({ updateAvailable: true, updateToastDismissed: true });
    useAppStore.getState().setUpdateAvailable(false);
    useAppStore.getState().setUpdateAvailable(true);

    expect(useAppStore.getState().updateToastDismissed).toBe(false);
  });
});
