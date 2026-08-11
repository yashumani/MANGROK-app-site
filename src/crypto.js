const encoder = new TextEncoder();
const decoder = new TextDecoder();
const ITERATIONS = 310000;

function subtle() {
  if (!globalThis.crypto?.subtle) throw new Error("Web Crypto is not available in this browser.");
  return globalThis.crypto.subtle;
}
function bytesToBase64(bytes) {
  if (typeof Buffer !== "undefined") return Buffer.from(bytes).toString("base64");
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
function base64ToBytes(value) {
  if (typeof Buffer !== "undefined") return new Uint8Array(Buffer.from(value, "base64"));
  const binary = atob(value); return Uint8Array.from(binary, c => c.charCodeAt(0));
}
export function toBase64Url(bytes) { return bytesToBase64(bytes).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, ""); }
export function fromBase64Url(value) {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  return base64ToBytes(normalized + "=".repeat((4 - normalized.length % 4) % 4));
}

async function deriveKey(passphrase, salt, iterations = ITERATIONS) {
  if (String(passphrase).length < 10) throw new Error("Use a secret passphrase with at least 10 characters.");
  const material = await subtle().importKey("raw", encoder.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  return subtle().deriveKey({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, material,
    { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}
function context(recipeId) { return encoder.encode(`mangrok:sealed-note:${String(recipeId)}`); }

export async function encryptSecret(plaintext, passphrase, recipeId) {
  if (!String(plaintext).trim()) return null;
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt, ITERATIONS);
  const cipher = await subtle().encrypt({ name: "AES-GCM", iv, additionalData: context(recipeId) }, key, encoder.encode(plaintext));
  return { ciphertext: bytesToBase64(new Uint8Array(cipher)), iv: bytesToBase64(iv), salt: bytesToBase64(salt), iterations: ITERATIONS, version: 1 };
}

export async function decryptSecret(payload, passphrase, recipeId) {
  if (!payload) return "";
  try {
    const key = await deriveKey(passphrase, base64ToBytes(payload.salt), payload.iterations || ITERATIONS);
    const plain = await subtle().decrypt({ name: "AES-GCM", iv: base64ToBytes(payload.iv), additionalData: context(recipeId) },
      key, base64ToBytes(payload.ciphertext));
    return decoder.decode(plain);
  } catch {
    throw new Error("The passphrase is incorrect, or this sealed note has been altered.");
  }
}

export async function encryptShareEnvelope(plaintext) {
  const rawKey = crypto.getRandomValues(new Uint8Array(32));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await subtle().importKey("raw", rawKey, { name: "AES-GCM" }, false, ["encrypt"]);
  const ciphertext = await subtle().encrypt({ name: "AES-GCM", iv }, key, encoder.encode(String(plaintext)));
  return { payload: { ciphertext: bytesToBase64(new Uint8Array(ciphertext)), iv: bytesToBase64(iv), version: 1 }, fragmentKey: toBase64Url(rawKey) };
}

export async function decryptShareEnvelope(payload, fragmentKey) {
  try {
    const key = await subtle().importKey("raw", fromBase64Url(fragmentKey), { name: "AES-GCM" }, false, ["decrypt"]);
    const plaintext = await subtle().decrypt({ name: "AES-GCM", iv: base64ToBytes(payload.iv) }, key, base64ToBytes(payload.ciphertext));
    return decoder.decode(plaintext);
  } catch { throw new Error("This share key is invalid or the shared secret was altered."); }
}

export function secretFingerprint(payload) {
  return payload ? `${payload.version}:${payload.iterations}:${payload.salt.slice(0, 8)}:${payload.ciphertext.slice(0, 12)}` : "none";
}
