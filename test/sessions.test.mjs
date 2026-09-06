import assert from "node:assert/strict";
import test from "node:test";
import { MemorySessionStore } from "../src/server/sessions.mjs";

test("WebSocket-Tokens sind kurzlebige One-shot-Credentials", () => {
  const sessions = new MemorySessionStore();
  const created = sessions.createDashboard({
    sessionId: "session-1",
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    player: { id: "player-1", displayName: "Fuchs", avatarUrl: null },
    progress: { schemaVersion: 1, version: 0, data: {} }
  });
  const wsToken = sessions.issueWebSocketToken(created.key);
  assert.equal(sessions.consumeWebSocketToken(wsToken)?.player.id, "player-1");
  assert.equal(sessions.consumeWebSocketToken(wsToken), null);
});

test("Gastsession serialisiert keine Dashboard-Identität oder Statistikrechte", () => {
  const sessions = new MemorySessionStore();
  const created = sessions.createGuest({
    displayName: "Gast",
    lobby: { code: "ABC234", role: "player" },
    expiresAt: new Date(Date.now() + 60_000).toISOString()
  });
  const publicSession = sessions.publicSession(created.key);
  assert.equal(publicSession.kind, "guest");
  assert.equal(publicSession.statisticsEnabled, false);
  assert.equal(Object.hasOwn(publicSession, "player"), false);
  assert.equal(Object.hasOwn(publicSession, "sessionId"), false);
});
