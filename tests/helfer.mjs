/* [Aufgabe: Prüfwesen] Behauptungen und Abschluss für Fachprüfungen.

   ── Warum es das gibt ──────────────────────────────────────────────

   Jede Prüfung läuft in einem eigenen Prozess mit eigenen Zählern.
   Die Projektpfade werden aus dem Werkzeughelfer durchgereicht, damit
   Fachprüfungen keine zweite Definition der Projektwurzel benötigen.

   ── Arbeitet zusammen mit ──────────────────────────────────────────

   tests/pruefe-*.mjs, die Kern- und Kopfnotizwächter sowie
   werkzeuge/helfer.mjs (Projektpfade, keine Fachbehauptungen). */

export { WURZEL, liesDatei } from "../werkzeuge/helfer.mjs";

let bestanden = 0;
let gefallen = 0;
const fehler = [];
let bereich = "";

export function abschnitt(name) { bereich = name; }

/* Eine einzelne Behauptung. `bedingung` muss wahr sein. */
export function behaupte(bedingung, was) {
  if (bedingung) { bestanden++; return true; }
  gefallen++;
  fehler.push(`${bereich ? bereich + " → " : ""}${was}`);
  return false;
}

export function gleich(ist, soll, was) {
  const ok = Object.is(ist, soll);
  return behaupte(ok, `${was}: ist ${anzeige(ist)}, soll ${anzeige(soll)}`);
}

export function nahe(ist, soll, spanne, was) {
  const ok = Math.abs(ist - soll) <= spanne;
  return behaupte(ok, `${was}: ist ${anzeige(ist)}, soll ${anzeige(soll)} ± ${spanne}`);
}

export function tiefGleich(ist, soll, was) {
  const a = JSON.stringify(ist), b = JSON.stringify(soll);
  return behaupte(a === b, `${was}:\n    ist  ${a}\n    soll ${b}`);
}

/* Erwartet, dass `fn` wirft. Ohne diese Prüfung würde eine Schutzwand,
   die aus Versehen entfernt wurde, niemandem auffallen. */
export function wirft(fn, was) {
  try { fn(); } catch { return behaupte(true, was); }
  return behaupte(false, `${was}: hat nicht geworfen`);
}

function anzeige(w) {
  if (typeof w === "number" && !Number.isInteger(w)) return w.toFixed(4);
  if (typeof w === "string") return `"${w}"`;
  return String(w);
}

/* Am Ende jeder Prüfdatei. Beendet den Prozess mit 0 oder 1 — nur so
   sieht `pruefe-alles.mjs` den Unterschied. */
export function ende(titel) {
  const strich = "─".repeat(Math.max(0, 58 - titel.length));
  if (gefallen === 0) {
    console.log(`  ✓ ${titel} ${strich} ${bestanden} Behauptungen`);
    process.exit(0);
  }
  console.log(`  ✗ ${titel} ${strich} ${gefallen} von ${bestanden + gefallen} gefallen`);
  for (const f of fehler) console.log(`      · ${f}`);
  process.exit(1);
}
