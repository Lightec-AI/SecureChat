/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ENABLE_LOGGER: string;
  readonly VITE_LOGGER_FILTER: string;
  // Add other env variables here
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** Electron desktop shell (apps/desktop) */
interface SecureChatDesktopWorkspace {
  get: () => Promise<string | null>;
  choose: () => Promise<string | null>;
  list: (relativePath?: string) => Promise<{ name: string; isDirectory: boolean; isFile: boolean }[]>;
  readText: (relativePath: string) => Promise<string>;
  writeText: (relativePath: string, content: string) => Promise<boolean>;
}

interface SecureChatDesktopBridge {
  platform: string;
  versions: Record<string, string | undefined>;
  workspace: SecureChatDesktopWorkspace;
}

declare global {
  interface Window {
    secureChatDesktop?: SecureChatDesktopBridge;
  }
}

export {};
