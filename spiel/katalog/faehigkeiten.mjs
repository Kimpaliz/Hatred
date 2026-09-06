/* [Aufgabe: Regelkern] Die zwölf Fähigkeiten — Zettel mit Wirkungen,
   nicht Code.

   ── Warum es das gibt / Warum so ───────────────────────────────────

   Eine Fähigkeit sagt hier **was** geschehen soll (`wirkung.art`) und
   mit welchen Zahlen — nie **wie**. Das Wie steht einmal in
   `spiel/kampf.mjs` und `spiel/zuege.mjs`. Der Grund ist derselbe wie
   bei den Waffen: Über die Leitung geht nur „Wesen 3 wirkt
   `wuchtstoss` auf Feld (12, 8)", und alle vier Rechner müssen daraus
   dieselben Ereignisse ableiten. Läge in jeder Fähigkeit ein Stück
   eigene Rechnung, gäbe es zwölf Stellen, die auseinanderlaufen
   können. `wirkung` ist deshalb ein flaches Objekt aus Zahlen und
   Zeichenketten — es überlebt `JSON.stringify` und einen
   Speicherstand unverändert.

   **Warum `sprung` das Herz dieser Liste ist.** Ohne sie gehört das
   Hochplateau den Gegnern: Hinauf kommt man nur über eine Rampe, und
   Rampen legt die Landschaft, nicht der Spieler. `satzsprung` ist die
   eine Fähigkeit, die eine Ebene ohne Rampe hinaufträgt — sie kostet
   drei Punkte und muss zwei Runden abkühlen, damit sie eine
   Entscheidung bleibt und keine zweite Art zu gehen wird.

   **Warum es Abklingzeiten gibt und nicht nur Preise.** Ein reiner
   AP-Preis macht jede Runde gleich: Man nimmt immer die beste
   Fähigkeit, bis die Punkte alle sind. Mit `abklingen` wird aus der
   Reihenfolge eine Frage — jetzt schieben oder aufheben, bis er am
   Abgrund steht.

   **Warum `reichweite: 0` vorkommt.** Null heißt „auf sich selbst",
   nicht „nirgendwohin". Diese Fähigkeiten tragen zusätzlich
   `wirkung.aufSich = true`, damit kein Aufrufer die Null als Fehler
   liest oder als Feldabstand missversteht;
   `werkzeuge/pruefe-katalog.mjs` besteht darauf, dass beides
   zusammen auftritt.

   **Warum die Schadenszahlen fest sind und nicht gewürfelt.** Eine
   Waffe soll streuen — daraus entsteht Spannung. Eine Fähigkeit mit
   vier Runden Abklingzeit soll das nicht: Wer sie einsetzt, plant mit
   ihr, und ein Fehlschlag alle vier Runden ärgert, statt zu spannen.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `spiel/katalog/helden.mjs` und `spiel/katalog/gegner.mjs` (nennen
   Schlüssel von hier), `spiel/kampf.mjs` (setzt `schaden`, `brennen`,
   `stossen`, `ziehen` um), `spiel/hoehen.mjs` (`sprung` und `stossen`
   fragen dieselben Höhenregeln), `spiel/licht.mjs` (`licht` legt ein
   Licht, dessen Art in `runtime/palette.js` stehen muss),
   `werkzeuge/pruefe-katalog.mjs`. Kennt selbst niemanden. */

/* Die Wirkungsarten. Als Liste, damit die Prüfung gegen etwas
   vergleichen kann und ein Tippfehler nicht stumm zu einer Fähigkeit
   wird, die nichts tut. */
export const WIRKUNGSARTEN = [
  "schaden",        /* fester Schaden auf ein Ziel                    */
  "heilen",         /* Lebenspunkte zurück                            */
  "stossen",        /* ein Feld weg; über eine Kante ein Sturz        */
  "ziehen",         /* zu sich her; über eine Kante ein Sturz         */
  "verlangsamen",   /* weniger Aktionspunkte für einige Runden        */
  "licht",          /* legt ein Licht auf ein Feld                    */
  "brennen",        /* Schaden je Zugbeginn, mehrere Runden           */
  "schild",         /* Rüstung obendrauf, einige Runden               */
  "sprung",         /* eine Ebene hinauf **ohne** Rampe               */
  "sicht",          /* mehr Sichtweite, einige Runden                 */
  "oeffnen",        /* macht ein Hindernis auf, ohne es zu zerstören  */
  "verbergen"       /* gilt als verborgen, auch im Hellen             */
];

/* Feste Reihenfolge; angehängt wird **unten** (Fehlerbuch B2). */
export const FAEHIGKEITEN = [
  {
    schluessel: "satzsprung",
    name: "Satzsprung",
    zier: "Anlauf, Absprung, Kante — wer zögert, hängt an den Fingern.",
    ap: 3,
    abklingen: 2,
    reichweite: 2,
    wirkung: { art: "sprung", ebenen: 1, felder: 2 }
  },
  {
    schluessel: "weitblick",
    name: "Weitblick",
    zier: "Ein Lidschlag lang reicht das Auge weiter, als die Fackel trägt.",
    ap: 1,
    abklingen: 3,
    reichweite: 0,
    wirkung: { art: "sicht", aufSich: true, zusatz: 4, runden: 2 }
  },
  {
    schluessel: "wuchtstoss",
    name: "Wuchtstoß",
    zier: "Die Schulter voran — und der Kerker hat drei Ebenen unter dir.",
    ap: 2,
    abklingen: 1,
    reichweite: 1,
    wirkung: { art: "stossen", felder: 1 }
  },
  {
    schluessel: "schildwall",
    name: "Schildwall",
    zier: "Der Schild geht runter, die Knie gehen tief, nichts geht weiter.",
    ap: 2,
    abklingen: 4,
    reichweite: 0,
    wirkung: { art: "schild", aufSich: true, ruestung: 3, runden: 2 }
  },
  {
    schluessel: "flammenruf",
    name: "Flammenruf",
    zier: "Ein Wort, und auf dem kalten Stein steht eine Flamme ohne Docht.",
    ap: 2,
    abklingen: 2,
    reichweite: 5,
    wirkung: { art: "licht", lichtArt: "fackel", staerke: 1, runden: 6 }
  },
  {
    schluessel: "brandmal",
    name: "Brandmal",
    zier: "Ein Zeichen auf fremder Haut, das von innen heraus weiterbrennt.",
    ap: 3,
    abklingen: 3,
    reichweite: 5,
    wirkung: { art: "brennen", wieviel: 3, runden: 3, schadensart: "feuer" }
  },
  {
    schluessel: "grabgriff",
    name: "Grabgriff",
    zier: "Zwei Finger im Schloss, ein Knacken — und der Sarg gibt her.",
    ap: 1,
    abklingen: 1,
    reichweite: 1,
    wirkung: { art: "oeffnen", was: "truhe" }
  },
  {
    schluessel: "schattenschritt",
    name: "Schattenschritt",
    zier: "Man tritt dorthin, wo das Licht gerade nicht hinschaut.",
    ap: 2,
    abklingen: 3,
    reichweite: 0,
    wirkung: { art: "verbergen", aufSich: true, runden: 2 }
  },
  {
    schluessel: "blutzoll",
    name: "Blutzoll",
    zier: "Er zahlt aus der eigenen Ader — und die Rechnung geht an dich.",
    ap: 2,
    abklingen: 1,
    reichweite: 4,
    wirkung: { art: "schaden", wieviel: 9, schadensart: "arkan", eigenerVerlust: 4 }
  },
  {
    schluessel: "blutbund",
    name: "Blutbund",
    zier: "Deine Wunde wird seine. Man sollte ihn nicht zu oft darum bitten.",
    ap: 2,
    abklingen: 2,
    reichweite: 3,
    wirkung: { art: "heilen", wieviel: 8, eigenerVerlust: 4 }
  },
  {
    schluessel: "hakenkette",
    name: "Hakenkette",
    zier: "Der Haken sitzt, die Kette strafft — und das Podest ist plötzlich leer.",
    ap: 3,
    abklingen: 2,
    reichweite: 5,
    wirkung: { art: "ziehen", felder: 2 }
  },
  {
    schluessel: "pechfessel",
    name: "Pechfessel",
    zier: "Kaltes Pech über die Stiefel; jeder Schritt kostet nun zwei.",
    ap: 2,
    abklingen: 3,
    reichweite: 4,
    wirkung: { art: "verlangsamen", apAbzug: 2, runden: 2 }
  }
];

const NACH_SCHLUESSEL = new Map(FAEHIGKEITEN.map((f) => [f.schluessel, f]));

/* Wirft bei unbekanntem Schlüssel — siehe `waffen.mjs`: Ein Tippfehler
   in einer Heldenvorlage soll beim Nachschlagen auffallen, nicht erst
   dann, wenn im Kampf `undefined.ap` gelesen wird. */
export function faehigkeit(schluessel) {
  const f = NACH_SCHLUESSEL.get(schluessel);
  if (!f) throw new Error(`Unbekannte Fähigkeit: "${schluessel}"`);
  return f;
}

export function kenntFaehigkeit(schluessel) {
  return NACH_SCHLUESSEL.has(schluessel);
}

/* Aus einer Schlüsselliste die Vorlagen, in genau der Reihenfolge der
   Liste — die Reihenfolge ist die der Vorlage und damit auf jedem
   Rechner dieselbe. */
export function faehigkeitenVon(schluessel) {
  return schluessel.map((s) => faehigkeit(s));
}

export function faehigkeitenNachArt(art) {
  return FAEHIGKEITEN.filter((f) => f.wirkung.art === art);
}
