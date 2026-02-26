/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_E2E?: string;
}

interface Window {
  __bbmn_test?: {
    resetMatch: () => Promise<void>;
  };
}
