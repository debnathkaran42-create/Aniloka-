/* =========================================================
   ANILOKA — CRYPTO UTILITIES
   -----------------------------------------------------------
   Password hashing: Node's built-in scrypt (a real, modern,
   memory-hard KDF — the same class of algorithm bcrypt/argon2
   belong to). No external hashing package needed.

   Session tokens: a minimal JWT-style signed token
   (header.payload.signature, HMAC-SHA256) so we don't need
   the "jsonwebtoken" package either. Same security property
   that matters here: the payload can't be forged without
   knowing SESSION_SECRET.
   ========================================================= */
const crypto = require("node:crypto");

const SCRYPT_KEYLEN = 64;

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, SCRYPT_KEYLEN).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  if (!stored || !stored.includes(":")) return false;
  const [salt, hash] = stored.split(":");
  const candidate = crypto.scryptSync(password, salt, SCRYPT_KEYLEN);
  const expected = Buffer.from(hash, "hex");
  if (candidate.length !== expected.length) return false;
  return crypto.timingSafeEqual(candidate, expected);
}

function base64url(input) {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function base64urlDecode(input) {
  input = input.replace(/-/g, "+").replace(/_/g, "/");
  while (input.length % 4) input += "=";
  return Buffer.from(input, "base64").toString("utf8");
}

function signToken(payload, secret, expiresInSeconds = 60 * 60 * 24 * 7) {
  const header = { alg: "HS256", typ: "AniLokaToken" };
  const body = { ...payload, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + expiresInSeconds };
  const encHeader = base64url(JSON.stringify(header));
  const encBody = base64url(JSON.stringify(body));
  const sig = crypto.createHmac("sha256", secret).update(`${encHeader}.${encBody}`).digest("base64")
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${encHeader}.${encBody}.${sig}`;
}

function verifyToken(token, secret) {
  if (!token || typeof token !== "string" || token.split(".").length !== 3) return null;
  const [encHeader, encBody, sig] = token.split(".");
  const expectedSig = crypto.createHmac("sha256", secret).update(`${encHeader}.${encBody}`).digest("base64")
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) return null;
  let payload;
  try { payload = JSON.parse(base64urlDecode(encBody)); } catch (e) { return null; }
  if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) return null;
  return payload;
}

function randomId(prefix = "") {
  return (prefix ? prefix + "_" : "") + crypto.randomBytes(12).toString("hex");
}

module.exports = { hashPassword, verifyPassword, signToken, verifyToken, randomId };
