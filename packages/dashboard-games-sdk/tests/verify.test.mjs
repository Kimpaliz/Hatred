import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { verifyGameRepository } from "../src/verify.mjs";

const manifest = `schemaVersion: 2
id: roguelike-billard
name: Roguelike Billard
version: 2.0.0
apiCompatibility: games-v1
runtime:
  type: fullstack
  port: 8080
  healthPath: /healthz
  versionPath: /version
  websocketPath: /ws
capabilities:
  multiplayer: true
  persistentProgress: true
  achievements: true
  leaderboards: true
resources:
  cpu: 0.5
  memoryMb: 512
  pids: 128
media:
  coverPath: public/dashboard/cover.png
  heroPath: public/dashboard/hero.png
  iconPath: public/dashboard/icon.png
`;

const workflow = `name: Dashboard game
on:
  workflow_dispatch:
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - run: npm run dashboard:verify
      - run: npm test
      - run: npm run build
      - run: echo "\${{ github.sha }}" > dashboard-game-result.json
      - uses: actions/upload-artifact@v4
        with:
          name: dashboard-game-result
          path: dashboard-game-result.json
`;

const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "dashboard-games-sdk-"));
  await mkdir(join(root, ".dashboard"), { recursive: true });
  await mkdir(join(root, ".github", "workflows"), { recursive: true });
  await mkdir(join(root, "public", "dashboard"), { recursive: true });
  await writeFile(join(root, ".dashboard", "game.yml"), manifest);
  await writeFile(join(root, ".github", "workflows", "dashboard-game.yml"), workflow);
  await writeFile(join(root, "package.json"), JSON.stringify({ scripts: { test: "node --test", build: "vite build", "dashboard:verify": "dashboard-games-verify ." } }));
  await writeFile(join(root, "package-lock.json"), "{}\n");
  await writeFile(join(root, "Dockerfile"), "FROM scratch\n");
  await writeFile(join(root, "README.md"), "# Game\n");
  for (const name of ["cover", "hero", "icon"]) await writeFile(join(root, "public", "dashboard", `${name}.png`), png);
  return root;
}

test("valid manifest v2 repository passes conformance verification", async (context) => {
  const root = await fixture();
  context.after(() => rm(root, { recursive: true, force: true }));
  const result = await verifyGameRepository(root);
  assert.equal(result.ok, true, result.errors.map((error) => error.message).join("\n"));
  assert.equal(result.manifest.schemaVersion, 2);
});

test("verifier reports legacy manifest, magic-byte mismatch and missing workflow/package scripts", async (context) => {
  const root = await fixture();
  context.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(join(root, ".dashboard", "game.yml"), manifest.replace("schemaVersion: 2", "schemaVersion: 1"));
  await writeFile(join(root, "public", "dashboard", "icon.png"), "not an image");
  await writeFile(join(root, "package.json"), JSON.stringify({ scripts: { test: "node --test" } }));
  await writeFile(join(root, ".github", "workflows", "dashboard-game.yml"), workflow.replace("      - run: npm run build\n", ""));
  const result = await verifyGameRepository(root);
  assert.equal(result.ok, false);
  const codes = result.errors.map((error) => error.code);
  assert.ok(codes.includes("manifest_schema_version"));
  assert.ok(codes.includes("media_magic_mismatch"));
  assert.ok(codes.includes("package_script_missing"));
  assert.ok(codes.includes("workflow_script_missing"));
});
