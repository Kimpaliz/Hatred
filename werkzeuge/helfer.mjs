/* [Aufgabe: Prüfwesen] Das kleinste Prüfgerüst, das diese Kette braucht.

   ── Warum kein fertiges Prüfwerkzeug ────────────────────────────────

   Ein Testläufer aus dem Paketverzeichnis brächte hundert Dateien mit,
   die niemand liest, und eine Version, die veraltet. Was hier gebraucht
   wird, sind vier Dinge: eine Behauptung, ein Name, ein Zähler und ein
   Rückgabewert für die Schale. Das sind sechzig Zeilen.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   Jeder Datei `werkzeuge/pruefe-*.mjs` und `werkzeuge/pruefe-alles.mjs`,
   das die Einzelprüfungen als eigene Prozesse startet. */

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
