/* [Aufgabe: Bild] Der Abspieler — er macht aus einem Zug, den der Kern
   auf einen Schlag liefert, eine Folge, der man zusehen kann.

   ── Warum es das gibt / Warum so ───────────────────────────────────

   `spiel/zug.mjs` rechnet einen ganzen Zug in einem Rutsch: gehen,
   treffen, stürzen, sterben. Wer das ungefiltert zeichnete, sähe das
   **Ergebnis** und nie den Weg dorthin — die Figur stünde plötzlich
   woanders, ein Gegner wäre plötzlich weg, und niemand wüsste, was
   passiert ist. Der Abspieler hält die Ereignisse in einer Reihe und
   arbeitet sie nacheinander ab, jedes mit seiner eigenen Dauer.

   **Er schreibt nicht in den Spielstand.** Was er führt, ist eine
   Nebenrechnung fürs Auge: wo eine Figur gerade zu sehen ist, wohin
   sie schaut, welche Zahl über ihr steht. Das ist keine Feinheit,
   sondern die Bedingung für den Netz-Koop: Zwei Rechner spielen
   dieselben Ereignisse verschieden schnell ab — säße die Abspielung im
   Spielstand, liefen beide auseinander (Fehlerbuch B2).

   ── Warum eine eigene Datei ────────────────────────────────────────

   Bis zum 06.09.2026 stand das alles in `runtime/start.js`. Diese Datei
   erreichte 999 von 1000 erlaubten Zeilen (Regel 8), und der Abspieler
   ist der sauberste Schnitt: Er hängt an keiner Leinwand, an keinem
   Hörer und an keinem Spielstand — nur an den Ereignissen, die man ihm
   hinlegt, und an der Uhr, die man ihm weiterstellt. Was hier steht,
   hat `start.js` nie gebraucht, um seine eigentliche Arbeit zu tun:
   Blatt holen, Hörer anmelden, Bilder anstoßen.

   ── Arbeitet zusammen mit ──────────────────────────────────────────

   `runtime/start.js` (legt Ereignisse hinein und fragt `schau` ab),
   `runtime/partikel.js` (`SCHLEIM_RAMPE`, und das Teilchenwerk, das
   hier gefüttert wird), `runtime/licht.js` (`KACHEL`),
   `runtime/palette.js` (`FARBEN`), `runtime/oberflaeche.js`
   (`satzVon` — der Lauftext), `runtime/sprites.js` (`richtungAus`),
   `spiel/zug.mjs` (`wesenMitId`), `spiel/wesen.mjs` (`ruestungVon`),
   `werkzeuge/pruefe-einstieg.mjs` (misst hierüber). */

import { FARBEN } from "./palette.js";
import { KACHEL } from "./licht.js";
import { SCHLEIM_RAMPE } from "./partikel.js";
import { satzVon } from "./oberflaeche.js";
import { richtungAus } from "./sprites.js";
import { wesenMitId } from "../spiel/zug.mjs";
import { ruestungVon } from "../spiel/wesen.mjs";

/* Die Uhr der Abspielung, in Sekunden. Gemessen wird sie nicht, sie
   ist gewählt: Ein Feld je 0,11 Sekunden ist schnell genug, dass ein
   Zug über acht Felder nicht langweilt, und langsam genug, dass man
   jedem Schritt folgen kann. */
export const TEMPO = {
  feld: 0.11, stoss: 0.14, sturz: 0.22, tod: 0.35, ruhe: 0.09, brut: 0.25
};

export const ZAHL_STEIGT = 0.9;   /* Sekunden, die eine Schadenszahl lebt */
export const ZAHL_HOCH = 12;      /* logische Bildpunkte, die sie dabei steigt */

/* Welche Teilchen zu welcher Schadensart gehören. Die Tabelle steht im
   Bildvertrag; hier ist nur die Zuordnung. */
export const SCHADEN_TEILCHEN = {
  hieb: "blut", stich: "blut", feuer: "glut", arkan: "zauberstaub",
  gift: "tropfen", sturz: "staub"
};

/* Ereignisse, die keinen Satz im Lauftext bekommen. */
export const STILLE_EREIGNISSE = new Set(["pause", "apGesetzt", "seiteDran", "ebeneGewechselt"]);

/* ── Der Abspieler ──────────────────────────────────────────────────

   Er hält die Ereignisse aus dem Kern in einer Reihe und arbeitet sie
   **nacheinander** ab. Das ist der Grund, warum es ihn gibt: Der Kern
   liefert einen ganzen Zug auf einen Schlag — gehen, treffen, stürzen,
   sterben —, und ohne Reihe stünde das Ergebnis sofort da, ohne dass
   irgendwer gesehen hätte, was passiert ist.

   Er schreibt **nicht** in den Spielstand. Was er führt, ist eine
   Nebenrechnung fürs Auge: wo eine Figur gerade zu sehen ist, wohin
   sie schaut, welche Zahl über ihr steht. */
export function macheAbspieler({
  partikelwerk = null, kamera = null, lichtwerk = null, beiSatz = null
} = {}) {
  const reihe = [];
  const anzeige = new Map();
  const blicke = new Map();
  const zahlen = [];
  let laufend = null;

  const kachelMitte = (feld) => feld * KACHEL + KACHEL / 2;

  function wirf(art, x, y, opts = {}) {
    if (partikelwerk) partikelwerk.stosseAus(art, kachelMitte(x), kachelMitte(y), opts);
  }

  function ruettle(staerke, dauer) {
    if (kamera && typeof kamera.ruettle === "function") kamera.ruettle(staerke, dauer);
  }

  function lege(ereignisse) {
    for (const ereignis of ereignisse || []) reihe.push(ereignis);
  }

  /* Eine Pause ohne Ereignis. Sie steht zwischen zwei Wesen der Brut:
     Ohne sie ziehen acht Gegner in einem Wimpernschlag, und niemand
     sieht, wer eigentlich was getan hat. */
  function pause(dauer) {
    reihe.push({ art: "pause", dauer });
  }

  function beschaeftigt() {
    return laufend !== null || reihe.length > 0;
  }

  /* ── Ein Ereignis beginnen ──────────────────────────────────────*/

  function beginne(ereignis, zustand) {
    /* Nicht jedes Ereignis ist ein Satz wert: `apGesetzt` käme nach
       jeder einzelnen Aktion und schöbe alles Lesenswerte aus dem
       Lauftext heraus. */
    if (beiSatz && !STILLE_EREIGNISSE.has(ereignis.art)) beiSatz(satzVon(zustand, ereignis));
    const wesen = wesenMitId(zustand, ereignis.wer);

    switch (ereignis.art) {
      case "pause":
        return { dauer: ereignis.dauer, tue: null };

      case "bewegt": {
        const pfad = Array.isArray(ereignis.pfad) ? ereignis.pfad : [];
        if (pfad.length < 2) return null;
        return { dauer: (pfad.length - 1) * TEMPO.feld, pfad, wer: ereignis.wer };
      }

      case "gestossen":
        return strecke(ereignis, TEMPO.stoss);

      case "gestuerzt": {
        const lauf = strecke(ereignis, TEMPO.sturz);
        /* Der Staubring beim Aufschlag - das einzige Bild, das einen
           Sturz von einem Schritt hinab unterscheidet. Er wird am
           **Ende** der Strecke geworfen, nicht am Anfang. */
        lauf.landung = true;
        return lauf;
      }

      case "schaden": {
        if (wesen) {
          const art = ereignis.art2 === "hieb" || ereignis.art2 === "stich"
            ? (ruestungVon(wesen) > 0 ? "funken" : "blut")
            : (SCHADEN_TEILCHEN[ereignis.art2] || "staub");
          const zusatz = ereignis.art2 === "gift"
            ? { farben: SCHLEIM_RAMPE, leuchtet: true } : {};
          wirf(art, wesen.x, wesen.y, zusatz);
          zahlen.push({ text: `-${ereignis.wieviel}`, x: wesen.x, y: wesen.y, alter: 0,
            farbe: ereignis.art2 === "sturz" ? FARBEN.hudWarn : FARBEN.hudSchlecht });
          ruettle(Math.min(3, 1 + ereignis.wieviel / 8), 0.16);
        }
        return { dauer: TEMPO.ruhe };
      }

      case "gestorben":
        wirf("blut", ereignis.x, ereignis.y, { anzahl: 18 });
        wirf("rauch", ereignis.x, ereignis.y);
        anzeige.set(ereignis.wer, { x: ereignis.x, y: ereignis.y, lebt: true });
        return { dauer: TEMPO.tod, stirbt: ereignis.wer };

      case "hindernisWeg":
        wirf("splitter", ereignis.x, ereignis.y);
        return { dauer: TEMPO.ruhe };

      /* Eine Fackel geht an oder aus. `runtime/zeichnen.js` holt die
         Quellen nur, wenn die **Karte** wechselt - hier wechselt nur
         ihr Inhalt, also muss es an dieser Stelle geschehen. */
      case "lichtNeu":
      case "lichtWeg":
        if (lichtwerk) lichtwerk.setzeQuellen(zustand.karte.lichter || []);
        return { dauer: TEMPO.ruhe };

      case "beute":
        if (wesen) wirf("zauberstaub", wesen.x, wesen.y, { anzahl: 6 });
        return { dauer: TEMPO.ruhe };

      /* Ein Fehlschlag bekommt eine kurze Ruhe, damit der Satz im
         Lauftext stehen bleibt; ein Treffer wird ohnehin vom
         Schadensereignis dahinter aufgehalten. */
      case "angriff":
        return { dauer: ereignis.treffer === false ? TEMPO.ruhe : 0 };

      default:
        return { dauer: 0 };
    }
  }

  function strecke(ereignis, dauer) {
    return { dauer, von: ereignis.von, nach: ereignis.nach, wer: ereignis.wer };
  }

  /* ── Ein Schritt der Uhr ────────────────────────────────────────*/

  function schritt(dt, zustand) {
    for (const zahl of zahlen) zahl.alter += dt;
    while (zahlen.length > 0 && zahlen[0].alter > ZAHL_STEIGT) zahlen.shift();

    let rest = dt;
    let wachen = 0;
    while (rest > 0 && wachen < 64) {
      wachen++;
      if (!laufend) {
        if (reihe.length === 0) break;
        const ereignis = reihe.shift();
        laufend = beginne(ereignis, zustand);
        if (!laufend) continue;
        laufend.alter = 0;
        bewege(zustand, 0);
      }
      const uebrig = laufend.dauer - laufend.alter;
      const nimm = Math.min(rest, uebrig);
      laufend.alter += nimm;
      rest -= nimm;
      bewege(zustand, laufend.alter);
      if (laufend.alter >= laufend.dauer) {
        if (laufend.wer !== undefined) anzeige.delete(laufend.wer);
        if (laufend.stirbt !== undefined) anzeige.delete(laufend.stirbt);
        if (laufend.landung) {
          wirf("staub", laufend.nach.x, laufend.nach.y);
          ruettle(3, 0.2);
        }
        laufend = null;
      }
    }
    return beschaeftigt();
  }

  /* Wo die Figur zum Zeitpunkt `alter` zu sehen ist. Zwischenwerte
     dürfen Bruchzahlen sein — gerundet wird erst beim Zeichnen, und
     zwar in `runtime/zeichnen.js`, damit es genau eine Stelle gibt. */
  function bewege(zustand, alter) {
    if (!laufend) return;
    if (laufend.pfad) {
      const anteil = laufend.dauer > 0 ? alter / laufend.dauer : 1;
      const stelle = Math.min(laufend.pfad.length - 1.0001,
        anteil * (laufend.pfad.length - 1));
      const i = Math.floor(stelle);
      const teil = stelle - i;
      const a = laufend.pfad[i];
      const b = laufend.pfad[Math.min(i + 1, laufend.pfad.length - 1)];
      anzeige.set(laufend.wer, { x: a.x + (b.x - a.x) * teil, y: a.y + (b.y - a.y) * teil });
      blicke.set(laufend.wer, richtungAus(b.x - a.x, b.y - a.y));
      return;
    }
    if (laufend.von && laufend.nach) {
      const anteil = laufend.dauer > 0 ? Math.min(1, alter / laufend.dauer) : 1;
      const x = laufend.von.x + (laufend.nach.x - laufend.von.x) * anteil;
      const y = laufend.von.y + (laufend.nach.y - laufend.von.y) * anteil;
      anzeige.set(laufend.wer, { x, y });
      blicke.set(laufend.wer,
        richtungAus(laufend.nach.x - laufend.von.x, laufend.nach.y - laufend.von.y));
    }
  }

  /* Der Spielstand fürs Auge: dieselben Felder, nur die Wesen an den
     Stellen, an denen sie **gerade** zu sehen sind. Es wird kopiert und
     nicht geschrieben — `runtime/` fasst den Spielstand nicht an. */
  function schau(zustand) {
    if (anzeige.size === 0 && blicke.size === 0) return zustand;
    const liste = [];
    const nachId = new Map();
    for (const wesen of zustand.wesen) {
      const stelle = anzeige.get(wesen.id);
      const blick = blicke.get(wesen.id);
      let sichtbar = wesen;
      if (stelle || blick !== undefined) {
        sichtbar = { ...wesen };
        if (stelle) {
          sichtbar.x = stelle.x;
          sichtbar.y = stelle.y;
          if (stelle.lebt !== undefined) sichtbar.lebt = stelle.lebt;
        }
        if (blick !== undefined) sichtbar.blick = blick;
      }
      liste.push(sichtbar);
      nachId.set(wesen.id, sichtbar);
    }
    return { ...zustand, wesen: liste, nachId };
  }

  return {
    lege, pause, schritt, beschaeftigt, schau,
    zahlen: () => zahlen,
    laenge: () => reihe.length,
    leere() { reihe.length = 0; laufend = null; anzeige.clear(); zahlen.length = 0; }
  };
}
