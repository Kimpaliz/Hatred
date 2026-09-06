const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const GAME_ID = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const COMMIT = /^[0-9a-f]{40,64}$/;

function requireValue(env, name) {
  const value = env[name]?.trim();
  if (!value) throw new Error(`${name} fehlt.`);
  return value;
}

function httpsUrl(value, name, { allowLocalHttp = false } = {}) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${name} ist keine gültige URL.`);
  }
  const localHttp = allowLocalHttp && parsed.protocol === "http:"
    && (parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost");
  if (parsed.protocol !== "https:" && !localHttp) throw new Error(`${name} muss HTTPS verwenden.`);
  if (parsed.username || parsed.password || parsed.hash) throw new Error(`${name} darf keine Zugangsdaten oder Fragmente enthalten.`);
  return parsed;
}

export function loadConfig(env = process.env) {
  const mode = env.NODE_ENV?.trim() || "production";
  const dashboardApi = httpsUrl(requireValue(env, "DASHBOARD_GAMES_API_URL"), "DASHBOARD_GAMES_API_URL", {
    allowLocalHttp: mode !== "production"
  });
  if (!dashboardApi.pathname.endsWith("/api/modules/games/v1")) {
    throw new Error("DASHBOARD_GAMES_API_URL muss die vollständige Games-v1-Basis sein.");
  }
  dashboardApi.pathname = dashboardApi.pathname.replace(/\/+$/, "");

  const gameId = requireValue(env, "DASHBOARD_GAME_ID");
  if (!GAME_ID.test(gameId)) throw new Error("DASHBOARD_GAME_ID ist keine gültige Game-ID.");
  const gameVersion = requireValue(env, "GAME_VERSION");
  if (!SEMVER.test(gameVersion)) throw new Error("GAME_VERSION ist keine gültige SemVer-Version.");
  const commitSha = requireValue(env, "COMMIT_SHA");
  if (!COMMIT.test(commitSha)) throw new Error("COMMIT_SHA muss ein kleingeschriebener Git-SHA sein.");
  const publicBaseUrl = httpsUrl(requireValue(env, "PUBLIC_BASE_URL"), "PUBLIC_BASE_URL", {
    allowLocalHttp: mode !== "production"
  });
  publicBaseUrl.pathname = "/";
  publicBaseUrl.search = "";

  const dashboardLaunchUrl = new URL("/", dashboardApi.origin);
  dashboardLaunchUrl.searchParams.set("view", "games");

  const port = Number(env.PORT || 8080);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error("PORT muss zwischen 1024 und 65535 liegen.");

  return Object.freeze({
    mode,
    port,
    dashboardApiUrl: dashboardApi.toString().replace(/\/$/, ""),
    dashboardLaunchUrl: dashboardLaunchUrl.toString(),
    gameId,
    gameVersion,
    commitSha,
    publicBaseUrl: publicBaseUrl.toString().replace(/\/$/, ""),
    apiKey: requireValue(env, "DASHBOARD_GAME_API_KEY")
  });
}
