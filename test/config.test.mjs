import assert from "node:assert/strict";
import test from "node:test";
import { loadConfig } from "../src/server/config.mjs";

const env = {
  NODE_ENV: "production",
  PORT: "8080",
  DASHBOARD_GAMES_API_URL: "https://dashboard.example.test/api/modules/games/v1",
  DASHBOARD_GAME_ID: "golden-path-game",
  DASHBOARD_GAME_API_KEY: "test-key-that-is-at-least-forty-characters-long",
  GAME_VERSION: "2.0.0",
  COMMIT_SHA: "a".repeat(40),
  PUBLIC_BASE_URL: "https://game.example.test"
};

test("leitet die feste Dashboard-Start-URL aus der API-Origin ab", () => {
  const config = loadConfig(env);
  assert.equal(config.dashboardLaunchUrl, "https://dashboard.example.test/?view=games");
  assert.equal(config.dashboardApiUrl, env.DASHBOARD_GAMES_API_URL);
});

test("weist unsichere externe URLs und unvollständige API-Basen ab", () => {
  assert.throws(() => loadConfig({ ...env, PUBLIC_BASE_URL: "http://game.example.test" }), /HTTPS/);
  assert.throws(() => loadConfig({ ...env, DASHBOARD_GAMES_API_URL: "https://dashboard.example.test/api" }), /Games-v1/);
});
