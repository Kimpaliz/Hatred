import crypto from "node:crypto";

export const SESSION_COOKIE = "__Host-dashboard_game_session";
const TOKEN_BYTES = 32;
const WS_TTL_MS = 60_000;

function token() {
  return crypto.randomBytes(TOKEN_BYTES).toString("base64url");
}

function digest(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function safeText(value, maxLength) {
  return typeof value === "string" && value.length > 0 && value.length <= maxLength ? value : null;
}

function expiresAt(value) {
  const time = Date.parse(value);
  return Number.isFinite(time) && time > Date.now() ? new Date(time).toISOString() : null;
}

export function sessionCookie(value) {
  return `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict`;
}

export function expiredSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

export function cookieToken(request) {
  const cookies = String(request.headers.cookie || "").split(";");
  for (const entry of cookies) {
    const separator = entry.indexOf("=");
    if (separator < 1) continue;
    if (entry.slice(0, separator).trim() !== SESSION_COOKIE) continue;
    const value = entry.slice(separator + 1).trim();
    return /^[A-Za-z0-9_-]{43}$/.test(value) ? value : null;
  }
  return null;
}

export class MemorySessionStore {
  #sessions = new Map();
  #wsTokens = new Map();

  #create(session) {
    const raw = token();
    const key = digest(raw);
    this.#sessions.set(key, session);
    return { cookieToken: raw, key, session };
  }

  createDashboard(exchange) {
    const sessionId = safeText(exchange?.sessionId, 256);
    const expiration = expiresAt(exchange?.expiresAt);
    const playerId = safeText(exchange?.player?.id, 256);
    const displayName = safeText(exchange?.player?.displayName, 80);
    if (!sessionId || !expiration || !playerId || !displayName) {
      throw new Error("Ungültige Sessionantwort der Plattform.");
    }
    return this.#create({
      kind: "dashboard",
      sessionId,
      expiresAt: expiration,
      player: {
        id: playerId,
        displayName,
        avatarUrl: exchange.player.avatarUrl === null ? null : null
      },
      progress: exchange.progress ?? null,
      lobby: null
    });
  }

  createGuest({ displayName, lobby, expiresAt: expiration }) {
    const normalizedExpiration = expiresAt(expiration);
    if (!safeText(displayName, 40) || !normalizedExpiration || !lobby?.code || !lobby?.role) {
      throw new Error("Ungültige Gastsession.");
    }
    return this.#create({
      kind: "guest",
      expiresAt: normalizedExpiration,
      displayName,
      lobby: { code: lobby.code, role: lobby.role }
    });
  }

  get(raw) {
    if (!raw) return null;
    const key = digest(raw);
    const session = this.#sessions.get(key);
    if (!session) return null;
    if (Date.parse(session.expiresAt) <= Date.now()) {
      this.#sessions.delete(key);
      return null;
    }
    return { key, session };
  }

  bindLobby(key, lobby) {
    const session = this.#sessions.get(key);
    if (!session || Date.parse(session.expiresAt) <= Date.now()) return null;
    session.lobby = { code: lobby.code, role: lobby.role };
    return session;
  }

  issueWebSocketToken(key) {
    const session = this.#sessions.get(key);
    if (!session || Date.parse(session.expiresAt) <= Date.now()) return null;
    const raw = token();
    this.#wsTokens.set(digest(raw), { key, expiresAt: Date.now() + WS_TTL_MS });
    return raw;
  }

  consumeWebSocketToken(raw) {
    if (!raw || !/^[A-Za-z0-9_-]{43}$/.test(raw)) return null;
    const key = digest(raw);
    const pending = this.#wsTokens.get(key);
    this.#wsTokens.delete(key);
    if (!pending || pending.expiresAt <= Date.now()) return null;
    const session = this.#sessions.get(pending.key);
    if (!session || Date.parse(session.expiresAt) <= Date.now()) return null;
    return session;
  }

  publicSession(key) {
    const session = this.#sessions.get(key);
    if (!session) return null;
    const wsToken = this.issueWebSocketToken(key);
    if (!wsToken) return null;
    if (session.kind === "dashboard") {
      return {
        kind: "dashboard",
        expiresAt: session.expiresAt,
        player: session.player,
        progress: session.progress,
        lobby: session.lobby,
        statisticsEnabled: true,
        wsToken
      };
    }
    return {
      kind: "guest",
      expiresAt: session.expiresAt,
      guest: { displayName: session.displayName },
      lobby: session.lobby,
      statisticsEnabled: false,
      wsToken
    };
  }
}
