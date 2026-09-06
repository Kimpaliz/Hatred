import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

// Der Freigabe-Check laeuft absichtlich nicht in `npm run verify`: Ein Spiel darf
// waehrend der Entwicklung offene Punkte haben. Hier wird deshalb nicht sein
// Urteil geprueft, sondern dass er in jedem Zustand ein lesbares, konsistentes
// Ergebnis liefert — auf der Vorlage wie im fertig gebrandeten Spiel.
const root = fileURLToPath(new URL("../", import.meta.url));
const run = spawnSync(process.execPath, ["scripts/check-release-readiness.mjs"], {
  cwd: root,
  encoding: "utf8"
});

test("meldet je Freigabepunkt einen eindeutigen Zustand", () => {
  assert.equal(run.status === 0 || run.status === 1, true, run.stderr);
  assert.match(run.stdout, /Freigabe-Check für den ersten Web-Deploy/);

  const states = run.stdout.split("\n").filter((line) => /^ {2}(OK|FEHLT)/.test(line));
  assert.equal(states.length >= 8, true, "Es fehlen Freigabepunkte im Bericht.");

  const open = states.filter((line) => line.startsWith("  FEHLT"));
  assert.equal(run.status, open.length === 0 ? 0 : 1, "Exitcode und Bericht widersprechen sich.");
  for (const line of open) {
    assert.match(run.stdout, new RegExp(`${line.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s\\S]*?→ `));
  }
});

test("hält Bauregeln und Freigabelauf im Repository", () => {
  const agents = readFileSync(new URL("../AGENTS.md", import.meta.url), "utf8");
  assert.match(agents, /npm run check:release/);
  assert.match(agents, /Freigabe für den ersten Web-Deploy/);
  // Der Rahmen ist privat: Testphasen und Rechtstexte werden ausdruecklich nicht gefordert.
  assert.match(agents, /Ausdrücklich nicht gefordert/);

  const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  assert.equal(packageJson.scripts["check:release"], "node scripts/check-release-readiness.mjs");
  assert.equal(packageJson.scripts.verify.includes("check:release"), false);
});
