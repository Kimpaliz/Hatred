/* [Aufgabe: Regelkern] Die Zugordnung — wer wann dran ist, was ein
   Rundenanfang mit jedem Wesen macht und wann der Lauf zu Ende ist.

   ── Warum es das gibt / Warum so ───────────────────────────────────

   An dieser Datei hängt das ganze Spiel: `spiel/aktionen.mjs` fragt
   sie, wer handeln darf, das Bild fragt sie, wessen Zug es anzeigen
   soll, und das Netz fragt sie, ob ein hereingereichtes Paket
   überhaupt an der Reihe ist. Deshalb steht die Reihenfolge hier an
   **einer** Stelle und wird nirgends nachgebaut.

   **Warum eine Liste von IDs und kein Zeiger auf Wesen.** `ordnung`
   trägt Zahlen. Zahlen überleben `JSON.stringify`, einen
   Speicherstand und die Leitung; ein Objektzeiger tut das nicht. Wer
   das Wesen braucht, schlägt es über `nachId` nach — und bekommt bei
   einem gelöschten Wesen `undefined` statt eines halb toten Objekts.

   **Warum die Ordnung nur am Rundenanfang neu entsteht.** Stirbt
   jemand mitten in der Runde, bleibt er in `ordnung` stehen und wird
   beim Weiterrücken nur **übersprungen**. Nähme man ihn heraus,
   rutschte alles dahinter eine Stelle nach vorn, und der Zeiger, der
   gerade weitergerückt ist, überspränge genau ein Wesen — das ist
   Fehlerbuch E1, und es fällt erst nach zwanzig Runden auf, wenn
   jemand zählt, wer wie oft dran war. Erst der nächste Rundenanfang
   baut die Ordnung aus den Lebenden neu.

   **Warum die Ordnung eine vollständige Vergleichsregel hat.** Sortiert
   wird nach Flinkheit absteigend und bei Gleichstand nach ID
   aufsteigend. Damit gibt es zu jeder Menge von Wesen **genau eine**
   Ordnung, und es ist gleichgültig, ob das Sortierverfahren stabil ist
   oder in welcher Reihenfolge die Wesen hereingereicht wurden. Eine
   Regel, die nur „meistens dasselbe" ergibt, ist im Netz-Koop ein
   Auseinanderlaufen mit Ansage (Fehlerbuch B2).

   **Warum `starteRunde` die Rundennummer nicht selbst hochzählt.** Sie
   bereitet die Runde vor, deren Nummer schon in `zustand.runde` steht.
   `zugBeenden` zählt hoch und ruft dann. So gibt es keinen Zustand, in
   dem die Nummer je nach Aufrufweg um eins verschoben ist — und
   `spiel/lauf.mjs` kann mit `runde: 1` beginnen und einmal rufen.

   **Die Reihenfolge am Rundenanfang ist eine Regel, keine Laune.**
   Zuerst werden die Punkte **abgelesen** (da liegt die Fessel noch
   darauf), dann ticken die Wirkungen samt Brandschaden (das kann
   töten), dann werden die Punkte **gesetzt** (eine Leiche bekommt
   keine), zuletzt die Lava. Läse man die Punkte nach dem Ticken, liefe
   eine Fessel über zwei Runden nur eine einzige Runde lang — sie fiele
   weg, bevor sie zum zweiten Mal drückt.

   **Was ein Wesen kann, steht nicht hier.** Rüstung, Aktionspunkte
   und das Herunterzählen der Wirkungen rechnet `spiel/wesen.mjs`; der
   Kampf fragt dieselbe Stelle (`spiel/kampf.mjs`). Diese Datei fragt
   sie auch — sie rechnet nichts davon nach.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `spiel/aktionen.mjs` (fragt `amZugWesen`, ruft `zugBeenden`, legt die
   Wirkungen an, die hier ticken), `spiel/wesen.mjs` (`apFuerZug`,
   `sichtVon`, `wirkungenTicken` — die Wesenwerte selbst),
   `spiel/kampf.mjs` (bucht den Angriffsschaden), `spiel/hoehen.mjs`
   (`betretenSchaden` — dieselbe Lavazahl wie beim Betreten, keine
   zweite Kopie), `spiel/katalog/*.mjs` (die Vorlagen, aus denen
   `apMax`, `flinkheit` und `ruestung` stammen), `spiel/lauf.mjs` (baut
   den Zustand und ruft `starteRunde` einmal), `netz/sitzung.mjs`
   (prüft, ob ein Paket vom Wesen am Zug kommt),
   `werkzeuge/pruefe-zug.mjs`. */

import { betretenSchaden } from "./hoehen.mjs";
import { apFuerZug, wirkungenTicken, sichtVon as sichtOhneZusatz } from "./wesen.mjs";

/* Der Grundwert. Sechs teilt sich durch zwei und drei — also drei
   Schläge mit einer 2-AP-Waffe oder zwei mit einer 3-AP-Waffe, ohne
   Rest. Jedes Wesen darf mit `apMax` davon abweichen; dieser Wert gilt
   nur, wenn es keinen eigenen mitbringt. */
export const AP_JE_ZUG = 6;

/* Die beiden Seiten. Als benannte Zeichenketten, damit ein Tippfehler
   in einer Vorlage nicht stumm eine dritte Seite erfindet, die dann
   nie ein Ziel hat. */
export const SEITE_JAEGER = "jaeger";
export const SEITE_BRUT = "brut";

/* ── Nachschlagen ───────────────────────────────────────────────────

   `nachId` ist die schnelle Antwort; ohne sie wird die Liste
   durchsucht. Das ist keine Bequemlichkeit für den Aufrufer, sondern
   für die Prüfung: Sie darf einen Zustand von Hand bauen, ohne die
   Karte doppelt zu führen. */
export function wesenMitId(zustand, id) {
  if (!zustand || id === undefined || id === null) return null;
  if (zustand.nachId && typeof zustand.nachId.get === "function") {
    const treffer = zustand.nachId.get(id);
    if (treffer) return treffer;
  }
  for (const w of zustand.wesen || []) {
    if (w && w.id === id) return w;
  }
  return null;
}

/* ── Werte, die aus Wesen und Wirkungen zusammen entstehen ──────────

   Rüstung, Aktionspunkte und das Herunterzählen der Wirkungen stehen
   in `spiel/wesen.mjs` und werden von dort geholt — dieselbe Antwort,
   die auch `spiel/kampf.mjs` bekommt. Eine zweite Rechnung hier wäre
   genau der Fall, vor dem die Kopfnotiz von `hoehen.mjs` warnt: eine
   `schild`-Wirkung, die im Kampf zählt und beim Aufräumen nicht. */

export function apMaxVon(wesen) {
  return wesen && Number.isFinite(wesen.apMax) ? wesen.apMax : AP_JE_ZUG;
}

export function wirkungenVon(wesen, art) {
  const raus = [];
  for (const w of (wesen && wesen.wirkungen) || []) {
    if (w && w.art === art) raus.push(w);
  }
  return raus;
}

export function hatWirkung(wesen, art) {
  return wirkungenVon(wesen, art).length > 0;
}

/* Sichtweite. `spiel/wesen.mjs` kennt nur den Abzug (`geblendet`),
   weil dort nur steht, was im Kampf gebraucht wird; der Zuschlag aus
   der Fähigkeit `weitblick` kommt hier obendrauf. Aufgesetzt und nicht
   nachgebaut: Die Blendung wird weiterhin dort gerechnet. */
export function sichtVon(wesen) {
  let weite = sichtOhneZusatz(wesen);
  for (const w of wirkungenVon(wesen, "sicht")) {
    if (Number.isFinite(w.zusatz)) weite += w.zusatz;
  }
  return weite < 0 ? 0 : weite;
}

/* Eine Wirkung anlegen oder auffrischen — **nur** für die Wirkungen,
   die `spiel/wesen.mjs` nicht kennt: `abklingen`, `verbergen`,
   `sicht`. Alles, was dort im Verzeichnis `WIRKUNGEN` steht (Brand,
   Fessel, Schild), wird mit `wirkungAnhaengen` von dort angehängt,
   damit für diese drei genau **eine** Zusammenlegungsregel gilt.
   Heruntergezählt werden trotzdem alle zusammen: `wirkungenTicken`
   nimmt jeder Wirkung eine Runde, ob es sie kennt oder nicht.

   Aufgefrischt statt angehängt, weil sich sonst zwei `weitblick` zu
   acht Feldern Sichtweite addierten, ohne dass irgendwo eine Regel das
   sagt. Abklingzeiten sind je Fähigkeitsschlüssel eigene Einträge —
   sie beschreiben verschiedene Dinge. */
export function setzeWirkung(wesen, wirkung) {
  if (!wesen || !wirkung) return null;
  if (!Array.isArray(wesen.wirkungen)) wesen.wirkungen = [];
  const gleicheStelle = wesen.wirkungen.findIndex((w) =>
    w && w.art === wirkung.art
    && (wirkung.art !== "abklingen" || w.schluessel === wirkung.schluessel));
  if (gleicheStelle >= 0) {
    wesen.wirkungen[gleicheStelle] = wirkung;
    return wirkung;
  }
  wesen.wirkungen.push(wirkung);
  return wirkung;
}

/* Die Abklingzeit einer Fähigkeit liegt als Wirkung im Wesen und
   tickt mit allem anderen herunter. Ein eigenes Feld wäre ein zweiter
   Zähler mit eigener Vergesslichkeit; so gibt es nur einen.

   `abklingen: n` heißt: benutzt in Runde r, wieder frei in Runde
   r + n. Der Rest der Runde, in der sie fiel, zählt als der erste. */
export function abklingtNoch(wesen, schluessel) {
  for (const w of wirkungenVon(wesen, "abklingen")) {
    if (w.schluessel === schluessel) return true;
  }
  return false;
}

/* ── Die Ordnung ────────────────────────────────────────────────────

   Flinkheit absteigend, bei Gleichstand ID aufsteigend. Die zweite
   Hälfte ist die wichtigere: Sie macht den Vergleich **vollständig**,
   und damit hängt das Ergebnis weder an der Stabilität des
   Sortierverfahrens noch an der Reihenfolge der Eingabe. Wesen ohne
   Flinkheit zählen als 0 statt als `undefined` — sonst stünden sie je
   nach Vergleichsrichtung einmal vorn und einmal hinten. */
export function macheOrdnung(wesenListe) {
  const liste = [];
  for (const w of wesenListe || []) {
    if (w && w.id !== undefined && w.id !== null) liste.push(w);
  }
  liste.sort((a, b) => {
    const fa = Number.isFinite(a.flinkheit) ? a.flinkheit : 0;
    const fb = Number.isFinite(b.flinkheit) ? b.flinkheit : 0;
    if (fa !== fb) return fb - fa;
    if (a.id < b.id) return -1;
    if (a.id > b.id) return 1;
    return 0;
  });
  return liste.map((w) => w.id);
}

/* ── Schaden am Rundenanfang ───────────────────────────────────────

   Brand und Lava schlagen zu, bevor irgendjemand handeln kann. Sie
   benutzen dieselbe Ereignisform wie jeder Waffentreffer, damit das
   Bild nur **eine** Sorte Schadensereignis abspielen muss. */
export function fuegeSchadenZu(wesen, wieviel, quelle, art2, ereignisse) {
  if (!wesen || !wesen.lebt || !(wieviel > 0)) return;
  wesen.lp -= wieviel;
  if (wesen.lp <= 0) wesen.lp = 0;
  ereignisse.push({
    art: "schaden", wer: wesen.id, wieviel, quelle, lpRest: wesen.lp, art2
  });
  if (wesen.lp === 0) {
    wesen.lebt = false;
    wesen.wacht = false;
    ereignisse.push({ art: "gestorben", wer: wesen.id, x: wesen.x, y: wesen.y });
  }
}

/* Ein Wesen an den Anfang seiner Runde bringen. Die Reihenfolge steht
   in der Kopfnotiz und ist eine Regel — nicht die Folge, in der man
   die Fälle beim Schreiben einfällt. */
function rundenbeginnFuer(zustand, wesen, ereignisse) {
  /* Wacht gilt bis zum eigenen nächsten Rundenanfang. Länger wäre sie
     kein Preis für einen ganzen Zug, sondern ein Dauerzustand. */
  wesen.wacht = false;

  /* Die Punkte werden **vor** dem Herunterzählen abgelesen und
     **nach** dem Brand gesetzt. Beides ist nötig: Läse man sie
     danach, liefe eine Fessel über zwei Runden nur eine — sie fiele
     weg, bevor sie zum zweiten Mal drückt. Setzte man sie davor,
     bekäme eine Leiche noch ein `apGesetzt`. */
  const punkte = apFuerZug(wesen);
  ereignisse.push(...wirkungenTicken(wesen));
  if (!wesen.lebt) return;

  wesen.ap = punkte > 0 ? punkte : 0;
  ereignisse.push({ art: "apGesetzt", wer: wesen.id, ap: wesen.ap });

  const lava = betretenSchaden(zustand.karte, wesen.x, wesen.y);
  if (lava) fuegeSchadenZu(wesen, lava.wieviel, "lava", lava.art, ereignisse);
}

/* Lichter, die eine Fähigkeit gelegt hat, brennen nur eine Weile.
   Sie liegen in `karte.lichter` wie jede Fackel — mit einem
   zusätzlichen `runden`. Ein Licht ohne `runden` gehört der
   Landschaft und erlischt nie. */
function tickeLichter(zustand, ereignisse) {
  const karte = zustand.karte;
  if (!karte || !Array.isArray(karte.lichter) || karte.lichter.length === 0) return;
  const bleiben = [];
  for (const licht of karte.lichter) {
    if (!licht) continue;
    if (!Number.isFinite(licht.runden)) { bleiben.push(licht); continue; }
    licht.runden -= 1;
    if (licht.runden > 0) bleiben.push(licht);
    else ereignisse.push({ art: "lichtWeg", x: licht.x, y: licht.y });
  }
  karte.lichter = bleiben;
}

/* ── Lauf-Ende ─────────────────────────────────────────────────────

   Niederlage geht vor Sieg: Fällt der letzte Jäger im selben Zug wie
   die letzte Brut, ist der Lauf verloren. Das ist die härtere und
   damit die eindeutige Auslegung — ein „beide tot, also gewonnen"
   wäre eine Belohnung fürs Sterben. */
export function pruefeLaufEnde(zustand) {
  if (!zustand) return null;
  if (zustand.vorbei) return zustand.vorbei;
  let jaeger = 0;
  let brut = 0;
  for (const w of zustand.wesen || []) {
    if (!w || !w.lebt) continue;
    if (w.seite === SEITE_JAEGER) jaeger += 1;
    else if (w.seite === SEITE_BRUT) brut += 1;
  }
  if (jaeger === 0) return "niederlage";
  if (brut === 0) return "sieg";
  return null;
}

/* Trägt das Ende in den Zustand ein und gibt das Ereignis dazu —
   genau einmal, denn `zustand.vorbei` sperrt jeden weiteren Aufruf. */
export function laufEndeEintragen(zustand) {
  if (zustand.vorbei) return [];
  const grund = pruefeLaufEnde(zustand);
  if (!grund) return [];
  zustand.vorbei = grund;
  return [{ art: "laufEnde", grund }];
}

/* ── Zeiger und Seite ──────────────────────────────────────────────*/

function lebtAnStelle(zustand, stelle) {
  const wesen = wesenMitId(zustand, zustand.ordnung[stelle]);
  return !!(wesen && wesen.lebt);
}

/* Die Seite am Zug ergibt sich aus dem Wesen am Zug — sie wird nicht
   getrennt fortgeschrieben. Ein zweiter Zähler für dieselbe Sache
   läuft irgendwann auseinander. Gemeldet wird nur die Änderung; das
   Bild braucht den Wechsel, nicht die Wiederholung. */
function seiteNachfuehren(zustand) {
  const wesen = amZugWesen(zustand);
  if (!wesen) return [];
  if (zustand.seiteDran === wesen.seite) return [];
  zustand.seiteDran = wesen.seite;
  return [{ art: "seiteDran", seite: wesen.seite }];
}

/* ── Der Rundenanfang ──────────────────────────────────────────────*/

export function starteRunde(zustand) {
  const ereignisse = [];
  if (!zustand || zustand.vorbei) return ereignisse;

  ereignisse.push({ art: "rundeNeu", nummer: zustand.runde });
  tickeLichter(zustand, ereignisse);

  const lebende = [];
  for (const w of zustand.wesen || []) if (w && w.lebt) lebende.push(w);
  zustand.ordnung = macheOrdnung(lebende);
  zustand.amZug = 0;

  /* In Ordnungsreihenfolge und nicht in Listenreihenfolge: Wer zuerst
     dran ist, brennt zuerst. Bei Ereignissen, die einen Tod auslösen
     können, ist das der Unterschied zwischen zwei Ereignislisten. */
  for (const id of zustand.ordnung) {
    const wesen = wesenMitId(zustand, id);
    if (wesen && wesen.lebt) rundenbeginnFuer(zustand, wesen, ereignisse);
  }

  const schluss = laufEndeEintragen(zustand);
  if (schluss.length > 0) { ereignisse.push(...schluss); return ereignisse; }

  /* Wer am Rundenanfang gestorben ist, kommt nicht mehr dran. Läuft
     der Zeiger dabei aus der Liste, ist niemand von den Lebenden in
     dieser Ordnung — dann hätte `laufEndeEintragen` schon zugeschlagen,
     und wir kämen hier nicht vorbei. */
  while (zustand.amZug < zustand.ordnung.length && !lebtAnStelle(zustand, zustand.amZug)) {
    zustand.amZug += 1;
  }
  ereignisse.push(...seiteNachfuehren(zustand));
  return ereignisse;
}

/* ── Wer ist dran ──────────────────────────────────────────────────

   Eine reine Frage: Sie rückt nichts weiter und meldet nichts. Ein
   Toter gibt `null` — so fragt niemand versehentlich eine Leiche nach
   ihren möglichen Aktionen. Dass der Zeiger nie auf einer Leiche
   stehen bleibt, sichert `zugBeenden`: Stirbt das handelnde Wesen,
   beendet `spiel/aktionen.mjs` seinen Zug sofort. */
export function amZugWesen(zustand) {
  if (!zustand || zustand.vorbei) return null;
  if (!Array.isArray(zustand.ordnung)) return null;
  const id = zustand.ordnung[zustand.amZug];
  if (id === undefined) return null;
  const wesen = wesenMitId(zustand, id);
  return wesen && wesen.lebt ? wesen : null;
}

/* Ist der laufende Zug der **letzte** dieser Seite in dieser Runde?
   Gefragt wird ab der Stelle **hinter** dem Zeiger: Der eigene Zug
   läuft ja gerade, die Frage gilt dem, was danach kommt. Genau das
   will die Oberfläche wissen („danach sind die anderen dran") und
   genau das fragt der Gegner-Antrieb, bevor er die Steuerung
   zurückgibt. Ist niemand am Zug — Runde vorbei, Lauf vorbei —, ist
   die Seite erst recht fertig. */
export function seiteFertig(zustand) {
  if (!zustand || !Array.isArray(zustand.ordnung)) return true;
  for (let i = zustand.amZug + 1; i < zustand.ordnung.length; i++) {
    const wesen = wesenMitId(zustand, zustand.ordnung[i]);
    if (wesen && wesen.lebt && wesen.seite === zustand.seiteDran) return false;
  }
  return true;
}

/* ── Weiterrücken ─────────────────────────────────────────────────*/

export function zugBeenden(zustand) {
  const ereignisse = [];
  if (!zustand || zustand.vorbei) return ereignisse;
  if (!Array.isArray(zustand.ordnung)) return ereignisse;

  /* Gemeldet wird die ID aus der Ordnung, nicht die des lebenden
     Wesens: Wer im eigenen Zug gefallen ist, hat seinen Zug trotzdem
     beendet, und das Bild wartet auf dieses Ereignis. */
  const id = zustand.ordnung[zustand.amZug];
  if (id !== undefined) ereignisse.push({ art: "zugEnde", wer: id });

  const schluss = laufEndeEintragen(zustand);
  if (schluss.length > 0) { ereignisse.push(...schluss); return ereignisse; }

  zustand.amZug += 1;
  while (zustand.amZug < zustand.ordnung.length && !lebtAnStelle(zustand, zustand.amZug)) {
    zustand.amZug += 1;
  }

  if (zustand.amZug >= zustand.ordnung.length) {
    zustand.runde += 1;
    ereignisse.push(...starteRunde(zustand));
    return ereignisse;
  }
  ereignisse.push(...seiteNachfuehren(zustand));
  return ereignisse;
}
