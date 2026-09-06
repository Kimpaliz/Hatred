import assert from "node:assert/strict";
import test from "node:test";
import { createGameServer } from "../src/server/http.mjs";

const config = Object.freeze({
  mode: "test",
  port: 8080,
  dashboardApiUrl: "https://dashboard.example.test/api/modules/games/v1",
  dashboardLaunchUrl: "https://dashboard.example.test/?view=games",
  gameId: "golden-path-game",
  gameVersion: "2.0.0",
  commitSha: "b".repeat(40),
  publicBaseUrl: "https://game.example.test",
  apiKey: "never-return-this-service-key-to-the-browser"
});

async function fixture() {
  const platformService = {
    async exchangeLaunchCode(code) {
      assert.equal(code, "opaque-launch-code-1234567890");
      return {
        sessionId: "session-dashboard-1",
        expiresAt: new Date(Date.now() + 300_000).toISOString(),
        player: { id: "player-1", displayName: "Fuchs", avatarUrl: null },
        progress: { schemaVersion: 1, version: 0, data: {} }
      };
    }
  };
  const server = createGameServer({ config, platformService });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  return {
    origin: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolve) => server.close(resolve))
  };
}

async function jsonRequest(origin, pathname, options = {}) {
  const response = await fetch(`${origin}${pathname}`, options);
  return { response, body: await response.json() };
}

test("liefert Health, Version, Repository-Medien und echte 404 ohne HTML-Fallback", async (context) => {
  const app = await fixture();
  context.after(app.close);
  const health = await jsonRequest(app.origin, "/healthz");
  assert.equal(health.response.status, 200);
  assert.deepEqual(health.body, { status: "ok" });
  const version = await jsonRequest(app.origin, "/version.json");
  assert.equal(version.body.commitSha, config.commitSha);
  const module = await fetch(`${app.origin}/app.mjs`);
  assert.match(module.headers.get("content-type"), /^text\/javascript/);

  for (const name of ["cover", "hero", "icon"]) {
    const pathname = `/dashboard/${name}.png`;
    const head = await fetch(`${app.origin}${pathname}`, { method: "HEAD" });
    assert.equal(head.status, 200, `${pathname} muss erreichbar sein`);
    assert.equal(head.headers.get("content-type"), "image/png");
    assert.match(head.headers.get("cache-control"), /^public, max-age=/);
    assert.notEqual(
      head.headers.get("cross-origin-resource-policy"),
      "same-origin",
      `${pathname} muss vom Dashboard auf einer anderen Subdomain eingebettet werden koennen`
    );

    const image = await fetch(`${app.origin}${pathname}`);
    const signature = new Uint8Array(await image.arrayBuffer()).slice(0, 8);
    assert.deepEqual(
      [...signature],
      [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
      `${pathname} muss einen echten PNG-Payload liefern`
    );
  }

  const missing = await jsonRequest(app.origin, "/missing-module.mjs");
  assert.equal(missing.response.status, 404);
  assert.equal(missing.body.error, "not_found");
});

test("Plattformantwort bleibt öffentlich und enthält kein frei geliefertes Rücksprungziel", async (context) => {
  const app = await fixture();
  context.after(app.close);
  const result = await jsonRequest(app.origin, "/api/platform");
  assert.deepEqual(result.body, {
    mode: "dashboard",
    requiresDashboardSession: true,
    guestSessionsSupported: true,
    dashboardLaunchUrl: config.dashboardLaunchUrl
  });
  assert.equal(JSON.stringify(result.body).includes(config.apiKey), false);
});

test("Launch, sichere Einladung und statistikloser Gast funktionieren ohne Dashboard-Cookie", async (context) => {
  const app = await fixture();
  context.after(app.close);
  const commonHeaders = { "content-type": "application/json", origin: config.publicBaseUrl };
  const launched = await jsonRequest(app.origin, "/api/session", {
    method: "POST",
    headers: commonHeaders,
    body: JSON.stringify({ launchCode: "opaque-launch-code-1234567890" })
  });
  assert.equal(launched.response.status, 200);
  assert.match(launched.response.headers.get("set-cookie"), /HttpOnly; Secure; SameSite=Strict/);
  const cookie = launched.response.headers.get("set-cookie").split(";", 1)[0];

  const invitation = await jsonRequest(app.origin, "/api/lobbies", {
    method: "POST",
    headers: { ...commonHeaders, cookie },
    body: "{}"
  });
  assert.equal(invitation.response.status, 201);
  const inviteUrl = new URL(invitation.body.inviteUrl);
  const inviteToken = new URLSearchParams(inviteUrl.hash.slice(1)).get("invite");
  assert.equal(inviteUrl.searchParams.get("mode"), "player");
  assert.ok(inviteToken);

  const guest = await jsonRequest(app.origin, "/api/session/guest", {
    method: "POST",
    headers: commonHeaders,
    body: JSON.stringify({ code: invitation.body.code, inviteToken, displayName: "  Gast  " })
  });
  assert.equal(guest.response.status, 200);
  assert.equal(guest.body.kind, "guest");
  assert.equal(guest.body.statisticsEnabled, false);
  assert.equal(Object.hasOwn(guest.body, "player"), false);

  const replay = await jsonRequest(app.origin, "/api/session/guest", {
    method: "POST",
    headers: commonHeaders,
    body: JSON.stringify({ code: invitation.body.code, inviteToken, displayName: "Gast" })
  });
  assert.equal(replay.response.status, 404);
  assert.equal(replay.body.error, "invite_unavailable");
});

test("zustandsändernde Requests anderer Origins werden abgewiesen", async (context) => {
  const app = await fixture();
  context.after(app.close);
  const result = await jsonRequest(app.origin, "/api/session", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://evil.example" },
    body: JSON.stringify({ launchCode: "opaque-launch-code-1234567890" })
  });
  assert.equal(result.response.status, 403);
});
