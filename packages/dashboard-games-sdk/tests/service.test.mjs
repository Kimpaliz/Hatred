import test from "node:test";
import assert from "node:assert/strict";

import {
  createGamesServiceClient,
  GamesServiceError,
  normalizeGamesV1BaseUrl
} from "../src/service.mjs";

const apiKey = "x".repeat(40);
const launchCode = "l".repeat(40);
const sessionId = "session-identifier-001";
const playerOne = "player-identifier-001";
const playerTwo = "player-identifier-002";

function jsonResponse(payload, { status = 200, contentType = "application/json; charset=utf-8" } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get(name) { return name.toLowerCase() === "content-type" ? contentType : null; } },
    async json() { return payload; }
  };
}

test("service client uses the complete Games-v1 base exactly once and sends strict JSON", async () => {
  const calls = [];
  const client = createGamesServiceClient({
    baseUrl: "https://dashboard.example/api/modules/games/v1/",
    apiKey,
    gameId: "roguelike-billard",
    gameVersion: "2.0.0",
    fetchImpl: async (...parameters) => {
      calls.push(parameters);
      return jsonResponse({ sessionId: "session-1" });
    }
  });
  await client.exchangeLaunchCode(launchCode);
  const [url, options] = calls[0];
  assert.equal(url, "https://dashboard.example/api/modules/games/v1/service/sessions/exchange");
  assert.equal(options.headers.Accept, "application/json");
  assert.equal(options.headers["Content-Type"], "application/json");
  assert.equal(options.headers.Authorization, `Bearer ${apiKey}`);
  assert.deepEqual(JSON.parse(options.body), {
    launchCode,
    gameId: "roguelike-billard",
    gameVersion: "2.0.0"
  });
});

test("competitive finish sends every participant and rejects duplicate players", async () => {
  let body;
  const client = createGamesServiceClient({
    baseUrl: "https://dashboard.example/api/modules/games/v1",
    apiKey,
    gameId: "roguelike-billard",
    gameVersion: "2.0.0",
    fetchImpl: async (_url, options) => {
      body = JSON.parse(options.body);
      return jsonResponse({ accepted: true });
    }
  });
  await client.finish(sessionId, {
    eventId: "event-1",
    runId: "run-1",
    participants: [
      { playerId: playerOne, result: "win", stats: { score: 9 }, rewards: {} },
      { playerId: playerTwo, result: "loss", stats: { score: 3 }, rewards: {} }
    ],
    finishedAt: "2026-08-08T12:00:00.000Z"
  });
  assert.equal(body.participants.length, 2);
  assert.equal(body.gameVersion, "2.0.0");
  assert.throws(() => client.finish(sessionId, {
    eventId: "event-2",
    runId: "run-2",
    participants: [
      { playerId: playerOne, result: "win", stats: {}, rewards: {} },
      { playerId: playerOne, result: "loss", stats: {}, rewards: {} }
    ]
  }), /doppelte playerId/);
});

test("service errors require JSON and preserve structured API error codes", async () => {
  const wrongContentType = createGamesServiceClient({
    baseUrl: "https://dashboard.example/api/modules/games/v1",
    apiKey,
    gameId: "roguelike-billard",
    gameVersion: "2.0.0",
    fetchImpl: async () => jsonResponse({}, { contentType: "text/html" })
  });
  await assert.rejects(() => wrongContentType.heartbeat(sessionId), (error) => {
    assert.ok(error instanceof GamesServiceError);
    assert.equal(error.code, "invalid_json_content_type");
    return true;
  });

  const rejected = createGamesServiceClient({
    baseUrl: "https://dashboard.example/api/modules/games/v1",
    apiKey,
    gameId: "roguelike-billard",
    gameVersion: "2.0.0",
    fetchImpl: async () => jsonResponse({ error: { code: "launch_expired", message: "Code expired" } }, { status: 401 })
  });
  await assert.rejects(() => rejected.exchangeLaunchCode(launchCode), (error) => {
    assert.equal(error.status, 401);
    assert.equal(error.code, "launch_expired");
    return true;
  });
});

test("partial, doubled and non-HTTPS Games API bases are rejected", () => {
  assert.equal(normalizeGamesV1BaseUrl("https://dashboard.example/api/modules/games/v1/"), "https://dashboard.example/api/modules/games/v1");
  assert.throws(() => normalizeGamesV1BaseUrl("https://dashboard.example"), /Games-v1|games\/v1/);
  assert.throws(() => normalizeGamesV1BaseUrl("https://dashboard.example/api/modules/games/v1/api/modules/games/v1"), /Games-v1|games\/v1/);
  assert.throws(() => normalizeGamesV1BaseUrl("http://dashboard.example/api/modules/games/v1"), /HTTPS/);
});

test("service identifiers and timestamps match the server boundaries", async () => {
  const client = createGamesServiceClient({
    baseUrl: "https://dashboard.example/api/modules/games/v1",
    apiKey,
    gameId: "roguelike-billard",
    gameVersion: "2.0.0",
    fetchImpl: async () => jsonResponse({ accepted: true })
  });
  assert.throws(() => client.exchangeLaunchCode("x".repeat(39)), /launchCode/);
  assert.throws(() => client.exchangeLaunchCode("x".repeat(257)), /launchCode/);
  assert.throws(() => client.heartbeat("short-session"), /sessionId/);
  assert.throws(() => client.getProgress("short-player"), /playerId/);
  assert.throws(() => client.finish(sessionId, {
    eventId: "event-3",
    runId: "run-3",
    participants: [{ playerId: playerOne, result: "win", stats: {}, rewards: {} }],
    finishedAt: "2026-08-08T12:00:00"
  }), /finishedAt/);
  await assert.doesNotReject(() => client.finish(sessionId, {
    eventId: "event-4",
    runId: "run-4",
    participants: [{ playerId: playerOne, result: "win", stats: {}, rewards: {} }],
    finishedAt: "2026-08-08T12:00:00+02:00"
  }));
});
