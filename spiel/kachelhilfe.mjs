/* [Aufgabe: Regelkern] Die kleinen Griffe, die beide Hälften des
   Kartenbaus brauchen — Feldindex, Richtung, Gebietssuche.

   ── Warum eine eigene Datei ────────────────────────────────────────

   `spiel/landschaft.mjs` baut die Form, `spiel/ausstattung.mjs` legt
   darauf, was daraufliegt. Beide brauchen dieselben vier Zeilen: aus
   einem Feldindex Spalte und Zeile machen, wissen ob eine Kachel offen
   ist, und zusammenhängende Gebiete finden.

   Lägen sie in einer der beiden, müsste die andere sie von dort holen —
   und weil `landschaft.mjs` die Ausstattung ohnehin aufruft, wäre das
   ein **Ringschluss**. Im Browser läuft der meist; im Bündler
   (`werkzeuge/eine-datei.mjs`) bricht er ab, weil die Reihenfolge dann
   nicht mehr eindeutig ist. Eine dritte, unterste Datei löst das ohne
   Kunstgriff.

   ── Warum auch `beckenGebiete` hier steht ──────────────────────────

   Aus demselben Grund. Die Frage „wo ist eine Mulde?" beantwortet
   `spiel/ausstattung.mjs` beim Wasser; die Form der Karte, also die
   Ebenen und die Wände, entsteht in `spiel/landschaft.mjs`. Stünde die
   Antwort dort, holte die Ausstattung sie aus der Landschaft, die die
   Ausstattung ihrerseits aufruft — genau der Ringschluss von oben.
   Dazu ist es dieselbe Sorte Frage wie `plateaus`: eine reine Abfrage
   über zusammenhängende Gebiete, die nichts ändert.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `spiel/gitter.mjs` (die Schlüssel und Richtungen). Gelesen von
   `spiel/landschaft.mjs`, `spiel/ausstattung.mjs` (dort setzt
   `setzeWasser` seine Seen auf die Beckenböden) und
   `werkzeuge/pruefe-landschaft.mjs`, `werkzeuge/pruefe-becken.mjs`.
   Liest selbst nichts aus dem Spiel. */

import { richtungen, BLOCKT_BEWEGUNG } from "./gitter.mjs";

export const spalte = (karte, i) => i % karte.breite;
export const zeile = (karte, i) => (i / karte.breite) | 0;

/* Die Gegenrichtung. Sechs Richtungen, also liegt sie drei weiter —
   und sie kommt aus der Tabelle **des Nachbarn**, nicht aus der des
   Ausgangsfeldes.

   Der erste Anlauf am 07.09.2026 schrieb `richtungen(y + 1)`, also
   „die andere Parität". Das stimmt für die vier schrägen Richtungen
   und ist für **Ost und West falsch**: Dort bleibt man in derselben
   Zeile. Gemessen hat es die Landschaftsprüfung — von 35 möglichen
   Aufstiegen bekamen nur 18 ihre Rampe, die übrigen zeigten ins
   Leere. Deshalb nimmt diese Funktion jetzt die Zeile des Nachbarn
   und rechnet sie nicht aus. */
export const gegen = (zeileDesNachbarn, k) => richtungen(zeileDesNachbarn)[(k + 3) % 6];

export const offen = (karte, i) => !BLOCKT_BEWEGUNG.has(karte.hindernis[i]);

export const alleDabei = () => true;
export const gleicheEbene = (karte) => (i, j) => karte.ebene[i] === karte.ebene[j];

/* Der eine Flutfüller. Vier Fragen dieser Datei sind dieselbe —
   „welche Kacheln hängen zusammen?" — und unterscheiden sich nur in
   `dabei` (wer zählt mit) und `gleich`. Viermal derselbe Stapel wäre
   viermal die Gelegenheit, die Randprüfung zu vergessen. Immer vier
   Richtungen in der Reihenfolge aus `richtungen`, damit die
   Nummerierung auf jedem Rechner dieselbe ist (Fehlerbuch B2). */
export function gebiete(karte, dabei, gleich) {
  const nummer = new Int32Array(karte.anzahl).fill(-1);
  const groessen = [];
  const stapel = [];
  for (let start = 0; start < karte.anzahl; start++) {
    if (nummer[start] >= 0 || !dabei(start)) continue;
    const marke = groessen.length;
    let zahl = 0;
    nummer[start] = marke;
    stapel.push(start);
    while (stapel.length) {
      const i = stapel.pop();
      zahl++;
      const x = spalte(karte, i), y = zeile(karte, i);
      for (const r of richtungen(y)) {
        const nx = x + r.dx, ny = y + r.dy;
        if (!karte.drin(nx, ny)) continue;
        const j = ny * karte.breite + nx;
        if (nummer[j] >= 0 || !dabei(j) || !gleich(i, j)) continue;
        nummer[j] = marke;
        stapel.push(j);
      }
    }
    groessen.push(zahl);
  }
  return { nummer, groessen };
}

/* Die zusammenhängenden Flächen gleicher Ebene unter den offenen
   Kacheln — die „Plateaus". Steht hier und nicht im Kartenbau, weil
   sowohl die Rampen als auch die Startsuche danach fragen. */
/* Plateaus: Gebiete gleicher Ebene unter den **offenen** Kacheln —
   das, was eine Rampe verbindet, und die Zahl, an der man sieht, ob
   eine Karte aus Flächen besteht oder aus Konfetti. */
export function plateaus(karte) {
  return gebiete(karte, (i) => offen(karte, i), gleicheEbene(karte));
}

/* Die Becken einer Karte: Plateaus, von denen es nur **hinauf** geht.

   Ein Becken hat zwei Teile, und beide werden gebraucht:

   · den **Boden** — ein zusammenhängendes offenes Gebiet gleicher
     Ebene, dessen sämtliche offenen Nachbarn höher liegen. Wasser
     liegt genau dort, weil es nirgends abfließen kann;
   · den **Rand** — die angrenzenden höheren offenen Kacheln. Von dort
     schaut man hinein, dorthin klettert man heraus, von dort wird
     gestoßen.

   Gefragt wird über `plateaus`, also über den einen Flutfüller dieser
   Datei. Eine eigene Nachbarschleife wäre eine zweite Reihenfolge, und
   zwei Rechner nummerierten ihre Becken verschieden (Fehlerbuch B2).

   Zwei Feinheiten, die man beim Lesen sonst falsch rät:

   · Ein offener Nachbar **gleicher** Ebene kann es nicht geben — er
     gehörte zum selben Gebiet. Deshalb genügt der Vergleich „tiefer?"
     für die Absage und „höher?" für den Rand.
   · Ein Gebiet ganz ohne offene Nachbarn ist nach dieser Regel ein
     Becken (es gibt keinen Nachbarn, der tiefer läge). Auf einer
     erzeugten Karte kommt das nicht vor — dort ist jede offene Kachel
     hin und zurück erreichbar —, und auf einer von Hand gebauten ist
     ein eingemauerter Hohlraum tatsächlich eine Zisterne.

   Reine Abfrage: ändert an der Karte nichts. */
export function beckenGebiete(karte) {
  const { nummer, groessen } = plateaus(karte);
  const nachUnten = new Uint8Array(groessen.length);
  for (let i = 0; i < karte.anzahl; i++) {
    const n = nummer[i];
    if (n < 0 || nachUnten[n]) continue;
    const x = spalte(karte, i), y = zeile(karte, i);
    for (const r of richtungen(y)) {
      const nx = x + r.dx, ny = y + r.dy;
      if (!karte.drin(nx, ny)) continue;
      const j = ny * karte.breite + nx;
      if (offen(karte, j) && karte.ebene[j] < karte.ebene[i]) { nachUnten[n] = 1; break; }
    }
  }
  const platz = new Int32Array(groessen.length).fill(-1);
  const becken = [], raender = [];
  for (let n = 0; n < groessen.length; n++) {
    if (nachUnten[n]) continue;
    platz[n] = becken.length;
    becken.push({ nummer: n, ebene: -1, boden: [], rand: [] });
    raender.push(new Set());
  }
  for (let i = 0; i < karte.anzahl; i++) {
    const n = nummer[i];
    if (n < 0 || platz[n] < 0) continue;
    const b = becken[platz[n]];
    if (b.ebene < 0) b.ebene = karte.ebene[i];
    b.boden.push(i);
    const x = spalte(karte, i), y = zeile(karte, i);
    for (const r of richtungen(y)) {
      const nx = x + r.dx, ny = y + r.dy;
      if (!karte.drin(nx, ny)) continue;
      const j = ny * karte.breite + nx;
      if (offen(karte, j) && karte.ebene[j] > karte.ebene[i]) raender[platz[n]].add(j);
    }
  }
  for (let k = 0; k < becken.length; k++) becken[k].rand = [...raender[k]];
  return becken;
}
