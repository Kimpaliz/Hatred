import { GAME_RUNTIME_ENDPOINTS } from "/sdk/contract.mjs";
import {
  consumeFragmentCredentials,
  createDashboardResumeUrl,
  parsePlatformDescriptor,
  storeInviteHandoff,
  takeInviteHandoff
} from "/sdk/browser.mjs";

const GAME_ID = "golden-path-game";
const statusNode = document.querySelector("#status");
const choiceNode = document.querySelector("#invite-choice");
const gameNode = document.querySelector("#game");
const welcomeNode = document.querySelector("#welcome");
const kindNode = document.querySelector("#session-kind");
const guestName = document.querySelector("#guest-name");
const joinGuest = document.querySelector("#join-guest");
const joinDashboard = document.querySelector("#join-dashboard");
const createInvite = document.querySelector("#create-invite");
const inviteOutput = document.querySelector("#invite-output");

let platform;
let pendingInvite = null;
let currentSession = null;

function lobbyCode() {
  const code = new URL(location.href).searchParams.get("code")?.toUpperCase() || "";
  return /^[A-HJ-NP-Z2-9]{6}$/.test(code) ? code : null;
}

async function api(path, { method = "GET", body } = {}) {
  const response = await fetch(path, {
    method,
    credentials: "same-origin",
    headers: body === undefined ? { accept: "application/json" } : {
      accept: "application/json",
      "content-type": "application/json"
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const payload = await response.json();
  if (!response.ok) throw Object.assign(new Error(payload.error || "request_failed"), { status: response.status });
  return payload;
}

function saveInvite(inviteToken) {
  const code = lobbyCode();
  if (!inviteToken || !code) return null;
  storeInviteHandoff({ gameId: GAME_ID, code, inviteToken });
  return { code, inviteToken };
}

function recoverInvite() {
  const code = lobbyCode();
  if (!code) return null;
  const saved = takeInviteHandoff({ gameId: GAME_ID, code });
  return saved ? { code: saved.code, inviteToken: saved.inviteToken } : null;
}

async function claimInvite(session) {
  pendingInvite ||= recoverInvite();
  if (!pendingInvite || session.kind !== "dashboard") return session;
  const claimed = await api("/api/lobbies/claim", { method: "POST", body: pendingInvite });
  takeInviteHandoff({ gameId: GAME_ID, code: pendingInvite.code });
  pendingInvite = null;
  return claimed;
}

function connectWebSocket(wsToken) {
  const url = new URL("/ws", location.href);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  const socket = new WebSocket(url, ["dashboard-games", wsToken]);
  socket.addEventListener("open", () => { statusNode.textContent = "Sicher verbunden."; });
  socket.addEventListener("close", () => { statusNode.textContent = "Spielverbindung beendet."; });
}

function showSession(session) {
  currentSession = session;
  choiceNode.hidden = true;
  gameNode.hidden = false;
  const name = session.kind === "dashboard" ? session.player.displayName : session.guest.displayName;
  welcomeNode.textContent = `Willkommen, ${name}`;
  kindNode.textContent = session.statisticsEnabled
    ? "Dashboard-Spieler: Fortschritt und Statistiken sind möglich."
    : "Gast: nur für diese Lobby, ohne Fortschritt und Statistiken.";
  createInvite.hidden = session.kind !== "dashboard";
  connectWebSocket(session.wsToken);
}

async function boot() {
  platform = parsePlatformDescriptor(await api(GAME_RUNTIME_ENDPOINTS.platform));
  const credentials = consumeFragmentCredentials({ location, history });
  pendingInvite = saveInvite(credentials.inviteToken);

  if (credentials.launchCode) {
    const launched = await api(GAME_RUNTIME_ENDPOINTS.session, {
      method: "POST",
      body: { launchCode: credentials.launchCode }
    });
    showSession(await claimInvite(launched));
    return;
  }

  try {
    const existing = await api(GAME_RUNTIME_ENDPOINTS.currentSession);
    showSession(await claimInvite(existing));
  } catch (error) {
    if (error.status !== 401) throw error;
    pendingInvite ||= recoverInvite();
    if (pendingInvite) {
      storeInviteHandoff({ gameId: GAME_ID, ...pendingInvite });
      choiceNode.hidden = false;
      statusNode.textContent = "Wähle, wie du der Einladung beitreten möchtest.";
      return;
    }
    statusNode.textContent = "Starte das Spiel über den Dashboard-Spielehub.";
  }
}

joinGuest.addEventListener("click", async () => {
  if (!pendingInvite) return;
  joinGuest.disabled = true;
  joinDashboard.disabled = true;
  try {
    const session = await api(GAME_RUNTIME_ENDPOINTS.guestSession, {
      method: "POST",
      body: { ...pendingInvite, displayName: guestName.value }
    });
    takeInviteHandoff({ gameId: GAME_ID, code: pendingInvite.code });
    pendingInvite = null;
    showSession(session);
  } catch {
    statusNode.textContent = "Diese Einladung ist nicht mehr verfügbar.";
  } finally {
    joinGuest.disabled = false;
    joinDashboard.disabled = false;
  }
});

joinDashboard.addEventListener("click", () => {
  if (!pendingInvite) return;
  storeInviteHandoff({ gameId: GAME_ID, ...pendingInvite });
  location.assign(createDashboardResumeUrl(platform, { gameId: GAME_ID, code: pendingInvite.code }));
});

createInvite.addEventListener("click", async () => {
  if (currentSession?.kind !== "dashboard") return;
  const invite = await api("/api/lobbies", { method: "POST", body: {} });
  inviteOutput.textContent = invite.inviteUrl;
});

boot().catch(() => {
  statusNode.textContent = "Die sichere Spielsession konnte nicht gestartet werden.";
});
