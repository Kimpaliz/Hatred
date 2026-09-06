/* [Aufgabe: Regelkern] Der Kerker: Räume, Gänge, vier Höhenebenen, Rampen.

   ── Warum es das gibt / Warum so ───────────────────────────────────

   Eine Karte aus reinem Rauschen ist kein Kerker, sondern eine Wolke:
   Man sieht ihr nicht an, wohin man gehen soll, und die Höhen sehen
   aus wie Bildstörung. Gebaut wird deshalb in getrennten, einzeln
   prüfbaren Schritten, und jeder hat einen Grund:

   1. **Räume** durch fortgesetzte Zweiteilung (BSP) — große Flächen
      mit rechten Winkeln statt ausgefranster Höhlen. Nur so kann ein
      Raum eine Art tragen, und nur so eine einheitliche Grundebene.
   2. **Gänge** über einen minimal aufspannenden Baum, **plus**
      Zusatzkanten. Der reine Baum wäre der Fehler: Dort gibt es genau
      einen Weg von A nach B, also kann man nie umgehen und nie
      umgangen werden. Rundwege machen den Kerker taktisch.
   3. **Höhen** aus einem fbm-Feld, **an den Raumgrenzen eingerastet**.
      Feld für Feld quantisiert sähen die Plateaukanten aus wie
      Rauschen; je Raum eingerastet wird daraus Architektur. Zwischen
      verbundenen Räumen bleibt höchstens eine Stufe, damit jeder Gang
      eine Treppe sein kann und keine Klippe.
   4. **Rampen** an jeder Ebenenkante. Ohne sie ist jedes Podest eine
      Einbahnstraße: hinab kommt man überall, hinauf nur über eine Rampe.
   5. **Erreichbarkeit** wird nachgerechnet, vorwärts *und* rückwärts.
      Vorwärts allein genügt nicht — man fällt überall hinunter, kommt
      aber ohne Rampe nicht zurück. Eine Karte, die nur vorwärts
      stimmt, ist eine Falle.

   Absichtliche Stürze bleiben: Eine Grube in der Halle hat **ein** Ufer
   mit Rampe und drei Kanten mit zwei Stufen Fall. Sie ist erreichbar
   und verlassbar — und trotzdem die Stelle, an die man jemanden stößt.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `spiel/gitter.mjs` (Feldwerte, Karte), `spiel/zufall.mjs` (gesäter
   Strom), `spiel/rauschen.mjs` (die weichen Felder),
   `werkzeuge/pruefe-landschaft.mjs`, `werkzeuge/karte-zeigen.mjs` und
   `spiel/hoehen.mjs` — von dort kommt `begehbar`, die **eine**
   Schrittregel des Spiels. Eine zweite, bequemere Bau-Regel wäre genau
   die Naht, an der eine Karte „geprüft" und doch unspielbar ist. */

import {
  macheKarte, alleFelder, RICHTUNGEN, RAMPE, BODEN, FLUESSIG, HINDERNIS,
  EBENEN, EBENE_GRABEN, EBENE_BODEN
} from "./gitter.mjs";
import { macheZufall } from "./zufall.mjs";
import { macheRauschfeld } from "./rauschen.mjs";
import { begehbar } from "./hoehen.mjs";

export const RAUM_ARTEN = [
  "halle", "gruft", "kammer", "brunnen", "altarraum", "eingang", "ausgang"
];

/* Ein Raum unter 5×5 ist kein Raum, sondern ein breiter Gang: Man kann
   niemanden umgehen und keine Deckung aufstellen. Ein Blatt der
   Zweiteilung braucht ihn plus ringsum Fels, sonst stoßen zwei Räume
   aneinander und der Gang dazwischen ist sinnlos. Kleiner als zwei
   Blätter lohnt die ganze Maschinerie nicht. */
export const MIN_RAUM = 5;
const MIN_BLATT = MIN_RAUM + 4;
export const MIN_KARTE = MIN_BLATT * 2 + 2;

const mitteX = (raum) => raum.x + (raum.breite >> 1);
const mitteY = (raum) => raum.y + (raum.hoehe >> 1);
const gegenRichtung = (nr) => RICHTUNGEN[(nr + 2) % 4];

/* ═══ Schritt 1 — Räume ═════════════════════════════════════════════ */

/* Fortgesetzte Zweiteilung. Geteilt wird in einer Warteschlange und
   nicht rekursiv: So werden die Blätter Stufe für Stufe gleich groß,
   statt dass ein Zweig achtmal und der andere einmal geteilt wird. */
export function teileFlaeche(breite, hoehe, zufall, opts = {}) {
  const stufenMax = opts.stufenMax ?? 4;
  const blaetter = [];
  const warteschlange = [{ x: 1, y: 1, breite: breite - 2, hoehe: hoehe - 2, stufe: 0 }];
  let kopf = 0;
  while (kopf < warteschlange.length) {
    const b = warteschlange[kopf++];
    const kannSenkrecht = b.breite >= MIN_BLATT * 2;
    const kannWaagerecht = b.hoehe >= MIN_BLATT * 2;
    if (b.stufe >= stufenMax || (!kannSenkrecht && !kannWaagerecht)) {
      blaetter.push(b);
      continue;
    }
    /* Geteilt wird quer zur langen Seite; sind beide ähnlich lang,
       entscheidet der Wurf. Sonst entstünden lauter Schläuche. */
    const senkrecht = !kannWaagerecht || (kannSenkrecht
      && (b.breite > b.hoehe * 5 / 4 || (b.hoehe <= b.breite * 5 / 4 && zufall.trifft(0.5))));

    const schnitt = zufall.ganz(MIN_BLATT, (senkrecht ? b.breite : b.hoehe) - MIN_BLATT);
    const stufe = b.stufe + 1;
    warteschlange.push(senkrecht
      ? { x: b.x, y: b.y, breite: schnitt, hoehe: b.hoehe, stufe }
      : { x: b.x, y: b.y, breite: b.breite, hoehe: schnitt, stufe });
    warteschlange.push(senkrecht
      ? { x: b.x + schnitt, y: b.y, breite: b.breite - schnitt, hoehe: b.hoehe, stufe }
      : { x: b.x, y: b.y + schnitt, breite: b.breite, hoehe: b.hoehe - schnitt, stufe });
  }
  return blaetter;
}

/* In jedes Blatt ein Rechteck mit mindestens einem Feld Luft zum Rand
   des Blattes — dadurch liegen zwischen zwei Räumen immer mindestens
   zwei Felder Fels, und ein Gang hat Platz. */
export function raeumeInBlaettern(blaetter, zufall) {
  const raeume = [];
  for (const b of blaetter) {
    const platzB = b.breite - 2;
    const platzH = b.hoehe - 2;
    if (platzB < MIN_RAUM || platzH < MIN_RAUM) continue;
    /* Zwei Würfe, der größere gilt: Ein Blatt, in dem nur ein 5×5
       steht, sieht aus wie ein Versehen. Der Vorzug für große Räume
       hebt den begehbaren Anteil der Karte spürbar. */
    const obenB = Math.min(platzB, MIN_RAUM + 9);
    const obenH = Math.min(platzH, MIN_RAUM + 7);
    const rb = Math.max(zufall.ganz(MIN_RAUM, obenB), zufall.ganz(MIN_RAUM, obenB));
    const rh = Math.max(zufall.ganz(MIN_RAUM, obenH), zufall.ganz(MIN_RAUM, obenH));
    raeume.push({
      x: b.x + 1 + zufall.ganz(0, platzB - rb), y: b.y + 1 + zufall.ganz(0, platzH - rh),
      breite: rb, hoehe: rh, art: "kammer", ebene: EBENE_BODEN
    });
  }
  return raeume;
}

/* Eingang und Ausgang zuerst: Der Eingang liegt an einer zufälligen
   Ecke, der Ausgang im davon am weitesten entfernten Raum — sonst
   steht die Treppe hinab manchmal drei Felder neben dem Start. */
export function verteileRaumArten(raeume, zufall, breite, hoehe) {
  if (raeume.length < 2) throw new Error("verteileRaumArten: mindestens zwei Räume nötig");
  const ecken = [{ x: 0, y: 0 }, { x: breite, y: 0 }, { x: 0, y: hoehe }, { x: breite, y: hoehe }];
  const ecke = ecken[zufall.ganz(0, 3)];
  const suche = (zx, zy, weiteste, ausser) => {
    let beste = ausser === 0 ? 1 : 0, wert = weiteste ? -1 : Infinity;
    for (let i = 0; i < raeume.length; i++) {
      if (i === ausser) continue;
      const d = Math.abs(mitteX(raeume[i]) - zx) + Math.abs(mitteY(raeume[i]) - zy);
      if (weiteste ? d > wert : d < wert) { wert = d; beste = i; }
    }
    return beste;
  };
  const eingang = suche(ecke.x, ecke.y, false, -1);
  const ausgang = suche(mitteX(raeume[eingang]), mitteY(raeume[eingang]), true, eingang);
  /* „Halle" nach **Rangfolge**, nicht nach einer festen Fläche: Eine
     feste Schwelle heißt bei großzügig geschnittenen Karten, dass jeder
     Raum eine Halle ist — und dann gibt es keine Gruft mehr, keinen
     Brunnen und keinen Altarraum. Das größte Drittel wird Halle. */
  const nachGroesse = raeume.map((r, i) => ({ i, flaeche: r.breite * r.hoehe }))
    .filter((e) => e.i !== eingang && e.i !== ausgang)
    .sort((a, b) => b.flaeche - a.flaeche || a.i - b.i);
  const hallen = new Set(nachGroesse.slice(0, Math.round(nachGroesse.length * 0.3))
    .map((e) => e.i));
  const uebrige = ["kammer", "gruft", "brunnen", "altarraum"];
  for (let i = 0; i < raeume.length; i++) {
    const r = raeume[i];
    if (i === eingang) r.art = "eingang";
    else if (i === ausgang) r.art = "ausgang";
    else if (hallen.has(i)) r.art = "halle";
    else r.art = zufall.nachGewicht(uebrige, [5, 3, 2, 2]);
  }
  return { eingang, ausgang };
}

/* ═══ Schritt 2 — Gänge ═════════════════════════════════════════════ */

/* Minimal aufspannender Baum (Prim) über die Raummitten, danach
   Zusatzkanten. Ohne die Zusatzkanten hätte der Kerker genau einen Weg
   je Raumpaar; mit ihnen entstehen Rundwege — und erst die machen
   Umgehen, Abschneiden und Rückzug möglich. */
export function verbindeRaeume(raeume, zufall, opts = {}) {
  const n = raeume.length;
  if (n < 2) return [];
  const weite = (a, b) => Math.abs(mitteX(raeume[a]) - mitteX(raeume[b]))
    + Math.abs(mitteY(raeume[a]) - mitteY(raeume[b]));
  const drin = new Uint8Array(n);
  const kanten = [];
  drin[0] = 1;
  for (let schritt = 1; schritt < n; schritt++) {
    let besterA = -1, besterB = -1, beste = Infinity;
    for (let a = 0; a < n; a++) {
      if (!drin[a]) continue;
      for (let b = 0; b < n; b++) {
        if (!drin[b] && weite(a, b) < beste) { beste = weite(a, b); besterA = a; besterB = b; }
      }
    }
    drin[besterB] = 1;
    kanten.push({ a: besterA, b: besterB, zusatz: false });
  }

  /* 15–25 % Zusatzkanten, gewählt aus den kürzesten noch freien
     Paaren — lange Zusatzgänge quer über die Karte sähen wie ein
     Versehen aus. Mindestens eine, damit es nie ein reiner Baum ist. */
  const schonDa = new Set(kanten.map((k) => `${Math.min(k.a, k.b)}:${Math.max(k.a, k.b)}`));
  const frei = [];
  for (let a = 0; a < n; a++) {
    for (let b = a + 1; b < n; b++) {
      if (!schonDa.has(`${a}:${b}`)) frei.push({ a, b, d: weite(a, b) });
    }
  }
  frei.sort((p, q) => p.d - q.d || p.a - q.a || p.b - q.b);
  const anteil = opts.anteil ?? zufall.zwischen(0.15, 0.25);
  const wieviele = Math.min(frei.length, Math.max(1, Math.round((n - 1) * anteil)));
  const auswahl = zufall.mischen(frei.slice(0, wieviele * 3));
  for (const k of auswahl.slice(0, wieviele)) kanten.push({ a: k.a, b: k.b, zusatz: true });
  return kanten;
}

/* ═══ Aushub — Räume und Gänge in den Fels schlagen ═════════════════ */

const BODEN_JE_ART = {
  halle: BODEN.platte, gruft: BODEN.knochen, kammer: BODEN.stein,
  brunnen: BODEN.kachel, altarraum: BODEN.kachel,
  eingang: BODEN.platte, ausgang: BODEN.platte
};

/* `gebiet` merkt sich je Feld, wozu es gehört: Raumnummer ≥ 0, `-2`
   Gang, `-1` gewachsener Fels. Ohne diese Auskunft wüsste später
   niemand mehr, welches Feld ein Raum ist — und davon hängen
   Höheneinrastung, Zier und die letzte Rettung der Wege ab. */
export const GEBIET_FELS = -1;
export const GEBIET_GANG = -2;

export function grabeKerker(karte, raeume, kanten, zufall) {
  karte.hindernis.fill(HINDERNIS.wand);
  karte.boden.fill(BODEN.stein);
  karte.ebene.fill(EBENE_BODEN);
  const gebiet = new Int16Array(karte.anzahl).fill(GEBIET_FELS);
  for (let i = 0; i < raeume.length; i++) {
    const r = raeume[i];
    const boden = BODEN_JE_ART[r.art] ?? BODEN.stein;
    for (let y = r.y; y < r.y + r.hoehe; y++) {
      for (let x = r.x; x < r.x + r.breite; x++) {
        if (!istInnen(karte, x, y)) continue;
        gebiet[karte.index(x, y)] = i;
        karte.setze(x, y, { hindernis: HINDERNIS.keins, boden });
      }
    }
  }
  for (const k of kanten) grabeGang(karte, gebiet, raeume[k.a], raeume[k.b], zufall);
  return gebiet;
}

/* Der Rand bleibt immer Wand — sonst liefe eine Figur aus der Karte
   heraus, und `ebeneBei` gibt draußen −1, was jede Höhenrechnung
   verdirbt. */
const istInnen = (karte, x, y) =>
  x >= 1 && y >= 1 && x <= karte.breite - 2 && y <= karte.hoehe - 2;

function grabeGang(karte, gebiet, a, b, zufall) {
  const ax = mitteX(a), ay = mitteY(a), bx = mitteX(b), by = mitteY(b);
  const dicke = zufall.trifft(0.35) ? 2 : 1;
  const pfad = [];
  const erstWaagerecht = zufall.trifft(0.5);
  laufe(...(erstWaagerecht ? [ax, bx, ay, dicke, true] : [ay, by, ax, dicke, false]), pfad);
  laufe(...(erstWaagerecht ? [ay, by, bx, dicke, false] : [ax, bx, by, dicke, true]), pfad);
  for (const p of pfad) {
    if (!istInnen(karte, p.x, p.y)) continue;
    const i = karte.index(p.x, p.y);
    if (gebiet[i] >= 0) continue;
    gebiet[i] = GEBIET_GANG;
    karte.setze(p.x, p.y, { hindernis: HINDERNIS.keins, boden: BODEN.stein });
  }
}

/* Ein gerader Lauf. Verbreitert wird **quer** zur Laufrichtung, nicht
   in beide: Sonst wächst an jedem Knick ein Klumpen. */
function laufe(von, bis, quer, dicke, waagerecht, aus) {
  const s = von <= bis ? 1 : -1;
  for (let k = von; ; k += s) {
    for (let d = 0; d < dicke; d++) {
      aus.push(waagerecht ? { x: k, y: quer + d } : { x: quer + d, y: k });
    }
    if (k === bis) break;
  }
}

/* ═══ Schritt 3 — Höhen ═════════════════════════════════════════════ */

export function setzeHoehen(karte, raeume, kanten, gebiet, saat, zufall) {
  const grob = macheRauschfeld(((saat >>> 0) ^ 0x5eed0173) >>> 0, karte.breite, karte.hoehe, {
    oktaven: 3, dauer: 0.55, weite: 22
  });

  /* Nach **Rangfolge** einteilen, nicht nach festen Schwellen: fbm
     drängt sich um 0,5, feste Schwellen gäben je nach Saat einmal
     lauter Ebene 1 und einmal lauter Ebene 2. */
  const nachTiefe = raeume.map((r, i) => ({ i, wert: grob[karte.index(mitteX(r), mitteY(r))] }));
  nachTiefe.sort((p, q) => p.wert - q.wert || p.i - q.i);
  const n = nachTiefe.length;
  const grenzen = [];
  let bisher = 0;
  for (const teil of [0.15, 0.40, 0.30]) {
    grenzen.push(bisher = Math.min(n, bisher + Math.max(1, Math.round(n * teil))));
  }
  for (let rang = 0; rang < n; rang++) {
    raeume[nachTiefe[rang].i].ebene = rang < grenzen[0] ? EBENE_GRABEN
      : rang < grenzen[1] ? 1 : rang < grenzen[2] ? 2 : 3;
  }
  /* Der Eingang darf kein Graben sein — dort stehen die Jäger, und in
     Ebene 0 liegt Wasser und Lava. Ein Brunnen braucht Ebene 1, damit
     sein Becken auf Ebene 0 genau **eine** Stufe tiefer liegt. */
  for (const r of raeume) {
    if (r.art === "eingang") r.ebene = Math.max(1, r.ebene);
    if (r.art === "brunnen") r.ebene = 1;
  }

  /* Verbundene Räume auf höchstens eine Stufe Unterschied ziehen.
     Sonst müsste ein Gang zwei Stufen auf einmal überwinden — das geht
     nach den Höhenregeln nur abwärts, und der Kerker hätte
     Einbahnstraßen, die keine Rampe heilt. Es wird nur gesenkt, darum
     endet die Schleife sicher. */
  for (let runde = 0; runde < n + 2; runde++) {
    let geaendert = false;
    for (const k of kanten) {
      const ra = raeume[k.a], rb = raeume[k.b];
      if (ra.ebene > rb.ebene + 1) { ra.ebene = rb.ebene + 1; geaendert = true; }
      else if (rb.ebene > ra.ebene + 1) { rb.ebene = ra.ebene + 1; geaendert = true; }
    }
    if (!geaendert) break;
  }

  for (const { i } of alleFelder(karte)) {
    if (gebiet[i] >= 0) karte.ebene[i] = raeume[gebiet[i]].ebene;
  }

  hoeheDerGaenge(karte, gebiet);
  glaetteGaenge(karte, gebiet);
  bauePodesteUndGruben(karte, raeume, gebiet, zufall);
  return raeume;
}

/* Jedes Gangfeld bekommt die Ebene des **nächstgelegenen** Raumfeldes.
   Eine Breitensuche von allen Raumfeldern gleichzeitig: Damit steigt
   ein Gang zwischen zwei verschieden hohen Räumen genau in der Mitte,
   und die Stufe liegt dort, wo sie hingehört. */
function hoeheDerGaenge(karte, gebiet) {
  const gesetzt = new Uint8Array(karte.anzahl), schlange = [];
  for (const { i } of alleFelder(karte)) {
    if (gebiet[i] >= 0) { gesetzt[i] = 1; schlange.push(i); }
  }
  let kopf = 0;
  while (kopf < schlange.length) {
    const i = schlange[kopf++];
    const x = i % karte.breite;
    for (const r of RICHTUNGEN) {
      const nx = x + r.dx, ny = (i - x) / karte.breite + r.dy;
      if (!karte.drin(nx, ny)) continue;
      const ni = karte.index(nx, ny);
      if (gesetzt[ni] || gebiet[ni] !== GEBIET_GANG) continue;
      gesetzt[ni] = 1;
      karte.ebene[ni] = karte.ebene[i];
      schlange.push(ni);
    }
  }
}

/* Zwei Gänge können sich kreuzen; dann treffen die Ebenen zweier weit
   entfernter Räume aufeinander und der Sprung ist zu groß. Diese
   Nachglättung zieht Gangfelder an ihre Nachbarn heran; Raumfelder
   bleiben fest — die Einrastung ist der ganze Punkt. */
function glaetteGaenge(karte, gebiet, gaenge = 8) {
  for (let runde = 0; runde < gaenge; runde++) {
    let geaendert = false;
    for (const { x, y, i } of alleFelder(karte)) {
      if (gebiet[i] !== GEBIET_GANG || karte.blocktBewegung(x, y)) continue;
      let tiefste = EBENEN, hoechste = -1;
      for (const r of RICHTUNGEN) {
        if (karte.blocktBewegung(x + r.dx, y + r.dy)) continue;
        const e = karte.ebeneBei(x + r.dx, y + r.dy);
        tiefste = Math.min(tiefste, e);
        hoechste = Math.max(hoechste, e);
      }
      if (hoechste < 0) continue;
      const ziel = Math.max(hoechste - 1, Math.min(karte.ebene[i], tiefste + 1));
      if (ziel !== karte.ebene[i]) { karte.ebene[i] = ziel; geaendert = true; }
    }
    if (!geaendert) break;
  }
}

/* Podest, Grube und Brunnenbecken — die drei Gründe, warum eine Halle
   nicht nur eine große leere Fläche ist. Das Podest liegt eine Stufe
   höher (Höhenvorteil), die Grube zwei tiefer (dorthin stößt man
   jemanden) und hat **ein** Ufer, über das man wieder herauskommt. */
function bauePodesteUndGruben(karte, raeume, gebiet, zufall) {
  for (let i = 0; i < raeume.length; i++) {
    const r = raeume[i];
    if (r.art === "brunnen") {
      const s = Math.min(3, r.breite - 4, r.hoehe - 4);
      if (s < 1) continue;
      fuelleFeldRechteck(karte, gebiet, i, mitteX(r) - (s >> 1), mitteY(r) - (s >> 1), s, s,
        Math.max(EBENE_GRABEN, r.ebene - 1), BODEN.kachel);
      continue;
    }
    /* Ein Podest braucht Rand zum Umlaufen: zwei Felder je Seite, und
       innen noch drei — sonst ist es kein Podest, sondern eine Säule. */
    if (Math.min(r.breite, r.hoehe) < 7 || Math.max(r.breite, r.hoehe) < 9) continue;
    if (r.art !== "halle" && r.art !== "ausgang") continue;
    const px = r.x + 2, py = r.y + 2, pb = r.breite - 4, ph = r.hoehe - 4;
    if (r.ebene + 1 < EBENEN && zufall.trifft(0.6)) {
      fuelleFeldRechteck(karte, gebiet, i, px, py, pb, ph, r.ebene + 1, BODEN.platte);
    } else if (r.ebene >= 2) {
      fuelleFeldRechteck(karte, gebiet, i, px, py, pb, ph, r.ebene - 2, BODEN.erde);
      /* Das Ufer: eine Reihe auf halber Höhe an der Nordkante der
         Grube. Über sie führt die einzige Rampe wieder hinauf; die
         anderen drei Kanten bleiben zwei Stufen hoch. */
      fuelleFeldRechteck(karte, gebiet, i, px, py, pb, 1, r.ebene - 1, BODEN.gitterrost);
    }
  }
}

function fuelleFeldRechteck(karte, gebiet, raumNr, x0, y0, breite, hoehe, ebene, boden) {
  for (let y = y0; y < y0 + hoehe; y++) {
    for (let x = x0; x < x0 + breite; x++) {
      if (!karte.drin(x, y) || gebiet[karte.index(x, y)] !== raumNr) continue;
      karte.setze(x, y, { ebene, boden });
    }
  }
}

/* ═══ Schritt 4 — Rampen ════════════════════════════════════════════ */

/* Ein Plateau ist eine zusammenhängende Fläche gleicher Ebene. Feld
   für Feld wäre die Frage nach Rampen sinnlos: Eine Kante ist viele
   Felder lang, und eine Rampe genügt für die ganze Kante. */
export function plateauNummern(karte) {
  const nummer = new Int32Array(karte.anzahl).fill(-1);
  let naechste = 0;
  for (const { x, y, i } of alleFelder(karte)) {
    if (nummer[i] !== -1 || karte.blocktBewegung(x, y)) continue;
    const meine = naechste++;
    const stapel = [i];
    nummer[i] = meine;
    while (stapel.length) {
      const j = stapel.pop();
      const jx = j % karte.breite;
      for (const r of RICHTUNGEN) {
        const nx = jx + r.dx, ny = (j - jx) / karte.breite + r.dy;
        if (karte.blocktBewegung(nx, ny)) continue;
        const ni = karte.index(nx, ny);
        if (nummer[ni] !== -1 || karte.ebene[ni] !== karte.ebene[j]) continue;
        nummer[ni] = meine;
        stapel.push(ni);
      }
    }
  }
  return nummer;
}

/* An jeder Kante zwischen zwei Plateaus, die genau eine Stufe trennt,
   mindestens eine Rampe — bei langen Kanten alle paar Felder eine
   weitere, damit man nicht quer durch die halbe Halle läuft. Die Rampe
   liegt immer auf dem **tieferen** Feld und zeigt hinauf. */
export function setzeRampen(karte, opts = {}) {
  const abstandMin = opts.abstandMin ?? 6;
  const plateau = plateauNummern(karte), gruppen = new Map();
  for (const { x, y, i } of alleFelder(karte)) {
    if (karte.blocktBewegung(x, y)) continue;
    for (let nr = 0; nr < RICHTUNGEN.length; nr++) {
      const r = RICHTUNGEN[nr];
      const nx = x + r.dx, ny = y + r.dy;
      if (!karte.drin(nx, ny) || karte.blocktBewegung(nx, ny)) continue;
      const ni = karte.index(nx, ny);
      if (karte.ebene[ni] !== karte.ebene[i] + 1) continue;
      const schluessel = `${plateau[i]}>${plateau[ni]}`;
      if (!gruppen.has(schluessel)) gruppen.set(schluessel, []);
      gruppen.get(schluessel).push({ x, y, rampe: r.rampe });
    }
  }
  let gesetzt = 0;
  for (const liste of gruppen.values()) {
    let letzter = -abstandMin - 1, inGruppe = 0;
    for (let k = 0; k < liste.length; k++) {
      const kand = liste[k];
      if (karte.rampeBei(kand.x, kand.y) !== RAMPE.keine) continue;
      if (inGruppe > 0 && k - letzter < abstandMin) continue;
      karte.setze(kand.x, kand.y, { rampe: kand.rampe });
      letzter = k;
      inGruppe++;
      gesetzt++;
    }
  }
  return gesetzt;
}

/* ═══ Schritt 5 — Erreichbarkeit ════════════════════════════════════ */

/* Geflutet wird mit `begehbar` aus `spiel/hoehen.mjs` — der Regel, die
   im Zug einer Figur gilt. Eine eigene Bau-Regel wäre bequemer und
   wertlos: Sie würde genau die Karten durchwinken, die im Spiel nicht
   funktionieren. Beide Richtungen laufen durch dieselbe Schleife,
   `rueckwaerts` dreht nur, in welcher Richtung gefragt wird — zwei
   Fassungen wären zwei Stellen, an denen jemand später eine Regel
   nachzieht und die andere vergisst. */
function flute(karte, felder, rueckwaerts) {
  const erreicht = new Uint8Array(karte.anzahl);
  const schlange = [];
  for (const f of felder) {
    if (!karte.drin(f.x, f.y) || karte.blocktBewegung(f.x, f.y)) continue;
    const i = karte.index(f.x, f.y);
    if (!erreicht[i]) { erreicht[i] = 1; schlange.push(i); }
  }
  let kopf = 0;
  while (kopf < schlange.length) {
    const i = schlange[kopf++];
    const x = i % karte.breite, y = (i - x) / karte.breite;
    for (const r of RICHTUNGEN) {
      const nx = x + r.dx, ny = y + r.dy;
      if (!karte.drin(nx, ny) || erreicht[karte.index(nx, ny)]) continue;
      if (!(rueckwaerts ? begehbar(karte, nx, ny, x, y) : begehbar(karte, x, y, nx, ny))) continue;
      erreicht[karte.index(nx, ny)] = 1;
      schlange.push(karte.index(nx, ny));
    }
  }
  return erreicht;
}

/* Wohin kommt man von den Startfeldern aus? */
export const flutfuellung = (karte, startFelder) => flute(karte, startFelder, false);

/* Von welchen Feldern kommt man **zu** den Zielfeldern? Ohne diese
   zweite Richtung übersieht man jede Falle: Ein Loch ohne Rampe ist
   vorwärts bestens erreichbar. */
export const rueckflut = (karte, zielFelder) => flute(karte, zielFelder, true);

/* Beides zusammen: hin **und** zurück. Nur solche Felder gehören zum
   bespielbaren Kerker. */
export function beidseitigErreichbar(karte, felder) {
  const hin = flute(karte, felder, false), zurueck = flute(karte, felder, true);
  const gut = new Uint8Array(karte.anzahl);
  for (let i = 0; i < gut.length; i++) gut[i] = hin[i] && zurueck[i] ? 1 : 0;
  return gut;
}

/* Solange etwas abgeschnitten ist, wird angeschlossen: erst Rampen,
   dann Wanddurchbrüche, dann Möbel weg, zuletzt werden übrig
   gebliebene Gang- und Felsnester zugemauert. Räume nie — kommt ein
   Raum trotzdem nicht an, wirft diese Funktion. Endlos laufen darf sie
   nicht: Eine Karte, die nach `grenze` Runden nicht steht, ist ein
   Fehler im Bau und kein Grund zum Weiterprobieren. */
export function sichereErreichbarkeit(karte, anker, gebiet, grenze = 16) {
  const zahl = { rampen: 0, durchbrueche: 0, geebnet: 0, zugemauert: 0, geraeumt: 0 };
  for (let runde = 0; runde <= grenze; runde++) {
    const gut = beidseitigErreichbar(karte, anker);
    const offen = [];
    for (const { x, y, i } of alleFelder(karte)) {
      if (!karte.blocktBewegung(x, y) && !gut[i]) offen.push({ x, y, i });
    }
    if (offen.length === 0) return { runden: runde, ...zahl };
    if (runde === grenze) break;
    let getan = 0;
    for (const f of offen) {
      getan += schliesseAn(karte, gut, f, (was) => {
        if (was === "rampe") zahl.rampen++; else zahl.geebnet++;
      });
    }
    if (getan === 0) {
      for (const f of offen) getan += brichDurch(karte, gut, f, () => zahl.durchbrueche++);
    }
    if (getan === 0) {
      for (const f of offen) getan += raeumeMoebel(karte, f, () => zahl.geraeumt++);
    }
    if (getan === 0) {
      for (const f of offen) {
        if (gebiet[f.i] >= 0) continue;
        karte.setze(f.x, f.y, { hindernis: HINDERNIS.wand, rampe: RAMPE.keine });
        zahl.zugemauert++;
        getan++;
      }
    }
    if (getan === 0) break;
  }
  throw new Error(`sichereErreichbarkeit: Kerker nach ${grenze} Runden nicht verbunden `
    + `(Rampen ${zahl.rampen}, Durchbrüche ${zahl.durchbrueche}, geebnet ${zahl.geebnet}, `
    + `geräumt ${zahl.geraeumt}, zugemauert ${zahl.zugemauert})`);
}

/* Ein abgeschnittenes Feld an einen guten Nachbarn hängen. Mehr als
   eine Stufe Unterschied wird zuerst eingeebnet — keine Rampe
   überbrückt zwei Stufen —, danach heilt in beiden Richtungen dieselbe
   Rampe: Sie liegt immer auf dem tieferen der beiden Felder. */
function schliesseAn(karte, gut, f, gezaehlt) {
  for (let nr = 0; nr < RICHTUNGEN.length; nr++) {
    const r = RICHTUNGEN[nr];
    const nx = f.x + r.dx, ny = f.y + r.dy;
    if (!karte.drin(nx, ny) || karte.blocktBewegung(nx, ny)) continue;
    if (!gut[karte.index(nx, ny)]) continue;
    const dort = karte.ebeneBei(nx, ny);
    let hier = karte.ebeneBei(f.x, f.y);
    let getan = 0;
    if (Math.abs(hier - dort) >= 2) {
      hier = hier > dort ? dort + 1 : dort - 1;
      ebneEin(karte, f.x, f.y, hier);
      gezaehlt("ebene");
      getan = 1;
    }
    /* Die Rampe kommt auf das tiefere Feld und zeigt zum höheren. */
    if (hier !== dort) {
      const auf = hier < dort ? { x: f.x, y: f.y, rampe: r.rampe }
        : { x: nx, y: ny, rampe: gegenRichtung(nr).rampe };
      if (karte.rampeBei(auf.x, auf.y) === RAMPE.keine) {
        karte.setze(auf.x, auf.y, { rampe: auf.rampe });
        gezaehlt("rampe");
        getan = 1;
      }
    }
    if (getan) return 1;
  }
  return 0;
}

/* Ändert die Ebene eines Feldes und nimmt jede Rampe mit, die dadurch
   ins Leere zeigt — die eigene und die der vier Nachbarn. Bliebe eine
   liegen, stünde auf der Karte eine Rampe, die zwei Stufen behauptet:
   sichtbar als Treppe, im Zug aber nicht begehbar. */
function ebneEin(karte, x, y, ebene) {
  karte.setze(x, y, { ebene, rampe: RAMPE.keine });
  for (let nr = 0; nr < RICHTUNGEN.length; nr++) {
    const nx = x + RICHTUNGEN[nr].dx, ny = y + RICHTUNGEN[nr].dy;
    if (karte.rampeBei(nx, ny) !== gegenRichtung(nr).rampe) continue;
    if (karte.ebeneBei(nx, ny) + 1 !== ebene) karte.setze(nx, ny, { rampe: RAMPE.keine });
  }
}

/* Hilft keine Ebenenkante, steht eine einzelne Wand im Weg. Sie wird
   durchbrochen und auf eine Höhe gebracht, von der beide Seiten mit
   höchstens einer Stufe erreichbar sind. Der Rand bleibt heil. */
function brichDurch(karte, gut, f, gezaehlt) {
  for (const r of RICHTUNGEN) {
    const wx = f.x + r.dx, wy = f.y + r.dy;
    const zx = f.x + r.dx * 2, zy = f.y + r.dy * 2;
    if (!istInnen(karte, wx, wy) || !karte.blocktBewegung(wx, wy)) continue;
    if (!karte.drin(zx, zy) || karte.blocktBewegung(zx, zy)) continue;
    if (!gut[karte.index(zx, zy)]) continue;
    const mitte = Math.round((karte.ebeneBei(f.x, f.y) + karte.ebeneBei(zx, zy)) / 2);
    karte.setze(wx, wy, { hindernis: HINDERNIS.keins, boden: BODEN.erde });
    ebneEin(karte, wx, wy, Math.max(0, Math.min(EBENEN - 1, mitte)));
    gezaehlt();
    return 1;
  }
  return 0;
}

/* Zier kann ein Feld vollständig einmauern: vier Fässer ringsum, und
   es gehört zu keinem Kerker mehr. Wände bleiben stehen — die trägt
   der Bau —, Möbel weichen. Da nur entfernt und nie aufgestellt wird,
   endet auch diese Schleife sicher. */
function raeumeMoebel(karte, f, gezaehlt) {
  for (const r of RICHTUNGEN) {
    const nx = f.x + r.dx, ny = f.y + r.dy;
    if (!istInnen(karte, nx, ny) || !karte.blocktBewegung(nx, ny)) continue;
    if (karte.hindernisBei(nx, ny) === HINDERNIS.wand) continue;
    karte.setze(nx, ny, { hindernis: HINDERNIS.keins });
    gezaehlt();
    return 1;
  }
  return 0;
}

/* ═══ Schritt 7 — Zier und Hindernisse ══════════════════════════════ */

/* Zugestellt wird nur, was im Raum liegt, keinen Gang neben sich hat
   und keine Rampe trägt. Der Gang-Abstand ist die wichtige Bedingung:
   Ein Fass in der Türöffnung schneidet einen ganzen Raum ab. */
function darfZier(karte, gebiet, raumNr, x, y) {
  if (!karte.drin(x, y)) return false;
  const i = karte.index(x, y);
  if (gebiet[i] !== raumNr || karte.hindernis[i] !== HINDERNIS.keins) return false;
  if (karte.rampe[i] !== RAMPE.keine) return false;
  return !RICHTUNGEN.some((r) => karte.drin(x + r.dx, y + r.dy)
    && gebiet[karte.index(x + r.dx, y + r.dy)] === GEBIET_GANG);
}

export function setzeZier(karte, raeume, gebiet, zufall) {
  let gestellt = 0;
  for (let i = 0; i < raeume.length; i++) {
    gestellt += fackelnAnDieWaende(karte, gebiet, i, raeume[i], zufall);
    gestellt += zierJeArt(karte, gebiet, i, raeume[i], zufall);
  }
  return gestellt;
}

/* Ein Sockel oder Spieß gehört an eine Wand, nicht mitten in den Raum. */
const stehtAnWand = (karte, x, y) =>
  RICHTUNGEN.some((r) => karte.hindernisBei(x + r.dx, y + r.dy) === HINDERNIS.wand);

/* Fackelsockel im gleichmäßigen Abstand rings an der Raumwand; der
   Versatz kommt aus dem Zufall, damit nicht überall dieselbe Ecke
   dunkel bleibt. */
function fackelnAnDieWaende(karte, gebiet, raumNr, r, zufall) {
  const ring = [];
  for (let x = r.x; x < r.x + r.breite; x++) ring.push({ x, y: r.y });
  for (let y = r.y + 1; y < r.y + r.hoehe; y++) ring.push({ x: r.x + r.breite - 1, y });
  for (let x = r.x + r.breite - 2; x >= r.x; x--) ring.push({ x, y: r.y + r.hoehe - 1 });
  for (let y = r.y + r.hoehe - 2; y > r.y; y--) ring.push({ x: r.x, y });
  const schritt = 5, versatz = zufall.ganz(0, schritt - 1);
  let gesetzt = 0;
  for (let k = 0; k < ring.length; k++) {
    const p = ring[k];
    if ((k + versatz) % schritt !== 0) continue;
    if (!darfZier(karte, gebiet, raumNr, p.x, p.y) || !stehtAnWand(karte, p.x, p.y)) continue;
    karte.setze(p.x, p.y, { hindernis: HINDERNIS.fackelsockel });
    gesetzt++;
  }
  return gesetzt;
}

/* Was in welchem Raum steht: `[Hindernis, wenigstens, höchstens]`. Als
   Schalterblock stand dieselbe Schleife siebenmal da, und was eine
   Gruft zur Gruft macht — der Sarg — verschwand dazwischen. */
const ZIER_JE_ART = {
  halle: [[HINDERNIS.fass, 1, 3], [HINDERNIS.kiste, 0, 2]],
  gruft: [[HINDERNIS.sarg, 2, 5], [HINDERNIS.truhe, 0, 1]],
  kammer: [[HINDERNIS.fass, 1, 3], [HINDERNIS.kiste, 0, 2], [HINDERNIS.truhe, 0, 1]],
  brunnen: [[HINDERNIS.gitter, 0, 2], [HINDERNIS.fass, 0, 2]],
  altarraum: [[HINDERNIS.saeule, 2, 2], [HINDERNIS.kiste, 0, 1]],
  ausgang: [[HINDERNIS.truhe, 1, 1], [HINDERNIS.saeule, 0, 2]],
  eingang: []
};

function zierJeArt(karte, gebiet, raumNr, r, zufall) {
  const freie = [];
  for (let y = r.y; y < r.y + r.hoehe; y++) {
    for (let x = r.x; x < r.x + r.breite; x++) {
      if (darfZier(karte, gebiet, raumNr, x, y)) freie.push({ x, y });
    }
  }
  zufall.mischen(freie);
  let gesetzt = 0;
  const stellHin = (x, y, was, boden) => {
    if (!darfZier(karte, gebiet, raumNr, x, y)) return;
    karte.setze(x, y, boden === undefined ? { hindernis: was } : { hindernis: was, boden });
    gesetzt++;
  };
  /* Säulen in gleichmäßigem Raster — eine Halle ohne Säulen ist eine
     Wiese; mit ihnen gibt es Deckung und Sichtschatten. */
  if (r.art === "halle") {
    for (let y = r.y + 2; y < r.y + r.hoehe - 2; y += 3) {
      for (let x = r.x + 2; x < r.x + r.breite - 2; x += 4) stellHin(x, y, HINDERNIS.saeule);
    }
  }
  if (r.art === "altarraum") stellHin(mitteX(r), mitteY(r), HINDERNIS.altar, BODEN.kachel);
  for (const [was, wenigstens, hoechstens] of ZIER_JE_ART[r.art] ?? []) {
    const wieviele = zufall.ganz(wenigstens, hoechstens);
    for (let k = 0; k < wieviele && freie.length; k++) {
      const pp = freie.pop();
      stellHin(pp.x, pp.y, was);
    }
  }

  /* Spieße blocken nichts und dürfen deshalb auch in Türnähe stehen
     — der billigste Weg, einer Wand ihre Geschichte anzusehen. */
  for (let k = 0; k < 3 && freie.length; k++) {
    const p = freie.pop();
    const i = karte.index(p.x, p.y);
    if (karte.hindernis[i] !== HINDERNIS.keins || karte.rampe[i] !== RAMPE.keine) continue;
    if (!stehtAnWand(karte, p.x, p.y) || !zufall.trifft(0.4)) continue;
    karte.setze(p.x, p.y, { hindernis: HINDERNIS.spiess });
    gesetzt++;
  }
  return gesetzt;
}

/* ═══ Schritt 6 — Flüssigkeiten ═════════════════════════════════════ */

/* Läuft **nach** der Zier, nicht davor: Öl soll neben Fässern stehen,
   und dafür müssen die Fässer schon dasein. */
export function setzeFluessigkeiten(karte, raeume, gebiet, saat, tiefe, zufall) {
  const fein = macheRauschfeld(((saat >>> 0) ^ 0x1a7a5e1f) >>> 0, karte.breite, karte.hoehe, {
    oktaven: 4, dauer: 0.5, weite: 7
  });
  /* Die Schwelle wird aus der Karte selbst genommen (Perzentil), nicht
     fest gesetzt: fbm drängt sich um 0,5, und eine feste Schwelle gäbe
     bei der einen Saat eine Pfütze und bei der nächsten einen See. */
  const schwelle = perzentil(fein, 0.45);

  /* Ebene 0 ist der Graben — nur dort steht Wasser oder Lava; welche
     von beiden, entscheidet der Raum, damit nicht in einer Pfütze
     beides liegt. Je tiefer der Lauf, desto öfter Lava. Gewürfelt wird
     für jeden Raum, auch für den Brunnen — sonst verschöbe sich die
     Reihe. Der Brunnen bekommt sein Ergebnis nur nicht: Da gehört
     Wasser hinein. */
  const lavaChance = Math.min(0.55, 0.12 + 0.09 * Math.max(1, tiefe));
  const lavaRaum = raeume.map((r) => zufall.trifft(lavaChance) && r.art !== "brunnen");
  for (const { x, y, i } of alleFelder(karte)) {
    if (karte.blocktBewegung(x, y) || karte.ebene[i] !== EBENE_GRABEN) continue;
    if (fein[i] >= schwelle) continue;
    const lava = gebiet[i] >= 0 && lavaRaum[gebiet[i]];
    karte.setze(x, y, { fluessig: lava ? FLUESSIG.lava : FLUESSIG.wasser });
  }
  /* Asche rings um die Lava — der einzige Hinweis darauf, wie weit die
     Hitze reicht, bevor man hineinläuft. */
  anNachbarn(karte, (i) => karte.fluessig[i] === FLUESSIG.lava, (ni) => {
    if (karte.fluessig[ni] === FLUESSIG.keine) karte.boden[ni] = BODEN.asche;
  });

  /* Das Brunnenbecken bekommt sein Wasser ohne Rauschen (Schwelle über
     allem) — ein Brunnen ohne Wasser ist ein Loch. Schleim gehört in
     die Gruft, Blut an die Kampfplätze: Altäre, Hallen, Ausgang. */
  const schleim = perzentil(fein, 0.3), blut = perzentil(fein, 0.10);
  for (let i = 0; i < raeume.length; i++) {
    const r = raeume[i];
    if (r.art === "brunnen") {
      fuelleWo(karte, gebiet, i, r, fein, Infinity, FLUESSIG.wasser, EBENE_GRABEN);
    } else if (r.art === "gruft") {
      fuelleWo(karte, gebiet, i, r, fein, schleim, FLUESSIG.schleim);
    } else if (r.art === "altarraum" || r.art === "halle" || r.art === "ausgang") {
      fuelleWo(karte, gebiet, i, r, fein, blut, FLUESSIG.blut);
    }
  }

  /* Öl steht, wo Fässer stehen: Damit ist die Kette „Fass → Öl →
     Lava/Fackel → Feuer" schon zu sehen, bevor sie gebraucht wird. */
  let oel = 0;
  anNachbarn(karte, (i) => karte.hindernis[i] === HINDERNIS.fass, (ni) => {
    if (karte.fluessig[ni] !== FLUESSIG.keine || !zufall.trifft(0.5)) return;
    karte.fluessig[ni] = FLUESSIG.oel;
    oel++;
  });
  return oel;
}

/* „Für jedes Feld, auf das X zutrifft, tu Y mit seinen vier begehbaren
   Nachbarn." Asche um Lava und Öl um Fässer sind dieselbe Bewegung. */
function anNachbarn(karte, trifftZu, tue) {
  for (const { x, y, i } of alleFelder(karte)) {
    if (!trifftZu(i)) continue;
    for (const r of RICHTUNGEN) {
      if (!karte.blocktBewegung(x + r.dx, y + r.dy)) tue(karte.index(x + r.dx, y + r.dy));
    }
  }
}

function fuelleWo(karte, gebiet, raumNr, r, feld, schwelle, was, nurEbene = -1) {
  for (let y = r.y; y < r.y + r.hoehe; y++) {
    for (let x = r.x; x < r.x + r.breite; x++) {
      if (!karte.drin(x, y)) continue;
      const i = karte.index(x, y);
      if (gebiet[i] !== raumNr || karte.blocktBewegung(x, y)) continue;
      if (karte.fluessig[i] !== FLUESSIG.keine || feld[i] >= schwelle) continue;
      if (nurEbene >= 0 && karte.ebene[i] !== nurEbene) continue;
      karte.fluessig[i] = was;
    }
  }
}

function perzentil(feld, teil) {
  const sortiert = Array.from(feld).sort((a, b) => a - b);
  return sortiert[Math.min(sortiert.length - 1, Math.max(0, Math.round(sortiert.length * teil)))];
}

/* Die Erreichbarkeitsreparatur hebt und senkt einzelne Felder. Eines,
   das dabei aus dem Graben steigt, nähme sein Wasser mit — und dann
   stünde ein See auf dem Plateau. Deshalb wird ganz am Ende
   nachgesehen: Die Reparatur ist die letzte, die Ebenen ändert. */
export function raeumeFluessigkeitenAuf(karte) {
  let entfernt = 0;
  for (const { x, y, i } of alleFelder(karte)) {
    const f = karte.fluessig[i];
    if (f !== FLUESSIG.wasser && f !== FLUESSIG.lava) continue;
    if (karte.ebene[i] === EBENE_GRABEN && !karte.blocktBewegung(x, y)) continue;
    karte.fluessig[i] = FLUESSIG.keine;
    entfernt++;
  }
  return entfernt;
}

/* ═══ Schritt 9 — Starts und Ausgang ════════════════════════════════ */

/* Die Startfelder müssen aneinanderhängen und auf **einer** Ebene
   liegen: Ein Jäger, der eine Stufe tiefer beginnt und ohne Rampe
   nicht hochkommt, ist kein Anfang, sondern ein Fehler. */
export function setzeStartsUndAusgang(karte, raeume, gebiet, spielerZahl) {
  const eingangNr = raeume.findIndex((r) => r.art === "eingang");
  const ausgangNr = raeume.findIndex((r) => r.art === "ausgang");
  if (eingangNr < 0 || ausgangNr < 0) {
    throw new Error("setzeStartsUndAusgang: Eingang oder Ausgang fehlt");
  }
  /* Erst wird lavafrei gesucht; ein Raum ganz aus Lava ist selten, aber
     möglich — dann wird trotzdem gesucht und die Lava unter den Füßen
     gelöscht. Ein Wurf nähme dem Spieler die Karte weg, statt sie zu
     heilen. */
  const nest = (nr, wieviele) => {
    const ohne = sammleNest(karte, gebiet, nr, raeume[nr], wieviele, false);
    return ohne.length >= wieviele ? ohne
      : sammleNest(karte, gebiet, nr, raeume[nr], wieviele, true);
  };
  karte.starts = nest(eingangNr, spielerZahl);
  if (karte.starts.length < spielerZahl) {
    throw new Error(
      `setzeStartsUndAusgang: nur ${karte.starts.length} von ${spielerZahl} Startfeldern frei`
    );
  }
  for (const st of karte.starts) {
    if (karte.fluessigBei(st.x, st.y) === FLUESSIG.lava) {
      karte.setze(st.x, st.y, { fluessig: FLUESSIG.keine, boden: BODEN.asche });
    }
  }
  const ausgang = nest(ausgangNr, 1)[0];
  if (!ausgang) throw new Error("setzeStartsUndAusgang: kein freies Feld im Ausgangsraum");
  karte.setze(ausgang.x, ausgang.y, {
    hindernis: HINDERNIS.keins, boden: BODEN.platte, fluessig: FLUESSIG.keine
  });
  karte.ausgang = ausgang;
  return karte.starts;
}

function sammleNest(karte, gebiet, raumNr, r, wieviele, lavaErlaubt) {
  const taugt = (x, y) => karte.drin(x, y) && gebiet[karte.index(x, y)] === raumNr
    && !karte.blocktBewegung(x, y)
    && (lavaErlaubt || karte.fluessigBei(x, y) !== FLUESSIG.lava);
  const mx = mitteX(r), my = mitteY(r);
  let anker = null, naheste = Infinity;
  for (let y = r.y; y < r.y + r.hoehe; y++) {
    for (let x = r.x; x < r.x + r.breite; x++) {
      const d = Math.abs(x - mx) + Math.abs(y - my);
      if (taugt(x, y) && d < naheste) { naheste = d; anker = { x, y }; }
    }
  }
  if (!anker) return [];
  const ebene = karte.ebeneBei(anker.x, anker.y);
  const gesehen = new Uint8Array(karte.anzahl);
  const nest = [], schlange = [anker];
  gesehen[karte.index(anker.x, anker.y)] = 1;
  let kopf = 0;
  while (kopf < schlange.length && nest.length < wieviele) {
    const p = schlange[kopf++];
    nest.push(p);
    for (const ri of RICHTUNGEN) {
      const nx = p.x + ri.dx, ny = p.y + ri.dy;
      if (!karte.drin(nx, ny)) continue;
      const ni = karte.index(nx, ny);
      if (gesehen[ni] || !taugt(nx, ny) || karte.ebene[ni] !== ebene) continue;
      gesehen[ni] = 1;
      schlange.push({ x: nx, y: ny });
    }
  }
  return nest;
}

/* ═══ Schritt 8 — Lichter ═══════════════════════════════════════════ */

/* Jede Fackel bekommt ihr Licht, Lava und Schleim leuchten von selbst,
   der Altar arkan. Lava und Schleim werden ausgedünnt: Ein Licht je
   Feld wären bei einem Lavasee dreihundert, jedes einzeln gerechnet. */
export function setzeLichter(karte) {
  karte.lichter = [];
  for (const { x, y, i } of alleFelder(karte)) {
    const h = karte.hindernis[i];
    const f = karte.fluessig[i];
    const art = h === HINDERNIS.fackelsockel ? "fackel"
      : h === HINDERNIS.altar ? "arkan"
        : f === FLUESSIG.lava && (x + y) % 3 === 0 ? "lava"
          : f === FLUESSIG.schleim && (x + y) % 4 === 0 ? "schleim" : null;
    if (art) karte.lichter.push({ x, y, art, staerke: 1 });
  }
  return karte.lichter;
}

/* ═══ Der ganze Kerker ══════════════════════════════════════════════ */

export function baueLandschaft({
  saat, breite = 56, hoehe = 40, tiefe = 1, spielerZahl = 2
} = {}) {
  if (!Number.isInteger(saat)) throw new Error("baueLandschaft: saat muss eine ganze Zahl sein");
  if (!Number.isInteger(breite) || !Number.isInteger(hoehe)
    || breite < MIN_KARTE || hoehe < MIN_KARTE) {
    throw new Error(`baueLandschaft: Karte braucht ganze Maße ab ${MIN_KARTE}×${MIN_KARTE}`);
  }
  if (!Number.isInteger(spielerZahl) || spielerZahl < 1 || spielerZahl > 4) {
    throw new Error("baueLandschaft: spielerZahl muss 1 bis 4 sein");
  }

  /* Ein eigener Zweig: Die Landschaft würfelt viel, und ohne Zweig
     verschöbe eine zusätzliche Fackel jeden späteren Trefferwurf. */
  const zufall = macheZufall(saat >>> 0).zweig();
  const karte = macheKarte(breite, hoehe);
  const raeume = raeumeInBlaettern(teileFlaeche(breite, hoehe, zufall), zufall);
  if (raeume.length < 4) {
    throw new Error(`baueLandschaft: nur ${raeume.length} Räume — Karte zu klein`);
  }
  verteileRaumArten(raeume, zufall, breite, hoehe);
  const kanten = verbindeRaeume(raeume, zufall);
  const gebiet = grabeKerker(karte, raeume, kanten, zufall);
  setzeHoehen(karte, raeume, kanten, gebiet, saat, zufall);
  setzeRampen(karte);
  setzeZier(karte, raeume, gebiet, zufall);
  setzeFluessigkeiten(karte, raeume, gebiet, saat, tiefe, zufall);
  setzeStartsUndAusgang(karte, raeume, gebiet, spielerZahl);
  /* Erst ganz zuletzt, denn Zier und Ausgang stellen Hindernisse auf
     und ändern Ebenen — beides kann Wege zuschieben. */
  sichereErreichbarkeit(karte, karte.starts, gebiet);
  raeumeFluessigkeitenAuf(karte);
  setzeLichter(karte);
  karte.saat = saat >>> 0;
  karte.tiefe = tiefe;
  karte.raeume = raeume;
  return karte;
}
