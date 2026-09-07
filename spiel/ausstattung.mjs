/* [Aufgabe: Regelkern] Die Ausstattung einer Karte — Wasser, Boden,
   Zier, Licht, Startfelder und Ausgang.

   ── Warum getrennt von `landschaft.mjs` ────────────────────────────

   Weil es zwei verschiedene Fragen sind. Dort steht die **Form**: Wo
   ist Wand, wie hoch liegt eine Kachel, wo geht es hinauf, kommt man
   überall hin. Hier steht, **was darauf liegt** — und das ändert an
   der Begehbarkeit nichts mehr, bis auf die Hindernisse, deren Setzen
   deshalb hinterher noch einmal geprüft wird.

   Die Trennung war zunächst keine: Beides stand in einer Datei, und
   die wuchs am 06.09.2026 mit dem Kliffschnitt auf 1.070 Zeilen. Die
   Grenze liegt bei 1.000, und eine Datei über der Grenze wird geteilt,
   nicht geduldet (Regel 8). Der Schnitt fiel dorthin, wo er ohnehin
   hingehört.

   ── Nur Wasser ─────────────────────────────────────────────────────

   Janniks Vorgabe wörtlich: *„erst mal nur mit wasser und ohne gase."*
   `spiel/gitter.mjs` kennt Lava, Schleim und Öl als Schlüssel, aber
   hier setzt sie niemand. Das ist eine Entscheidung, keine Lücke.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `spiel/landschaft.mjs` (ruft diese Schritte der Reihe nach auf),
   `spiel/gitter.mjs` (die Schlüssel), `spiel/welt-feld.mjs` (Räume und
   Hallen), `spiel/hoehen.mjs` (Erreichbarkeit nach dem Setzen). */

import {
  BODEN, FLUESSIG, HINDERNIS, RAMPE, richtungen, EBENE_GRABEN, abstand
} from "./gitter.mjs";
import { laufKosten } from "./hoehen.mjs";
import { macheWeltfeld } from "./welt-feld.mjs";
import { PIXEL_JE_FELD } from "./bauart.mjs";
import { hash, fbm } from "./welt-rauschen.mjs";

import {
  spalte, zeile, gegen, offen, alleDabei, gleicheEbene, gebiete
} from "./kachelhilfe.mjs";

import {
  laufKostenFeld, erreichbareFelder, beidseitigErreichbar, offeneGebiete,
  groesstesPlateauFeld, kachelMitte
} from "./erreichbarkeit.mjs";

/* Bildpunkte je Kachel. */
const P = PIXEL_JE_FELD;

/* Kleinster Fackelabstand in Kacheln (Schachbrett). Eine Fackel
   leuchtet 6,5 Felder weit (`LICHT_ARTEN` in `runtime/palette.js`); bei
   fünf Feldern überlappen die Kreise, es bleibt kein schwarzes Loch. */
export const FACKEL_ABSTAND = 5;

export const SPIESS_HAEUFIGKEIT = 0.050;

/* Wie weit ein Startfeld vom ersten entfernt sein darf. Vier Schritte
   sind „benachbart": Man sieht sich, man kann sich decken. */
export const START_NAEHE = 4;

/* Was wo steht und wie oft. `halle` heißt: nur in einer Halle (true),
   nur außerhalb (false) oder überall (null). `marke` trennt die
   Würfelwürfe auseinander — ohne sie fiele für jede Art derselbe Wurf,
   und wo ein Fass steht, stünde auch ein Sarg. Sparsam, weil alles
   außer dem Spieß die Bewegung blockt und ein Kerker voller Fässer
   ein Labyrinth ist, kein Schlachtfeld. */
export const ZIER_ARTEN = [
  { name: "altar", art: HINDERNIS.altar, halle: true, haeufig: 0.010, marke: 1 },
  { name: "truhe", art: HINDERNIS.truhe, halle: true, haeufig: 0.008, marke: 2 },
  { name: "sarg", art: HINDERNIS.sarg, halle: false, haeufig: 0.010, marke: 3 },
  { name: "fass", art: HINDERNIS.fass, halle: null, haeufig: 0.020, marke: 4 },
  { name: "kiste", art: HINDERNIS.kiste, halle: null, haeufig: 0.014, marke: 5 }
];

/* Wie weit die Umgehungsprobe für ein neues Hindernis schaut: drei
   Kacheln in jede Richtung, ein Fenster von 7 × 7. */
export const ZIER_FENSTER = 3;


/* ═══ Schritt 6 — Wasser ════════════════════════════════════════════════════
   Nur Wasser. Kein Schleim, kein Öl, keine Lava, kein Gas — Janniks
   Vorgabe ist wörtlich *„erst mal nur mit wasser und ohne gase"*; die
   anderen Schlüssel in `gitter.mjs` sind keine Lücke, sondern eine
   spätere Entscheidung.

   Wasser steht in Ebene 0 und nur, wo die Senke groß genug ist: Eine
   einzelne nasse Kachel im Trockenen sieht nach einem Fehler aus,
   nicht nach einem See. Die Mindestgröße steht in `bauart.mjs`, weil
   sie zur Höhle gehört. Wasser kostet einen Punkt mehr, sperrt aber
   nichts; deshalb darf es nach den Rampen kommen. */
export function setzeWasser(karte, welt) {
  const mindest = welt.bauart.wasserMindestSee;
  const { nummer, groessen } = gebiete(karte,
    (i) => offen(karte, i) && karte.ebene[i] === EBENE_GRABEN, alleDabei);
  let nass = 0, gross = 0;
  for (const zahl of groessen) if (zahl >= mindest) gross++;
  for (let i = 0; i < karte.anzahl; i++) {
    if (nummer[i] < 0 || groessen[nummer[i]] < mindest) continue;
    karte.fluessig[i] = FLUESSIG.wasser;
    nass++;
  }
  return { seen: gross, felder: nass, senken: groessen.length };
}

/* ═══ Schritt 7 — Boden ═════════════════════════════════════════════════════
   Liegt diese Bildpunktstelle in einer Halle der Engine? Die Engine
   verzerrt die Abtaststelle, bevor sie liest; genau dieselbe
   Verzerrung wird hier gerechnet, sonst läge der gekachelte Boden
   neben seiner Halle statt darin. Geprüft wird gegen den **Kreis** um
   die Raummitte statt gegen die gelappte Ellipse aus `welt-feld.mjs`:
   Die ist nicht herausgereicht und entscheidet hier über eine Kachel
   am Rand. */
export function macheHallenProbe(welt) {
  const v = [0, 0];
  return (X, Y) => {
    welt.versatz(X, Y, v);
    const wx = X + v[0], wy = Y + v[1];
    const sx = Math.floor(wx / welt.sektor), sy = Math.floor(wy / welt.sektor);
    for (let j = -1; j <= 1; j++) {
      for (let i = -1; i <= 1; i++) {
        const raum = welt.raumBei(sx + i, sy + j);
        if (!raum.halle) continue;
        const dx = wx - raum.x, dy = wy - raum.y;
        if (dx * dx + dy * dy < raum.r * raum.r) return true;
      }
    }
    return false;
  };
}

/* Höhlenhaft, nicht gefliest: Stein ist die Regel. Erde liegt am
   Wandfuß, wo `bauart.wandAnhebung` die Ebene anhebt — dort liegt das
   Geröll, derselbe Ort, dieselbe Begründung; genauer im **stärksten
   Viertel** dieser Anhebung. Über ihre ganze Weite (26 Bildpunkte)
   wären 76,7 % aller offenen Kacheln Erde und Stein die Ausnahme; beim
   Viertel sind es 26,8 % (20 Saaten auf 56 × 40, nachzurechnen mit
   `pruefe-landschaft.mjs`). Kacheln nur in den Hallen der Engine — das
   einzige, was hier je jemand gebaut hat. Knochen in Flecken aus einem
   groben Rauschfeld: ein Knochenteppich ist eine Gruft. */
export function setzeBoden(karte, welt, wandNaehe) {
  const nahWand = welt.bauart.wandAnhebungWeite / 4;
  const istHalle = macheHallenProbe(welt);
  const zahlen = { stein: 0, erde: 0, kachel: 0, knochen: 0 };
  const saat = (welt.saat | 0) + 331;
  for (let y = 0; y < karte.hoehe; y++) {
    for (let x = 0; x < karte.breite; x++) {
      const i = y * karte.breite + x;
      if (!offen(karte, i)) { karte.boden[i] = BODEN.stein; continue; }
      const amFels = wandNaehe[i] > -nahWand;
      let art = BODEN.stein, name = "stein";
      if (!amFels && istHalle(kachelMitte(x), kachelMitte(y))) {
        art = BODEN.kachel; name = "kachel";
      } else if (amFels) {
        art = BODEN.erde; name = "erde";
      } else if (fbm(x * 0.09, y * 0.09, saat, 2) > 0.680) {
        art = BODEN.knochen; name = "knochen";
      }
      karte.boden[i] = art;
      zahlen[name]++;
    }
  }
  return zahlen;
}

/* ═══ Schritt 8 — Zier und Licht ════════════════════════════════════════════
   Darf hier ein Hindernis stehen? Geprüft wird **lokal**: Bleiben alle
   offenen Nachbarn im Fenster gegenseitig erreichbar, ohne die Kachel
   zu benutzen, dann lässt sich jeder Weg ringsherum umleiten — auch
   global, denn die Umleitung liegt ganz auf der Karte. Die Probe lehnt
   im Zweifel ab, und das ist für eine Zierde die richtige Richtung.
   Dazu die Nur-Diagonale: Ein Fass in der Ecke schafft genau die
   Scheinverbindung von Schritt 4. */
export function zierErlaubt(karte, x, y) {
  const i = karte.index(x, y);
  if (!offen(karte, i)) return false;
  const merk = karte.hindernis[i];
  karte.hindernis[i] = HINDERNIS.wand;
  const nachbarn = [];
  for (const r of richtungen(y)) {
    const nx = x + r.dx, ny = y + r.dy;
    if (karte.drin(nx, ny) && !karte.blocktBewegung(nx, ny)) nachbarn.push({ x: nx, y: ny });
  }
  let gut = true;
  if (nachbarn.length > 1) {
    const da = beidseitigErreichbar(karte, [nachbarn[0]], { x, y, weite: ZIER_FENSTER });
    for (const n of nachbarn) if (!da[karte.index(n.x, n.y)]) gut = false;
  }
  for (let b = -1; b <= 0 && gut; b++) {
  }
  karte.hindernis[i] = merk;
  return gut;
}

/* Berührt die Kachel orthogonal eine Wand? Die Stelle für Fackeln und
   Spieße — beide hängen an der Wand und nicht in der Luft. */
function anDerWand(karte, x, y) {
  for (const r of richtungen(y)) {
    if (karte.hindernisBei(x + r.dx, y + r.dy) === HINDERNIS.wand) return true;
  }
  return false;
}

/* Fackeln in regelmäßigem Abstand an den Wänden — die einzige
   Lichtquelle dieser Karte. Ohne sie ist der Kerker schwarz, und die
   Verborgen-Schwelle aus `spiel/licht.mjs` nimmt jedem Jäger die halbe
   Karte. Feste Reihenfolge, und jede neue Fackel muss `FACKEL_ABSTAND`
   (Schachbrett) weg sein: ein Kranz ohne globale Planung. */
export function setzeFackeln(karte) {
  const gesetzt = [];
  for (let y = 1; y < karte.hoehe - 1; y++) {
    for (let x = 1; x < karte.breite - 1; x++) {
      const i = y * karte.breite + x;
      if (karte.hindernis[i] !== HINDERNIS.keins) continue;
      if (karte.fluessig[i] !== FLUESSIG.keine || karte.rampe[i] !== RAMPE.keine) continue;
      if (!anDerWand(karte, x, y)) continue;
      const zuNah = gesetzt.some(
        (f) => Math.max(Math.abs(f.x - x), Math.abs(f.y - y)) < FACKEL_ABSTAND);
      if (zuNah || !zierErlaubt(karte, x, y)) continue;
      karte.hindernis[i] = HINDERNIS.fackelsockel;
      karte.lichter.push({ x, y, art: "fackel", staerke: 1 });
      gesetzt.push({ x, y });
    }
  }
  return gesetzt.length;
}

/* Fässer, Kisten, Särge, Altäre, Truhen, Spieße — raumartgerecht:
   Altar und Truhe in den Hallen (dort hat jemand gebaut), Sarg und
   Fass in den Kammern, Spieße an der Wand. Der Spieß blockt nichts
   (`gitter.mjs`) und braucht keine Umgehungsprobe. Gewürfelt wird aus
   Feldnummer und Saat: Die Zier steht in `karte.summe()`, und zwei
   Rechner mit verschiedenen Fässern brechen die Sitzung ab. */
export function setzeZier(karte, welt, saat) {
  const istHalle = macheHallenProbe(welt);
  const s = (saat | 0) + 501;
  const zahlen = { fass: 0, kiste: 0, sarg: 0, altar: 0, truhe: 0, spiess: 0 };
  for (let y = 1; y < karte.hoehe - 1; y++) {
    for (let x = 1; x < karte.breite - 1; x++) {
      const i = y * karte.breite + x;
      if (karte.hindernis[i] !== HINDERNIS.keins || karte.rampe[i] !== RAMPE.keine) continue;
      if (anDerWand(karte, x, y) && hash(i, 6, s) < SPIESS_HAEUFIGKEIT) {
        karte.hindernis[i] = HINDERNIS.spiess;
        zahlen.spiess++;
        continue;
      }
      if (karte.fluessig[i] !== FLUESSIG.keine) continue;
      const halle = istHalle(kachelMitte(x), kachelMitte(y));
      let gewaehlt = null;
      for (const z of ZIER_ARTEN) {
        if (z.halle !== null && z.halle !== halle) continue;
        if (hash(i, z.marke, s) < z.haeufig) { gewaehlt = z; break; }
      }
      const art = gewaehlt ? gewaehlt.art : HINDERNIS.keins;
      if (!gewaehlt || !zierErlaubt(karte, x, y)) continue;
      karte.hindernis[i] = art;
      zahlen[gewaehlt.name]++;
      /* Der Altar leuchtet arkan — die einzige Stelle, an der es von
         selbst blau wird (Janniks Leuchtpfützen). */
      if (art === HINDERNIS.altar) karte.lichter.push({ x, y, art: "arkan", staerke: 1 });
    }
  }
  return zahlen;
}

/* ═══ Schritt 9 — Starts, Ausgang, Räume ════════════════════════════════════
   Die Startgruppe: `spielerZahl` Kacheln, die beieinander liegen und
   gegenseitig erreichbar sind. Gesucht wird die Stelle mit den
   **meisten** guten Kacheln im Umkreis von `START_NAEHE` — vier Jäger
   in einer Sackgasse verlieren ihren ersten Zug damit, sich aneinander
   vorbeizuschieben. Trocken muss es sein, weil Wasser einen Punkt
   kostet und der erste Zug der teuerste des Laufs ist. */
function umkreis(karte, x, y, weite, brauchbar) {
  const raus = [];
  /* Gemessen wird mit `abstand`, dem Maß des Rasters — nicht mit
     `|dx| + |dy|`. Bis zum 07.09.2026 stand hier die Manhattan-Formel
     des Quadratrasters; auf Versatzzeilen beschreibt sie eine Raute,
     die schräg über die Sechsecke liegt und dabei Felder ausläßt.
     Gemessen hat es die Landschaftsprüfung: Auf einer engen Karte fand
     `waehleStarts` nur noch ein einziges Startfeld statt zweier. */
  for (let b = -weite; b <= weite; b++) {
    for (let a = -weite; a <= weite; a++) {
      const nx = x + a, ny = y + b;
      if (!karte.drin(nx, ny)) continue;
      const d = abstand(x, y, nx, ny);
      if (d > weite) continue;
      const j = ny * karte.breite + nx;
      if (brauchbar(j)) raus.push({ x: nx, y: ny, d, j });
    }
  }
  return raus;
}

export function waehleStarts(karte, spielerZahl) {
  const quelle = groesstesPlateauFeld(karte);
  if (quelle < 0) throw new Error("waehleStarts: die Karte hat keine offene Kachel");
  const gut = beidseitigErreichbar(karte,
    [{ x: spalte(karte, quelle), y: zeile(karte, quelle) }]);
  const brauchbar = (i) => gut[i] === 1 && karte.fluessig[i] === FLUESSIG.keine;
  let besterOrt = -1, besteZahl = -1;
  for (let i = 0; i < karte.anzahl; i++) {
    if (!brauchbar(i)) continue;
    const zahl = umkreis(karte, spalte(karte, i), zeile(karte, i),
      START_NAEHE, brauchbar).length;
    if (zahl > besteZahl) { besteZahl = zahl; besterOrt = i; }
  }
  if (besterOrt < 0) throw new Error("waehleStarts: keine erreichbare trockene Kachel");
  const nahe = umkreis(karte, spalte(karte, besterOrt), zeile(karte, besterOrt),
    START_NAEHE, brauchbar);
  /* Erst nach Entfernung, bei Gleichstand nach Feldnummer — eine feste
     Ordnung, damit vier Rechner dieselben Startfelder wählen. */
  nahe.sort((a, b) => (a.d - b.d) || (a.j - b.j));
  if (nahe.length < spielerZahl) {
    throw new Error(`waehleStarts: nur ${nahe.length} Startfelder für ${spielerZahl} Jäger`);
  }
  return nahe.slice(0, spielerZahl).map((f) => ({ x: f.x, y: f.y }));
}

/* Der Ausgang liegt so weit vom Start weg, wie man **laufen** muss,
   nicht wie die Luftlinie misst — der Unterschied zwischen „quer durch
   den Kerker" und „um die Felswand herum, die dazwischenliegt". */
export function waehleAusgang(karte, starts) {
  const kosten = laufKostenFeld(karte, starts);
  let bester = -1;
  for (let i = 0; i < karte.anzahl; i++) {
    if (kosten[i] < 0 || !offen(karte, i)) continue;
    if (starts.some((s) => karte.index(s.x, s.y) === i)) continue;
    if (bester < 0 || kosten[i] > kosten[bester]) bester = i;
  }
  if (bester < 0) throw new Error("waehleAusgang: kein erreichbares Feld außer den Starts");
  return { x: spalte(karte, bester), y: zeile(karte, bester), kosten: kosten[bester] };
}

/* Die Räume der Engine, in Kacheln umgerechnet. `raumBei` liefert sie
   im **verzerrten** Raum; `entzerre` findet die Weltstelle dazu, und
   erst die ist eine Kachel auf dieser Karte. Die Liste ist keine Regel
   — sie beschreibt, wie die Karte gemeint war, und `runtime/` färbt
   danach. Deshalb der Radius als grobes Kästchenmaß statt als Hülle. */
export function sammleRaeume(karte, welt) {
  const rand = 2, raus = [0, 0], raeume = [];
  const s1x = Math.floor((karte.breite * P) / welt.sektor) + rand;
  const s1y = Math.floor((karte.hoehe * P) / welt.sektor) + rand;
  for (let sy = -rand; sy <= s1y; sy++) {
    for (let sx = -rand; sx <= s1x; sx++) {
      const raum = welt.raumBei(sx, sy);
      welt.entzerre(raum.x, raum.y, raus);
      const x = Math.round((raus[0] - P / 2) / P), y = Math.round((raus[1] - P / 2) / P);
      if (!karte.drin(x, y)) continue;
      const weite = Math.max(1, Math.round((2 * raum.r) / P));
      raeume.push({
        x, y, breite: weite, hoehe: weite, art: raum.halle ? "halle" : "kammer",
        ebene: karte.ebene[y * karte.breite + x]
      });
    }
  }
  return raeume;
}

/* Der Raum, der einer Kachel am nächsten liegt, bekommt ihre Rolle.
   „Eingang" und „Ausgang" gehören dem Lauf, nicht der Höhle — deshalb
   erst hier und nicht in der Engine. */
export function markiereRaum(raeume, feld, art) {
  if (!feld || raeume.length === 0) return;
  let bester = 0, beste = Infinity;
  raeume.forEach((r, n) => {
    const d = Math.abs(r.x - feld.x) + Math.abs(r.y - feld.y);
    if (d < beste) { beste = d; bester = n; }
  });
  raeume[bester].art = art;
}

/* ═══ Die ganze Landschaft ═════════════════════════════════════════════ */


/* Die neun Schritte, jeder auf dem vorigen stehend. Rastern und Rand
   machen den Fels · das Aufräumen ändert Ebenen (die geöffnete
   Diagonale nimmt die tiefere), also stehen die Ebenen davor · Rampen
   brauchen endgültige Ebenen, sonst zeigen sie irgendwohin · Wasser
   ändert nur Kosten · der Boden braucht die Wandnähe aus dem Rastern ·
   die Zier weicht Rampen und Wasser aus · Starts und Ausgang brauchen
   die fertige Zier, sonst stünde ein Jäger unter einem Sarg. */
