import {
  clearWebSyncFolder,
  decryptWebConversationPayload,
  getWebLocalEncryptPreference,
  hasWebSyncFolder,
  isWebLocalEncryptedPayload,
  pickWebSyncFolder,
  resetWebLocalEncryptionKey,
  setWebLocalEncryptPreference,
  supportsWebDirectoryPicker,
  writeWebConversationMarkdown,
} from './webStorage';
import { TextDecoder, TextEncoder } from 'util';

type StoreMap = Map<string, unknown>;

function installIndexedDbMock(store: StoreMap) {
  const open = jest.fn(() => {
    const request: {
      result?: unknown;
      onupgradeneeded?: () => void;
      onsuccess?: () => void;
      onerror?: () => void;
      error?: Error;
    } = {};

    const db = {
      objectStoreNames: { contains: () => true },
      createObjectStore: jest.fn(),
      close: jest.fn(),
      transaction: () => {
        const tx: { oncomplete?: () => void; onerror?: () => void; objectStore: () => unknown } = {
          oncomplete: undefined,
          onerror: undefined,
          objectStore: () => ({
            get: (key: string) => {
              const req: { onsuccess?: () => void; onerror?: () => void; result?: unknown } = {};
              queueMicrotask(() => {
                req.result = store.get(key);
                req.onsuccess?.();
                tx.oncomplete?.();
              });
              return req;
            },
            put: (value: unknown, key: string) => {
              store.set(key, value);
              queueMicrotask(() => tx.oncomplete?.());
              return {};
            },
            delete: (key: string) => {
              store.delete(key);
              queueMicrotask(() => tx.oncomplete?.());
              return {};
            },
          }),
        };
        return tx;
      },
    };

    queueMicrotask(() => {
      request.result = db;
      request.onupgradeneeded?.();
      request.onsuccess?.();
    });
    return request;
  });

  Object.defineProperty(window, 'indexedDB', {
    configurable: true,
    value: { open },
  });
}

describe('webStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    Object.defineProperty(globalThis, 'TextEncoder', { configurable: true, value: TextEncoder });
    Object.defineProperty(globalThis, 'TextDecoder', { configurable: true, value: TextDecoder });
    let keyCounter = 0;
    const encode = (value: string) => new TextEncoder().encode(value).buffer;
    const decode = (value: BufferSource) => {
      const bytes =
        value instanceof ArrayBuffer ? new Uint8Array(value) : new Uint8Array(value.buffer);
      return new TextDecoder().decode(bytes);
    };

    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: {
        getRandomValues: (arr: Uint8Array) => {
          for (let i = 0; i < arr.length; i++) {
            arr[i] = (i + 17) % 255;
          }
          return arr;
        },
        subtle: {
          generateKey: jest.fn(async () => ({ id: `k${++keyCounter}` })),
          exportKey: jest.fn(async (_format: string, key: { id: string }) => ({ k: key.id })),
          importKey: jest.fn(async (_format: string, jwk: { k: string }) => ({ id: jwk.k })),
          encrypt: jest.fn(async (_algo: unknown, key: { id: string }, data: BufferSource) =>
            encode(`${key.id}|${decode(data)}`),
          ),
          decrypt: jest.fn(async (_algo: unknown, key: { id: string }, data: BufferSource) => {
            const raw = decode(data);
            const marker = `${key.id}|`;
            if (!raw.startsWith(marker)) {
              throw new Error('bad key');
            }
            return encode(raw.slice(marker.length));
          }),
        },
      },
    });
  });

  it('stores and reads encryption preference', () => {
    setWebLocalEncryptPreference(true);
    expect(getWebLocalEncryptPreference()).toBe(true);
    setWebLocalEncryptPreference(false);
    expect(getWebLocalEncryptPreference()).toBe(false);
  });

  it('reports directory picker support', () => {
    Object.defineProperty(window, 'showDirectoryPicker', {
      configurable: true,
      value: jest.fn(),
    });
    expect(supportsWebDirectoryPicker()).toBe(true);
  });

  it('picks, checks, and clears web sync folder handle', async () => {
    const store = new Map<string, unknown>();
    installIndexedDbMock(store);
    Object.defineProperty(window, 'showDirectoryPicker', {
      configurable: true,
      value: jest.fn().mockResolvedValue({ id: 'folder' }),
    });

    await expect(pickWebSyncFolder()).resolves.toBe(true);
    await expect(hasWebSyncFolder()).resolves.toBe(true);
    await clearWebSyncFolder();
    await expect(hasWebSyncFolder()).resolves.toBe(false);
  });

  it('writes markdown to OPFS when folder handle is unavailable', async () => {
    installIndexedDbMock(new Map<string, unknown>());
    const write = jest.fn().mockResolvedValue(undefined);
    const close = jest.fn().mockResolvedValue(undefined);
    const createWritable = jest.fn().mockResolvedValue({ write, close });
    const getFileHandle = jest.fn().mockResolvedValue({ createWritable });
    const getDirectoryHandle = jest.fn().mockResolvedValue({ getFileHandle });
    Object.defineProperty(navigator, 'storage', {
      configurable: true,
      value: { getDirectory: jest.fn().mockResolvedValue({ getDirectoryHandle }) },
    });

    await expect(writeWebConversationMarkdown('c1', 'hello', 'c1')).resolves.toBe(true);
    expect(getDirectoryHandle).toHaveBeenCalled();
    expect(write).toHaveBeenCalledWith('hello');
  });

  it('encrypts payload and decrypts it back with same key', async () => {
    installIndexedDbMock(new Map<string, unknown>());
    setWebLocalEncryptPreference(true);

    let savedPayload = '';
    const write = jest.fn().mockImplementation(async (value: string) => {
      savedPayload = value;
    });
    const close = jest.fn().mockResolvedValue(undefined);
    const createWritable = jest.fn().mockResolvedValue({ write, close });
    const getFileHandle = jest.fn().mockResolvedValue({ createWritable });
    const getDirectoryHandle = jest.fn().mockResolvedValue({ getFileHandle });
    Object.defineProperty(navigator, 'storage', {
      configurable: true,
      value: { getDirectory: jest.fn().mockResolvedValue({ getDirectoryHandle }) },
    });

    await expect(writeWebConversationMarkdown('c1', 'secret markdown', 'c1')).resolves.toBe(true);
    expect(isWebLocalEncryptedPayload(savedPayload)).toBe(true);
    await expect(decryptWebConversationPayload(savedPayload)).resolves.toBe('secret markdown');
  });

  it('returns null for malformed encrypted payloads', async () => {
    await expect(decryptWebConversationPayload('plain-text')).resolves.toBeNull();
    await expect(
      decryptWebConversationPayload('SECURECHAT-ENC-v1\nno-separator'),
    ).resolves.toBeNull();
    await expect(decryptWebConversationPayload('SECURECHAT-ENC-v1\nabc:')).resolves.toBeNull();
  });

  it('cannot decrypt old payload after key reset', async () => {
    installIndexedDbMock(new Map<string, unknown>());
    setWebLocalEncryptPreference(true);

    let savedPayload = '';
    const write = jest.fn().mockImplementation(async (value: string) => {
      savedPayload = value;
    });
    const close = jest.fn().mockResolvedValue(undefined);
    const createWritable = jest.fn().mockResolvedValue({ write, close });
    const getFileHandle = jest.fn().mockResolvedValue({ createWritable });
    const getDirectoryHandle = jest.fn().mockResolvedValue({ getFileHandle });
    Object.defineProperty(navigator, 'storage', {
      configurable: true,
      value: { getDirectory: jest.fn().mockResolvedValue({ getDirectoryHandle }) },
    });

    await writeWebConversationMarkdown('c1', 'to-be-lost-after-reset', 'c1');
    await expect(decryptWebConversationPayload(savedPayload)).resolves.toBe(
      'to-be-lost-after-reset',
    );

    await resetWebLocalEncryptionKey();
    await expect(decryptWebConversationPayload(savedPayload)).resolves.toBeNull();
  });
});
