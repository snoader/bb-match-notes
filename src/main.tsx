import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app/App";
import "./index.css";
import { registerSW } from "virtual:pwa-register";
import { useAppStore } from "./store/appStore";

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    useAppStore.getState().setUpdateAvailable(true);
  },
});

useAppStore.getState().setUpdateHandler(async () => {
  await updateSW(false);
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
