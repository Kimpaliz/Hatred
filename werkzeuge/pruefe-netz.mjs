/* [Aufgabe: Prüfwesen] Zwei vollständige Spielstände in einem Prozess,
   über eine Leitung verbunden — und dreißig Runden lang derselbe Lauf.

   ── Warum es das gibt / Warum so ───────────────────────────────────

   Das Netz ist die einzige Stelle dieses Spiels, an der ein Fehler
   nicht sofort auffällt. Ein falsch gezeichneter Schatten sieht falsch
   aus; zwei Rechner, die sich in Runde sieben trennen, spielen
   fröhlich weiter — bis einer eine Leiche angreift, die beim anderen
   noch steht. Deshalb wird hier nicht die Schnittstelle abgeklopft,
   sondern **ein Spiel zu zweit gespielt**: ein Gastgeber, ein Gast,
   zwei getrennte Zustände, und alles zwischen ihnen geht durch
   `netz/nachrichten.mjs`.

   **Geprüft wird der Fall, der ohne die Arbeit falsch wäre.** Dass
   zwei frisch gebaute Läufe mit derselben Saat gleich anfangen, gewinnt
   ohnehin (das beweist `werkzeuge/pruefe-lauf.mjs`). Diese Datei prüft:

   · dass die Prüfzahl nach **jeder** Runde in beiden Zuständen
     dieselbe ist — und, als Gegenprobe, dass ein absichtlich
     verfälschter Zustand beim Gast **erkannt** wird. Ohne die
     Gegenprobe könnte die Summe eine Zahl sein, die immer stimmt.
   · dass eine verfälschte Zeile verworfen wird und **nichts** ändert.
     Ein halb abgeschickter Datensatz sieht aus wie Bosheit; beide
     müssen an derselben Wand enden.
   · dass eine Aktion, die beim Gastgeber unzulässig ist, abgelehnt
     wird — und der Absender den Grund als deutschen Satz bekommt,
     statt in eine Sitzung zu laufen, die abbricht.
   · dass Nachrichten in falscher Reihenfolge **gepuffert** werden.
     Aktionen sind nicht vertauschbar: Wer 7 vor 6 anwendet, würfelt in
     anderer Reihenfolge und hat danach ein anderes Spiel.
   · dass `leseCode` jeden Tippfehler in einem Zeichen fängt. Ein Code,
     der falsch gelesen wird, führt zwei Freunde in zwei Kerker — und
     das merkt sonst erst die Rundensumme.

   **Warum eine Leitung aus zwei Funktionen und kein echtes Netz.** Ein
   echter Anschluss brächte Zeit, Warteschlangen und Zufall in eine
   Prüfung, die genau das nicht will. Die Leitung hier ist eine Liste:
   Sie stellt zu, wenn man es sagt, sie hält an, wenn man es sagt, und
   sie verdreht, wenn man es sagt. Damit wird der Fehlerfall
   **herstellbar** statt abgewartet.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `netz/nachrichten.mjs`, `netz/lobbycode.mjs` und `netz/sitzung.mjs`
   (das Geprüfte), `spiel/lauf.mjs` (`macheLauf`, `zustandsSumme`),
   `spiel/aktionen.mjs` und `spiel/zug.mjs` (das Vorgehen der beiden
   Seiten), `spiel/gegner-ki.mjs` und `spiel/wegfindung.mjs` (was die
   Brut und die Jäger tun), `werkzeuge/helfer.mjs` (das Prüfgerüst),
   `werkzeuge/pruefe-alles.mjs` (startet diese Datei als eigenen
   Prozess). */

import { abschnitt, behaupte, gleich, wirft, ende } from "./helfer.mjs";
import { macheZufall } from "../spiel/zufall.mjs";
import { AKTION, pruefeAktion } from "../spiel/aktionen.mjs";
import { macheLauf, zustandsSumme } from "../spiel/lauf.mjs";
import { amZugWesen, SEITE_JAEGER } from "../spiel/zug.mjs";
import { planeZug } from "../spiel/gegner-ki.mjs";
import { wegSuche } from "../spiel/wegfindung.mjs";
import { BODEN } from "../spiel/gitter.mjs";
import { schreibeAktion } from "../spiel/protokoll.mjs";
import {
  NACHRICHT, FASSUNG, FORMEN, GRENZEN, ZEILE_HOECHSTENS, baue, schreibe, lies
} from "../netz/nachrichten.mjs";
import {
  ZEICHEN, BASIS, LAENGE, SAAT_HOECHSTENS, HAFEN_ERSTER, HAFEN_ANZAHL,
  GEGENSTUECK_ACHT, macheCode, leseCode
} from "../netz/lobbycode.mjs";
import { macheSitzung, GASTGEBER_PLATZ, OHNE_PLATZ } from "../netz/sitzung.mjs";

/* Die Saat des langen Laufes. Sie ist **gemessen** und nicht geraten:
   Mit ihr überstehen bei zwei Spielern beide Jäger dreißig Runden, und
   es wird gekämpft, getrunken, gestoßen und gezaubert (die Zahlen
   stehen unten in der Meldung). Ein Lauf, in dem der Gast in Runde
   vier stirbt, schickte danach keine Absicht mehr — und der Gleichlauf
   wäre über ein Standbild bewiesen. */
const LAUF_SAAT = 5;
const LAUF_SPIELER = 2;
const LAUF_RUNDEN = 30;

/* Wie viele Runden mindestens zustande kommen müssen, damit der
   Gleichlauf über etwas geprüft ist. Gemessen am 06.09.2026: 17. */
const MINDEST_RUNDEN = 12;

/* Wie viele Codes vertippt werden. Die Zahl steht im Auftrag. */
const CODE_PROBEN = 2000;

const WEM_GASTGEBER = "gastgeber";
const WEM_GAST = "gast";

/* ══ 1. Die Nachrichten ════════════════════════════════════════════ */

/* Eine Beispielnachricht je Art. Sie decken die drei Sorten Stück ab:
   Zahlen, Aktionstext und Menschentext — und beim Grund ausdrücklich
   einen, der selbst einen Trenner trägt. */
const PROBE_AKTION = { typ: AKTION.faehigkeit, wer: 3, ziel: null, schluessel: "blutzoll" };
const PROBEN = [
  [NACHRICHT.beitritt, { fassung: FASSUNG, name: "Jannik" }],
  [NACHRICHT.willkommen, { platz: 2, saat: 4294967295, spielerZahl: 4, tiefe: 7, summe: 0 }],
  [NACHRICHT.aktion, { nummer: 0, aktion: { typ: AKTION.gehen, wer: 1, nach: { x: 12, y: 8 } } }],
  [NACHRICHT.aktion, { nummer: 41, aktion: PROBE_AKTION }],
  [NACHRICHT.rundenSumme, { runde: 12, summe: 123456789 }],
  [NACHRICHT.entlassen, { platz: 3, grund: "Dafür fehlen Aktionspunkte: 4 nötig, 1 übrig." }],
  [NACHRICHT.gleichstand, { runde: 1, summe: 7 }],
  [NACHRICHT.abbruch, { grund: "Runde 3 ist auseinandergelaufen | hier 12, dort 13." }],
  [NACHRICHT.name, { platz: 4, name: "Rübezahl" }],
  [NACHRICHT.herzschlag, { nummer: 1000000000 }]
];

{
  abschnitt("Nachrichten — Rundlauf");

  gleich(Object.keys(FORMEN).length, 9, "es gibt neun Nachrichtenarten");
  const kuerzel = new Set(Object.values(FORMEN).map((f) => f.kuerzel));
  gleich(kuerzel.size, 9, "jede Art hat ihr eigenes Kürzel");

  const gesehen = new Set();
  for (const [art, inhalt] of PROBEN) {
    gesehen.add(art);
    const gebaut = baue(art, inhalt);
    const text = schreibe(gebaut);
    const gelesen = lies(text);
    behaupte(gelesen.ok, `${art}: lässt sich wieder lesen (${gelesen.grund || text})`);
    if (!gelesen.ok) continue;
    /* Der Rundlauf muss **zeichengleich** sein. Wäre er nur „ungefähr
       gleich", schrieben zwei Rechner dieselbe Nachricht verschieden
       und jeder Vergleich in dieser Datei wäre eine Zufallsfrage. */
    gleich(schreibe(gelesen.nachricht), text, `${art}: schreibe(lies(t)) ist wieder t`);
    gleich(gelesen.nachricht.art, art, `${art}: die Art kommt heil an`);
  }
  gleich(gesehen.size, 9, "jede der neun Arten war im Rundlauf");

  /* Der Fall, der ohne diese Zeile durchrutschte: Der Aktionstext
     trägt selbst den Trenner. Steht er nicht zuletzt, geht er kaputt. */
  const mitTrenner = schreibe(baue(NACHRICHT.aktion, {
    nummer: 3, aktion: { typ: AKTION.gehen, wer: 2, nach: { x: 5, y: 9 } }
  }));
  behaupte(mitTrenner.split("|").length > 3, `der Aktionstext trägt Trenner (${mitTrenner})`);
  const zurueck = lies(mitTrenner);
  behaupte(zurueck.ok && zurueck.nachricht.aktion.nach.x === 5,
    "eine Aktion mit Trennern im Text kommt heil zurück");

  /* Und dasselbe für den Menschentext: Ein Grund mit Trenner darin darf
     die Nachricht nicht zerreißen. */
  const grundText = schreibe(baue(NACHRICHT.abbruch, { grund: "a | b | c" }));
  const grundZurueck = lies(grundText);
  behaupte(grundZurueck.ok && grundZurueck.nachricht.grund === "a | b | c",
    "ein Grund mit Trennern kommt heil zurück");
}

{
  abschnitt("Nachrichten — was beim Empfang abprallt");

  /* Jede dieser Zeilen ist die Sorte, die eine halb abgeschickte oder
     böse Gegenseite schickt. Keine darf durchkommen, und keine darf
     werfen. */
  const schlechteZeilen = [
    ["", "die leere Zeile"],
    ["y|1|2", "ein Kürzel, das es nicht gibt"],
    ["a", "eine Aktion ohne jedes Stück"],
    ["a|7", "eine Aktion ohne Aktionstext"],
    ["a|7|z", "eine Aktion mit unlesbarem Aktionstext"],
    ["a|sieben|g|w1", "eine Nummer, die keine Zahl ist"],
    ["a|-1|g|w1", "eine Nummer unter null"],
    ["a|1000000001|g|w1", "eine Nummer über der Grenze"],
    ["h|1|2", "ein Herzschlag mit einem Stück zu viel"],
    ["w|0|1|2|1|3", "ein Platz null"],
    ["w|5|1|2|1|3", "ein Platz über vier"],
    ["w|2|-1|2|1|3", "eine Saat unter null"],
    ["w|2|4294967296|2|1|3", "eine Saat über 32 Bit"],
    ["s|0|7", "eine Runde null"],
    ["n|2|", "ein leerer Name"],
    ["n|2|   ", "ein Name aus Leerzeichen"],
    ["n|2| Jannik", "ein Name mit Leerraum am Rand"],
    ["x|", "ein Abbruch ohne Grund"],
    ["b|1|" + "N".repeat(25), "ein Name über der Längengrenze"],
    ["x|" + "G".repeat(301), "ein Grund über der Längengrenze"],
    ["h|0007", "eine Zahl mit führenden Nullen"],
    ["h|-0", "die Zahl minus null"],
    /* `spiel/protokoll.mjs` liest „n02:8" wie „n2:8" — dieselbe
       Aktion, aber zwei Zeilen. Wer das durchlässt, kann zwei
       Nachrichten nicht mehr vergleichen. */
    ["a|1|g|w1|n02:8", "eine Aktion mit führender Null im Feld"],
    ["a|1|g|w01|n2:8", "und eine mit führender Null beim Wesen"]
  ];
  for (const [zeile, was] of schlechteZeilen) {
    let ergebnis = null;
    let geworfen = null;
    try { ergebnis = lies(zeile); } catch (fund) { geworfen = fund.message; }
    behaupte(geworfen === null, `${was}: lies wirft nicht (${geworfen})`);
    behaupte(ergebnis !== null && ergebnis.ok === false, `${was}: wird abgelehnt`);
    behaupte(!!(ergebnis && ergebnis.grund), `${was}: mit einem Grund`);
  }

  /* Ein Umbruch mitten in der Zeile zerschnitte die Nachricht auf der
     Leitung in zwei — er prallt ab wie jedes Steuerzeichen. Diese
     beiden Zeilen hängen an **zwei** Wächtern in `lies`: dem für die
     ganze Zeile und dem im einzelnen Stück. Nur wenn beide fehlen,
     werden sie rot (gemessen am 06.09.2026). Das ist Absicht: Ein
     Steuerzeichen darf an keiner Stelle durchkommen, und welcher der
     beiden Wächter es fängt, ist dem Empfänger gleichgültig. */
  gleich(lies("h|1" + String.fromCharCode(10)).ok, false, "eine Zeile mit Umbruch prallt ab");
  gleich(lies("n|2|Jan" + String.fromCharCode(9) + "nik").ok, false,
    "und eine mit Tabulator auch");
  gleich(lies(null).ok, false, "kein Text ist keine Nachricht");
  gleich(lies("h|" + "9".repeat(ZEILE_HOECHSTENS)).ok, false, "eine überlange Zeile prallt ab");

  /* Und die Gegenprobe: Was gültig ist, kommt durch. Ohne sie könnte
     `lies` schlicht immer `false` geben und alles oben bestehen. */
  gleich(lies("h|3").ok, true, "eine gültige Zeile kommt durch");
  gleich(lies("n|2|Jannik").ok, true, "ein gültiger Name kommt durch");
}

{
  abschnitt("Nachrichten — jedes Zeichen verdreht");

  /* Der stumpfe Beweis, dass `lies` nie wirft: jede Stelle jeder
     Probenachricht durch andere Zeichen ersetzt. Was dabei zufällig
     wieder gültig ist, ist erlaubt — was wirft, ist es nicht. */
  const ersatz = ["x", "|", "0", "9", "~", "A", ":", "", " ", "ä"];
  let versuche = 0;
  let wuerfe = 0;
  let angenommen = 0;
  for (const [art, inhalt] of PROBEN) {
    const text = schreibe(baue(art, inhalt));
    for (let i = 0; i < text.length; i++) {
      for (const zeichen of ersatz) {
        const verdreht = text.slice(0, i) + zeichen + text.slice(i + 1);
        if (verdreht === text) continue;
        versuche++;
        try {
          const gelesen = lies(verdreht);
          if (gelesen.ok) {
            angenommen++;
            /* Auch eine angenommene Zeile muss die Normalform tragen:
               Sonst gäbe es zwei Texte für dieselbe Nachricht. */
            if (schreibe(gelesen.nachricht) !== verdreht) wuerfe++;
          } else if (typeof gelesen.grund !== "string" || gelesen.grund === "") {
            wuerfe++;
          }
        } catch { wuerfe++; }
      }
    }
  }
  behaupte(versuche > 2000, `es wurde wirklich verdreht: ${versuche} Zeilen`);
  gleich(wuerfe, 0, "keine verdrehte Zeile wirft oder kommt ohne Normalform durch");
  console.log(`      · ${versuche} verdrehte Zeilen, ${angenommen} davon zufällig wieder gültig`);
}

{
  abschnitt("Nachrichten — bauen und schreiben");

  wirft(() => baue("gibtsNicht", {}), "eine unbekannte Art wirft beim Bauen");
  wirft(() => baue(NACHRICHT.herzschlag, { nummer: 1.5 }), "eine gebrochene Zahl wirft");
  wirft(() => baue(NACHRICHT.herzschlag, {}), "eine fehlende Zahl wirft");
  wirft(() => baue(NACHRICHT.name, { platz: 9, name: "X" }), "ein Platz über vier wirft");
  wirft(() => baue(NACHRICHT.name, { platz: 1, name: "  " }), "ein leerer Name wirft");
  wirft(() => baue(NACHRICHT.name, { platz: 1, name: "a" + String.fromCharCode(10) + "b" }),
    "ein Steuerzeichen wirft");
  wirft(() => baue(NACHRICHT.aktion, { nummer: 1, aktion: { typ: "tanzen", wer: 1 } }),
    "eine Aktionsart, die es nicht gibt, wirft");
  wirft(() => schreibe({ art: "gibtsNicht" }), "schreibe wirft bei unbekannter Art");

  /* Ein Feld, das jemand der Aktion angeheftet hat, darf nicht
     mitreisen — sonst bekäme der Empfänger eine Aktion, die er nie
     geprüft hat. */
  const angeheftet = { typ: AKTION.wacht, wer: 2, angezeigtAb: 17 };
  const durch = lies(schreibe(baue(NACHRICHT.aktion, { nummer: 1, aktion: angeheftet })));
  behaupte(durch.ok && durch.nachricht.aktion.angezeigtAb === undefined,
    "ein angeheftetes Feld fällt beim Bauen weg");

  /* Der Name wird beim Bauen gekürzt — sonst gäbe es zwei Zeilen für
     denselben Spieler. */
  gleich(baue(NACHRICHT.name, { platz: 1, name: "  Jannik  " }).name, "Jannik",
    "ein Name wird beim Bauen von Leerraum befreit");

  gleich(GRENZEN.platz[1], 4, "der höchste Platz ist die Vier aus spiel/wesen.mjs");
}

/* ══ 2. Der Lobbycode ══════════════════════════════════════════════ */

{
  abschnitt("Lobbycode — Vorrat und Form");

  gleich(ZEICHEN.length, 31, "der Vorrat hat 31 Zeichen");
  gleich(BASIS, 31, "und 31 ist die Basis");
  gleich(new Set(ZEICHEN).size, 31, "kein Zeichen steht zweimal im Vorrat");
  for (const verboten of ["0", "1", "O", "I", "L"]) {
    behaupte(!ZEICHEN.includes(verboten), `„${verboten}" steht nicht im Vorrat`);
  }
  /* 31 ist eine Primzahl — daran hängt, dass die Prüfziffer greift. */
  let teiler = 0;
  for (let i = 2; i < BASIS; i++) if (BASIS % i === 0) teiler++;
  gleich(teiler, 0, "31 ist eine Primzahl");
  gleich((8 * GEGENSTUECK_ACHT) % BASIS, 1, "4 ist das Gegenstück von 8 im Körper mit 31");

  const code = macheCode(1234567, { hafen: 49200 });
  behaupte(/^[0-9A-Z]{4}-[0-9A-Z]{4}$/.test(code), `die Form ist XXXX-XXXX (${code})`);
  gleich(code.length, LAENGE + 1, "acht Zeichen und ein Bindestrich");

  wirft(() => macheCode(-1), "eine Saat unter null wirft");
  wirft(() => macheCode(SAAT_HOECHSTENS + 1), "eine Saat über der Grenze wirft");
  wirft(() => macheCode(7, { hafen: HAFEN_ERSTER - 1 }), "ein Hafen unter dem Bereich wirft");
  wirft(() => macheCode(7, { hafen: HAFEN_ERSTER + HAFEN_ANZAHL }), "und einer darüber auch");
  gleich(leseCode("kein Code"), null, "was kein Code ist, gibt null");
  gleich(leseCode(123), null, "und was kein Text ist, erst recht");
}

/* Die Codes der Tippfehlerprobe. Aus dem Zufallsstrom des Spiels, mit
   fester Saat — damit dieselbe Prüfung morgen dieselben 2.000 Codes
   vertippt und ein Fund wiederfindbar ist. */
function macheProbenCodes(wieviele) {
  const zufall = macheZufall(4711);
  const liste = [];
  for (let i = 0; i < wieviele; i++) {
    const saat = zufall.ganz(0, SAAT_HOECHSTENS);
    const hafen = HAFEN_ERSTER + zufall.ganz(0, HAFEN_ANZAHL - 1);
    liste.push({ saat, hafen, code: macheCode(saat, { hafen }) });
  }
  return liste;
}

const probenCodes = macheProbenCodes(CODE_PROBEN);

{
  abschnitt("Lobbycode — Rundlauf");

  let falsch = 0;
  for (const { saat, hafen, code } of probenCodes) {
    const gelesen = leseCode(code);
    if (!gelesen || gelesen.saat !== saat || gelesen.hafen !== hafen) falsch++;
  }
  gleich(falsch, 0, `alle ${CODE_PROBEN} Codes geben Saat und Hafen zurück`);

  const eckfaelle = [
    [0, HAFEN_ERSTER],
    [SAAT_HOECHSTENS, HAFEN_ERSTER + HAFEN_ANZAHL - 1],
    [1, HAFEN_ERSTER + 1],
    [SAAT_HOECHSTENS, HAFEN_ERSTER]
  ];
  for (const [saat, hafen] of eckfaelle) {
    const gelesen = leseCode(macheCode(saat, { hafen }));
    behaupte(!!gelesen && gelesen.saat === saat && gelesen.hafen === hafen,
      `Eckfall Saat ${saat}, Hafen ${hafen}`);
  }

  /* Nachsichtig beim Lesen, wo es nichts kostet. */
  const einer = probenCodes[0].code;
  behaupte(!!leseCode(einer.toLowerCase()), "klein geschrieben wird gelesen");
  behaupte(!!leseCode(einer.replace("-", "")), "ohne Bindestrich wird gelesen");
  behaupte(!!leseCode(`  ${einer} `), "mit Leerraum wird gelesen");
  gleich(leseCode(einer.slice(0, 8)), null, "ein Zeichen zu wenig gibt null");
  gleich(leseCode(einer + "A"), null, "ein Zeichen zu viel gibt null");
}

{
  abschnitt("Lobbycode — jeder Tippfehler in einem Zeichen");

  /* Der eigentliche Auftrag: Aus **keinem** Code darf durch einen
     einzigen vertippten Buchstaben ein anderer gültiger Code werden.
     Gezählt wird, nicht behauptet — eine halbe Million Behauptungen
     wären kein Bericht mehr, sondern eine Wand. */
  const fremd = ["0", "1", "O", "I", "L", "!", " "];
  let stellen = 0;
  let durchgerutscht = 0;
  let fremdeStellen = 0;
  let fremdDurch = 0;
  let dreher = 0;
  let dreherDurch = 0;

  for (const { code } of probenCodes) {
    const knapp = code.replace("-", "");
    for (let i = 0; i < knapp.length; i++) {
      for (const zeichen of ZEICHEN) {
        if (zeichen === knapp[i]) continue;
        stellen++;
        const vertippt = knapp.slice(0, i) + zeichen + knapp.slice(i + 1);
        if (leseCode(vertippt) !== null) durchgerutscht++;
      }
      for (const zeichen of fremd) {
        fremdeStellen++;
        const vertippt = knapp.slice(0, i) + zeichen + knapp.slice(i + 1);
        if (leseCode(vertippt) !== null) fremdDurch++;
      }
      /* Der Dreher zweier Nachbarn — der zweite Fehler, den ein Mensch
         am Telefon macht. Gleiche Nachbarn sind kein Dreher. */
      if (i + 1 < knapp.length && knapp[i] !== knapp[i + 1]) {
        dreher++;
        const gedreht = knapp.slice(0, i) + knapp[i + 1] + knapp[i] + knapp.slice(i + 2);
        if (leseCode(gedreht) !== null) dreherDurch++;
      }
    }
  }

  gleich(stellen, CODE_PROBEN * LAENGE * (BASIS - 1),
    "es wurde an jeder Stelle mit jedem anderen Zeichen vertippt");
  gleich(durchgerutscht, 0, `kein vertippter Code wird gelesen (${stellen} Versuche)`);
  gleich(fremdDurch, 0, `kein Code mit fremdem Zeichen wird gelesen (${fremdeStellen})`);
  gleich(dreherDurch, 0, `kein Dreher zweier Nachbarn wird gelesen (${dreher} Versuche)`);
  console.log(`      · ${CODE_PROBEN} Codes: ${stellen} Tippfehler, ${fremdeStellen} fremde `
    + `Zeichen, ${dreher} Dreher — 0 durchgerutscht`);
}

/* ══ 3. Zwei Rechner, eine Leitung ═════════════════════════════════ */

/* Die Leitung. Sie stellt nur zu, wenn man es sagt — das macht das
   Verdrehen und das Verfälschen herstellbar statt abwartbar. */
function macheLeitung() {
  const briefe = [];
  const gezaehlt = new Map();
  return {
    schicke(an, text) {
      briefe.push({ an, text });
      const kuerzel = text[0];
      gezaehlt.set(kuerzel, (gezaehlt.get(kuerzel) || 0) + 1);
    },
    wartend() { return briefe.length; },
    nimmAlle() { return briefe.splice(0, briefe.length); },
    zahlVon(art) { return gezaehlt.get(FORMEN[art].kuerzel) || 0; },
    /* Zustellen, bis nichts mehr wartet: Jede Zustellung kann neue
       Nachrichten auslösen (Antwort, Gleichstand, Nachreichen). */
    stelleZu(kasten, hoechstens = 20000) {
      let zugestellt = 0;
      while (briefe.length > 0) {
        if (++zugestellt > hoechstens) throw new Error("Die Leitung kommt nicht zur Ruhe");
        const brief = briefe.shift();
        kasten[brief.an](brief.text);
      }
      return zugestellt;
    }
  };
}

/* Ein Paar: zwei getrennte Zustände aus derselben Saat, zwei
   Sitzungen, eine Leitung. Mehr braucht ein Koop-Abend nicht. */
function machePaar(saat = LAUF_SAAT, spielerZahl = LAUF_SPIELER) {
  const leitung = macheLeitung();
  const zustandGastgeber = macheLauf({ saat, spielerZahl, tiefe: 1 });
  const zustandGast = macheLauf({ saat, spielerZahl, tiefe: 1 });

  const gastgeber = macheSitzung({
    istGastgeber: true,
    zustand: zustandGastgeber,
    sendeAn: (wem, text) => leitung.schicke(wem, text),
    alleSenden: (text) => leitung.schicke(WEM_GAST, text)
  });
  const gast = macheSitzung({
    istGastgeber: false,
    zustand: zustandGast,
    sendeAn: (_wem, text) => leitung.schicke(WEM_GASTGEBER, text),
    alleSenden: (text) => leitung.schicke(WEM_GASTGEBER, text)
  });

  const fehlerGastgeber = [];
  const fehlerGast = [];
  const ereignisseGastgeber = [];
  const ereignisseGast = [];
  gastgeber.beiFehler((text) => fehlerGastgeber.push(text));
  gast.beiFehler((text) => fehlerGast.push(text));
  gastgeber.beiEreignissen((liste) => ereignisseGastgeber.push(...liste));
  gast.beiEreignissen((liste) => ereignisseGast.push(...liste));

  const kasten = {
    [WEM_GASTGEBER]: (text) => gastgeber.empfange(text, WEM_GAST),
    [WEM_GAST]: (text) => gast.empfange(text, WEM_GASTGEBER)
  };

  const paar = {
    leitung, gastgeber, gast, zustandGastgeber, zustandGast, kasten,
    fehlerGastgeber, fehlerGast, ereignisseGastgeber, ereignisseGast,
    zustelle() { return leitung.stelleZu(kasten); },
    stehenGleich() { return zustandsSumme(zustandGastgeber) === zustandsSumme(zustandGast); }
  };

  gast.beitreten("Jannik");
  paar.zustelle();
  return paar;
}

/* ── Das Vorgehen der Jäger ────────────────────────────────────────

   Kein Spielverstand, sondern ein **Vorgehen**: Aus demselben Zustand
   folgt immer dieselbe Aktion. Würfelte es, verglichen die
   Rundensummen zweier Rechner nichts.

   Gewählt wird auf dem Zustand dessen, der handelt — der Gast wählt
   auf **seinem** Zustand. Genau das ist der Beweis: Läuft sein Stand
   auch nur um ein Feld auseinander, schlägt der Gastgeber die Absicht
   aus, und `abgelehnt` unten ist nicht mehr null. */
function zumAusgang(zustand, wesen) {
  const ziel = zustand.karte.ausgang;
  if (!ziel || (ziel.x === wesen.x && ziel.y === wesen.y)) return null;
  const weg = wegSuche(zustand.karte, { x: wesen.x, y: wesen.y }, ziel, { maxKosten: Infinity });
  if (!weg) return null;
  for (let i = weg.pfad.length - 1; i > 0; i--) {
    const feld = weg.pfad[i];
    if (feld.kosten > wesen.ap) continue;
    const gehen = { typ: AKTION.gehen, wer: wesen.id, nach: { x: feld.x, y: feld.y } };
    if (pruefeAktion(zustand, gehen) === null) return gehen;
  }
  return null;
}

/* Zum nächsten Gegner statt zum Ausgang, solange es einen gibt.

   ⚠️ Das stand hier bis zum 06.09.2026 nicht, und die Prüfung hing
   deshalb an einer **gemessenen Saat**: Mit Saat 5 trafen sich die
   Seiten zufällig, und es wurde gekämpft. Als die Landschaft auf
   Janniks Pixelslop-Engine umgestellt wurde, waren die Höhlen größer
   und offener — und in dreißig Runden fielen **null** Angriffe, null
   Stöße, null Tränke. Die Gleichlaufprüfung lief damit über zwei
   Rechner, die im Wesentlichen spazieren gingen.

   Eine Prüfung, die an einer glücklichen Saat hängt, ist keine
   Prüfung, sondern ein Fund. Jetzt suchen die Jäger den nächsten
   Gegner, und der Kampf findet auf **jeder** Karte statt.

   Der nächste Gegner ist der mit dem billigsten Weg; bei gleichen
   Kosten der mit der kleineren Kennung — sonst hinge die Wahl an der
   Reihenfolge der Liste und damit am Rechner (Fehlerbuch B2). */
function zumGegner(zustand, wesen) {
  let bester = null;
  for (const anderer of zustand.wesen) {
    if (!anderer.lebt || anderer.seite === wesen.seite) continue;
    const weg = wegSuche(zustand.karte, { x: wesen.x, y: wesen.y },
      { x: anderer.x, y: anderer.y }, { maxKosten: Infinity });
    if (!weg) continue;
    if (!bester || weg.kosten < bester.kosten
      || (weg.kosten === bester.kosten && anderer.id < bester.id)) {
      bester = { kosten: weg.kosten, id: anderer.id, pfad: weg.pfad };
    }
  }
  if (!bester) return null;
  /* Das letzte Feld ist der Gegner selbst — dorthin geht niemand. */
  for (let i = bester.pfad.length - 2; i > 0; i--) {
    const feld = bester.pfad[i];
    if (feld.kosten > wesen.ap) continue;
    const gehen = { typ: AKTION.gehen, wer: wesen.id, nach: { x: feld.x, y: feld.y } };
    if (pruefeAktion(zustand, gehen) === null) return gehen;
  }
  return null;
}

function jaegerAktion(zustand, wesen) {
  if (wesen.traenke > 0 && wesen.lp * 2 <= wesen.lpMax) {
    const trank = { typ: AKTION.trank, wer: wesen.id };
    if (pruefeAktion(zustand, trank) === null) return trank;
  }
  /* Jede dritte Runde erst stoßen. Ohne diese Zeile käme in dreißig
     Runden kein einziger Stoß vor — und der Stoß ist die Aktion, die
     die Höhen zum Spiel macht. */
  if (zustand.runde % 3 === 0) {
    for (const anderer of zustand.wesen) {
      if (!anderer.lebt || anderer.seite === wesen.seite) continue;
      const stoss = { typ: AKTION.stoss, wer: wesen.id, ziel: anderer.id };
      if (pruefeAktion(zustand, stoss) === null) return stoss;
    }
  }
  for (const anderer of zustand.wesen) {
    if (!anderer.lebt || anderer.seite === wesen.seite) continue;
    const schlag = { typ: AKTION.angriff, wer: wesen.id, ziel: anderer.id };
    if (pruefeAktion(zustand, schlag) === null) return schlag;
  }
  for (const schluessel of wesen.faehigkeiten) {
    const aufSich = {
      typ: AKTION.faehigkeit, wer: wesen.id, schluessel, ziel: null, feld: null
    };
    if (pruefeAktion(zustand, aufSich) === null) return aufSich;
  }
  const jagen = zumGegner(zustand, wesen);
  if (jagen) return jagen;
  const gehen = zumAusgang(zustand, wesen);
  if (gehen) return gehen;
  const wacht = { typ: AKTION.wacht, wer: wesen.id };
  return pruefeAktion(zustand, wacht) === null ? wacht : null;
}

/* Wer als Nächstes handelt, und mit welcher Sitzung. Der Gast führt
   Platz 2, der Gastgeber Platz 1 und die ganze Brut. */
function naechsteWahl(paar) {
  const dran = amZugWesen(paar.zustandGastgeber);
  if (!dran) return null;
  const beimGast = dran.spielerPlatz === 2;
  const zustand = beimGast ? paar.zustandGast : paar.zustandGastgeber;
  const wesen = beimGast ? paar.zustandGast.nachId.get(dran.id) : dran;
  if (!wesen) return null;
  const aktion = wesen.seite === SEITE_JAEGER
    ? jaegerAktion(zustand, wesen)
    : (planeZug(zustand, wesen)[0] || null);
  return {
    sitzung: beimGast ? paar.gast : paar.gastgeber,
    aktion: aktion || { typ: AKTION.zugEnde, wer: dran.id },
    beimGast
  };
}

function spielePaar(paar, runden) {
  const zaehler = { angriff: 0, gehen: 0, trank: 0, faehigkeit: 0, wacht: 0, stoss: 0, zugEnde: 0 };
  const summenPaare = [];
  let ungleich = 0;
  let abgelehnt = 0;
  let gezaehlteRunden = 0;
  let letzteRunde = paar.zustandGastgeber.runde;
  let vomGast = 0;
  let fehler = null;

  try {
    while (gezaehlteRunden < runden && !paar.zustandGastgeber.vorbei) {
      if (paar.gastgeber.stand().beendet) break;
      const wahl = naechsteWahl(paar);
      if (!wahl) break;
      if (zaehler[wahl.aktion.typ] !== undefined) zaehler[wahl.aktion.typ]++;
      if (wahl.beimGast) vomGast++;
      if (!wahl.sitzung.willAktion(wahl.aktion)) abgelehnt++;
      paar.zustelle();

      if (paar.zustandGastgeber.runde !== letzteRunde) {
        letzteRunde = paar.zustandGastgeber.runde;
        gezaehlteRunden++;
        const beimGastgeber = zustandsSumme(paar.zustandGastgeber);
        const beimGast = zustandsSumme(paar.zustandGast);
        summenPaare.push([beimGastgeber, beimGast]);
        if (beimGastgeber !== beimGast) ungleich++;
      }
    }
  } catch (wurf) {
    fehler = wurf.message;
  }
  return { zaehler, summenPaare, ungleich, abgelehnt, gezaehlteRunden, vomGast, fehler };
}

/* Spielt weiter, bis die Figur eines bestimmten Platzes am Zug ist.
   Ohne das ließe sich der Fall gar nicht herstellen, auf den es
   ankommt: eine Absicht für eine fremde Figur, die **erlaubt wäre**,
   wenn sie vom Richtigen käme. */
function spieleBisDran(paar, platz, hoechstens = 80) {
  for (let i = 0; i < hoechstens; i++) {
    const dran = amZugWesen(paar.zustandGastgeber);
    if (!dran || paar.zustandGastgeber.vorbei) return null;
    if (dran.spielerPlatz === platz) return dran;
    const wahl = naechsteWahl(paar);
    if (!wahl) return null;
    wahl.sitzung.willAktion(wahl.aktion);
    paar.zustelle();
  }
  return null;
}

/* Sammelt Aktionen des Gastgebers ein, ohne sie zuzustellen — so
   entsteht die Lücke, die sonst nur eine echte Leitung herstellt. */
function sammleAktionenAnDenGast(paar, wieviele, hoechstens = 40) {
  const gesammelt = [];
  let versuche = 0;
  while (gesammelt.length < wieviele && versuche < hoechstens) {
    versuche++;
    const wahl = naechsteWahl(paar);
    if (!wahl) break;
    if (wahl.beimGast) {
      /* Der Gast ist dran — seine Absicht muss durch, sonst steht das
         Spiel. Erst danach wieder sammeln. */
      wahl.sitzung.willAktion(wahl.aktion);
      paar.zustelle();
      continue;
    }
    paar.gastgeber.willAktion(wahl.aktion);
    for (const brief of paar.leitung.nimmAlle()) {
      if (brief.an === WEM_GAST && brief.text.startsWith("a|")) gesammelt.push(brief.text);
    }
  }
  return gesammelt;
}

let langerLauf = null;

{
  abschnitt("Beitritt");

  const paar = machePaar();
  gleich(paar.gast.stand().platz, 2, "der Gast bekommt Platz 2");
  gleich(paar.gastgeber.stand().platz, GASTGEBER_PLATZ, "der Gastgeber sitzt auf Platz 1");
  gleich(paar.gastgeber.stand().beendet, null, "der Beitritt bricht nichts ab");
  gleich(paar.gast.stand().beendet, null, "auch beim Gast nicht");

  const liste = paar.gastgeber.spielerListe();
  gleich(liste.length, LAUF_SPIELER, "die Spielerliste hat beide Plätze");
  gleich(liste[1].name, "Jannik", "der Name des Gastes steht in der Liste des Gastgebers");
  behaupte(liste[1].verbunden, "und er gilt als verbunden");
  behaupte(liste[0].selbst, "der Gastgeber erkennt sich selbst");
  gleich(paar.gast.spielerListe()[1].selbst, true, "und der Gast sich auch");

  /* Ein Gast mit anderem Kerker darf gar nicht erst hineinkommen —
     sonst fiele es erst der Rundensumme auf, nach der ersten Runde. */
  const fremdes = machePaar();
  fremdes.zustandGast.karte.boden[0] = (fremdes.zustandGast.karte.boden[0] + 1) % 8;
  const zweiter = macheSitzung({
    istGastgeber: false,
    zustand: fremdes.zustandGast,
    sendeAn: () => {},
    alleSenden: () => {}
  });
  const fehlerFremd = [];
  zweiter.beiFehler((text) => fehlerFremd.push(text));
  zweiter.empfange(schreibe(baue(NACHRICHT.willkommen, {
    platz: 2,
    saat: fremdes.zustandGastgeber.saat >>> 0,
    spielerZahl: LAUF_SPIELER,
    tiefe: 1,
    summe: zustandsSumme(fremdes.zustandGastgeber)
  })), WEM_GASTGEBER);
  gleich(zweiter.stand().platz, OHNE_PLATZ, "ein anderer Kerker bekommt keinen Platz");
  behaupte(!!zweiter.stand().beendet, "sondern einen Abbruch");
  behaupte(fehlerFremd.some((t) => t.includes("anderen Spielstand")),
    `und einen deutschen Grund (${fehlerFremd[0]})`);

  /* Und eine andere Fassung ebenso wenig. */
  const fassung = machePaar();
  fassung.gastgeber.empfange(`b|${FASSUNG + 1}|Fremder`, "fremd");
  const antwort = fassung.leitung.nimmAlle();
  behaupte(antwort.some((b) => b.text.startsWith("x|") && b.text.includes("Fassung")),
    "eine andere Fassung bekommt eine Absage");
}

{
  abschnitt("Dreißig Runden zu zweit");

  const paar = machePaar();
  langerLauf = spielePaar(paar, LAUF_RUNDEN);
  const lauf = langerLauf;

  gleich(lauf.fehler, null, "der lange Lauf läuft ohne Abbruch durch");

  /* ⚠️ Hier stand bis zum 06.09.2026 `gleich(gezaehlteRunden, 30)`.
     Das war die falsche Behauptung, und sie fiel erst auf, als die
     Jäger anfingen, den Gegner zu suchen (siehe `zumGegner`): Jetzt
     endet der Lauf, weil die Brut fällt — in Runde 17 statt nach 30.
     Ein Lauf, der **gewonnen** wird, ist kein Fehler.

     Die Eigenschaft, um die es geht, ist nicht „genau dreißig Runden",
     sondern **jede gespielte Runde ist gleichgelaufen**. Genau das
     steht jetzt da, und es ist die stärkere Aussage: Sie gilt auch
     dann, wenn der Lauf früher endet. Die Untergrenze fängt nur den
     Fall ab, dass gar nichts passiert. */
  behaupte(lauf.gezaehlteRunden >= MINDEST_RUNDEN,
    `es wurden ${lauf.gezaehlteRunden} Runden gespielt (mindestens ${MINDEST_RUNDEN})`);
  behaupte(lauf.gezaehlteRunden <= LAUF_RUNDEN,
    `und nicht mehr als die verlangten ${LAUF_RUNDEN}`);
  gleich(paar.gastgeber.stand().beendet, null, "die Sitzung des Gastgebers lebt noch");
  gleich(paar.gast.stand().beendet, null, "die des Gastes auch");

  /* Der Kern der Sache. */
  gleich(lauf.ungleich, 0,
    `nach jeder Runde dieselbe Prüfzahl (${lauf.summenPaare.length} Vergleiche)`);
  gleich(lauf.abgelehnt, 0, "keine einzige Absicht wurde abgelehnt");
  behaupte(lauf.vomGast >= 20, `der Gast hat wirklich mitgespielt: ${lauf.vomGast} Absichten`);

  /* Ohne diese fünf Zeilen bewiese der Gleichlauf ein Standbild. */
  behaupte(lauf.zaehler.angriff >= 30, `es wird gekämpft: ${lauf.zaehler.angriff} Angriffe`);
  behaupte(lauf.zaehler.gehen >= 20, `es wird gegangen: ${lauf.zaehler.gehen} Wege`);
  behaupte(lauf.zaehler.faehigkeit >= 5, `Fähigkeiten: ${lauf.zaehler.faehigkeit}`);
  behaupte(lauf.zaehler.stoss >= 1, `und gestoßen wird auch: ${lauf.zaehler.stoss}`);
  behaupte(lauf.zaehler.trank >= 1, `Tränke: ${lauf.zaehler.trank}`);

  /* Die Sitzung selbst muss die Summen auch **verglichen** haben —
     sonst prüft die Gleichheit oben nur zwei Zahlen, die niemand
     jemals gegeneinander gehalten hat. */
  gleich(paar.leitung.zahlVon(NACHRICHT.rundenSumme), lauf.gezaehlteRunden,
    "der Gast hat jede gespielte Runde seine Prüfzahl gemeldet");
  gleich(paar.leitung.zahlVon(NACHRICHT.gleichstand), lauf.gezaehlteRunden,
    "und der Gastgeber jede davon als Gleichstand bestätigt");

  behaupte(paar.ereignisseGast.length > 100,
    `der Gast hat Ereignisse zum Abspielen bekommen: ${paar.ereignisseGast.length}`);
  gleich(paar.ereignisseGast.length, paar.ereignisseGastgeber.length,
    "beide Seiten haben dieselbe Zahl Ereignisse gesehen");

  console.log(`      · ${LAUF_RUNDEN} Runden, Saat ${LAUF_SAAT}: `
    + `${lauf.zaehler.angriff} Angriffe, ${lauf.zaehler.gehen} Wege, `
    + `${lauf.zaehler.stoss} Stöße, ${lauf.zaehler.trank} Tränke, `
    + `${lauf.zaehler.faehigkeit} Fähigkeiten, ${lauf.vomGast} Absichten vom Gast`);
}

{
  abschnitt("Eine verfälschte Nachricht ändert nichts");

  const paar = machePaar();
  spielePaar(paar, 3);

  const gesammelt = sammleAktionenAnDenGast(paar, 1);
  gleich(gesammelt.length, 1, "genau eine Aktion wartet auf den Gast");

  const echt = gesammelt[0];
  const vorher = zustandsSumme(paar.zustandGast);
  const nummerVorher = paar.gast.stand().naechsteNummer;

  const verfaelschungen = [
    ["y" + echt.slice(1), "eine Art, die es nicht gibt"],
    [echt.replace(/^a\|\d+\|/, "a|x|"), "eine Nummer aus Buchstaben"],
    [echt.replace(/^(a\|\d+\|).*$/, "$1"), "eine Zeile ohne Aktionstext"],
    [echt + "|w99", "ein angehängtes Feld"],
    [echt.replace("|", String.fromCharCode(1)), "ein Steuerzeichen statt des Trenners"]
  ];
  for (const [text, was] of verfaelschungen) {
    const angenommen = paar.gast.empfange(text, WEM_GASTGEBER);
    gleich(zustandsSumme(paar.zustandGast), vorher, `${was}: der Zustand bleibt unberührt`);
    gleich(paar.gast.stand().naechsteNummer, nummerVorher, `${was}: die Nummer rückt nicht`);
    gleich(paar.gast.stand().beendet, null, `${was}: die Sitzung lebt weiter`);
    gleich(angenommen, false, `${was}: wird abgelehnt`);
  }
  behaupte(paar.fehlerGast.some((t) => t.includes("verworfen")),
    "der Gast hat das Verwerfen als deutschen Satz gemeldet");

  /* Und die Gegenprobe: Die **echte** Zeile kommt an und wirkt. Ohne
     sie prüfte alles oben nur, dass der Gast nichts tut. */
  paar.gast.empfange(echt, WEM_GASTGEBER);
  gleich(paar.gast.stand().naechsteNummer, nummerVorher + 1, "die echte Zeile rückt die Nummer");
  behaupte(paar.stehenGleich(), "und danach stehen beide Zustände wieder gleich");
}

{
  abschnitt("Eine unzulässige Aktion wird begründet abgelehnt");

  const paar = machePaar();
  spielePaar(paar, 2);

  /* Gespielt wird bis zu dem Augenblick, in dem der Held des
     **Gastgebers** am Zug ist. Nur dann ist der Fall unten scharf. */
  const dran = spieleBisDran(paar, 1);
  behaupte(!!dran, "der Held des Gastgebers ist am Zug");
  const gastWesen = paar.zustandGast.spieler.find((s) => s.platz === 2).wesenId;
  const summeVorher = zustandsSumme(paar.zustandGastgeber);
  const fehlerVorher = paar.fehlerGast.length;

  /* Fall 1: Der Gast will handeln, obwohl er nicht am Zug ist. */
  paar.gast.willAktion({ typ: AKTION.wacht, wer: gastWesen });
  paar.zustelle();
  gleich(zustandsSumme(paar.zustandGastgeber), summeVorher,
    "eine Absicht außer der Reihe ändert beim Gastgeber nichts");
  behaupte(paar.fehlerGast.length > fehlerVorher, "und der Gast bekommt eine Meldung");
  const letzte = paar.fehlerGast[paar.fehlerGast.length - 1];
  behaupte(letzte.includes("nicht gespielt"), `die Meldung nennt die Ablehnung: ${letzte}`);
  behaupte(letzte.includes("am Zug"), `und den Grund aus pruefeAktion: ${letzte}`);
  gleich(paar.gast.stand().beendet, null, "eine Ablehnung beendet die Sitzung nicht");

  /* Fall 2 — der, auf den es ankommt: Ein Gast schickt von Hand eine
     Aktion für eine **fremde** Figur, und zwar eine, die der Regelkern
     **erlauben würde**. `pruefeAktion` weiß von Plätzen nichts; ohne
     die Besitzprüfung in `netz/sitzung.mjs` beendete Platz 2 den Zug
     von Platz 1 — oder schöbe dessen Helden in die Lava. */
  const eigner = paar.zustandGastgeber.spieler.find((s) => s.platz === 1).wesenId;
  const fremdeAktion = { typ: AKTION.zugEnde, wer: eigner };
  gleich(pruefeAktion(paar.zustandGastgeber, fremdeAktion), null,
    "die Aktion wäre nach den Spielregeln erlaubt — nur nicht für diesen Absender");
  const summeVorFremd = zustandsSumme(paar.zustandGastgeber);
  const fehlerVorFremd = paar.fehlerGast.length;
  const bosheit = schreibe(baue(NACHRICHT.aktion, { nummer: 0, aktion: fremdeAktion }));
  paar.gastgeber.empfange(bosheit, WEM_GAST);
  paar.zustelle();
  gleich(zustandsSumme(paar.zustandGastgeber), summeVorFremd,
    "eine Aktion für eine fremde Figur ändert nichts");
  behaupte(paar.fehlerGast.length > fehlerVorFremd, "der Absender bekommt eine Antwort");
  const antwort = paar.fehlerGast[paar.fehlerGast.length - 1];
  behaupte(antwort.includes("gehört Platz 1"), `mit dem Grund: ${antwort}`);
  gleich(paar.gastgeber.stand().beendet, null, "und die Sitzung läuft weiter");

  /* Ein Rechner ohne Platz wird gar nicht erst gehört. */
  paar.gastgeber.empfange(bosheit, "unbekannt");
  gleich(zustandsSumme(paar.zustandGastgeber), summeVorFremd,
    "eine Absicht von einem Rechner ohne Platz ändert nichts");
  behaupte(paar.fehlerGastgeber.some((t) => t.includes("ohne Platz")),
    "und wird als solche gemeldet");

  /* Und eine **nummerierte** Aktion von einem Gast nimmt der
     Gastgeber nicht an — Nummern vergibt allein er. */
  paar.gastgeber.empfange(schreibe(baue(NACHRICHT.aktion, {
    nummer: 999, aktion: { typ: AKTION.wacht, wer: eigner }
  })), WEM_GAST);
  gleich(zustandsSumme(paar.zustandGastgeber), summeVorFremd,
    "eine nummerierte Aktion vom Gast ändert nichts");
  behaupte(paar.fehlerGastgeber.some((t) => t.includes("Nummern")),
    "der Gastgeber meldet, dass er sie verwirft");
}

{
  abschnitt("Falsche Reihenfolge wird gepuffert");

  const paar = machePaar();
  spielePaar(paar, 2);

  const gesammelt = sammleAktionenAnDenGast(paar, 2);
  gleich(gesammelt.length, 2, "zwei Aktionen warten auf den Gast");

  const nummerVorher = paar.gast.stand().naechsteNummer;
  const summeVorher = zustandsSumme(paar.zustandGast);

  /* Verdreht zustellen: die zweite zuerst. */
  paar.gast.empfange(gesammelt[1], WEM_GASTGEBER);
  gleich(paar.gast.stand().naechsteNummer, nummerVorher,
    "die Aktion aus der Zukunft wird nicht angewandt");
  gleich(paar.gast.stand().gepuffert, 1, "sondern gepuffert");
  gleich(zustandsSumme(paar.zustandGast), summeVorher, "und der Zustand bleibt stehen");
  gleich(paar.gast.stand().beendet, null, "eine Lücke ist kein Abbruch");

  paar.gast.empfange(gesammelt[0], WEM_GASTGEBER);
  gleich(paar.gast.stand().gepuffert, 0, "die Lücke schließt sich, der Puffer leert sich");
  gleich(paar.gast.stand().naechsteNummer, nummerVorher + 2, "beide Aktionen sind angewandt");
  behaupte(paar.stehenGleich(), "und beide Zustände stehen wieder gleich");

  /* Ein Doppel ändert nichts — im Netz kommt jede Zeile irgendwann
     zweimal an. */
  const nachDoppel = paar.gast.stand().naechsteNummer;
  const summeNachDoppel = zustandsSumme(paar.zustandGast);
  paar.gast.empfange(gesammelt[0], WEM_GASTGEBER);
  paar.gast.empfange(gesammelt[1], WEM_GASTGEBER);
  gleich(paar.gast.stand().naechsteNummer, nachDoppel, "ein Doppel rückt die Nummer nicht");
  gleich(zustandsSumme(paar.zustandGast), summeNachDoppel, "und ändert den Zustand nicht");
}

{
  abschnitt("Ein verfälschter Zustand fällt der Rundensumme auf");

  const paar = machePaar();
  spielePaar(paar, 1);

  /* Verfälscht wird der **Boden** eines Feldes: Er geht in
     `karte.summe()` ein, aber in keine Regel — kein Weg, keine Sicht,
     kein Schaden hängt daran (`spiel/gitter.mjs`). Damit läuft das
     Spiel weiter wie zuvor, und der Unterschied kann **nur** über die
     Prüfzahl auffallen. Verfälschte man etwas Regelrelevantes, bewiese
     der Abbruch bloß, dass eine Aktion nicht mehr passt. */
  const karte = paar.zustandGast.karte;
  karte.boden[0] = karte.boden[0] === BODEN.asche ? BODEN.knochen : BODEN.asche;
  behaupte(!paar.stehenGleich(),
    "die Prüfzahlen gehen durch den verfälschten Boden auseinander");

  const lauf = spielePaar(paar, 3);
  behaupte(!!paar.gastgeber.stand().beendet, "die Sitzung des Gastgebers bricht ab");
  behaupte(!!paar.gast.stand().beendet, "und die des Gastes ebenso");
  const meldung = paar.fehlerGastgeber.find((t) => t.includes("auseinandergelaufen"));
  behaupte(!!meldung, `der Gastgeber nennt den Grund auf Deutsch: ${meldung}`);
  behaupte(!!meldung && meldung.includes("Runde"), "und die Runde, in der es auffiel");
  behaupte(paar.fehlerGast.some((t) => t.includes("beendet")),
    "der Gast erfährt, dass die Gegenseite beendet hat");
  behaupte(lauf.gezaehlteRunden < 3, "und es wird nicht einfach weitergespielt");

  /* Die Gegenprobe steht oben: Ohne die Verfälschung laufen dieselben
     dreißig Runden ohne einen einzigen Abbruch durch. Ohne sie bewiese
     dieser Abschnitt nur, dass die Sitzung gern abbricht. */
  gleich(langerLauf.ungleich, 0, "und ohne Verfälschung bricht nichts ab");
}

{
  abschnitt("Herzschlag und Nachreichen");

  const paar = machePaar();
  spielePaar(paar, 2);

  const verloren = sammleAktionenAnDenGast(paar, 2);
  gleich(verloren.length, 2, "zwei Aktionen sind unterwegs verloren gegangen");
  behaupte(!paar.stehenGleich(), "der Gast hinkt jetzt hinterher");

  paar.gastgeber.herzschlag();
  paar.zustelle();
  behaupte(paar.stehenGleich(), "nach einem Herzschlag hat der Gast aufgeholt");
  gleich(paar.gast.stand().beendet, null, "ohne Abbruch");
  gleich(paar.gastgeber.stand().beendet, null, "auf beiden Seiten");

  /* Und noch ein Herzschlag darf nichts nachreichen — sonst schickte
     der Gastgeber bei jedem Schlag dasselbe noch einmal. */
  const summe = zustandsSumme(paar.zustandGast);
  paar.gastgeber.herzschlag();
  paar.zustelle();
  gleich(zustandsSumme(paar.zustandGast), summe, "ein zweiter Herzschlag ändert nichts");
}

{
  abschnitt("Namen sind Zierde, keine Regel");

  const paar = machePaar();
  const vorher = zustandsSumme(paar.zustandGastgeber);
  paar.gast.setzeName("Rübezahl");
  paar.zustelle();
  gleich(zustandsSumme(paar.zustandGastgeber), vorher, "ein Name ändert die Prüfzahl nicht");
  gleich(paar.gastgeber.spielerListe()[1].name, "Rübezahl",
    "aber der Gastgeber kennt den neuen Namen");
  gleich(paar.zustandGastgeber.spieler[1].name, "Spieler 2",
    "und im Spielstand steht er nicht — dort schreibt nur wendeAn");

  /* Einen fremden Platz benennt niemand um. */
  paar.gastgeber.empfange(schreibe(baue(NACHRICHT.name, { platz: 1, name: "Dieb" })), WEM_GAST);
  gleich(paar.gastgeber.spielerListe()[0].name, "Spieler 1",
    "ein fremder Platz lässt sich nicht umbenennen");
}

console.log(`      · Aktionstext einer Probeaktion: „${schreibeAktion(PROBE_AKTION)}"`);

ende("Netz");
