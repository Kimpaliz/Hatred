/* [Aufgabe: Regelkern] Die Figuren — wie aus einer Katalogvorlage ein
   Wesen wird, was an ihm haftet und wie lange.

   ── Warum es das gibt / Warum so ───────────────────────────────────

   Der Katalog hält **Vorlagen**: „Ein Grubenhund hat 14 Lebenspunkte."
   Auf der Karte steht dagegen ein **Wesen**: „Nummer 7 hat noch 6
   Lebenspunkte, brennt seit einer Runde und steht auf (12, 8)." Beides
   in einem Objekt zu führen ist der schnellste Weg zu einem Kerker, in
   dem der zweite Grubenhund schon angeschlagen ins Spiel kommt — die
   Vorlage bliebe nämlich nicht Vorlage. Deshalb baut `macheWesen` eine
   **frische** Figur und kopiert dabei auch die Fähigkeitenliste; sie
   ist der einzige Platz, an dem aus Katalogzahlen Spielzahlen werden.

   **Warum hier so viel geworfen wird.** Ein fehlendes `lpMax` wird zu
   `undefined`, das erste `lp - schaden` zu `NaN`, und `NaN > 0` ist
   falsch — die Figur gilt ab da als tot, ohne dass je eine Meldung
   erschien. Ein Waffenschlüssel mit Tippfehler fiele erst im Kampf auf,
   drei Module weiter, als „kann `ap` von `undefined` nicht lesen".
   Beides wird deshalb an der einen Stelle geprüft, an der die Figur
   entsteht.

   **Warum die Felder in fester Reihenfolge stehen.** Ein Wesen geht als
   Teil des Spielstands durch `JSON.stringify`; die Reihenfolge der
   Schlüssel ist dort die Einfügereihenfolge. Ein Objektliteral mit
   fester Folge gibt auf jedem Rechner dieselben Bytes — bedingt
   angehängte Felder gäben es nicht (Fehlerbuch B2).

   ── Die Wirkungen: warum eine Liste am Wesen und keine Felder ───────

   „Brennt", „vergiftet", „verlangsamt", „geschildet", „geblendet" haben
   alle dieselbe Form: eine Art, eine Reststrecke in Runden, eine
   Stärke. Als einzelne Felder am Wesen (`brennt: 2, brenntStaerke: 3,
   vergiftet: 0, …`) wären das zehn Felder, von denen neun meistens
   leer sind, und jede neue Wirkung berührte jede Stelle, die ein Wesen
   baut, speichert oder vergleicht. Als Liste flacher Objekte ist es
   eine Stelle — und sie überlebt `JSON.stringify` unverändert.

   **Gleiche Art wird zusammengelegt, nicht angehängt.** Sonst hätte ein
   Wesen nach fünf Pechfesseln fünf Einträge, verlöre zehn
   Aktionspunkte und stünde für immer still; und die Liste wüchse über
   dreißig Runden, ohne je zu schrumpfen. Es gewinnt die höhere Stärke
   **und** die längere Dauer — wer stärker fesselt, fesselt nicht
   kürzer, wer länger fesselt, nicht schwächer.

   **Wirkungsschaden geht an der Rüstung vorbei.** Ein Panzer hält keine
   Flamme ab, die schon unter ihm brennt, und kein Gift, das schon im
   Blut ist. Der zweite Grund ist ein baulicher: `wirkungenTicken` läuft
   am Zugbeginn und dürfte sonst `spiel/kampf.mjs` rufen — das ruft
   aber diese Datei, und zwei Module, die einander rufen, sind ein Ring,
   den man später nicht mehr auseinanderbekommt.

   **Was hier nicht getickt wird: Lava.** Auch sie tut am Zugbeginn weh
   (`hoehen.betretenSchaden`), aber dafür braucht man die Karte, und
   diese Datei kennt keine. Wer die Züge führt, hat beides zur Hand.

   **Warum `ruestungVon`, `sichtVon`, `apFuerZug` hier stehen.** Die
   rohen Zahlen am Wesen (`ruestung`, `sicht`, `apMax`) bleiben roh —
   eine Wirkung, die sie überschreibt, müsste sie beim Ablaufen wieder
   herstellen, und genau dabei bleibt irgendwann eine Stufe Schild
   hängen. Gefragt wird deshalb, nicht geschrieben. `spiel/sicht.mjs`
   liest `wesen.sicht` roh und soll von Wirkungen nichts wissen; wer
   ein geblendetes Wesen richtig sehen lassen will, reicht ihm
   `{ ...wesen, sicht: sichtVon(wesen) }` herein.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `spiel/katalog/helden.mjs` und `spiel/katalog/gegner.mjs` (die
   Vorlagen), `spiel/katalog/waffen.mjs` und
   `spiel/katalog/faehigkeiten.mjs` (prüfen die genannten Schlüssel),
   `spiel/kampf.mjs` (fragt `ruestungVon`, hängt `brennt` an),
   `spiel/wegfindung.mjs` (`belegtPruefer` ist ihr `belegt`),
   `spiel/zuege.mjs` (tickt am Zugbeginn, setzt `apFuerZug`),
   `werkzeuge/pruefe-kampf.mjs`. */

import { kenntWaffe } from "./katalog/waffen.mjs";
import { kenntFaehigkeit } from "./katalog/faehigkeiten.mjs";

/* Die beiden Seiten. Als Liste, damit ein Tippfehler („jäger") beim
   Bauen der Figur auffällt und nicht erst dann, wenn niemand mehr ein
   Ziel findet, weil zwei Seiten nirgends aufeinandertreffen. */
export const SEITEN = ["jaeger", "brut"];

/* Höchstens vier Plätze — der Auftrag ist „1 bis 4 über das Internet". */
export const MAX_SPIELER = 4;

/* Die Wirkungen, die ein Wesen tragen kann.

   `wirktAuf` sagt, **welche** Zahl die Wirkung anfasst, und ist der
   Grund, warum `wirkungenTicken` keine Aufzählung von Sonderfällen ist:
   Was auf `lp` wirkt, tut am Zugbeginn weh; alles andere wird gefragt,
   wenn die Zahl gebraucht wird. Eine sechste Wirkung braucht damit
   keine neue Verzweigung, nur einen Eintrag.

   `schadensart` ist der Schlüssel, der im Ereignis `schaden` als `art2`
   erscheint — dieselben Worte wie bei den Waffen, damit das Bild nicht
   zwei Listen führen muss. */
export const WIRKUNGEN = {
  brennt: { art: "brennt", name: "Brennt", wirktAuf: "lp", schadensart: "feuer" },
  vergiftet: { art: "vergiftet", name: "Vergiftet", wirktAuf: "lp", schadensart: "gift" },
  verlangsamt: { art: "verlangsamt", name: "Verlangsamt", wirktAuf: "ap", schadensart: null },
  schild: { art: "schild", name: "Schild", wirktAuf: "ruestung", schadensart: null },
  geblendet: { art: "geblendet", name: "Geblendet", wirktAuf: "sicht", schadensart: null }
};

/* Die Kleinstwerte der Vorlagenzahlen. `lpMax` mindestens 1: Eine
   Figur, die mit 0 Lebenspunkten entsteht, ist im selben Atemzug tot,
   und niemand fände heraus, warum. */
const PFLICHTZAHLEN = { lpMax: 1, apMax: 0, flinkheit: 0, ruestung: 0, sicht: 0 };

function ganzeZahl(wert, was) {
  if (!Number.isInteger(wert)) {
    throw new Error(`macheWesen: ${was} muss eine ganze Zahl sein (${wert})`);
  }
}

function vorlagenZahl(vorlage, feld, art) {
  const wert = vorlage[feld];
  if (!Number.isInteger(wert) || wert < PFLICHTZAHLEN[feld]) {
    throw new Error(
      `macheWesen: "${art}" braucht ${feld} als ganze Zahl ab ${PFLICHTZAHLEN[feld]} (${wert})`);
  }
  return wert;
}

/* Baut aus einer Katalogvorlage eine Figur für die Karte.

   Die Vorlage darf aus `HELDEN` oder aus `GEGNER` kommen: Helden nennen
   ihre Waffe `startWaffe` (sie können sie im Lauf wechseln), Gegner
   `waffe` (sie können es nicht). Beides wird hier zu **einem** Feld
   `waffe` am Wesen — sonst müsste jede Stelle, die eine Waffe braucht,
   erst fragen, wer da vor ihr steht.

   Gespeichert wird der **Schlüssel**, nicht der Waffenzettel. Er geht
   durch `JSON.stringify` und über die Leitung, ohne dass ein Katalog
   mitkopiert wird, und `waffe(schluessel)` holt den Zettel in einem
   Schritt zurück. */
export function macheWesen(vorlage, angaben = {}) {
  if (!vorlage || typeof vorlage !== "object") {
    throw new Error("macheWesen: ohne Vorlage geht nichts");
  }
  const art = vorlage.schluessel;
  if (typeof art !== "string" || art === "") {
    throw new Error("macheWesen: die Vorlage hat keinen Schlüssel");
  }

  const { id, seite, x, y, spielerPlatz = null } = angaben;
  ganzeZahl(id, "id");
  ganzeZahl(x, "x");
  ganzeZahl(y, "y");
  if (!SEITEN.includes(seite)) {
    throw new Error(`macheWesen: seite muss "jaeger" oder "brut" sein ("${seite}")`);
  }
  if (spielerPlatz !== null
    && !(Number.isInteger(spielerPlatz) && spielerPlatz >= 1 && spielerPlatz <= MAX_SPIELER)) {
    throw new Error(
      `macheWesen: spielerPlatz ist null oder 1 bis ${MAX_SPIELER} (${spielerPlatz})`);
  }

  const waffenSchluessel = vorlage.waffe !== undefined ? vorlage.waffe : vorlage.startWaffe;
  if (!kenntWaffe(waffenSchluessel)) {
    throw new Error(`macheWesen: "${art}" trägt eine unbekannte Waffe ("${waffenSchluessel}")`);
  }

  if (!Array.isArray(vorlage.faehigkeiten)) {
    throw new Error(`macheWesen: "${art}" braucht eine Liste faehigkeiten (auch eine leere)`);
  }
  for (const schluessel of vorlage.faehigkeiten) {
    if (!kenntFaehigkeit(schluessel)) {
      throw new Error(`macheWesen: "${art}" nennt eine unbekannte Fähigkeit ("${schluessel}")`);
    }
  }

  const lpMax = vorlagenZahl(vorlage, "lpMax", art);
  const apMax = vorlagenZahl(vorlage, "apMax", art);
  const flinkheit = vorlagenZahl(vorlage, "flinkheit", art);
  const ruestung = vorlagenZahl(vorlage, "ruestung", art);
  const sicht = vorlagenZahl(vorlage, "sicht", art);

  /* Feste Feldfolge, keine bedingten Anhänge — siehe Kopfnotiz.
     `eigenheit` steht mit dabei, weil zwei Klassen ohne sie ihren
     eigenen Satz verlören: Die Bogenschützin schießt von oben ein Feld
     weiter als jeder andere, der Grabräuber bekommt Truhen auf. Wer die
     Eigenheit nicht kennt, überliest das Feld. */
  return {
    id,
    art,
    seite,
    x,
    y,
    lp: lpMax,
    lpMax,
    ap: apMax,
    apMax,
    flinkheit,
    ruestung,
    sicht,
    waffe: waffenSchluessel,
    faehigkeiten: vorlage.faehigkeiten.slice(),
    wirkungen: [],
    wacht: false,
    lebt: true,
    spielerPlatz,
    eigenheit: vorlage.eigenheit === undefined ? null : vorlage.eigenheit
  };
}

/* Hängt eine Wirkung an oder frischt eine bestehende auf. Gibt den
   Eintrag zurück, damit der Aufrufer sieht, was nun wirklich gilt.

   Ganze Zahlen und nichts Negatives: Eine „Wirkung" mit Stärke −3
   wäre eine Heilung, die zufällig `brennt` heißt, und eine mit 0,5
   Runden liefe nie ab. Beides fiele im Spiel als Merkwürdigkeit auf,
   nicht als Fehler. */
export function wirkungAnhaengen(wesen, art, runden, staerke = 1) {
  if (!wesen || typeof wesen !== "object") {
    throw new Error("wirkungAnhaengen: ohne Wesen geht nichts");
  }
  if (!Object.prototype.hasOwnProperty.call(WIRKUNGEN, art)) {
    throw new Error(`wirkungAnhaengen: unbekannte Wirkung "${art}"`);
  }
  if (!Number.isInteger(runden) || runden < 1) {
    throw new Error(`wirkungAnhaengen: runden muss eine ganze Zahl ab 1 sein (${runden})`);
  }
  if (!Number.isInteger(staerke) || staerke < 0) {
    throw new Error(`wirkungAnhaengen: staerke muss eine ganze Zahl ab 0 sein (${staerke})`);
  }
  if (!Array.isArray(wesen.wirkungen)) wesen.wirkungen = [];

  for (const da of wesen.wirkungen) {
    if (da.art !== art) continue;
    if (runden > da.runden) da.runden = runden;
    if (staerke > da.staerke) da.staerke = staerke;
    return da;
  }
  const neu = { art, runden, staerke };
  wesen.wirkungen.push(neu);
  return neu;
}

/* Trägt genau diese Wirkung? Für Fragen wie „steht schon ein Schild?". */
export function hatWirkung(wesen, art) {
  if (!wesen || !Array.isArray(wesen.wirkungen)) return false;
  return wesen.wirkungen.some((w) => w.art === art);
}

/* Die Stärke einer Wirkung, 0 wenn sie nicht anliegt. Weil gleiche
   Arten zusammengelegt werden, gibt es je Art höchstens einen Eintrag —
   hier steht deshalb kein Aufaddieren, das sonst je nach
   Listenreihenfolge anders ausfiele. */
export function wirkungsStaerke(wesen, art) {
  if (!wesen || !Array.isArray(wesen.wirkungen)) return 0;
  for (const w of wesen.wirkungen) if (w.art === art) return w.staerke;
  return 0;
}

/* Die Rüstung, wie sie im Kampf gilt: die eigene plus ein Schild. */
export function ruestungVon(wesen) {
  if (!wesen) return 0;
  return wesen.ruestung + wirkungsStaerke(wesen, "schild");
}

/* Die Sichtweite, wie sie gilt. Mindestens 1: Wer geblendet ist, sieht
   schlecht — aber ein Sichtfeld von 0 wäre kein Nachteil, sondern eine
   Figur, die nicht einmal das Nachbarfeld kennt und damit keinen Zug
   mehr hat. */
export function sichtVon(wesen) {
  if (!wesen) return 0;
  return Math.max(1, wesen.sicht - wirkungsStaerke(wesen, "geblendet"));
}

/* Die Aktionspunkte, mit denen ein Zug beginnt. Nie unter 0 — negative
   Punkte machten aus der nächsten Runde eine Strafe, die niemand mehr
   nachvollziehen kann. */
export function apFuerZug(wesen) {
  if (!wesen) return 0;
  return Math.max(0, wesen.apMax - wirkungsStaerke(wesen, "verlangsamt"));
}

/* Der Zugbeginn eines Wesens: Was auf Lebenspunkte wirkt, wirkt jetzt;
   danach läuft jede Wirkung um eine Runde ab.

   Gibt die Ereignisse in fester Folge zurück — erst der Schaden in
   Listenreihenfolge, ein `gestorben` unmittelbar hinter dem Schaden,
   der es ausgelöst hat. Das Bild spielt sie in dieser Folge ab, und
   vier Rechner bauen dieselbe Liste.

   Gezählt wird **auch dann herunter**, wenn die Wirkung in dieser Runde
   nichts getan hat; sonst liefe ein Schild ohne Kämpfe nie ab. */
export function wirkungenTicken(wesen) {
  const ereignisse = [];
  if (!wesen || !Array.isArray(wesen.wirkungen) || wesen.wirkungen.length === 0) {
    return ereignisse;
  }

  if (lebendig(wesen)) {
    for (const w of wesen.wirkungen) {
      const vorlage = WIRKUNGEN[w.art];
      if (!vorlage || vorlage.wirktAuf !== "lp" || w.staerke <= 0) continue;
      /* Wer an der ersten Wirkung stirbt, verbrennt nicht noch an der
         zweiten — sonst stünden zwei `gestorben` in einer Liste. */
      if (!lebendig(wesen)) break;

      wesen.lp -= w.staerke;
      if (wesen.lp < 0) wesen.lp = 0;
      ereignisse.push({
        art: "schaden",
        wer: wesen.id,
        wieviel: w.staerke,
        quelle: w.art,
        lpRest: wesen.lp,
        art2: vorlage.schadensart
      });
      if (wesen.lp <= 0) {
        wesen.lebt = false;
        ereignisse.push({ art: "gestorben", wer: wesen.id, x: wesen.x, y: wesen.y });
      }
    }
  }

  const bleiben = [];
  for (const w of wesen.wirkungen) {
    w.runden -= 1;
    if (w.runden > 0) bleiben.push(w);
  }
  wesen.wirkungen = bleiben;
  return ereignisse;
}

/* Lebt diese Figur noch? Beide Fragen zusammen, weil `lebt` das
   Kennzeichen ist und `lp` die Zahl: Eine Figur mit `lebt: true` und 0
   Lebenspunkten gäbe es nur nach einem Fehler — sie soll dann als tot
   gelten und nicht weiterkämpfen. */
export function lebendig(wesen) {
  return Boolean(wesen) && wesen.lebt !== false && wesen.lp > 0;
}

export function istJaeger(wesen) {
  return Boolean(wesen) && wesen.seite === "jaeger";
}

export function istBrut(wesen) {
  return Boolean(wesen) && wesen.seite === "brut";
}

/* Wer steht auf diesem Feld? Tote zählen nicht — ein Leichnam ist kein
   Hindernis, sonst verstopfte der erste gefallene Krätzling den Gang
   für den Rest des Laufs. Bei mehreren gewinnt der erste der Liste;
   die Reihenfolge ist auf jedem Rechner dieselbe. */
export function wesenBei(wesenListe, x, y) {
  if (!Array.isArray(wesenListe)) return undefined;
  for (const w of wesenListe) {
    if (lebendig(w) && w.x === x && w.y === y) return w;
  }
  return undefined;
}

/* Die `belegt`-Frage für `spiel/wegfindung.mjs`, als **Momentaufnahme**.

   Einmal gebaut, danach nur noch gefragt: Die Wegfindung stellt die
   Frage für jeden Nachbarn jedes abgearbeiteten Feldes, und eine Suche
   über die halbe Karte fragt sie tausendfach. Über die Liste zu laufen
   wäre je Frage ein Durchgang durch alle Figuren.

   Momentaufnahme heißt: Wer die Figuren danach bewegt, braucht einen
   neuen Prüfer. Das ist Absicht — ein Prüfer, der sich mitten in einer
   Wegsuche ändert, gäbe Wege, die es nie gab.

   Das eigene Feld sperrt der Prüfer mit; die Wegfindung nimmt das
   Startfeld ohnehin immer hinein (siehe dort). */
export function belegtPruefer(wesenListe) {
  const besetzt = new Set();
  if (Array.isArray(wesenListe)) {
    for (const w of wesenListe) {
      if (lebendig(w)) besetzt.add(`${w.x},${w.y}`);
    }
  }
  return (x, y) => besetzt.has(`${x},${y}`);
}
