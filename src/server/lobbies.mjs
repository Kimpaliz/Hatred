import crypto from "node:crypto";

const INVITE_TTL_MS = 15 * 60_000;
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function secret() {
  return crypto.randomBytes(32).toString("base64url");
}

function hash(value) {
  return crypto.createHash("sha256").update(value).digest();
}

function equalSecret(raw, expected) {
  if (typeof raw !== "string" || raw.length < 22 || raw.length > 256) return false;
  const actual = hash(raw);
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

function lobbyCode() {
  const bytes = crypto.randomBytes(6);
  return Array.from(bytes, (value) => ALPHABET[value % ALPHABET.length]).join("");
}

function normalizeDisplayName(value) {
  if (typeof value !== "string") return null;
  const normalized = value.normalize("NFKC").replace(/[\u0000-\u001f\u007f]/g, "").trim().replace(/\s+/g, " ");
  return normalized.length >= 1 && normalized.length <= 32 ? normalized : null;
}

function normalizeCode(value) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  return /^[A-HJ-NP-Z2-9]{6}$/.test(normalized) ? normalized : null;
}

export class InMemoryLobbyBroker {
  #lobbies = new Map();
  #attempts = new Map();

  createInvite(ownerKey, publicBaseUrl) {
    let code;
    do code = lobbyCode(); while (this.#lobbies.has(code));
    const inviteToken = secret();
    const expiresAt = Date.now() + INVITE_TTL_MS;
    this.#lobbies.set(code, {
      ownerKey,
      inviteHash: hash(inviteToken),
      expiresAt,
      claimed: false,
      role: "player"
    });
    const inviteUrl = new URL(publicBaseUrl);
    inviteUrl.searchParams.set("code", code);
    inviteUrl.searchParams.set("mode", "player");
    inviteUrl.hash = `invite=${encodeURIComponent(inviteToken)}`;
    return { code, inviteUrl: inviteUrl.toString(), expiresAt: new Date(expiresAt).toISOString() };
  }

  #withinRateLimit(remoteAddress) {
    const now = Date.now();
    const current = this.#attempts.get(remoteAddress);
    if (!current || current.resetAt <= now) {
      this.#attempts.set(remoteAddress, { count: 1, resetAt: now + 60_000 });
      return true;
    }
    current.count += 1;
    return current.count <= 8;
  }

  #claim(codeValue, inviteToken, remoteAddress) {
    const code = normalizeCode(codeValue);
    if (!this.#withinRateLimit(remoteAddress || "unknown")) return null;
    const lobby = code ? this.#lobbies.get(code) : null;
    const valid = lobby && lobby.expiresAt > Date.now() && !lobby.claimed
      && equalSecret(inviteToken, lobby.inviteHash);
    if (!valid) return null;
    lobby.claimed = true;
    lobby.inviteHash = hash(secret());
    return { code, role: lobby.role, expiresAt: new Date(lobby.expiresAt).toISOString() };
  }

  claimGuest({ code, inviteToken, displayName, remoteAddress }) {
    const name = normalizeDisplayName(displayName);
    if (!name) return null;
    const lobby = this.#claim(code, inviteToken, remoteAddress);
    return lobby ? { ...lobby, displayName: name } : null;
  }

  claimDashboard({ code, inviteToken, remoteAddress }) {
    return this.#claim(code, inviteToken, remoteAddress);
  }
}
