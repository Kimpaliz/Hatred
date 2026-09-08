/* [Aufgabe: Prüfwesen] Jede Quelldatei trägt die Kopfnotiz aus dem
   Vertrag — und keine wird zu lang oder zu breit.

   ── Warum es das gibt / Warum so ───────────────────────────────────

   Sie deckt zwei Regeln: `docs/REGELN.md` 7 (jede Quelldatei trägt die
   Kopfnotiz mit Tag, Begründung und „Arbeitet zusammen mit") und
   `docs/REGELN.md` 8 (die zwei Maße). Beide hängen an derselben
   Dateiliste, deshalb stehen sie in einer Prüfung.

   Die Kopfnotiz ist in diesem Projekt kein Schmuck, sondern die einzige
   Stelle, an der die **Begründung** einer Datei steht. Wer sie
   weglässt, hinterlässt Code, den in drei Monaten niemand mehr ändern
   mag, weil keiner weiß, warum er so ist. Und weil eine fehlende
   Kopfnotiz nichts kaputtmacht, fällt sie ohne Prüfung nie auf: Sie
   fehlt einfach immer öfter, bis die Regel tot ist.

   Geprüft wird deshalb der Fall, der ohne diese Arbeit falsch wäre:

   · Die Kopfnotiz steht **vor** dem ersten Code, nicht irgendwo.
   · Das Kennwort `[Aufgabe: …]` trägt einen Tag aus der Liste des
     Vertrags — nicht einen frei erfundenen. Ein Tippfehler („Prüfwesn")
     wäre sonst genauso still wie ein fehlender Kopf.
   · Der Abschnitt „Arbeitet zusammen mit" ist da **und hat Inhalt**.
     Eine leere Überschrift ist der übliche Weg, eine Formregel zu
     erfüllen, ohne sie zu befolgen.
   · Kein Bericht ohne Begründung: mindestens ein Abschnitt mit der
     `──`-Überschrift, bevor die Nachbardateien aufgezählt werden.

   Die zwei Maße aus `docs/REGELN.md` 8: keine Datei über 1000 Zeilen,
   keine Zeile über 100 Zeichen. **Zeichen, nicht Bytes** — „ö" ist in
   UTF-8 zwei Bytes, und in einer deutschen Datei zählte man sich sonst
   um bis zu ein Viertel reich. Ausgenommen ist eine Zeile, die nur
   wegen einer langen Zeichenkette überläuft (Sprite-Zeilen, Adressen):
   Die kann man nicht umbrechen, ohne ihren Inhalt zu ändern.

   ── Warum es eine Liste bekannter Abweichungen gibt ────────────────

   `BEKANNTE_ABWEICHUNGEN` ist keine Ausnahmeregel, sondern ein Nagel:
   Der Vertrag friert vier Dateien ein („Was schon fertig ist — NICHT
   ändern, nur benutzen"), und eine davon hat eine Zeile mit 101
   Zeichen. Wer sie umbricht, ändert eine eingefrorene Datei; wer sie
   verschweigt, verliert die Regel. Also steht sie hier mit Datei,
   Zeile und **genauer Länge**, wird bei jedem Lauf gedruckt — und die
   Prüfung wird rot, sobald ein Eintrag nicht mehr stimmt. Wird die
   Zeile eines Tages umbrochen, verlangt die Prüfung, dass der Eintrag
   verschwindet. Eine Ausnahme, die sich selbst aufräumt.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   Allem unter `spiel/`, `netz/`, `runtime/` und `werkzeuge/` (nur
   gelesen), `tests/helfer.mjs` (Behauptungen und Abschluss) und
   `werkzeuge/pruefe-alles.mjs`, das diese Datei als eigenen Prozess
   startet. Den Wortlaut der Form trägt der Schnittstellenvertrag. */

import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { abschnitt, behaupte, gleich, ende } from "../tests/helfer.mjs";

const WURZEL = dirname(dirname(fileURLToPath(import.meta.url)));
const ORDNER = ["spiel", "netz", "runtime", "werkzeuge", "tests"];

const TAGS = ["Regelkern", "Bild", "Netz", "Prüfwesen", "Oberfläche", "Werkzeug", "Doku"];
const HOECHSTENS_ZEILEN = 1000;
const HOECHSTENS_ZEICHEN = 100;

/* ── Fremdcode aus dem Skill `alpha-code` ────────────────────────────
   Diese Dateien sind **wörtlich** aus dem Skill kopiert
   (florianfinn/claude-skills, `plugins/alpha-code/skills/alpha-code/
   werkzeuge/`). Sie werden hier nicht umformatiert, und deshalb gilt
   für sie die **Spaltengrenze** dieses Projekts nicht.

   Das ist keine gesenkte Schwelle, sondern dieselbe Begründung, die
   der Skill selbst für `sprache.ausnahmen: ["werkzeuge"]` gibt: Ein
   Werkzeug, das die Regel des Projekts erzwingt, muss ihr nicht selbst
   folgen — sonst müsste man es beim nächsten Skill-Update erneut
   umformatieren, und eine Verbesserung am Skill käme hier nie an.

   **Was weiter gilt:** Kopfnotiz, Tag und die Zeilengrenze von 1000.
   Nur die Breite fällt weg. Und die Liste ist ausdrücklich, nicht
   `werkzeuge/*` — eine eigene Datei dieses Projekts kann sich hier
   nicht stillschweigend hineinschmuggeln. */
const AUS_DEM_SKILL = new Set([
  "werkzeuge/github-zugang.mjs",
  "werkzeuge/pruefe-altlasten.mjs",
  "werkzeuge/pruefe-arbeitsweise.mjs",
  "werkzeuge/pruefe-doku-status.mjs",
  "werkzeuge/pruefe-freigabe.mjs",
  "werkzeuge/pruefe-geheimnisse.mjs",
  "werkzeuge/pruefe-sprache.mjs",
  "werkzeuge/pruefe-tags.mjs",
  "werkzeuge/pruefe-verweise.mjs",
  "werkzeuge/pruefe-vorgaenge.mjs",
  "werkzeuge/pruefe-workclaim.mjs",
  "werkzeuge/vorgaenge.mjs"
]);

/* Datei, Zeile und die **gemessene** Länge. Stimmt eine der drei Zahlen
   nicht mehr, schlägt die Prüfung an — nicht umgekehrt. */
const BEKANNTE_ABWEICHUNGEN = [
  {
    datei: "spiel/gitter.mjs",
    /* War Zeile 134; der Abgrund (Vorgang #8) hat 24 Zeilen darüber
       eingefügt und sie nach 158 geschoben. Die Zeile selbst ist
       unverändert — nur ihre Nummer wandert, und genau dafür ist diese
       Liste da: Sie hält den Nagel fest, statt die Regel aufzugeben. */
    zeile: 158,
    zeichen: 101,
    grund: "vom Vertrag eingefroren: „Was schon fertig ist — NICHT ändern, nur benutzen.“"
  }
];

/* ── Messen ─────────────────────────────────────────────────────────*/

/* Zeichen, nicht Bytes und nicht UTF-16-Einheiten: `[...z]` zählt
   Kodierungspunkte, und genau die meint der Vertrag. */
const zeichenzahl = (zeile) => [...zeile].length;

/* Zeilen wie `wc -l`: der Umbruch am Dateiende beginnt keine Zeile.
   CRLF ist ein Umbruch; sein CR gehört weder zum Kopf noch zur Breite. */
function zeilenVon(text) {
  const z = text.split(/\r?\n/);
  if (z.length > 0 && z[z.length - 1] === "") z.pop();
  return z;
}

/* Die längste Zeichenkette einer Zeile — Anführungszeichen beider Art,
   Schablonen und nackte Adressen. Wer nur `"` sucht, übersieht die
   Sprite-Zeilen, die mit Rückwärtszeichen geschrieben werden. */
function laengsteZeichenkette(zeile) {
  const zeichen = [...zeile];
  let laengste = 0;
  for (let i = 0; i < zeichen.length; i++) {
    const c = zeichen[i];
    if (c !== "\"" && c !== "'" && c !== "`") continue;
    let j = i + 1;
    while (j < zeichen.length && zeichen[j] !== c) j += zeichen[j] === "\\" ? 2 : 1;
    if (j < zeichen.length) {
      laengste = Math.max(laengste, j - i + 1);
      i = j;
    }
  }
  const adresse = /https?:\/\/\S+/.exec(zeile);
  if (adresse) laengste = Math.max(laengste, [...adresse[0]].length);
  return laengste;
}

/* Entschuldigt ist eine zu lange Zeile nur, wenn sie sich gar nicht
   kürzen ließe: Die Zeichenkette allein sprengt schon samt Einrückung
   die Breite. Die schwächere Fassung („ohne die Zeichenkette passte
   sie") entschuldigt jede Zeile, in der irgendwo ein `${…}` vorkommt —
   und damit fast jede Meldung dieser Prüfkette. Genau so verschwindet
   eine Regel: nicht durch Abschalten, sondern durch eine Ausnahme, die
   zu weit gefasst ist. */
const nurWegenZeichenkette = (zeile) => {
  const kette = laengsteZeichenkette(zeile);
  const einrueckung = zeichenzahl(zeile) - zeichenzahl(zeile.replace(/^\s+/, ""));
  if (kette + einrueckung <= HOECHSTENS_ZEICHEN) return false;
  return zeichenzahl(zeile) - kette <= HOECHSTENS_ZEICHEN;
};

/* ── Die Kopfnotiz zerlegen ─────────────────────────────────────────*/

function lieskopf(text) {
  const zeilen = zeilenVon(text);
  const erste = zeilen[0] || "";
  const kennung = /^\/\* \[Aufgabe: ([^\]]+)\] (\S.*)$/.exec(erste);
  /* Ein Kommentarende am Zeilenende ist kein Satz: Steht in der ersten
     Zeile nur „[Aufgabe: Bild]" und dann gleich der Kommentarschluss,
     ist das ein leerer Kopf — und der muss auffallen. */
  const satz = kennung ? kennung[2].replace(/\*\/\s*$/, "").trim() : "";
  const schluss = zeilen.findIndex((z) => z.includes("*/"));
  const kopf = schluss < 0 ? "" : zeilen.slice(0, schluss + 1).join("\n");
  const ueberschriften = [...kopf.matchAll(/──+ *(\S.*?) *──+/g)].map((t) => t[1]);
  const zusammen = kopf.indexOf("Arbeitet zusammen mit");
  let inhalt = "";
  if (zusammen >= 0) {
    inhalt = kopf.slice(zusammen).split("\n").slice(1).join(" ")
      .replace(/[─*/]/g, " ").replace(/\s+/g, " ").trim();
  }
  return {
    tag: kennung && satz !== "" ? kennung[1] : null,
    satz,
    geschlossen: schluss >= 0,
    ueberschriften,
    zusammenInhalt: inhalt
  };
}

function sammle(ordner, aus = []) {
  for (const name of readdirSync(ordner).sort()) {
    const pfad = join(ordner, name);
    if (statSync(pfad).isDirectory()) sammle(pfad, aus);
    else if (/\.(mjs|js)$/.test(name)) aus.push(pfad);
  }
  return aus;
}

/* ── 1. Selbstprobe ─────────────────────────────────────────────────
   Erst das Werkzeug, dann die Dateien: Ein Leser, der jeden Kopf für
   gültig hält, meldete für immer „grün". */
{
  abschnitt("Kopfleser");

  const gut = "/* [Aufgabe: Regelkern] Was das ist.\n\n" +
    "   ── Warum so ───\n\n   Weil.\n\n" +
    "   ── Arbeitet zusammen mit ───\n\n   `spiel/gitter.mjs`. */\nconst a = 1;\n";
  const k = lieskopf(gut);
  gleich(k.tag, "Regelkern", "Tag wird gelesen");
  gleich(k.satz, "Was das ist.", "der erste Satz wird gelesen");
  behaupte(k.geschlossen, "der Kopf ist geschlossen");
  gleich(k.ueberschriften.length, 2, "zwei Abschnittsüberschriften");
  behaupte(k.zusammenInhalt.includes("gitter.mjs"), "der Inhalt des Abschnitts wird gelesen");
  const windowsKopf = lieskopf(gut.replace(/\n/g, "\r\n"));
  gleich(JSON.stringify(windowsKopf), JSON.stringify(k),
    "CRLF und LF ergeben dieselbe Kopfnotiz mit allen Abschnitten");

  gleich(lieskopf("const a = 1;\n").tag, null, "eine Datei ohne Kopf fällt auf");
  gleich(lieskopf("/* [Aufgabe: Prüfwesn] X. */\n").tag, "Prüfwesn",
    "ein verschriebener Tag wird gelesen, nicht stillschweigend berichtigt");
  gleich(lieskopf("/* [Aufgabe: Bild] */\n").tag, null, "ein Kopf ohne Satz gilt nicht als Kopf");
  gleich(lieskopf("/* [Aufgabe: Bild] */\r\n").tag, null,
    "auch mit CRLF bleibt ein Kopf ohne Satz ungültig");
  behaupte(!lieskopf("/* [Aufgabe: Bild] X.\n   ohne Schluss\n").geschlossen,
    "ein nie geschlossener Kopf fällt auf");
  const leer = lieskopf("/* [Aufgabe: Bild] X.\n\n   ── Arbeitet zusammen mit ───\n*/\n");
  gleich(leer.zusammenInhalt, "", "eine leere Überschrift zählt nicht als Inhalt");

  abschnitt("Maße");
  gleich(zeichenzahl("äöüß"), 4, "Umlaute zählen als ein Zeichen, nicht als zwei Bytes");
  gleich(zeilenVon("a\nb\n").length, 2, "der Umbruch am Dateiende beginnt keine Zeile");
  gleich(zeilenVon("a\nb").length, 2, "eine Datei ohne Schlussumbruch zählt gleich");
  gleich(zeilenVon("a\r\nb\r\n").length, 2, "CRLF erzeugt keine zusätzliche Zeile");
  gleich(zeichenzahl(zeilenVon("x".repeat(100) + "\r\n")[0]), 100,
    "CRLF zählt nicht zur Zeichenbreite einer genau 100 Zeichen langen Zeile");
  gleich(zeichenzahl(zeilenVon("x".repeat(101) + "\r\n")[0]), 101,
    "eine mit CRLF geschlossene zu breite Zeile bleibt zu breit");
  gleich(zeilenVon("a\rb\n")[0], "a\rb", "ein einzelnes CR im Text bleibt erhalten");

  const lang = "  const s = \"" + "x".repeat(120) + "\";";
  behaupte(zeichenzahl(lang) > HOECHSTENS_ZEICHEN, "die Probezeile ist wirklich zu lang");
  behaupte(nurWegenZeichenkette(lang), "eine lange Zeichenkette entschuldigt die Zeile");
  behaupte(!nurWegenZeichenkette("  " + "const nameSehrLang" + " = 1; ".repeat(20)),
    "langer Code wird nicht entschuldigt");
  /* Der Fall, der die schwache Fassung durchrutschen ließe: eine
     Meldezeile mit einer mittellangen Schablone darin. Die kann man
     umbrechen, also muss sie umbrochen werden. */
  behaupte(!nurWegenZeichenkette("      const x = " + "y".repeat(60) + " + `Ebene ${e} zu hell`;"),
    "eine kurze Zeichenkette in langem Code entschuldigt nicht");
  behaupte(nurWegenZeichenkette("  /* siehe https://" + "a".repeat(110) + " */"),
    "eine lange Adresse entschuldigt die Zeile");
  gleich(laengsteZeichenkette("const a = \"kurz\"; const b = `laenger hier`;"), 14,
    "die längste Zeichenkette gewinnt, auch als Schablone");
  gleich(laengsteZeichenkette("const a = \"nie geschlossen;"), 0,
    "ein offenes Anführungszeichen entschuldigt nichts");
}

/* ── 2. Die Dateien ─────────────────────────────────────────────────*/

const dateien = [];
for (const ordner of ORDNER) {
  const voll = join(WURZEL, ordner);
  if (existsSync(voll)) sammle(voll, dateien);
}

const genutzt = new Set();
let breiteste = { kurz: "—", zeile: 0, zeichen: 0 };
let laengste = { kurz: "—", zeilen: 0 };

{
  abschnitt("Kopfnotizen");
  behaupte(dateien.length >= 10, `es gibt Quelldateien zu prüfen (${dateien.length})`);

  for (const pfad of dateien) {
    const kurz = relative(WURZEL, pfad).split("\\").join("/");
    const text = readFileSync(pfad, "utf8");
    const kopf = lieskopf(text);

    behaupte(kopf.tag !== null, `${kurz}: beginnt mit "/* [Aufgabe: …] <Satz>"`);
    if (kopf.tag !== null) {
      behaupte(TAGS.includes(kopf.tag), `${kurz}: Tag "${kopf.tag}" steht in der Liste`);
      behaupte(zeichenzahl(kopf.satz) >= 12, `${kurz}: der erste Satz sagt, was die Datei ist`);
    }
    behaupte(kopf.geschlossen, `${kurz}: die Kopfnotiz ist mit "*/" geschlossen`);
    /* Die Gliederung in ──-Abschnitte ist eine Form dieses Projekts.
       Fremdcode aus dem Skill trägt seine eigene und wird nicht
       umformatiert — Begründung siehe bei `AUS_DEM_SKILL`. */
    behaupte(AUS_DEM_SKILL.has(kurz) || kopf.ueberschriften.length >= 2,
      `${kurz}: Begründung und "Arbeitet zusammen mit" als eigene Abschnitte`);
    behaupte(kopf.ueberschriften.includes("Arbeitet zusammen mit"),
      `${kurz}: hat den Abschnitt "Arbeitet zusammen mit"`);
    behaupte(zeichenzahl(kopf.zusammenInhalt) >= 20,
      `${kurz}: "Arbeitet zusammen mit" nennt wirklich Dateien`);
  }
}

{
  abschnitt("Maße der Dateien");

  for (const pfad of dateien) {
    const kurz = relative(WURZEL, pfad).split("\\").join("/");
    const zeilen = zeilenVon(readFileSync(pfad, "utf8"));

    behaupte(zeilen.length <= HOECHSTENS_ZEILEN,
      `${kurz}: ${zeilen.length} Zeilen, höchstens ${HOECHSTENS_ZEILEN}`);
    if (zeilen.length > laengste.zeilen) laengste = { kurz, zeilen: zeilen.length };

    for (let n = 0; n < zeilen.length; n++) {
      const breite = zeichenzahl(zeilen[n]);
      if (breite > breiteste.zeichen) breiteste = { kurz, zeile: n + 1, zeichen: breite };
      if (breite <= HOECHSTENS_ZEICHEN) continue;
      if (AUS_DEM_SKILL.has(kurz)) continue;
      if (nurWegenZeichenkette(zeilen[n])) continue;

      const bekannt = BEKANNTE_ABWEICHUNGEN.find(
        (a) => a.datei === kurz && a.zeile === n + 1 && a.zeichen === breite);
      if (bekannt) { genutzt.add(bekannt); continue; }
      behaupte(false, `${kurz}:${n + 1} ist ${breite} Zeichen breit, erlaubt sind` +
        ` ${HOECHSTENS_ZEICHEN} — ${zeilen[n].trim().slice(0, 40)}…`);
    }
  }
}

{
  abschnitt("Bekannte Abweichungen");
  for (const a of BEKANNTE_ABWEICHUNGEN) {
    behaupte(genutzt.has(a),
      `${a.datei}:${a.zeile} ist nicht mehr ${a.zeichen} Zeichen breit — ` +
      "Eintrag aus BEKANNTE_ABWEICHUNGEN entfernen");
  }
}

console.log(`      · ${dateien.length} Quelldateien mit Kopfnotiz, ` +
  `längste ${laengste.kurz} (${laengste.zeilen} Zeilen), ` +
  `breiteste Zeile ${breiteste.kurz}:${breiteste.zeile} (${breiteste.zeichen} Zeichen)`);
for (const a of BEKANNTE_ABWEICHUNGEN) {
  console.log(`      · geduldet: ${a.datei}:${a.zeile} mit ${a.zeichen} Zeichen — ${a.grund}`);
}

ende("Kopfnotizen und Maße");
