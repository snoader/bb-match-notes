/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface Window {
  __bbmn_test?: {
    reset?: () => Promise<void>;
  };
}
