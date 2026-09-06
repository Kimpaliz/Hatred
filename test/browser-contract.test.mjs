import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Browser entfernt Fragment-Credentials und löscht den Invite-Handoff nach dem Claim", async () => {
  const source = await readFile(new URL("../src/client/app.mjs", import.meta.url), "utf8");
  assert.match(source, /consumeFragmentCredentials\(\{ location, history \}\)/);
  const claim = source.slice(source.indexOf("async function claimInvite"), source.indexOf("function connectWebSocket"));
  assert.match(claim, /takeInviteHandoff\(\{ gameId: GAME_ID, code: pendingInvite\.code \}\)/);
  assert.match(claim, /pendingInvite = null/);
});
