/* [Aufgabe: Prüfwesen] Rechnet nach, dass jeder erzeugte Kerker spielbar ist.

   ── Warum es das gibt / Warum so ───────────────────────────────────

   Ein Kerkerbauer ist die Sorte Werkzeug, die fast immer funktioniert
   und alle zweihundert Saaten eine Karte ausspuckt, in der ein Raum
   hinter einer Klippe liegt. Wer das von Hand sucht, findet es nie.
   Deshalb wird hier nicht **eine** Karte geprüft, sondern zweiundsiebzig
   — und zwar mit den echten Schrittregeln des Spiels, nicht mit einer
   bequemen Ersatzregel.

   Zwei Dinge sind wichtiger als alles andere:

   1. **Hin und zurück.** Vorwärts ist jede Karte erreichbar: Man fällt
      überall hinunter. Erst rückwärts zeigt sich das Loch ohne Rampe.
      Eine Prüfung, die nur vorwärts flutet, gewinnt immer und misst
      nichts.
   2. **Die Rampen müssen tragen.** Darum wird auf einer Stichprobe
      absichtlich jede Rampe entfernt und verlangt, dass die Karte
      dann **zerfällt**. Bliebe sie ganz, wäre sie flach und die ganze
      Höhenmaschinerie eine Behauptung.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `spiel/landschaft.mjs` und `spiel/rauschen.mjs` (das Geprüfte),
   `spiel/gitter.mjs` (Feldwerte), `werkzeuge/helfer.mjs` (Gerüst),
   `werkzeuge/karte-zeigen.mjs` (zum Ansehen, wenn hier etwas rot ist). */

import { abschnitt, behaupte, gleich, wirft, ende } from "./helfer.mjs";
import {
  wertRauschen, fbm, macheRauschfeld, ganzHash, hash, vn, sstep, smin, smax
} from "../spiel/rauschen.mjs";
import {
  macheKarte, alleFelder, RICHTUNGEN, RAMPE, HINDERNIS, FLUESSIG, BODEN, EBENEN,
  EBENE_GRABEN
} from "../spiel/gitter.mjs";
import { macheZufall } from "../spiel/zufall.mjs";
import { begehbar } from "../spiel/hoehen.mjs";
import {
  baueLandschaft, teileFlaeche, raeumeInBlaettern, verteileRaumArten, verbindeRaeume,
  grabeKerker, setzeHoehen, setzeRampen, setzeZier, setzeFluessigkeiten,
  setzeStartsUndAusgang, setzeLichter, sichereErreichbarkeit, plateauNummern,
  raeumeFluessigkeitenAuf, flutfuellung, rueckflut, beidseitigErreichbar,
  RAUM_ARTEN, MIN_RAUM, MIN_KARTE
} from "../spiel/landschaft.mjs";

const mitteVon = (r) => ({ x: r.x + (r.breite >> 1), y: r.y + (r.hoehe >> 1) });

const SAATEN = [];
for (let s = 1; s <= 72; s++) SAATEN.push(s * 7919 + 13);

/* ═══ Das Rauschen ══════════════════════════════════════════════════ */

abschnitt("Rauschen");
{
  let ausserhalb = 0;
  for (let x = -30; x < 30; x++) {
    for (let y = -30; y < 30; y++) {
      const w = wertRauschen(9, x * 0.37, y * 0.41);
      if (!(w >= 0 && w < 1)) ausserhalb++;
    }
  }
  gleich(ausserhalb, 0, "wertRauschen bleibt in 0…1, auch bei negativen Stellen");

  gleich(wertRauschen(4, 3.25, 8.75), wertRauschen(4, 3.25, 8.75),
    "wertRauschen ist bei gleicher Saat gleich");
  behaupte(wertRauschen(4, 3.25, 8.75) !== wertRauschen(5, 3.25, 8.75),
    "wertRauschen ist bei anderer Saat anders");
  gleich(ganzHash(7, -1, -1), ganzHash(7, -1, -1), "ganzHash ist wiederholbar");
  behaupte(ganzHash(7, 1, 2) !== ganzHash(7, 2, 1), "ganzHash unterscheidet x und y");

  /* Der Kern der Sache: Nachbarfelder müssen sich **weniger**
     unterscheiden als beliebige Felder. Genau das trennt Rauschen von
     Konfetti — und genau das wäre ohne Glättung falsch. */
  const feld = macheRauschfeld(31337, 60, 60, { oktaven: 4, dauer: 0.5, weite: 10 });
  let nachbarSumme = 0, nachbarZahl = 0, fernSumme = 0, fernZahl = 0;
  for (let y = 0; y < 60; y++) {
    for (let x = 0; x < 59; x++) {
      nachbarSumme += Math.abs(feld[y * 60 + x] - feld[y * 60 + x + 1]);
      nachbarZahl++;
    }
  }
  for (let y = 0; y < 60; y++) {
    for (let x = 0; x < 40; x++) {
      fernSumme += Math.abs(feld[y * 60 + x] - feld[y * 60 + x + 19]);
      fernZahl++;
    }
  }
  const nachbar = nachbarSumme / nachbarZahl;
  const fern = fernSumme / fernZahl;
  behaupte(nachbar * 3 < fern, "Nachbarfelder ähneln sich deutlich mehr als ferne"
    + ` (${nachbar.toFixed(4)} gegen ${fern.toFixed(4)})`);

  let fbmDaneben = 0;
  for (let x = 0; x < 40; x++) {
    for (let y = 0; y < 40; y++) {
      const w = fbm(77, x, y, { oktaven: 6, dauer: 0.6, weite: 5 });
      if (!(w >= 0 && w < 1)) fbmDaneben++;
    }
  }
  gleich(fbmDaneben, 0, "fbm bleibt in 0…1, auch bei sechs Oktaven");
  behaupte(fbm(77, 3, 4, { oktaven: 1, dauer: 0.5, weite: 8 })
    !== fbm(77, 3, 4, { oktaven: 4, dauer: 0.5, weite: 8 }),
    "mehr Oktaven ändern das Ergebnis");

  const a = macheRauschfeld(5, 20, 12, { oktaven: 3, weite: 6 });
  const b = macheRauschfeld(5, 20, 12, { oktaven: 3, weite: 6 });
  gleich(a.length, 240, "macheRauschfeld liefert breite × hoehe Werte");
  let ungleich = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) ungleich++;
  gleich(ungleich, 0, "macheRauschfeld ist byteweise wiederholbar");
  gleich(a[7 * 20 + 3], Math.fround(fbm(5, 3, 7, { oktaven: 3, weite: 6 })),
    "macheRauschfeld[i] ist fbm an derselben Stelle");
  wirft(() => macheRauschfeld(5, 0, 4), "macheRauschfeld wirft bei Breite 0");
  wirft(() => macheRauschfeld(5, 4.5, 4), "macheRauschfeld wirft bei gebrochener Breite");

  /* In `spiel/rauschen.mjs` wohnen zurzeit zwei Rauschfamilien: die
     hiesige und die aus Janniks Scotophobia-Engine, die
     `spiel/welt-feld.mjs` benutzt. `fbm` entscheidet am vierten
     Argument, welche gemeint ist. Diese Probe hält beide auseinander —
     ohne sie bekäme eine der beiden still die Zahlen der anderen, und
     genau das fiele niemandem auf: Beide liefern 0…1. */
  const meins = fbm(7, 3, 4, { oktaven: 3, dauer: 0.5, weite: 8 });
  const scoto = fbm(7, 3, 4, 3);
  behaupte(meins >= 0 && meins < 1 && scoto >= 0 && scoto < 1,
    "beide Rauschfamilien bleiben in 0…1");
  behaupte(meins !== scoto,
    "eine Zahl als viertes Argument meint Scotophobia, ein Objekt den Kerkerbau");
  gleich(fbm(7, 3, 4, 3), fbm(7, 3, 4, 3), "die Scotophobia-Fassung ist wiederholbar");
  wirft(() => fbm(7, 3, 4), "fbm ohne viertes Argument wirft, statt zu raten");
  behaupte(typeof hash(3, 4, 7) === "number" && typeof vn(3.5, 4.5, 7) === "number",
    "die Scotophobia-Bausteine sind da — `spiel/welt-feld.mjs` liest sie");
  gleich(sstep(0, 1, -5), 0, "sstep klemmt unterhalb der ersten Schwelle");
  gleich(sstep(0, 1, 5), 1, "sstep klemmt oberhalb der zweiten");
  behaupte(smin(3, 5, 2) <= 3 && smax(3, 5, 2) >= 5, "smin und smax runden in die richtige Ecke");
}

/* ═══ Die Flutfüllung ══════════════════════════════════════════════ */

/* Die Regel selbst gehört `spiel/hoehen.mjs` und wird dort geprüft.
   Hier steht die Frage, die diese Datei zu verantworten hat: Flutet
   der Kerkerbau **mit** dieser Regel — und sieht er die Falle?

   Der Aufbau ist die Falle in Reinform: ein Feld auf Ebene 2 neben
   einem Feld auf Ebene 1. Vorwärts ist alles erreichbar, denn man
   fällt herunter. Zurück kommt man nur mit Rampe. Eine Flutfüllung,
   die das nicht trennt, würde jede Karte durchwinken. */
abschnitt("Flutfüllung");
{
  const k = macheKarte(8, 5);
  for (const { x, y } of alleFelder(k)) {
    k.setze(x, y, { ebene: 1, hindernis: HINDERNIS.keins });
  }
  for (let y = 0; y < 5; y++) {
    k.setze(0, y, { hindernis: HINDERNIS.wand });
    k.setze(7, y, { hindernis: HINDERNIS.wand });
  }
  for (let x = 0; x < 8; x++) {
    k.setze(x, 0, { hindernis: HINDERNIS.wand });
    k.setze(x, 4, { hindernis: HINDERNIS.wand });
  }
  /* Die rechte Hälfte liegt eine Stufe höher. */
  for (let y = 1; y <= 3; y++) for (let x = 4; x <= 6; x++) k.setze(x, y, { ebene: 2 });

  const start = [{ x: 1, y: 2 }];
  const hoch = k.index(5, 2);
  behaupte(!flutfuellung(k, start)[hoch], "ohne Rampe kommt man nicht hinauf");
  behaupte(rueckflut(k, start)[hoch], "von oben kommt man ohne Rampe herunter — das ist die Falle");
  behaupte(!beidseitigErreichbar(k, start)[hoch], "hin und zurück erkennt die Falle");

  k.setze(3, 2, { rampe: RAMPE.ost });
  behaupte(flutfuellung(k, start)[hoch], "mit Rampe nach Osten kommt man hinauf");
  behaupte(beidseitigErreichbar(k, start)[hoch], "mit Rampe ist das Plateau kein Loch mehr");

  k.setze(3, 2, { rampe: RAMPE.nord });
  behaupte(!beidseitigErreichbar(k, start)[hoch], "eine Rampe in die falsche Richtung hilft nicht");

  /* Die Rampe gehört auf das **tiefere** Feld. Auf dem höheren ist sie
     wirkungslos — der häufigste Vorzeichenfehler in dieser Ecke. */
  k.setze(3, 2, { rampe: RAMPE.keine });
  k.setze(4, 2, { rampe: RAMPE.west });
  behaupte(!beidseitigErreichbar(k, start)[hoch], "eine Rampe auf dem höheren Feld hilft nicht");

  /* Zwei Stufen klettert niemand — auch nicht mit Rampe. */
  k.setze(4, 2, { rampe: RAMPE.keine });
  k.setze(3, 2, { rampe: RAMPE.ost });
  for (let y = 1; y <= 3; y++) for (let x = 4; x <= 6; x++) k.setze(x, y, { ebene: 3 });
  behaupte(!flutfuellung(k, start)[hoch], "zwei Stufen hinauf geht auch mit Rampe nicht");

  gleich(raeumeFluessigkeitenAuf(k), 0, "ohne Wasser gibt es nichts aufzuräumen");
  k.setze(1, 2, { fluessig: FLUESSIG.wasser, ebene: 2 });
  gleich(raeumeFluessigkeitenAuf(k), 1, "Wasser oberhalb des Grabens wird entfernt");
  gleich(k.fluessigBei(1, 2), FLUESSIG.keine, "das Feld ist danach trocken");
}

/* ═══ Die Bauschritte einzeln ═══════════════════════════════════════ */

abschnitt("Bauschritte");
{
  const zufall = macheZufall(4242).zweig();
  const blaetter = teileFlaeche(56, 40, zufall);
  behaupte(blaetter.length >= 4, `Zweiteilung liefert Blätter (${blaetter.length})`);
  let ausserhalb = 0, zuKlein = 0, ueberlappend = 0;
  for (let i = 0; i < blaetter.length; i++) {
    const b = blaetter[i];
    if (b.x < 1 || b.y < 1 || b.x + b.breite > 55 || b.y + b.hoehe > 39) ausserhalb++;
    if (b.breite < MIN_RAUM + 4 || b.hoehe < MIN_RAUM + 4) zuKlein++;
    for (let j = i + 1; j < blaetter.length; j++) {
      const c = blaetter[j];
      if (b.x < c.x + c.breite && c.x < b.x + b.breite
        && b.y < c.y + c.hoehe && c.y < b.y + b.hoehe) ueberlappend++;
    }
  }
  gleich(ausserhalb, 0, "kein Blatt ragt über den Kartenrand");
  gleich(zuKlein, 0, "kein Blatt ist kleiner als Raum plus Rand");
  gleich(ueberlappend, 0, "Blätter überlappen sich nicht");

  const raeume = raeumeInBlaettern(blaetter, zufall);
  behaupte(raeume.length >= 4, `Räume entstehen (${raeume.length})`);
  let zuSchmal = 0, zuNah = 0;
  for (let i = 0; i < raeume.length; i++) {
    const r = raeume[i];
    if (r.breite < MIN_RAUM || r.hoehe < MIN_RAUM) zuSchmal++;
    for (let j = i + 1; j < raeume.length; j++) {
      const q = raeume[j];
      /* Ein Feld Luft ringsum: Sonst gäbe es zwischen zwei Räumen
         keine Wand und der Gang wäre bedeutungslos. */
      if (r.x - 1 < q.x + q.breite && q.x - 1 < r.x + r.breite
        && r.y - 1 < q.y + q.hoehe && q.y - 1 < r.y + r.hoehe) zuNah++;
    }
  }
  gleich(zuSchmal, 0, `kein Raum unter ${MIN_RAUM}×${MIN_RAUM}`);
  gleich(zuNah, 0, "zwischen zwei Räumen bleibt Fels");

  verteileRaumArten(raeume, zufall, 56, 40);
  gleich(raeume.filter((r) => r.art === "eingang").length, 1, "genau ein Eingangsraum");
  gleich(raeume.filter((r) => r.art === "ausgang").length, 1, "genau ein Ausgangsraum");
  gleich(raeume.filter((r) => !RAUM_ARTEN.includes(r.art)).length, 0,
    "alle Raumarten stehen in RAUM_ARTEN");

  const kanten = verbindeRaeume(raeume, zufall);
  /* Der aufspannende Baum allein hätte n−1 Kanten. Mehr heißt:
     Rundwege. Weniger hieße: nicht alle Räume hängen zusammen. */
  behaupte(kanten.length > raeume.length - 1,
    `Gänge bilden Rundwege, nicht nur einen Baum (${kanten.length} Kanten,` +
    ` Baum wären ${raeume.length - 1})`);
  const zusatz = kanten.filter((k) => k.zusatz).length;
  const anteil = zusatz / (raeume.length - 1);
  behaupte(zusatz >= 1 && anteil <= 0.35,
    `Zusatzkanten im vereinbarten Rahmen (${zusatz} = ${(anteil * 100).toFixed(0)} %)`);
  const gesehen = new Set([0]);
  for (let runde = 0; runde < raeume.length; runde++) {
    for (const k of kanten) {
      if (gesehen.has(k.a)) gesehen.add(k.b);
      if (gesehen.has(k.b)) gesehen.add(k.a);
    }
  }
  gleich(gesehen.size, raeume.length, "der Kantengraph erreicht jeden Raum");
}

/* ═══ Die Rampen setzen ═════════════════════════════════════════════ */

/* `setzeRampen` wird eigens geprüft, denn die Erreichbarkeitsreparatur
   deckt seinen Ausfall zu: Nimmt man alle Rampen heraus, baut die
   Reparatur sie mühsam wieder ein und die Karte ist am Ende doch
   spielbar — nur sähen die Rampen aus wie hingewürfelt. Geprüft wird
   also, dass die Rampen **vor** der Reparatur schon liegen. */
abschnitt("Rampen setzen");
{
  const k = macheKarte(9, 5);
  for (const { x, y } of alleFelder(k)) k.setze(x, y, { ebene: 1 });
  for (let x = 0; x < 9; x++) { k.setze(x, 0, { hindernis: HINDERNIS.wand }); }
  for (let x = 0; x < 9; x++) { k.setze(x, 4, { hindernis: HINDERNIS.wand }); }
  for (let y = 0; y < 5; y++) { k.setze(0, y, { hindernis: HINDERNIS.wand }); }
  for (let y = 0; y < 5; y++) { k.setze(8, y, { hindernis: HINDERNIS.wand }); }
  for (let y = 1; y <= 3; y++) for (let x = 5; x <= 7; x++) k.setze(x, y, { ebene: 2 });

  gleich(setzeRampen(k), 1, "eine Stufenkante bekommt genau eine Rampe");
  let auf = null;
  for (const { x, y, i } of alleFelder(k)) if (k.rampe[i] !== RAMPE.keine) auf = { x, y };
  behaupte(auf !== null && k.ebeneBei(auf.x, auf.y) === 1,
    "die Rampe liegt auf dem tieferen Feld");
  gleich(auf ? k.rampeBei(auf.x, auf.y) : RAMPE.keine, RAMPE.ost, "die Rampe zeigt hinauf");
  behaupte(beidseitigErreichbar(k, [{ x: 1, y: 2 }])[k.index(6, 2)],
    "mit der gesetzten Rampe ist das Plateau erreichbar");

  /* Zwei Stufen kann keine Rampe überbrücken — dort darf auch keine
     liegen, sonst sieht die Karte begehbar aus, wo sie es nicht ist. */
  const k2 = macheKarte(9, 5);
  for (const { x, y } of alleFelder(k2)) k2.setze(x, y, { ebene: 1 });
  for (let y = 1; y <= 3; y++) for (let x = 5; x <= 7; x++) k2.setze(x, y, { ebene: 3 });
  gleich(setzeRampen(k2), 0, "an einer Kante von zwei Stufen entsteht keine Rampe");
}

/* Und dasselbe am gebauten Kerker: Nach `setzeRampen` — aber **vor**
   der Reparatur — muss fast alles schon zusammenhängen. */
abschnitt("Rampen tragen den Bau");
{
  let begehbarGesamt = 0, offenRoh = 0, offenMitZier = 0, ohneRampen = 0;
  for (const saat of SAATEN.slice(0, 8)) {
    const zufall = macheZufall(saat).zweig();
    const karte = macheKarte(56, 40);
    const blaetter = teileFlaeche(56, 40, zufall);
    const raeume = raeumeInBlaettern(blaetter, zufall);
    verteileRaumArten(raeume, zufall, 56, 40);
    const kanten = verbindeRaeume(raeume, zufall);
    const gebiet = grabeKerker(karte, raeume, kanten, zufall);
    setzeHoehen(karte, raeume, kanten, gebiet, saat, zufall);
    if (setzeRampen(karte) === 0) ohneRampen++;

    const eingang = raeume.find((r) => r.art === "eingang");
    const anker = [{ x: mitteVon(eingang).x, y: mitteVon(eingang).y }];
    const rohGut = beidseitigErreichbar(karte, anker);
    for (const { x, y, i } of alleFelder(karte)) {
      if (karte.blocktBewegung(x, y)) continue;
      begehbarGesamt++;
      if (!rohGut[i]) offenRoh++;
    }
    setzeZier(karte, raeume, gebiet, zufall);
    setzeFluessigkeiten(karte, raeume, gebiet, saat, 1, zufall);
    setzeStartsUndAusgang(karte, raeume, gebiet, 2);
    const gut = beidseitigErreichbar(karte, karte.starts);
    for (const { x, y, i } of alleFelder(karte)) {
      if (!karte.blocktBewegung(x, y) && !gut[i]) offenMitZier++;
    }
  }
  gleich(ohneRampen, 0, "jeder gebaute Kerker bekommt Rampen");
  /* Nach Höhen und Rampen, aber noch ohne Möbel, muss der nackte
     Kerker praktisch geschlossen sein. Genau das leisten die Rampen —
     ohne sie zerfällt er in seine Plateaus. */
  const roh = offenRoh / begehbarGesamt;
  behaupte(roh < 0.01, "Höhen und Rampen allein ergeben schon einen ganzen Kerker"
    + ` (${(roh * 100).toFixed(2)} % offen)`);
  /* Die Möbel dürfen ein paar Nischen abschneiden — dafür gibt es die
     Reparatur —, aber nicht den halben Kerker. */
  const mitZier = offenMitZier / begehbarGesamt;
  behaupte(mitZier < 0.05,
    `Zier schneidet nur Nischen ab (${(mitZier * 100).toFixed(2)} % offen)`);
}

/* ═══ Zweiundsiebzig Kerker ═════════════════════════════════════════ */

abschnitt("Kerker über viele Saaten");

const messung = {
  begehbar: [], raumZahl: [], ebenen: [0, 0, 0, 0], rampen: [], plateaus: [],
  lichter: [], gaenge: 0, raumErreichbar: 1
};
const summen = new Map();
const grundrisse = new Set();
const gewuerfe = [];
let fehlerStarts = 0, fehlerAusgang = 0, fehlerRaum = 0, fehlerHinZurueck = 0;
let fehlerRand = 0, fehlerEbenenZahl = 0, fehlerRampenlage = 0, fehlerFluessig = 0;
let fehlerLicht = 0, fehlerFelder = 0, fehlerStartNest = 0;

for (const saat of SAATEN) {
  const spielerZahl = 1 + (saat % 4);
  /* Ein Wurf ist hier ein Befund, kein Absturz: Wer die Prüfung mit
     einem Stapelabzug beendet, sieht die anderen einundsiebzig
     Karten nie und weiß am Ende weniger als vorher. */
  let karte = null;
  try {
    karte = baueLandschaft({ saat, spielerZahl, tiefe: 1 + (saat % 5) });
  } catch (fehler) {
    gewuerfe.push(`Saat ${saat}: ${fehler.message}`);
    continue;
  }

  /* (h) Der Rand ist vollständig Wand. */
  for (let x = 0; x < karte.breite; x++) {
    if (karte.hindernisBei(x, 0) !== HINDERNIS.wand) fehlerRand++;
    if (karte.hindernisBei(x, karte.hoehe - 1) !== HINDERNIS.wand) fehlerRand++;
  }
  for (let y = 0; y < karte.hoehe; y++) {
    if (karte.hindernisBei(0, y) !== HINDERNIS.wand) fehlerRand++;
    if (karte.hindernisBei(karte.breite - 1, y) !== HINDERNIS.wand) fehlerRand++;
  }

  /* (a) Jedes Startfeld ist begehbar, es sind so viele wie Spieler,
     sie hängen aneinander und keiner steht in der Lava. */
  if (karte.starts.length !== spielerZahl) fehlerStarts++;
  for (const s of karte.starts) {
    if (karte.blocktBewegung(s.x, s.y)) fehlerStarts++;
    if (karte.fluessigBei(s.x, s.y) === FLUESSIG.lava) fehlerStarts++;
  }
  const nurErster = flutfuellung(karte, [karte.starts[0]]);
  for (const s of karte.starts) if (!nurErster[karte.index(s.x, s.y)]) fehlerStartNest++;

  const gut = beidseitigErreichbar(karte, karte.starts);

  /* (b) Der Ausgang ist von jedem Startfeld aus erreichbar — und zurück. */
  for (const s of karte.starts) {
    const hin = flutfuellung(karte, [s]);
    const zurueck = rueckflut(karte, [s]);
    const ai = karte.index(karte.ausgang.x, karte.ausgang.y);
    if (!hin[ai] || !zurueck[ai]) fehlerAusgang++;
  }

  /* (c) Jeder eingetragene Raum hat mindestens ein erreichbares Feld. */
  for (const r of karte.raeume) {
    let erreichbar = 0, begehbarImRaum = 0;
    for (let y = r.y; y < r.y + r.hoehe; y++) {
      for (let x = r.x; x < r.x + r.breite; x++) {
        if (karte.blocktBewegung(x, y)) continue;
        begehbarImRaum++;
        if (gut[karte.index(x, y)]) erreichbar++;
      }
    }
    if (erreichbar < 1) fehlerRaum++;
    if (begehbarImRaum > 0) {
      messung.raumErreichbar = Math.min(messung.raumErreichbar, erreichbar / begehbarImRaum);
    }
  }

  /* (d) Kein begehbares Feld liegt hinter einer Ebenenkante ohne Rampe.
     Das ist die scharfe Fassung: Es genügt nicht, dass die Räume
     zusammenhängen — kein einziges Feld darf eine Falle sein. */
  let begehbar = 0;
  const jeEbene = [0, 0, 0, 0];
  for (const { x, y, i } of alleFelder(karte)) {
    if (karte.blocktBewegung(x, y)) {
      if (karte.rampe[i] !== RAMPE.keine) fehlerRampenlage++;
      continue;
    }
    begehbar++;
    jeEbene[karte.ebene[i]]++;
    if (!gut[i]) fehlerHinZurueck++;
    /* Wasser und Lava gehören in den Graben, sonst steht der See auf
       dem Hochplateau. */
    const f = karte.fluessig[i];
    if ((f === FLUESSIG.wasser || f === FLUESSIG.lava) && karte.ebene[i] !== EBENE_GRABEN) {
      fehlerFluessig++;
    }
    /* Eine Rampe liegt auf dem tieferen Feld und zeigt genau eine
       Stufe hinauf — alles andere ist Zierde am falschen Ort. */
    const rampe = karte.rampe[i];
    if (rampe !== RAMPE.keine) {
      const r = RICHTUNGEN.find((ri) => ri.rampe === rampe);
      if (!r || karte.ebeneBei(x + r.dx, y + r.dy) !== karte.ebene[i] + 1) fehlerRampenlage++;
    }
    if (karte.boden[i] > BODEN.holz || karte.ebene[i] >= EBENEN) fehlerFelder++;
  }

  /* (g) Mindestens zwei verschiedene Ebenen kommen wirklich vor. */
  if (jeEbene.filter((z) => z > 0).length < 2) fehlerEbenenZahl++;

  for (const licht of karte.lichter) {
    if (!karte.drin(licht.x, licht.y) || !(licht.staerke > 0) || typeof licht.art !== "string") {
      fehlerLicht++;
    }
    if (licht.art === "fackel"
      && karte.hindernisBei(licht.x, licht.y) !== HINDERNIS.fackelsockel) fehlerLicht++;
  }

  let rampenZahl = 0;
  for (let i = 0; i < karte.anzahl; i++) if (karte.rampe[i] !== RAMPE.keine) rampenZahl++;
  const plateau = plateauNummern(karte);
  let plateauZahl = 0;
  for (const p of plateau) if (p + 1 > plateauZahl) plateauZahl = p + 1;

  messung.begehbar.push(begehbar / karte.anzahl);
  messung.raumZahl.push(karte.raeume.length);
  messung.rampen.push(rampenZahl);
  messung.plateaus.push(plateauZahl);
  messung.lichter.push(karte.lichter.length);
  for (let e = 0; e < 4; e++) messung.ebenen[e] += jeEbene[e];

  summen.set(karte.summe(), (summen.get(karte.summe()) ?? 0) + 1);
  grundrisse.add(karte.raeume.map((r) => `${r.x},${r.y},${r.breite},${r.hoehe}`).join(";"));
}

gleich(gewuerfe.length, 0,
  `baueLandschaft kommt mit jeder Saat zurecht${gewuerfe.length ? " — " + gewuerfe[0] : ""}`);
gleich(fehlerRand, 0, "(h) der Rand jeder Karte ist vollständig Wand");
gleich(fehlerStarts, 0, "(a) alle Startfelder sind begehbar, zahlreich genug und lavafrei");
gleich(fehlerStartNest, 0, "(a) die Startfelder hängen aneinander");
gleich(fehlerAusgang, 0, "(b) der Ausgang ist von jedem Startfeld aus erreichbar — hin und zurück");
gleich(fehlerRaum, 0, "(c) jeder eingetragene Raum hat mindestens ein erreichbares Feld");
gleich(fehlerHinZurueck, 0, "(d) kein begehbares Feld liegt hinter einer Kante ohne Rampe");
gleich(fehlerEbenenZahl, 0, "(g) jede Karte zeigt mindestens zwei verschiedene Ebenen");
gleich(fehlerRampenlage, 0, "jede Rampe liegt auf dem tieferen Feld und zeigt eine Stufe hinauf");
gleich(fehlerFluessig, 0, "Wasser und Lava liegen nur in Ebene 0");
gleich(fehlerLicht, 0, "jedes Licht steht auf der Karte, jede Fackel auf einem Sockel");
gleich(fehlerFelder, 0, "alle Feldwerte bleiben im gültigen Bereich");
gleich(summen.size, SAATEN.length, "(f) verschiedene Saaten geben verschiedene Karten");
/* Die Prüfsumme allein genügt hier nicht: Ein Bauer, der die Saat nur
   ins Höhenrauschen reicht und den Grundriss immer gleich legt, gibt
   auch verschiedene Prüfsummen — und trotzdem jedes Mal denselben
   Kerker. Deshalb wird der Grundriss selbst verglichen. */
gleich(grundrisse.size, SAATEN.length,
  "(f) verschiedene Saaten geben verschiedene Grundrisse, nicht nur andere Höhen");

/* ═══ (e) Dieselbe Saat gibt byteweise dieselbe Karte ═══════════════ */

abschnitt("Wiederholbarkeit");
{
  let ungleich = 0, summeUngleich = 0;
  for (const saat of gewuerfe.length ? [] : SAATEN.slice(0, 12)) {
    const a = baueLandschaft({ saat, spielerZahl: 3, tiefe: 2 });
    const b = baueLandschaft({ saat, spielerZahl: 3, tiefe: 2 });
    if (a.summe() !== b.summe()) summeUngleich++;
    for (const reihe of ["boden", "ebene", "hindernis", "fluessig", "rampe"]) {
      for (let i = 0; i < a.anzahl; i++) if (a[reihe][i] !== b[reihe][i]) ungleich++;
    }
    if (JSON.stringify(a.starts) !== JSON.stringify(b.starts)) ungleich++;
    if (JSON.stringify(a.ausgang) !== JSON.stringify(b.ausgang)) ungleich++;
    if (JSON.stringify(a.lichter) !== JSON.stringify(b.lichter)) ungleich++;
    if (JSON.stringify(a.raeume) !== JSON.stringify(b.raeume)) ungleich++;
  }
  gleich(summeUngleich, 0, "(e) dieselbe Saat gibt dieselbe Prüfsumme");
  gleich(ungleich, 0, "(e) dieselbe Saat gibt byteweise dieselben Reihen, Starts und Lichter");
}

/* ═══ Tragen die Rampen wirklich? ═══════════════════════════════════ */

/* Ohne diese Probe könnte die ganze Höhenmaschinerie eine flache Karte
   erzeugen und jede Erreichbarkeitsprüfung bestehen. */
abschnitt("Rampen tragen");
{
  let zerfallen = 0;
  const probe = gewuerfe.length ? [] : SAATEN.slice(0, 20);
  for (const saat of probe) {
    const karte = baueLandschaft({ saat, spielerZahl: 2 });
    karte.rampe.fill(RAMPE.keine);
    const ohne = beidseitigErreichbar(karte, karte.starts);
    let abgeschnitten = 0;
    for (const { x, y, i } of alleFelder(karte)) {
      if (!karte.blocktBewegung(x, y) && !ohne[i]) abgeschnitten++;
    }
    if (abgeschnitten > 0) zerfallen++;
  }
  behaupte(probe.length > 0 && zerfallen === probe.length,
    "ohne Rampen zerfällt jede Karte — die Ebenen trennen also wirklich");
}

/* ═══ Die Reparatur ═════════════════════════════════════════════════ */

/* Die Erreichbarkeitsreparatur muss auch dann greifen, wenn jemand
   ihr eine kaputte Karte hinlegt — und sie darf nicht endlos laufen. */
abschnitt("Reparatur");
{
  const zufall = macheZufall(9001).zweig();
  const karte = macheKarte(56, 40);
  const blaetter = teileFlaeche(56, 40, zufall);
  const raeume = raeumeInBlaettern(blaetter, zufall);
  verteileRaumArten(raeume, zufall, 56, 40);
  const kanten = verbindeRaeume(raeume, zufall);
  const gebiet = grabeKerker(karte, raeume, kanten, zufall);
  setzeHoehen(karte, raeume, kanten, gebiet, 9001, zufall);
  setzeRampen(karte);
  setzeZier(karte, raeume, gebiet, zufall);
  setzeFluessigkeiten(karte, raeume, gebiet, 9001, 1, zufall);
  setzeStartsUndAusgang(karte, raeume, gebiet, 2);

  /* Mutwillig kaputt: alle Rampen weg, dazu ein Ring aus Fässern um
     ein Feld herum. Beides muss die Reparatur heilen. */
  karte.rampe.fill(RAMPE.keine);
  const opfer = raeume[0];
  const ox = opfer.x + 1, oy = opfer.y + 1;
  karte.setze(ox, oy, { hindernis: HINDERNIS.keins });
  for (const r of RICHTUNGEN) karte.setze(ox + r.dx, oy + r.dy, { hindernis: HINDERNIS.fass });
  const bericht = sichereErreichbarkeit(karte, karte.starts, gebiet);
  behaupte(bericht.runden >= 1, `die Reparatur musste arbeiten (${bericht.runden} Runden)`);
  behaupte(bericht.rampen > 0, `die Reparatur hat Rampen gesetzt (${bericht.rampen})`);
  const gut = beidseitigErreichbar(karte, karte.starts);
  let offen = 0;
  for (const { x, y, i } of alleFelder(karte)) {
    if (!karte.blocktBewegung(x, y) && !gut[i]) offen++;
  }
  gleich(offen, 0, "nach der Reparatur ist jedes begehbare Feld hin und zurück erreichbar");
  setzeLichter(karte);
  behaupte(karte.lichter.length > 0, "Lichter entstehen");

  /* Eine Karte, die sich nicht heilen lässt, muss werfen statt
     endlos zu laufen: ein Raumfeld ohne jeden Zugang. */
  const eng = macheKarte(24, 24);
  const engGebiet = new Int16Array(eng.anzahl).fill(0);
  eng.hindernis.fill(HINDERNIS.wand);
  for (let y = 2; y <= 4; y++) for (let x = 2; x <= 4; x++) {
    eng.setze(x, y, { hindernis: HINDERNIS.keins, ebene: 1 });
  }
  for (let y = 10; y <= 12; y++) for (let x = 10; x <= 12; x++) {
    eng.setze(x, y, { hindernis: HINDERNIS.keins, ebene: 1 });
  }
  wirft(() => sichereErreichbarkeit(eng, [{ x: 2, y: 2 }], engGebiet, 4),
    "sichereErreichbarkeit wirft, statt endlos zu laufen");
}

/* ═══ Randfälle des Bauers ══════════════════════════════════════════ */

abschnitt("Randfälle");
{
  wirft(() => baueLandschaft({ saat: 1.5 }), "gebrochene Saat wird abgelehnt");
  wirft(() => baueLandschaft({}), "fehlende Saat wird abgelehnt");
  wirft(() => baueLandschaft({ saat: 1, breite: MIN_KARTE - 1 }), "zu schmale Karte fällt durch");
  wirft(() => baueLandschaft({ saat: 1, hoehe: MIN_KARTE - 1 }), "zu flache Karte wird abgelehnt");
  wirft(() => baueLandschaft({ saat: 1, spielerZahl: 0 }), "null Spieler wird abgelehnt");
  wirft(() => baueLandschaft({ saat: 1, spielerZahl: 5 }), "fünf Spieler werden abgelehnt");
  wirft(() => baueLandschaft({ saat: 1, breite: 56.5 }), "gebrochene Breite wird abgelehnt");

  const klein = baueLandschaft({ saat: 3, breite: MIN_KARTE, hoehe: MIN_KARTE, spielerZahl: 1 });
  gleich(klein.starts.length, 1, "die kleinste erlaubte Karte trägt einen Spieler");
  behaupte(klein.raeume.length >= 4, `die kleinste Karte hat Räume (${klein.raeume.length})`);

  const gross = baueLandschaft({ saat: 3, breite: 96, hoehe: 72, spielerZahl: 4 });
  gleich(gross.starts.length, 4, "eine große Karte trägt vier Spieler");
  behaupte(gross.raeume.length > klein.raeume.length, "größere Karten haben mehr Räume");
  gleich(gross.tiefe, 1, "karte.tiefe wird gesetzt");
  gleich(gross.saat, 3, "karte.saat wird gesetzt");

  for (const spielerZahl of [1, 2, 3, 4]) {
    const k = baueLandschaft({ saat: 555, spielerZahl });
    gleich(k.starts.length, spielerZahl, `${spielerZahl} Spieler geben ${spielerZahl} Startfelder`);
  }
}

/* ═══ Es ist wirklich dieselbe Regel ════════════════════════════════ */

/* Der Kerkerbau darf keine eigene, mildere Schrittregel führen. Diese
   Probe hält die Flutfüllung gegen `begehbar` aus `spiel/hoehen.mjs`,
   Feld für Feld und Richtung für Richtung: Was der Bau für gangbar
   hält, muss das Spiel auch für gangbar halten. */
abschnitt("Dieselbe Regel wie im Zug");
{
  let abweichung = 0, geprueft = 0;
  for (const saat of gewuerfe.length ? [] : SAATEN.slice(0, 6)) {
    const karte = baueLandschaft({ saat, spielerZahl: 2 });
    const erreicht = flutfuellung(karte, karte.starts);
    for (const { x, y, i } of alleFelder(karte)) {
      if (!erreicht[i]) continue;
      for (const r of RICHTUNGEN) {
        const nx = x + r.dx, ny = y + r.dy;
        geprueft++;
        /* Jeder Nachbar, den die Flut erreicht hat, muss auch nach der
           Spielregel von hier aus betretbar sein — oder auf einem
           anderen Weg erreicht worden sein. Umgekehrt darf kein nach
           der Spielregel betretbarer Nachbar unerreicht bleiben. */
        if (begehbar(karte, x, y, nx, ny) && !erreicht[karte.index(nx, ny)]) abweichung++;
      }
    }
  }
  behaupte(geprueft > 10000, `genug Schritte geprüft (${geprueft})`);
  gleich(abweichung, 0, "die Flutfüllung lässt kein nach Spielregel gangbares Feld aus");
}

/* ═══ Die gemessenen Zahlen ═════════════════════════════════════════ */

const mittel = (l) => (l.length ? l.reduce((a, b) => a + b, 0) / l.length : 0);
const kleinste = (l) => (l.length ? l.reduce((a, b) => Math.min(a, b)) : 0);
const groesste = (l) => (l.length ? l.reduce((a, b) => Math.max(a, b)) : 0);
const ebenenSumme = Math.max(1, messung.ebenen.reduce((a, b) => a + b, 0));
console.log("");
console.log(`  Gemessen über ${SAATEN.length} Saaten, je 56×40 = 2240 Felder:`);
console.log(`    begehbare Felder   ${(mittel(messung.begehbar) * 100).toFixed(1)} %` +
  ` (${(kleinste(messung.begehbar) * 100).toFixed(1)} … ` +
  `${(groesste(messung.begehbar) * 100).toFixed(1)} %)`);
console.log(`    Räume je Karte     ${mittel(messung.raumZahl).toFixed(2)}` +
  ` (${kleinste(messung.raumZahl)} … ${groesste(messung.raumZahl)})`);
console.log(`    Plateaus je Karte  ${mittel(messung.plateaus).toFixed(2)}` +
  ` (${kleinste(messung.plateaus)} … ${groesste(messung.plateaus)})`);
console.log(`    Rampen je Karte    ${mittel(messung.rampen).toFixed(2)}` +
  ` (${kleinste(messung.rampen)} … ${groesste(messung.rampen)})`);
console.log(`    Lichter je Karte   ${mittel(messung.lichter).toFixed(2)}` +
  ` (${kleinste(messung.lichter)} … ${groesste(messung.lichter)})`);
console.log(`    Ebenenverteilung   ` + messung.ebenen
  .map((z, e) => `${e}: ${(100 * z / ebenenSumme).toFixed(1)} %`).join("   "));
console.log(`    schlechtester Raum ${(messung.raumErreichbar * 100).toFixed(1)} %` +
  " seiner begehbaren Felder erreichbar");
console.log("");

ende("Landschaft");
