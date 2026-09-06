import {
  DEFAULT_INVITE_HANDOFF_TTL_MS,
  MAX_INVITE_HANDOFF_TTL_MS
} from "./contract.mjs";

const GAME_ID = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const LOBBY_CODE = /^[A-HJ-NP-Z2-9]{6}$/;
const OPAQUE_INVITE = /^[A-Za-z0-9_-]{22,256}$/;
const trustedPlatformDescriptors = new WeakSet();

export class FragmentCredentialError extends Error {
  constructor(message) {
    super(message);
    this.name = "FragmentCredentialError";
  }
}

export class InviteHandoffError extends Error {
  constructor(message) {
    super(message);
    this.name = "InviteHandoffError";
  }
}

export function consumeFragmentCredentials({ location, history }) {
  if (!location || !history || typeof history.replaceState !== "function") {
    throw new TypeError("location und history.replaceState sind erforderlich.");
  }
  const fragment = String(location.hash || "").replace(/^#/, "");
  const parameters = new URLSearchParams(fragment);
  const launchValues = parameters.getAll("launch_code");
  const inviteValues = parameters.getAll("invite");

  parameters.delete("launch_code");
  parameters.delete("invite");
  const remainder = parameters.toString();
  const cleanUrl = `${location.pathname || "/"}${location.search || ""}${remainder ? `#${remainder}` : ""}`;
  history.replaceState(null, "", cleanUrl);

  if (launchValues.length > 1 || inviteValues.length > 1) {
    throw new FragmentCredentialError("Fragment-Credentials dürfen nicht mehrfach vorkommen.");
  }
  const launchCode = launchValues[0] || null;
  const inviteToken = inviteValues[0] || null;
  if (launchCode && (launchCode.length > 512 || /[\u0000-\u001f\u007f]/.test(launchCode))) {
    throw new FragmentCredentialError("launch_code ist ungültig.");
  }
  if (inviteToken && !OPAQUE_INVITE.test(inviteToken)) {
    throw new FragmentCredentialError("invite ist kein gültiges opakes Capability-Token.");
  }
  return Object.freeze({ launchCode, inviteToken });
}

export function parsePlatformDescriptor(payload) {
  if (!isPlainObject(payload)) throw new TypeError("Plattformbeschreibung muss ein Objekt sein.");
  const mode = payload.mode;
  if (!new Set(["standalone", "mock", "dashboard"]).has(mode)) {
    throw new TypeError("Unbekannter Plattformmodus.");
  }
  if (typeof payload.requiresDashboardSession !== "boolean") {
    throw new TypeError("requiresDashboardSession fehlt.");
  }
  if (typeof payload.guestSessionsSupported !== "boolean") {
    throw new TypeError("guestSessionsSupported fehlt.");
  }
  const dashboardLaunchUrl = payload.dashboardLaunchUrl === undefined
    ? null
    : normalizeDashboardLaunchUrl(payload.dashboardLaunchUrl);
  if (mode === "dashboard" && !dashboardLaunchUrl) {
    throw new TypeError("dashboardLaunchUrl fehlt im Dashboard-Modus.");
  }
  const descriptor = Object.freeze({
    mode,
    requiresDashboardSession: payload.requiresDashboardSession,
    guestSessionsSupported: payload.guestSessionsSupported,
    dashboardLaunchUrl
  });
  trustedPlatformDescriptors.add(descriptor);
  return descriptor;
}

export function createDashboardResumeUrl(platform, { gameId, code }) {
  if (!trustedPlatformDescriptors.has(platform)) {
    throw new TypeError("Plattformbeschreibung muss aus parsePlatformDescriptor stammen.");
  }
  assertGameId(gameId);
  const normalizedCode = normalizeLobbyCode(code);
  if (!platform.dashboardLaunchUrl) {
    throw new InviteHandoffError("Dashboard-Anmeldung ist für diese Plattform nicht verfügbar.");
  }
  const destination = new URL(platform.dashboardLaunchUrl);
  destination.searchParams.set("view", "games");
  destination.searchParams.set("game", gameId);
  destination.searchParams.set("resumeInvite", normalizedCode);
  return destination.toString();
}

export function storeInviteHandoff({
  storage = defaultSessionStorage(),
  gameId,
  code,
  inviteToken,
  now = Date.now(),
  ttlMs = DEFAULT_INVITE_HANDOFF_TTL_MS
}) {
  assertGameId(gameId);
  const normalizedCode = normalizeLobbyCode(code);
  assertInviteToken(inviteToken);
  if (!Number.isSafeInteger(now) || now < 0) throw new TypeError("now ist ungültig.");
  if (!Number.isSafeInteger(ttlMs) || ttlMs <= 0 || ttlMs > MAX_INVITE_HANDOFF_TTL_MS) {
    throw new TypeError(`ttlMs muss zwischen 1 und ${MAX_INVITE_HANDOFF_TTL_MS} liegen.`);
  }
  const record = {
    schemaVersion: 1,
    gameId,
    code: normalizedCode,
    inviteToken,
    createdAt: now,
    expiresAt: now + ttlMs
  };
  storage.setItem(handoffKey(gameId, normalizedCode), JSON.stringify(record));
  return Object.freeze({ code: normalizedCode, expiresAt: record.expiresAt });
}

export function takeInviteHandoff({
  storage = defaultSessionStorage(),
  gameId,
  code,
  now = Date.now()
}) {
  assertGameId(gameId);
  const normalizedCode = normalizeLobbyCode(code);
  const key = handoffKey(gameId, normalizedCode);
  const serialized = storage.getItem(key);
  storage.removeItem(key);
  if (!serialized) return null;

  let record;
  try {
    record = JSON.parse(serialized);
  } catch {
    return null;
  }
  if (!isPlainObject(record)
    || record.schemaVersion !== 1
    || record.gameId !== gameId
    || record.code !== normalizedCode
    || !OPAQUE_INVITE.test(String(record.inviteToken || ""))
    || !Number.isSafeInteger(record.createdAt)
    || !Number.isSafeInteger(record.expiresAt)
    || record.expiresAt <= now
    || record.createdAt > now
    || record.expiresAt - record.createdAt > MAX_INVITE_HANDOFF_TTL_MS) {
    return null;
  }
  return Object.freeze({
    gameId,
    code: normalizedCode,
    inviteToken: record.inviteToken,
    createdAt: record.createdAt,
    expiresAt: record.expiresAt
  });
}

function normalizeDashboardLaunchUrl(value) {
  if (typeof value !== "string" || value.length > 2048) throw new TypeError("dashboardLaunchUrl ist ungültig.");
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new TypeError("dashboardLaunchUrl ist keine URL.");
  }
  if (url.protocol !== "https:" || url.username || url.password || url.hash || url.pathname !== "/") {
    throw new TypeError("dashboardLaunchUrl muss eine feste HTTPS-Dashboard-Basis sein.");
  }
  for (const key of url.searchParams.keys()) {
    if (key !== "view") throw new TypeError("dashboardLaunchUrl enthält unerlaubte Parameter.");
  }
  if (url.searchParams.has("view") && url.searchParams.get("view") !== "games") {
    throw new TypeError("dashboardLaunchUrl verweist nicht auf den Spiele-Hub.");
  }
  url.searchParams.set("view", "games");
  return url.toString();
}

function normalizeLobbyCode(value) {
  const code = String(value || "").toUpperCase();
  if (!LOBBY_CODE.test(code)) throw new TypeError("Lobbycode ist ungültig.");
  return code;
}

function assertGameId(value) {
  if (typeof value !== "string" || !GAME_ID.test(value)) throw new TypeError("Game-ID ist ungültig.");
}

function assertInviteToken(value) {
  if (typeof value !== "string" || !OPAQUE_INVITE.test(value)) {
    throw new TypeError("Invite-Token ist ungültig.");
  }
}

function handoffKey(gameId, code) {
  return `dashboard-games:invite-handoff:v1:${gameId}:${code}`;
}

function defaultSessionStorage() {
  if (typeof window === "undefined" || !window.sessionStorage) {
    throw new TypeError("sessionStorage muss außerhalb des Browsers explizit übergeben werden.");
  }
  return window.sessionStorage;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
