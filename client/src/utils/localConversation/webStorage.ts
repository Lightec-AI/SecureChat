const OPFS_ROOT = 'securechat-conversations';
const IDB_NAME = 'securechat-local-conv';
const IDB_STORE = 'kv';
const IDB_VERSION = 1;
const KEY_CRYPTO_JWK = 'webLocalAesGcmJwk';
const KEY_FSA_HANDLE = 'fsaDirectoryHandle';
const LS_ENCRYPT = 'securechat:localConv:webEncrypt';

const ENC_HEADER = 'SECURECHAT-ENC-v1';

function getEncryptPreference(): boolean {
  try {
    return localStorage.getItem(LS_ENCRYPT) === '1';
  } catch {
    return false;
  }
}

export function setWebLocalEncryptPreference(enabled: boolean): void {
  try {
    localStorage.setItem(LS_ENCRYPT, enabled ? '1' : '0');
  } catch {
    /* ignore */
  }
}

export function getWebLocalEncryptPreference(): boolean {
  return getEncryptPreference();
}

function idbOpen(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly');
    const store = tx.objectStore(IDB_STORE);
    const g = store.get(key);
    g.onsuccess = () => resolve(g.result as T | undefined);
    g.onerror = () => reject(g.error);
    tx.oncomplete = () => db.close();
  });
}

async function idbSet(key: string, value: unknown): Promise<void> {
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(value, key);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

async function idbDelete(key: string): Promise<void> {
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).delete(key);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

async function getOrCreateAesKey(): Promise<CryptoKey> {
  const existing = await idbGet<JsonWebKey>(KEY_CRYPTO_JWK);
  if (existing?.k) {
    return crypto.subtle.importKey('jwk', existing, { name: 'AES-GCM' }, false, [
      'encrypt',
      'decrypt',
    ]);
  }
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
    'encrypt',
    'decrypt',
  ]);
  const jwk = await crypto.subtle.exportKey('jwk', key);
  await idbSet(KEY_CRYPTO_JWK, jwk);
  return key;
}

function bytesToB64(buf: ArrayBufferLike): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function b64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function encryptPayload(plain: string): Promise<string> {
  const key = await getOrCreateAesKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plain),
  );
  return `${ENC_HEADER}\n${bytesToB64(iv.buffer)}:${bytesToB64(enc)}`;
}

export function isWebLocalEncryptedPayload(payload: string): boolean {
  return payload.startsWith(`${ENC_HEADER}\n`);
}

export async function decryptWebConversationPayload(payload: string): Promise<string | null> {
  if (!isWebLocalEncryptedPayload(payload)) {
    return null;
  }
  const body = payload.slice(`${ENC_HEADER}\n`.length);
  const separatorIndex = body.indexOf(':');
  if (separatorIndex <= 0) {
    return null;
  }
  const ivB64 = body.slice(0, separatorIndex);
  const cipherB64 = body.slice(separatorIndex + 1);
  if (cipherB64.length === 0) {
    return null;
  }

  try {
    const key = await getOrCreateAesKey();
    const iv = b64ToBytes(ivB64);
    const cipher = b64ToBytes(cipherB64);
    const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher);
    return new TextDecoder().decode(plainBuf);
  } catch {
    return null;
  }
}

async function getOpfsConversationsDir(): Promise<FileSystemDirectoryHandle> {
  const root = await navigator.storage.getDirectory();
  return root.getDirectoryHandle(OPFS_ROOT, { create: true });
}

async function writeOpfsFile(name: string, body: string): Promise<void> {
  const dir = await getOpfsConversationsDir();
  const fh = await dir.getFileHandle(name, { create: true });
  const w = await fh.createWritable();
  await w.write(body);
  await w.close();
}

export async function writeWebConversationMarkdown(
  _conversationId: string,
  markdown: string,
  safeName: string,
): Promise<boolean> {
  if (!navigator.storage?.getDirectory) {
    return false;
  }
  const payload = getEncryptPreference() ? await encryptPayload(markdown) : markdown;
  const fsaHandle = await idbGet<FileSystemDirectoryHandle>(KEY_FSA_HANDLE);
  const permissionedHandle = fsaHandle as
    | (FileSystemDirectoryHandle & {
        requestPermission?: (descriptor?: {
          mode?: 'read' | 'readwrite';
        }) => Promise<PermissionState>;
      })
    | null;
  if (permissionedHandle && typeof permissionedHandle.requestPermission === 'function') {
    try {
      const perm = await permissionedHandle.requestPermission({ mode: 'readwrite' });
      if (perm === 'granted') {
        const convDir = await permissionedHandle.getDirectoryHandle('conversations', {
          create: true,
        });
        const fh = await convDir.getFileHandle(`${safeName}.md`, { create: true });
        const w = await fh.createWritable();
        await w.write(payload);
        await w.close();
        return true;
      }
    } catch {
      /* fall through to OPFS */
    }
  }
  await writeOpfsFile(`${safeName}.md`, payload);
  return true;
}

export async function pickWebSyncFolder(): Promise<boolean> {
  const picker = (
    window as Window & {
      showDirectoryPicker?: (opts?: { mode?: string }) => Promise<FileSystemDirectoryHandle>;
    }
  ).showDirectoryPicker;
  if (!picker) {
    return false;
  }
  const handle = await picker({ mode: 'readwrite' });
  await idbSet(KEY_FSA_HANDLE, handle);
  return true;
}

export async function clearWebSyncFolder(): Promise<void> {
  await idbDelete(KEY_FSA_HANDLE);
}

export async function resetWebLocalEncryptionKey(): Promise<void> {
  await idbDelete(KEY_CRYPTO_JWK);
}

export async function hasWebSyncFolder(): Promise<boolean> {
  const h = await idbGet<FileSystemDirectoryHandle>(KEY_FSA_HANDLE);
  return Boolean(h);
}

export function supportsWebDirectoryPicker(): boolean {
  return (
    typeof (window as Window & { showDirectoryPicker?: unknown }).showDirectoryPicker === 'function'
  );
}
