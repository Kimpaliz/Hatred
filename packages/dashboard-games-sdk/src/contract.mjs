export const SDK_VERSION = "2.0.0";
export const MANIFEST_SCHEMA_VERSION = 2;
export const GAME_API_COMPATIBILITY = "games-v1";
export const GAMES_V1_API_PATH = "/api/modules/games/v1";
export const DASHBOARD_GAME_WORKFLOW = ".github/workflows/dashboard-game.yml";
export const DASHBOARD_GAME_MANIFEST = ".dashboard/game.yml";
export const DASHBOARD_GAME_RESULT_ARTIFACT = "dashboard-game-result";
export const DASHBOARD_GAME_RESULT_FILE = "dashboard-game-result.json";
export const DEFAULT_INVITE_HANDOFF_TTL_MS = 10 * 60_000;
export const MAX_INVITE_HANDOFF_TTL_MS = 15 * 60_000;

export const CANONICAL_MEDIA_PATHS = Object.freeze({
  cover: "public/dashboard/cover",
  hero: "public/dashboard/hero",
  icon: "public/dashboard/icon"
});

export const ALLOWED_MEDIA_EXTENSIONS = Object.freeze([
  "avif",
  "png",
  "jpg",
  "jpeg",
  "webp"
]);

export const GAME_SERVICE_ENDPOINTS = Object.freeze({
  exchange: "service/sessions/exchange",
  heartbeat: (sessionId) => `service/sessions/${encodeURIComponent(sessionId)}/heartbeat`,
  progress: (playerId) => `service/players/${encodeURIComponent(playerId)}/progress`,
  checkpoint: (sessionId) => `service/sessions/${encodeURIComponent(sessionId)}/checkpoint`,
  finish: (sessionId) => `service/sessions/${encodeURIComponent(sessionId)}/finish`,
  events: "service/events/batch"
});

export const GAME_RUNTIME_ENDPOINTS = Object.freeze({
  platform: "/api/platform",
  session: "/api/session",
  currentSession: "/api/session/current",
  webSocketToken: "/api/session/ws-token",
  guestSession: "/api/session/guest"
});
