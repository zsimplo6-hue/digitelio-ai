// Hashage de mot de passe avec PBKDF2 (disponible nativement dans Cloudflare Workers via Web Crypto)

const ITERATIONS = 100000;
const HASH_ALGO = "SHA-256";
const KEY_LENGTH = 32; // octets

function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function deriveKey(password, salt) {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: ITERATIONS,
      hash: HASH_ALGO,
    },
    keyMaterial,
    KEY_LENGTH * 8
  );
  return derivedBits;
}

// Retourne une chaîne au format "salt_base64:hash_base64"
export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const derivedBits = await deriveKey(password, salt);
  return `${bufferToBase64(salt.buffer)}:${bufferToBase64(derivedBits)}`;
}

export async function verifyPassword(password, storedHash) {
  const [saltB64, hashB64] = storedHash.split(":");
  if (!saltB64 || !hashB64) return false;
  const salt = new Uint8Array(base64ToBuffer(saltB64));
  const derivedBits = await deriveKey(password, salt);
  const computedHashB64 = bufferToBase64(derivedBits);
  return computedHashB64 === hashB64;
}

