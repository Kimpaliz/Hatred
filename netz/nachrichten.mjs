/* [Aufgabe: Netz] Das Nachrichtenformat der Sitzung: eine Nachricht ist
   eine Zeile, und beim Empfang wird ihr nichts geglaubt.

   ── Warum es das gibt / Warum so ───────────────────────────────────

   Über die Leitung geht eine **Aktion**, nie ein Zustand
   (`docs/WEGWEISER.md`). Damit das trägt, braucht es genau zwei Dinge:
   eine Form, die durch jede Leitung passt, und eine Prüfung, die eine
   fremde Zeile erst dann für eine Nachricht hält, wenn jedes Stück
   darin nachgerechnet ist.

   **Warum beim Empfang geprüft wird und nicht beim Absender.** Der
   Absender ist ein anderer Rechner. Was von dort kommt, kann
   abgeschnitten sein (halb abgeschickt), verdreht (ein Vermittler, der
   Zeilen zusammenfasst) oder böse gemeint — und diese drei Fälle sehen
   auf der Leitung **gleich** aus. Deshalb gibt es hier keine „von einem
   Freund, also in Ordnung"-Abkürzung: `lies` prüft Art, Anzahl der
   Stücke, Zahlenbereiche und Textlängen, jedes Mal. Eine Prüfung, die
   nur beim Absender läuft, prüft den Einzigen, der ohnehin ehrlich ist.

   **Warum `lies` nicht wirft, `baue` und `schreibe` aber schon.** Ein
   fehlerhafter Text von außen ist der **Normalfall** eines Netzes und
   darf die Sitzung nicht abreißen: Er kommt als `{ok:false, grund}`
   zurück, die Sitzung verwirft die Zeile und spielt weiter. Ein
   fehlerhafter Aufruf im eigenen Haus ist dagegen ein Programmfehler
   und soll laut sein — sonst schickt ein Rechner monatelang
   Nachrichten, die niemand versteht, und niemand merkt es.

   **Warum die Aktion als Aktionstext und nicht als JSON mitreist.**
   `spiel/protokoll.mjs` schreibt sie in einem Dutzend Zeichen und —
   wichtiger — lässt beim Lesen nur die fünf bekannten Felder durch.
   Wer stattdessen JSON nähme, bekäme jedes Feld mit, das ein Bild der
   Aktion angeheftet hat, und würde es anwenden.

   **Warum das freie Textstück immer hinten steht.** Ein Name und ein
   Grund sind Menschentext; ein Aktionstext trägt selbst `|`. Stünde so
   ein Stück in der Mitte, müsste es maskiert werden — und jede
   Maskierung ist eine zweite Stelle, an der zwei Rechner verschieden
   rechnen können. Steht es hinten, ist es „der Rest der Zeile", und es
   gibt nichts zu maskieren.

   **Warum es die Fassungszahl gibt.** Zwei Rechner mit verschiedenen
   Ständen des Spiels rechnen dieselbe Aktion verschieden aus. Das
   fällt sonst erst an der Rundensumme auf — eine Runde später, wenn
   niemand mehr sagen kann, wer recht hatte. Der Beitritt nennt die
   Fassung, und ein Unterschied ist sofort eine verständliche Absage.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `spiel/protokoll.mjs` (schreibt und liest den Aktionstext — die
   Aktion selbst wird hier nicht nachgebaut), `spiel/wesen.mjs`
   (`MAX_SPIELER` — die Vier steht nur dort), `netz/sitzung.mjs` (der
   einzige Aufrufer: baut, schickt, empfängt und verwirft),
   `netz/lobbycode.mjs` (dieselbe Saat, die hier im `willkommen`
   steht), `werkzeuge/pruefe-netz.mjs` (fährt jede Art im Kreis und
   verfälscht sie absichtlich). */

import { schreibeAktion, leseAktion } from "../spiel/protokoll.mjs";
import { MAX_SPIELER } from "../spiel/wesen.mjs";

/* Die Fassung des Formats. Sie steigt, sobald sich an einer Form etwas
   ändert — und dann sagt der Beitritt „andere Fassung" statt später
   die Rundensumme „auseinandergelaufen". */
export const FASSUNG = 1;

/* Die neun Arten. Als benanntes Bündel und nicht als lose
   Zeichenketten: Ein Tippfehler soll „unbekannte Art" heißen und nicht
   eine stumm verworfene Nachricht. */
export const NACHRICHT = {
  beitritt: "beitritt",
  willkommen: "willkommen",
  aktion: "aktion",
  rundenSumme: "rundenSumme",
  entlassen: "entlassen",
  gleichstand: "gleichstand",
  abbruch: "abbruch",
  name: "name",
  herzschlag: "herzschlag"
};

/* Vier Sorten Stück, mehr braucht keine Nachricht:
   `ganz` — eine ganze Zahl in festen Grenzen.
   `aktion` — ein Aktionstext aus `spiel/protokoll.mjs`.
   `name`, `grund` — Menschentext, jeweils mit eigener Höchstlänge. */
export const TEXT_GRENZEN = { name: 24, grund: 300 };

/* Die Grenzen jeder Zahl. Sie stehen hier und nicht in der Sitzung:
   Eine Zahl, die nur der Empfänger prüft, prüft der Empfänger — und
   zwar jeder für sich, mit seiner eigenen Meinung. */
export const GRENZEN = {
  fassung: [1, 999],
  platz: [1, MAX_SPIELER],
  saat: [0, 4294967295],
  spielerZahl: [1, MAX_SPIELER],
  tiefe: [1, 999],
  summe: [0, 4294967295],
  nummer: [0, 1000000000],
  runde: [1, 1000000]
};

/* Je Art ein Buchstabe und die Stücke in fester Ordnung. Das freie
   Stück steht immer zuletzt — Begründung in der Kopfnotiz.

   `entlassen` ist die Antwort des Gastgebers auf eine Absicht, die er
   **nicht** spielt: Der Grund muss zum Absender zurück, und `abbruch`
   wäre dafür die falsche Nachricht — ein verklickter Zug soll keine
   Sitzung beenden. */
export const FORMEN = {
  [NACHRICHT.beitritt]: { kuerzel: "b", felder: [["fassung", "ganz"], ["name", "name"]] },
  [NACHRICHT.willkommen]: {
    kuerzel: "w",
    felder: [["platz", "ganz"], ["saat", "ganz"], ["spielerZahl", "ganz"],
      ["tiefe", "ganz"], ["summe", "ganz"]]
  },
  [NACHRICHT.aktion]: { kuerzel: "a", felder: [["nummer", "ganz"], ["aktion", "aktion"]] },
  [NACHRICHT.rundenSumme]: { kuerzel: "s", felder: [["runde", "ganz"], ["summe", "ganz"]] },
  [NACHRICHT.entlassen]: { kuerzel: "e", felder: [["platz", "ganz"], ["grund", "grund"]] },
  [NACHRICHT.gleichstand]: { kuerzel: "q", felder: [["runde", "ganz"], ["summe", "ganz"]] },
  [NACHRICHT.abbruch]: { kuerzel: "x", felder: [["grund", "grund"]] },
  [NACHRICHT.name]: { kuerzel: "n", felder: [["platz", "ganz"], ["name", "name"]] },
  [NACHRICHT.herzschlag]: { kuerzel: "h", felder: [["nummer", "ganz"]] }
};

const TRENNER = "|";

/* Eine ganze Zeile darf nicht länger sein als das. Der Aktionstext ist
   ein Dutzend Zeichen, der längste Grund dreihundert — was darüber
   liegt, ist keine Nachricht dieses Spiels, sondern etwas, das jemand
   in die Leitung geschoben hat. */
export const ZEILE_HOECHSTENS = 1000;

const ART_NACH_KUERZEL = new Map();
for (const [art, form] of Object.entries(FORMEN)) ART_NACH_KUERZEL.set(form.kuerzel, art);

/* Steuerzeichen haben in einer Zeile nichts verloren — der Umbruch
   zerschnitte die Nachricht in zwei, und die Leitung rahmt nach
   Zeilen. Geprüft wird auf Kodierungspunkte, nicht auf Bytes. */
function hatSteuerzeichen(text) {
  for (const zeichen of text) {
    const wert = zeichen.codePointAt(0);
    if (wert < 0x20 || wert === 0x7f) return true;
  }
  return false;
}

function grenzenVon(feld) {
  const g = GRENZEN[feld];
  if (!g) throw new Error(`nachrichten: für „${feld}" stehen keine Grenzen fest`);
  return g;
}

/* ── Bauen ─────────────────────────────────────────────────────────

   Aus Art und Inhalt eine Nachricht. Was hier durchkommt, lässt sich
   schreiben; was nicht durchkommt, wirft — es ist ein Fehler im
   eigenen Haus, kein Fund auf der Leitung. */
export function baue(art, inhalt = {}) {
  const form = FORMEN[art];
  if (!form) throw new Error(`baue: die Nachricht „${art}" gibt es nicht`);
  if (!inhalt || typeof inhalt !== "object") {
    throw new Error(`baue: „${art}" braucht einen Inhalt`);
  }

  const nachricht = { art };
  for (const [feld, sorte] of form.felder) {
    const wert = inhalt[feld];
    if (sorte === "ganz") {
      const [klein, gross] = grenzenVon(feld);
      if (!Number.isSafeInteger(wert) || wert < klein || wert > gross) {
        throw new Error(`baue: ${art}.${feld} muss ${klein} bis ${gross} sein (${wert})`);
      }
      nachricht[feld] = wert;
      continue;
    }
    if (sorte === "aktion") {
      /* Schreiben und sofort wieder lesen: Damit steht in der
         Nachricht die **Normalform** der Aktion, und ein Feld, das
         jemand angeheftet hat, ist schon hier weg — nicht erst beim
         Empfänger, der es sonst als Unterschied sähe. */
      nachricht[feld] = leseAktion(schreibeAktion(wert));
      continue;
    }
    if (typeof wert !== "string") {
      throw new Error(`baue: ${art}.${feld} muss ein Text sein`);
    }
    const gekuerzt = wert.trim();
    const hoechstens = TEXT_GRENZEN[sorte];
    if (gekuerzt === "" || [...gekuerzt].length > hoechstens || hatSteuerzeichen(gekuerzt)) {
      throw new Error(`baue: ${art}.${feld} muss 1 bis ${hoechstens} Zeichen ohne `
        + "Steuerzeichen haben");
    }
    nachricht[feld] = gekuerzt;
  }
  return nachricht;
}

/* ── Schreiben ─────────────────────────────────────────────────────*/

export function schreibe(nachricht) {
  if (!nachricht || typeof nachricht !== "object") {
    throw new Error("schreibe: das ist keine Nachricht");
  }
  const form = FORMEN[nachricht.art];
  if (!form) throw new Error(`schreibe: die Nachricht „${nachricht.art}" gibt es nicht`);

  /* Noch einmal durch `baue`: Eine von Hand zusammengesteckte
     Nachricht soll dieselbe Zeile ergeben wie eine gebaute. Sonst
     hätte das Format zwei Wahrheiten, und der Rundlauf in der Prüfung
     vergliche nichts. */
  const geprueft = baue(nachricht.art, nachricht);
  const stuecke = [form.kuerzel];
  for (const [feld, sorte] of form.felder) {
    const wert = geprueft[feld];
    stuecke.push(sorte === "aktion" ? schreibeAktion(wert) : String(wert));
  }
  const zeile = stuecke.join(TRENNER);
  if ([...zeile].length > ZEILE_HOECHSTENS) {
    throw new Error(`schreibe: die Zeile ist länger als ${ZEILE_HOECHSTENS} Zeichen`);
  }
  return zeile;
}

/* ── Lesen ─────────────────────────────────────────────────────────

   Die einzige Stelle, an der eine fremde Zeile zu einer Nachricht
   wird. Sie wirft nie: Jeder Fund kommt als Grund zurück, damit die
   Sitzung ihn hinschreiben und weiterspielen kann. */
function schlecht(grund) { return { ok: false, grund }; }

function leseGanz(feld, text) {
  if (!/^(0|-?[1-9]\d*)$/.test(text)) {
    return { grund: `${feld} ist keine ganze Zahl („${text}")` };
  }
  const zahl = Number(text);
  const [klein, gross] = grenzenVon(feld);
  if (!Number.isSafeInteger(zahl) || zahl < klein || zahl > gross) {
    return { grund: `${feld} liegt außerhalb von ${klein} bis ${gross} (${text})` };
  }
  return { wert: zahl };
}

function leseText(feld, sorte, text) {
  const hoechstens = TEXT_GRENZEN[sorte];
  const zeichen = [...text];
  if (zeichen.length === 0) return { grund: `${feld} ist leer` };
  if (zeichen.length > hoechstens) {
    return { grund: `${feld} ist länger als ${hoechstens} Zeichen (${zeichen.length})` };
  }
  if (hatSteuerzeichen(text)) return { grund: `${feld} trägt ein Steuerzeichen` };
  /* Kein Rand aus Leerzeichen: `baue` kürzt ihn weg, also gäbe es
     sonst zwei Zeilen für dieselbe Nachricht — und die Aussage
     „schreibe(lies(t)) === t" wäre keine mehr. */
  if (text !== text.trim()) return { grund: `${feld} beginnt oder endet mit Leerraum` };
  return { wert: text };
}

export function lies(text) {
  if (typeof text !== "string") return schlecht("Das ist kein Text.");
  if (text === "") return schlecht("Eine leere Zeile ist keine Nachricht.");
  if ([...text].length > ZEILE_HOECHSTENS) {
    return schlecht(`Die Zeile ist länger als ${ZEILE_HOECHSTENS} Zeichen.`);
  }
  if (hatSteuerzeichen(text)) return schlecht("Die Zeile trägt ein Steuerzeichen.");

  const stuecke = text.split(TRENNER);
  const art = ART_NACH_KUERZEL.get(stuecke[0]);
  if (!art) return schlecht(`Unbekannte Nachrichtenart „${stuecke[0]}".`);
  const form = FORMEN[art];
  const anzahl = form.felder.length;
  const letzteSorte = form.felder[anzahl - 1][1];
  const frei = letzteSorte !== "ganz";

  if (stuecke.length < anzahl + 1) {
    return schlecht(`„${art}" braucht ${anzahl} Stück(e), gekommen sind ${stuecke.length - 1}.`);
  }
  if (!frei && stuecke.length > anzahl + 1) {
    return schlecht(`„${art}" trägt ${stuecke.length - 1} Stücke statt ${anzahl}.`);
  }

  const nachricht = { art };
  for (let i = 0; i < anzahl; i++) {
    const [feld, sorte] = form.felder[i];
    /* Das letzte freie Stück ist der ganze Rest — der Aktionstext
       trägt selbst Trenner, und ein Grund darf einen tragen. */
    const roh = (frei && i === anzahl - 1)
      ? stuecke.slice(i + 1).join(TRENNER)
      : stuecke[i + 1];

    if (sorte === "ganz") {
      const gelesen = leseGanz(feld, roh);
      if (gelesen.grund) return schlecht(`„${art}": ${gelesen.grund}.`);
      nachricht[feld] = gelesen.wert;
      continue;
    }
    if (sorte === "aktion") {
      let aktion;
      try {
        aktion = leseAktion(roh);
      } catch (fund) {
        return schlecht(`„${art}": die Aktion ist unlesbar — ${fund.message}`);
      }
      /* Zurückgeschrieben muss derselbe Text herauskommen.
         `spiel/protokoll.mjs` liest „n02:8" und „n2:8" als dasselbe
         Feld (gemessen am 06.09.2026: `leseGanzeZahl` erlaubt führende
         Nullen). Beide Rechner rechnen damit zwar gleich, aber **eine**
         Aktion hätte zwei Zeilen — und das nimmt jedem Vergleich
         zweier Nachrichten den Boden. Eine Zeile, die nicht in ihrer
         Normalform steht, hat kein ehrlicher Absender gebaut. */
      const zurueck = schreibeAktion(aktion);
      if (zurueck !== roh) {
        return schlecht(`„${art}": die Aktion steht nicht in ihrer Normalform `
          + `(„${roh}" statt „${zurueck}").`);
      }
      nachricht[feld] = aktion;
      continue;
    }
    const gelesen = leseText(feld, sorte, roh);
    if (gelesen.grund) return schlecht(`„${art}": ${gelesen.grund}.`);
    nachricht[feld] = gelesen.wert;
  }
  return { ok: true, nachricht };
}
