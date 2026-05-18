/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_RENDERER_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
