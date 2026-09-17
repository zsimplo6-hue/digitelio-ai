// Implémentation légère de JWT (HS256) avec Web Crypto, sans dépendance externe

function base64urlEncode(input) {
  let bytes;
  if (typeof input === "string") {
    bytes = new TextEncoder().encode(input);
  } else {
    bytes = new Uint8Array(input);
  }
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecode(str) {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function getSigningKey(secret) {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function signJWT(payload, secret, expiresInSeconds = 60 * 60 * 24 * 7) {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = { ...payload, iat: now, exp: now + expiresInSeconds };

  const encodedHeader = base64urlEncode(JSON.stringify(header));
  const encodedPayload = base64urlEncode(JSON.stringify(fullPayload));
  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  const key = await getSigningKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(dataToSign));
  const encodedSignature = base64urlEncode(signature);

  return `${dataToSign}.${encodedSignature}`;
}

export async function verifyJWT(token, secret) {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  const key = await getSigningKey(secret);
  const signatureBytes = base64urlDecode(encodedSignature);
  const isValid = await crypto.subtle.verify(
    "HMAC",
    key,
    signatureBytes,
    new TextEncoder().encode(dataToSign)
  );
  if (!isValid) return null;

  const payload = JSON.parse(new TextDecoder().decode(base64urlDecode(encodedPayload)));
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) return null; // expiré

  return payload;
}

