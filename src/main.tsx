import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app/App";
import "./index.css";
import { registerSW } from "virtual:pwa-register";
import { useAppStore } from "./store/appStore";
import { useThemeStore } from "./store/themeStore";
import { applyThemeTokens } from "./theme/theme";
import { themes } from "./theme/themes";

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    useAppStore.getState().setUpdateAvailable(true);
  },
});

useAppStore.getState().setUpdateHandler(async () => {
  await updateSW(false);
});

const initialTheme = useThemeStore.getState().theme;
applyThemeTokens(themes[initialTheme].tokens);
document.documentElement.setAttribute("data-theme", initialTheme);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
