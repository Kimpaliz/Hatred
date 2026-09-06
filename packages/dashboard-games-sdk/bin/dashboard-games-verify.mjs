#!/usr/bin/env node
import { formatVerificationResult, verifyGameRepository } from "../src/verify.mjs";

const HELP = `dashboard-games-verify v2.0.0

Verwendung:
  dashboard-games-verify [root]
  dashboard-games-verify [root] --json
  dashboard-games-verify --help

root ist standardmaessig das aktuelle Arbeitsverzeichnis.`;

const arguments_ = process.argv.slice(2);
if (arguments_.includes("--help") || arguments_.includes("-h")) {
  console.log(HELP);
  process.exitCode = 0;
} else {
  const json = arguments_.includes("--json");
  const positional = arguments_.filter((argument) => !argument.startsWith("-"));
  const unknown = arguments_.filter((argument) => argument.startsWith("-") && argument !== "--json");
  if (positional.length > 1 || unknown.length > 0) {
    console.error(HELP);
    process.exitCode = 2;
  } else {
    try {
      const result = await verifyGameRepository(positional[0] || process.cwd());
      console.log(json ? JSON.stringify(result, null, 2) : formatVerificationResult(result));
      process.exitCode = result.ok ? 0 : 1;
    } catch (error) {
      console.error(`Verifier konnte nicht ausgefuehrt werden: ${error instanceof Error ? error.message : String(error)}`);
      process.exitCode = 2;
    }
  }
}
