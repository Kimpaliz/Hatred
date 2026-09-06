import http from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { GAME_RUNTIME_ENDPOINTS } from "@dashboard/games-sdk/contract";
import { cookieToken, expiredSessionCookie, MemorySessionStore, sessionCookie } from "./sessions.mjs";
import { InMemoryLobbyBroker } from "./lobbies.mjs";
import { handleWebSocketUpgrade } from "./websocket.mjs";

const MAX_JSON_BYTES = 16 * 1024;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../");
const STATIC_FILES = new Map([
  ["/", [path.join(ROOT, "src/client/index.html"), "text/html; charset=utf-8"]],
  ["/app.mjs", [path.join(ROOT, "src/client/app.mjs"), "text/javascript; charset=utf-8"]],
  ["/styles.css", [path.join(ROOT, "src/client/styles.css"), "text/css; charset=utf-8"]],
  ["/sdk/browser.mjs", [path.join(ROOT, "packages/dashboard-games-sdk/src/browser.mjs"), "text/javascript; charset=utf-8"]],
  ["/sdk/contract.mjs", [path.join(ROOT, "packages/dashboard-games-sdk/src/contract.mjs"), "text/javascript; charset=utf-8"]],
  ["/dashboard/cover.png", [path.join(ROOT, "public/dashboard/cover.png"), "image/png"]],
  ["/dashboard/hero.png", [path.join(ROOT, "public/dashboard/hero.png"), "image/png"]],
  ["/dashboard/icon.png", [path.join(ROOT, "public/dashboard/icon.png"), "image/png"]]
]);

function json(response, status, payload, extraHeaders = {}) {
  const body = Buffer.from(JSON.stringify(payload), "utf8");
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "content-length": body.length,
    "x-content-type-options": "nosniff",
    ...extraHeaders
  });
  response.end(body);
}

function exactKeys(value, keys) {
  return value && typeof value === "object" && !Array.isArray(value)
    && Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

async function jsonBody(request) {
  if (!String(request.headers["content-type"] || "").toLowerCase().startsWith("application/json")) {
    const error = new Error("JSON erforderlich.");
    error.status = 415;
    throw error;
  }
  let size = 0;
  const chunks = [];
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_JSON_BYTES) {
      const error = new Error("Anfrage zu groß.");
      error.status = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
  } catch {
    const error = new Error("Ungültiges JSON.");
    error.status = 400;
    throw error;
  }
}

function sameOrigin(request, config) {
  const origin = request.headers.origin;
  const fetchSite = request.headers["sec-fetch-site"];
  return (!origin || origin === new URL(config.publicBaseUrl).origin)
    && (!fetchSite || fetchSite === "same-origin");
}

function activeSession(request, sessions) {
  return sessions.get(cookieToken(request));
}

async function staticResponse(request, response, pathname) {
  if (request.method !== "GET" && request.method !== "HEAD") return false;
  const target = STATIC_FILES.get(pathname);
  if (!target) return false;
  try {
    const body = await readFile(target[0]);
    response.writeHead(200, {
      "content-type": target[1],
      "content-length": body.length,
      // Das Dashboard ruft das Artwork unter einer digest-gestempelten URL ab
      // (`?v=<imageDigest>`), der Inhalt hinter dieser URL aendert sich nie.
      "cache-control": pathname.startsWith("/dashboard/")
        ? "public, max-age=31536000, immutable"
        : "no-cache",
      "x-content-type-options": "nosniff",
      "content-security-policy": "default-src 'self'; connect-src 'self' ws: wss:; img-src 'self'; style-src 'self'; script-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
      "referrer-policy": "no-referrer"
    });
    response.end(request.method === "HEAD" ? undefined : body);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    json(response, 404, { error: "not_found" });
  }
  return true;
}

export function createGameServer({ config, platformService, sessions = new MemorySessionStore(), lobbies = new InMemoryLobbyBroker() }) {
  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url || "/", config.publicBaseUrl);
      if (await staticResponse(request, response, url.pathname)) return;

      if (request.method === "GET" && url.pathname === "/healthz") {
        json(response, 200, { status: "ok" });
        return;
      }
      if (request.method === "GET" && url.pathname === "/version.json") {
        json(response, 200, { gameId: config.gameId, version: config.gameVersion, commitSha: config.commitSha });
        return;
      }
      if (request.method === "GET" && url.pathname === GAME_RUNTIME_ENDPOINTS.platform) {
        json(response, 200, {
          mode: "dashboard",
          requiresDashboardSession: true,
          guestSessionsSupported: true,
          dashboardLaunchUrl: config.dashboardLaunchUrl
        });
        return;
      }

      if (request.method === "POST" && !sameOrigin(request, config)) {
        json(response, 403, { error: "forbidden" });
        return;
      }

      if (request.method === "POST" && url.pathname === GAME_RUNTIME_ENDPOINTS.session) {
        const body = await jsonBody(request);
        if (!exactKeys(body, ["launchCode"]) || typeof body.launchCode !== "string"
          || body.launchCode.length < 16 || body.launchCode.length > 512) {
          json(response, 400, { error: "invalid_request" });
          return;
        }
        const exchange = await platformService.exchangeLaunchCode(body.launchCode);
        const created = sessions.createDashboard(exchange);
        json(response, 200, sessions.publicSession(created.key), { "set-cookie": sessionCookie(created.cookieToken) });
        return;
      }

      if (request.method === "GET" && url.pathname === GAME_RUNTIME_ENDPOINTS.currentSession) {
        const active = activeSession(request, sessions);
        if (!active) {
          json(response, 401, { error: "session_required" }, { "set-cookie": expiredSessionCookie() });
          return;
        }
        json(response, 200, sessions.publicSession(active.key));
        return;
      }

      if (request.method === "POST" && url.pathname === GAME_RUNTIME_ENDPOINTS.webSocketToken) {
        const body = await jsonBody(request);
        if (!exactKeys(body, [])) {
          json(response, 400, { error: "invalid_request" });
          return;
        }
        const active = activeSession(request, sessions);
        const wsToken = active ? sessions.issueWebSocketToken(active.key) : null;
        json(response, wsToken ? 200 : 401, wsToken ? { wsToken, expiresInSeconds: 60 } : { error: "session_required" });
        return;
      }

      if (request.method === "POST" && url.pathname === GAME_RUNTIME_ENDPOINTS.guestSession) {
        const body = await jsonBody(request);
        if (!exactKeys(body, ["code", "inviteToken", "displayName"])) {
          json(response, 400, { error: "invalid_request" });
          return;
        }
        const claim = lobbies.claimGuest({ ...body, remoteAddress: request.socket.remoteAddress });
        if (!claim) {
          json(response, 404, { error: "invite_unavailable" });
          return;
        }
        const created = sessions.createGuest({ displayName: claim.displayName, lobby: claim, expiresAt: claim.expiresAt });
        json(response, 200, sessions.publicSession(created.key), { "set-cookie": sessionCookie(created.cookieToken) });
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/lobbies") {
        const body = await jsonBody(request);
        const active = activeSession(request, sessions);
        if (!exactKeys(body, []) || !active || active.session.kind !== "dashboard") {
          json(response, active ? 400 : 401, { error: active ? "invalid_request" : "session_required" });
          return;
        }
        json(response, 201, lobbies.createInvite(active.key, config.publicBaseUrl));
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/lobbies/claim") {
        const body = await jsonBody(request);
        const active = activeSession(request, sessions);
        if (!active) {
          json(response, 401, { error: "session_required" });
          return;
        }
        if (!exactKeys(body, ["code", "inviteToken"])) {
          json(response, 400, { error: "invalid_request" });
          return;
        }
        const claim = lobbies.claimDashboard({ ...body, remoteAddress: request.socket.remoteAddress });
        if (!claim) {
          json(response, 404, { error: "invite_unavailable" });
          return;
        }
        sessions.bindLobby(active.key, claim);
        json(response, 200, sessions.publicSession(active.key));
        return;
      }

      json(response, 404, { error: "not_found" });
    } catch (error) {
      const status = Number.isInteger(error?.status) && error.status >= 400 && error.status < 600 ? error.status : 500;
      json(response, status, { error: status >= 500 ? "internal_error" : "invalid_request" });
    }
  });
  server.on("upgrade", (request, socket, head) => handleWebSocketUpgrade(request, socket, head, { config, sessions }));
  return server;
}
