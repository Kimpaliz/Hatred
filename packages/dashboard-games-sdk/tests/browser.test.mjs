import test from "node:test";
import assert from "node:assert/strict";

import {
  consumeFragmentCredentials,
  createDashboardResumeUrl,
  FragmentCredentialError,
  parsePlatformDescriptor,
  storeInviteHandoff,
  takeInviteHandoff
} from "../src/browser.mjs";

class MemoryStorage {
  items = new Map();
  getItem(key) { return this.items.get(key) ?? null; }
  setItem(key, value) { this.items.set(key, value); }
  removeItem(key) { this.items.delete(key); }
}

test("consumeFragmentCredentials removes secrets immediately and preserves unrelated fragment data", () => {
  let cleanUrl;
  const credentials = consumeFragmentCredentials({
    location: {
      pathname: "/play",
      search: "?mode=coop",
      hash: "#launch_code=launch-secret&invite=abcdefghijklmnopqrstuv&theme=dark"
    },
    history: { replaceState(_state, _unused, url) { cleanUrl = url; } }
  });
  assert.deepEqual(credentials, {
    launchCode: "launch-secret",
    inviteToken: "abcdefghijklmnopqrstuv"
  });
  assert.equal(cleanUrl, "/play?mode=coop#theme=dark");
});

test("duplicate fragment credentials are cleared before an error is thrown", () => {
  let cleanUrl;
  assert.throws(() => consumeFragmentCredentials({
    location: { pathname: "/", search: "", hash: "#invite=abcdefghijklmnopqrstuv&invite=zyxwvutsrqponmlkjihgfe" },
    history: { replaceState(_state, _unused, url) { cleanUrl = url; } }
  }), FragmentCredentialError);
  assert.equal(cleanUrl, "/");
});

test("invite handoff is tab-scoped, time-limited and one-shot", () => {
  const storage = new MemoryStorage();
  storeInviteHandoff({
    storage,
    gameId: "roguelike-billard",
    code: "abc234",
    inviteToken: "abcdefghijklmnopqrstuv",
    now: 1_000,
    ttlMs: 5_000
  });
  const handoff = takeInviteHandoff({ storage, gameId: "roguelike-billard", code: "ABC234", now: 2_000 });
  assert.equal(handoff.inviteToken, "abcdefghijklmnopqrstuv");
  assert.equal(takeInviteHandoff({ storage, gameId: "roguelike-billard", code: "ABC234", now: 2_001 }), null);

  storeInviteHandoff({ storage, gameId: "roguelike-billard", code: "ABC234", inviteToken: "abcdefghijklmnopqrstuv", now: 3_000, ttlMs: 50 });
  assert.equal(takeInviteHandoff({ storage, gameId: "roguelike-billard", code: "ABC234", now: 3_050 }), null);
});

test("resume URLs can only be built from a parsed fixed HTTPS platform base", () => {
  const platform = parsePlatformDescriptor({
    mode: "dashboard",
    requiresDashboardSession: true,
    guestSessionsSupported: true,
    dashboardLaunchUrl: "https://dashboard.example/?view=games"
  });
  assert.equal(
    createDashboardResumeUrl(platform, { gameId: "roguelike-billard", code: "abc234" }),
    "https://dashboard.example/?view=games&game=roguelike-billard&resumeInvite=ABC234"
  );
  assert.throws(() => createDashboardResumeUrl({ ...platform }, { gameId: "roguelike-billard", code: "ABC234" }), /parsePlatformDescriptor/);
  assert.throws(() => parsePlatformDescriptor({
    mode: "dashboard",
    requiresDashboardSession: true,
    guestSessionsSupported: true,
    dashboardLaunchUrl: "https://evil.example/redirect?returnTo=https://dashboard.example"
  }), /Dashboard-Basis/);
});
