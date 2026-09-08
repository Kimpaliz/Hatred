/* [Aufgabe: Werkzeug] Die Brücke zwischen diesem Spiel und dem Skill
   `pixel-werkstatt`: schreibt je Sprite eine `auftrag.json`, wie sie
   `pruefe-sprite.mjs` und `artboard.mjs` dort lesen.

   ── Warum es diese Übersetzung überhaupt braucht ───────────────────

   Der Skill rechnet mit **Hexfarben**. Dieses Spiel schreibt
   **Farbnamen** aus `runtime/palette.js` — das ist Absicht, denn nur
   so hat der Stil einen einzigen Schalter. Ohne diese Brücke müsste
   jemand die Farben von Hand abschreiben, und dann wäre die Messung
   eine einmalige Sache, die beim nächsten Palettenschritt still
   falsch wird. Mit ihr ist sie ein Befehl.

   ── Warum die echten Untergründe und nicht Weiß ────────────────────

   Der Skill misst den Kontrast gegen Untergründe, die im Auftrag
   stehen. Gegen Weiß gemessen bestünde jedes Sprite dieses Spiels —
   und keine der Zahlen sagte etwas darüber, ob man die Figur auf dem
   Kerkerboden sieht. Eingetragen werden deshalb genau die drei Böden,
   auf denen im Spiel wirklich gestanden wird: Stein auf Ebene 1,
   Platte auf Ebene 2, Erde im Graben. Sie kommen aus `bodenTon()`
   selbst, nicht aus abgeschriebenen Zahlen.

   ── Warum Helden viermal geschrieben werden ────────────────────────

   `@hell`/`@mittel`/`@dunkel` sind erst beim Zeichnen eine Farbe. Ein
   Auftrag trägt aber **eine** Palette, nicht vier. Ein Held bekommt
   deshalb vier Auftragsdateien, eine je Spielerfarbe — sonst wäre nur
   der erste Spieler gemessen, und die Wertetrennung des vierten
   könnte reißen, ohne dass es jemand merkt.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `runtime/sprite-daten.js` (die Raster und `SPIELER_FARBEN`),
   `runtime/sprites.js` (`farbeFuer`), `runtime/palette.js`
   (`bodenTon`), `spiel/gitter.mjs` (`BODEN`), und
   `tests/pruefe-sprites.mjs`, das die Tabelle `MERKMAL` von hier
   liest, damit es sie nicht ein zweites Mal gibt. Gelesen wird das
   Ergebnis von `pruefe-sprite.mjs` im Skill `pixel-werkstatt`.

   Aufruf:
     node werkzeuge/werkstatt-auftrag.mjs [--nach <ordner>] [nur-diese-art]
*/

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { BODEN } from "../spiel/gitter.mjs";
import { bodenTon } from "../runtime/palette.js";
import * as DATEN from "../runtime/sprite-daten.js";
import { farbeFuer, bildAnzahl, bildVon } from "../runtime/sprites.js";

/* Die drei Böden, gegen die gemessen wird. Gerechnet von `bodenTon`,
   nicht abgeschrieben: Wer die Palette verschiebt, verschiebt hier
   mit. */
export const UNTERGRUENDE = [
  bodenTon(BODEN.stein, 1),
  bodenTon(BODEN.platte, 2),
  bodenTon(BODEN.erde, 0)
];

/* ── Die Merkmalstabelle ────────────────────────────────────────────

   Je Art **ein** Zeichen, an dem man sie erkennt, wenn sie gedreht,
   verkleinert und halb im Dunkeln steht. Es muss ein
   **zusammenhängender** Fleck sein: Ein Merkmal aus mehreren Inseln
   verschmilzt beim Verkleinern zu einer, und die Prüfung, die das
   fangen soll, zählt dann eine Insel statt sechs.

   Der Halbsatz hinter jedem Eintrag ist keine Zierde — er ist die
   Begründung, warum ausgerechnet dieses Zeichen die Art trägt. Wer
   ein Sprite umbaut und die Begründung nicht mehr lesen kann, hat das
   Merkmal verloren, nicht nur verschoben. */
export const MERKMAL = {
  "HELDEN_BILDER.spaeher":
    ["g", "die Kapuzenöffnung — das Einzige, was vorn heller ist als der Umhang"],
  "HELDEN_BILDER.schildtraeger":
    ["e", "die Schildkante als Riegel vor ihm; sie sagt, wohin er deckt"],
  "HELDEN_BILDER.flammenpriester":
    ["f", "die Flammenschale; kein anderer Held trägt Feuer vor sich her"],
  "HELDEN_BILDER.grabraeuber":
    ["e", "der Enterhaken abseits der Mitte; er verrät die Drehung sofort"],
  "HELDEN_BILDER.bluthexer": ["b", "die Blutschale, die einzige rote Fläche unter den Helden"],
  "HELDEN_BILDER.bogenschuetzin":
    ["h", "der Bogenrücken, zwei Bildpunkte dick, damit er verkleinert hält"],
  "GEGNER_BILDER.kraetzling":
    ["z", "die Zahnreihe, breiter als der Schädel — seine Beschreibung im Katalog"],
  "GEGNER_BILDER.grubenhund": ["s", "die vorgestreckte Schnauze; blind geboren, also kein Auge"],
  "GEGNER_BILDER.knochendiener": ["s", "der bleiche Schädel, das Hellste an ihm"],
  "GEGNER_BILDER.bogenschinder": ["b", "der Bogenrücken quer vor ihm; danach ist er benannt"],
  "GEGNER_BILDER.kettenwicht": ["c", "die Kette, die schräg nach hinten wegläuft"],
  "GEGNER_BILDER.pechspeier": ["g", "die Gallenblase, aus der er speit"],
  "GEGNER_BILDER.rammbock": ["h", "der Hammerkopf — der Grund, nicht an der Kante zu stehen"],
  "GEGNER_BILDER.dunkelweber":
    ["a", "der glühende Sehschlitz, das Einzige, was aus dem Dunkeln ankommt"],
  "GEGNER_BILDER.aschemagier":
    ["f", "die Flammenkrone vor der Kapuze; was von ihm brennt, brennt weiter"],
  "GEGNER_BILDER.blutvogt": ["s", "die Klinge des Richtschwerts, die weit vor ihm liegt"],
  "DINGE.fass": ["e", "die Eisenreifen samt Riemen — ein Fass ohne sie ist eine Tonne"],
  "DINGE.kiste": ["e", "die Diagonalstrebe; sie liegt schräg und trennt jede Drehung"],
  "DINGE.sarg": ["b", "der bleiche Deckelstein am Kopfende, das immer nach Norden zeigt"],
  "DINGE.altar": ["b", "die Blutrinne vom Nordrand bis in die Schale"],
  "DINGE.saeule": ["g", "die Glanzsichel nach Nordwesten; rund und ohne sie wäre sie drehgleich"],
  "DINGE.truheZu": ["e", "Schloss und Riegel; sie zeigen, wo vorn ist"],
  "DINGE.truheAuf": ["o", "das Gold im offenen Rumpf — der ganze Grund, sie zu öffnen"],
  "DINGE.fackelsockel": ["f", "die Flamme; der Sockel allein wäre ein Stein"],
  "DINGE.gitter": ["g", "der blanke Riegel quer über den Stäben"],
  "DINGE.spiess": ["w", "die weißen Spitzen auf ihrer Leiste — die harte Reihe aus dem Vorbild"],
  "DINGE.treppeHinab": ["a", "die oberste, hellste Stufe; an ihr liest man, dass es hinabgeht"],
  "ZEICHEN.zielkreuz": ["w", "der Kranz mit den Armen; der Nordarm ist länger als die anderen"],
  "ZEICHEN.wegpunkt": ["a", "die Raute mit dem Stiel, der auf das Feld zeigt"],
  "ZEICHEN.wachtauge": ["a", "die glühende Iris um die Pupille"],
  "ZEICHEN.ausrufezeichen": ["w", "der Balken; der Punkt darunter ist absichtlich abgesetzt"],
  "ZEICHEN.stosspfeil": ["s", "der Pfeilkörper, der mit der Stoßrichtung gedreht wird"],
  "ZEICHEN.apPunkt":
    ["A", "die volle Scheibe; der Glanz nach Nordwesten trennt sie von ihrer Drehung"],
  "ZEICHEN.sturzpfeil": ["s", "der Pfeil nach unten; ein Sturz geht immer in dieselbe Richtung"]
};

/* Sprites, die absichtlich aus zwei Stücken bestehen. Es ist genau
   eines, und es steht hier mit Grund — nicht als Schalter, den man
   dranmacht, wenn eine Messung stört. Ein Ausrufezeichen ohne Lücke
   ist ein Ausrufestrich. */
export const ZERFAELLT = {
  "ZEICHEN.ausrufezeichen": "der Punkt unter dem Balken ist abgesetzt, sonst wäre es ein Strich"
};

export const VORRAETE = ["HELDEN_BILDER", "GEGNER_BILDER", "DINGE", "ZEICHEN"];

/* Alle Sprites in fester Reihenfolge — feste Reihenfolge, damit zwei
   Läufe dieselben Dateien in derselben Folge schreiben. */
export function alleSprites() {
  const raus = [];
  for (const vorrat of VORRAETE) {
    for (const [schluessel, sprite] of Object.entries(DATEN[vorrat])) {
      raus.push({ voll: `${vorrat}.${schluessel}`, vorrat, schluessel, sprite });
    }
  }
  return raus;
}

/* Ob ein Sprite Spielerfarben trägt. Nur diese bekommen vier
   Auftragsdateien. */
export function traegtSpielerfarben(sprite) {
  return Object.values(sprite.zeichen).some((f) => f.startsWith("@"));
}

/* Palette und Merkmalsindex in **einem** Durchgang: Der Skill zählt
   die Zeichen in der Reihenfolge, in der sie im Objekt stehen, und
   `merkmal` ist genau dieser Zählstand. Getrennt gerechnet liefen die
   beiden auseinander, sobald jemand ein Zeichen einfügt. */
export function machePalette(eintrag, spielerFarbe) {
  const palette = {};
  let merkmalIndex = 0;
  const gesucht = MERKMAL[eintrag.voll]?.[0];
  let gefunden = false;
  let zaehler = 0;
  for (const [zeichen, name] of Object.entries(eintrag.sprite.zeichen)) {
    const hex = farbeFuer(zeichen, eintrag.sprite.zeichen, spielerFarbe);
    if (!hex) throw new Error(`${eintrag.voll}: Zeichen "${zeichen}" ergibt keine Farbe`);
    palette[zeichen] = hex;
    if (zeichen === gesucht) { merkmalIndex = zaehler; gefunden = true; }
    zaehler++;
  }
  if (!gefunden) {
    throw new Error(`${eintrag.voll}: Merkmal "${gesucht}" kommt in der Zeichentabelle nicht vor`);
  }
  return { palette, merkmalIndex };
}

export function macheAuftrag(eintrag, spielerFarbe = null) {
  const { palette, merkmalIndex } = machePalette(eintrag, spielerFarbe);
  const [zeichen, warum] = MERKMAL[eintrag.voll];
  const anzahl = bildAnzahl(eintrag.sprite);
  const blaetter = [];
  for (let n = 0; n < anzahl; n++) {
    const blatt = {
      titel: anzahl === 1 ? eintrag.voll : `${eintrag.voll} — Bild ${n + 1} von ${anzahl}`,
      hinweis: `Merkmal "${zeichen}": ${warum}`,
      zeilen: bildVon(eintrag.sprite, n)
    };
    if (ZERFAELLT[eintrag.voll]) blatt.zerfaellt = true;
    blaetter.push(blatt);
  }
  const notiz = ZERFAELLT[eintrag.voll]
    ? `Zwei Stücke mit Absicht: ${ZERFAELLT[eintrag.voll]}. Liest sich das bei 1:1 noch als ein Zeichen?`
    : `Erkennt man ${eintrag.schluessel} noch am Merkmal "${zeichen}" (${warum}), wenn das Bild ` +
      "gedreht und verkleinert auf dem Kerkerboden steht?";
  return {
    _: "Erzeugt von werkzeuge/werkstatt-auftrag.mjs aus runtime/sprite-daten.js. " +
      "Nicht von Hand ändern — die Quelle ist das Repository, nicht diese Datei.",
    palette,
    untergruende: UNTERGRUENDE,
    merkmal: merkmalIndex,
    notiz,
    blaetter
  };
}

/* Der Dateiname eines Auftrags. Kleingeschrieben und ohne Punkte,
   damit er auf jedem Dateisystem gleich heißt. */
export function dateiname(eintrag, spielerNummer = null) {
  const stamm = eintrag.voll.replace("_BILDER", "").replace(".", "-").toLowerCase();
  return spielerNummer === null ? `${stamm}.json` : `${stamm}-spieler${spielerNummer}.json`;
}

/* Alle Aufträge als Paare {name, auftrag} — ohne zu schreiben, damit
   `tests/pruefe-sprites.mjs` dieselbe Rechnung prüfen kann, ohne
   Dateien anzulegen. */
export function alleAuftraege(nurDiese = null) {
  const raus = [];
  const passt = (e) => !nurDiese
    || e.vorrat.toLowerCase().startsWith(nurDiese.toLowerCase())
    || e.schluessel.toLowerCase() === nurDiese.toLowerCase();
  for (const eintrag of alleSprites()) {
    if (!passt(eintrag)) continue;
    if (traegtSpielerfarben(eintrag.sprite)) {
      DATEN.SPIELER_FARBEN.forEach((farbe, i) => {
        const name = dateiname(eintrag, i + 1);
        raus.push({ name, auftrag: macheAuftrag(eintrag, farbe), eintrag });
      });
    } else {
      raus.push({ name: dateiname(eintrag), auftrag: macheAuftrag(eintrag), eintrag });
    }
  }
  return raus;
}

/* ── Kommandozeile ──────────────────────────────────────────────── */

const HILFE = `Schreibt je Sprite eine auftrag.json für den Skill pixel-werkstatt.

  node werkzeuge/werkstatt-auftrag.mjs [--nach <ordner>] [nur-diese-art]

  --nach <ordner>   wohin geschrieben wird (Vorgabe: der aktuelle Ordner).
                    Nicht ins Projekt schreiben — sonst sieht
                    pruefe-arbeitsweise.mjs die Aufträge als offene Änderung.
  nur-diese-art     "helden", "gegner", "dinge", "zeichen" oder ein
                    einzelner Schlüssel wie "rammbock".

Danach je Datei:
  node <pixel-werkstatt>/werkzeuge/pruefe-sprite.mjs <auftrag>.json`;

if (process.argv[1] && process.argv[1].endsWith("werkstatt-auftrag.mjs")) {
  const argumente = process.argv.slice(2);
  if (argumente.includes("--hilfe")) { console.log(HILFE); process.exit(0); }
  const nachStelle = argumente.indexOf("--nach");
  const ordner = nachStelle >= 0 ? argumente[nachStelle + 1] : ".";
  const rest = argumente.filter((a, i) => a !== "--nach" && i !== nachStelle + 1);
  const nurDiese = rest.find((a) => !a.startsWith("--")) || null;

  mkdirSync(ordner, { recursive: true });
  const auftraege = alleAuftraege(nurDiese);
  for (const { name, auftrag } of auftraege) {
    writeFileSync(join(ordner, name), JSON.stringify(auftrag, null, 2) + "\n", "utf8");
  }
  console.log(`${auftraege.length} Auftrag/Aufträge nach ${ordner} geschrieben.`);
  console.log(`Untergründe: ${UNTERGRUENDE.join("  ")}`);
}
