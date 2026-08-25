/// <reference types="vite/client" />

interface DukkeobiRuntimeConfig {
  kakaoJsKey: string;
  build: string;
  dataMode: "snapshot" | "snapshot+kakao";
}

interface Window {
  DUKKEOBI_CONFIG?: DukkeobiRuntimeConfig;
  kakao?: any;
}
