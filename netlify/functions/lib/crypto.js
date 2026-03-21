const crypto = require("crypto");

function b64urlEncode(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function b64urlDecode(input) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + "=".repeat(padLength);
  return Buffer.from(padded, "base64");
}

function signStatePayload(payloadObj) {
  const secret = process.env.OAUTH_STATE_SECRET;
  if (!secret) {
    throw new Error("OAUTH_STATE_SECRET is missing");
  }
  const payload = b64urlEncode(JSON.stringify(payloadObj));
  const signature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
  return `${payload}.${signature}`;
}

function verifyAndParseState(state) {
  const secret = process.env.OAUTH_STATE_SECRET;
  if (!secret) {
    throw new Error("OAUTH_STATE_SECRET is missing");
  }
  const [payload, signature] = String(state || "").split(".");
  if (!payload || !signature) {
    throw new Error("Invalid state format");
  }

  const expected = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  const sigA = Buffer.from(signature, "utf8");
  const sigB = Buffer.from(expected, "utf8");

  if (sigA.length !== sigB.length || !crypto.timingSafeEqual(sigA, sigB)) {
    throw new Error("Invalid OAuth state signature");
  }

  const obj = JSON.parse(b64urlDecode(payload).toString("utf8"));

  if (!obj.ts || Date.now() - Number(obj.ts) > 10 * 60 * 1000) {
    throw new Error("OAuth state expired");
  }

  return obj;
}

function getAesKey() {
  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("TOKEN_ENCRYPTION_KEY is missing");
  }
  const key = crypto.createHash("sha256").update(raw).digest();
  return key;
}

function encryptToken(plain) {
  const iv = crypto.randomBytes(12);
  const key = getAesKey();
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(String(plain), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return JSON.stringify({
    iv: iv.toString("hex"),
    tag: tag.toString("hex"),
    data: encrypted.toString("hex"),
  });
}

function decryptToken(cipherJson) {
  const parsed = typeof cipherJson === "string" ? JSON.parse(cipherJson) : cipherJson;
  const key = getAesKey();
  const iv = Buffer.from(parsed.iv, "hex");
  const tag = Buffer.from(parsed.tag, "hex");
  const data = Buffer.from(parsed.data, "hex");

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString("utf8");
}

module.exports = {
  signStatePayload,
  verifyAndParseState,
  encryptToken,
  decryptToken,
};
