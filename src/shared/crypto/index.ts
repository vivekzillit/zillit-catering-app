// AES-256-CBC + bodyhash helpers matching the iOS / backend implementation.
// Uses the browser-native Web Crypto API.

const ENV_KEYS = {
  dev: 'Yz2eI81ZLzCxJwf7BjTsMjyx-_PH5op=',
  qa: 'Yz2eI81ZNzCzJwf7BjAsMjtx-_KH5wo=',
  prod: 'Yz2eI18NZZcZJcy7DjBsMjtx-_IJ5qe=',
} as const;

const AES_KEY_STRING = ENV_KEYS.dev;
const IV_STRING = 'Brxd-7fAiRQFYz2e';
const SALT = 'Brxd-7fAiRQFYz2e';

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToArrayBuffer(hex: string): ArrayBuffer {
  const len = hex.length / 2;
  const buf = new ArrayBuffer(len);
  const view = new Uint8Array(buf);
  for (let i = 0; i < len; i++) {
    view[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return buf;
}

let _cachedEncryptKey: CryptoKey | null = null;
let _cachedDecryptKey: CryptoKey | null = null;

async function getAesKey(usage: 'encrypt' | 'decrypt'): Promise<CryptoKey> {
  const cached = usage === 'encrypt' ? _cachedEncryptKey : _cachedDecryptKey;
  if (cached) return cached;
  const keyBytes = textEncoder.encode(AES_KEY_STRING);
  const key = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-CBC' },
    false,
    [usage]
  );
  if (usage === 'encrypt') _cachedEncryptKey = key;
  else _cachedDecryptKey = key;
  return key;
}

export async function encryptAES256CBC(plaintext: string): Promise<string> {
  const key = await getAesKey('encrypt');
  const iv = textEncoder.encode(IV_STRING);
  const data = textEncoder.encode(plaintext);
  const cipherBuffer = await crypto.subtle.encrypt({ name: 'AES-CBC', iv }, key, data);
  return toHex(cipherBuffer);
}

export async function decryptAES256CBC(hexCipher: string): Promise<string> {
  if (!hexCipher || !/^[0-9a-fA-F]+$/.test(hexCipher) || hexCipher.length % 32 !== 0) {
    return hexCipher;
  }
  try {
    const key = await getAesKey('decrypt');
    const iv = textEncoder.encode(IV_STRING);
    const plainBuffer = await crypto.subtle.decrypt(
      { name: 'AES-CBC', iv },
      key,
      hexToArrayBuffer(hexCipher)
    );
    return textDecoder.decode(plainBuffer);
  } catch {
    return hexCipher;
  }
}

export async function generateModuledata(
  userId: string,
  projectId: string,
  deviceId: string
): Promise<string> {
  const payload = JSON.stringify({
    user_id: userId,
    project_id: projectId,
    device_id: deviceId,
    time_stamp: Date.now(),
  });
  return encryptAES256CBC(payload);
}

export async function generateBodyhash(
  requestBody: string,
  moduledata: string
): Promise<string> {
  const virtualBody = !requestBody
    ? `{"payload":"","moduledata":"${moduledata}"}`
    : `{"payload":${requestBody},"moduledata":"${moduledata}"}`;
  const data = textEncoder.encode(virtualBody + SALT);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return toHex(hash);
}
