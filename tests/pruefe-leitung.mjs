/* [Aufgabe: Prüfwesen] Die Leitung und ihre Vermittlung: 1.000 Angaben
   im Kreis, jeder Einladungscode an jeder Stelle verfälscht, beide
   Vermittler mit denselben Fragen — und ein Verbindungsaufbau ohne
   Browser.

   ── Warum es das gibt / Warum so ───────────────────────────────────

   Die Vermittlung ist die Stelle, an der ein Fehler am teuersten ist
   und am spätesten auffällt. Sie läuft **einmal**, bevor irgendetwas
   zu sehen ist: Wenn hier etwas halb ankommt, sitzen zwei Freunde vor
   zwei Bildschirmen, auf denen nichts passiert — und keiner von beiden
   kann sagen, woran es liegt. Deshalb wird hier nicht geschaut, ob es
   im Normalfall funktioniert, sondern ob der **Fehlerfall** als Satz
   endet statt als Stillstand.

   Geprüft wird der Fall, der ohne die Arbeit falsch wäre:

   · **Der Rundlauf.** Dass ein kurzer Text durchkommt, gewinnt
     ohnehin. Geprüft werden tausend Angaben mit zufälliger Länge und
     zufälligen Zeichen aus dem ganzen Zeichenvorrat — genau dort
     bricht ein Packer, der sich um ein Byte verzählt, und genau dort
     bricht eine Kodierung, die an Umlaute nicht gedacht hat.
   · **Der Kürzungsgrad wird gemessen, nicht behauptet.** Er steht in
     keinem Kommentar. Er wird an echten Leitungsangaben ausgerechnet
     und gedruckt — wer den Vorrat verschlechtert, sieht die Zahl
     fallen.
   · **Die Verfälschung.** Ein Code wird an **jeder** Stelle
     verändert, gelöscht, verdoppelt und gedreht. Die Behauptung ist
     nicht „es wird erkannt", sondern die schärfere: Kein einziger
     verfälschter Code darf als eine **andere**, gültig aussehende
     Angabe durchgehen. Genau das ist das stille Halblesen, das zwei
     Freunde in zwei verschiedene Leitungen führt.
   · **Dieselben Fragen an beide Vermittler.** Zwei Wege, die sich
     verschieden verhalten, sind zwei Wege, die man beide lernen muss —
     und `netz/verbindung.mjs` müsste wissen, welchen es hat. Deshalb
     steht der Fragenkatalog **einmal** da und wird zweimal gestellt.
   · **Der Vermittler mit echter Leitung.** Das Brett wird nicht
     nachgebaut, sondern gestartet: eigener Anschluss, freier Hafen,
     echte Anfragen. Ein nachgebauter Anschluss beweist nur, dass der
     Nachbau zum Aufrufer passt.
   · **Ein Verbindungsaufbau ohne Browser.** `netz/verbindung.mjs`
     bekommt einen erfundenen Browser untergeschoben, und der ganze
     Ablauf läuft durch: Angebot, Antwort, Kanal, eine Zeile hin, eine
     Zeile zurück. Ohne ihn wäre die Reihenfolge im Öffnen die einzige
     Stelle des Netzes, die niemand je ausführt, bevor Jannik es tut.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `netz/vermittler.mjs` und `netz/broker.mjs` und `netz/verbindung.mjs`
   (das Geprüfte), `spiel/zufall.mjs` (`macheZufall` — dieselbe Saat
   ergibt dieselben tausend Angaben, sonst misst diese Datei bei jedem
   Lauf etwas anderes), `tests/helfer.mjs` (das Prüfgerüst),
   `werkzeuge/pruefe-alles.mjs` (startet diese Datei als eigenen
   Prozess). */

import { abschnitt, behaupte, gleich, tiefGleich, wirft, ende } from "./helfer.mjs";
import { macheZufall } from "../spiel/zufall.mjs";
import {
  ANGEBOT, ANTWORT, FASSUNG, KENNUNG, ANGABE_HOECHSTENS,
  packe, entpacke, nachBasis, ausBasis,
  schreibeAngabe, leseAngabe, rohtextVon, pruefeAngabe,
  vermittlerVonHand, vermittlerUeberBroker
} from "../netz/vermittler.mjs";
import { macheBrett, macheBroker, ZETTEL_HOECHSTENS } from "../netz/broker.mjs";
import { macheVerbindung, holeBauart, OFFEN, ZU, GESCHEITERT } from "../netz/verbindung.mjs";

/* Eine echte Ruhe, aber eine sehr kurze: Die Prüfung wartet auf
   Ereignisse, nicht auf Sekunden. */
const ruhe = (ms) => new Promise((fertig) => setTimeout(fertig, ms));

/* Zwei echte Leitungsangaben, wie ein Browser sie schreibt — die eine
   mit einer Netzkarte, die andere mit dreien. Sie stehen hier als
   Text und nicht als Nachbau: Der Kürzungsgrad ist nur dann eine
   Aussage, wenn er an dem gemessen wird, was wirklich durch die
   Leitung geht. */
const ANGABE_KLEIN = [
  "v=0",
  "o=- 4611731400430051336 2 IN IP4 127.0.0.1",
  "s=-",
  "t=0 0",
  "a=group:BUNDLE 0",
  "a=extmap-allow-mixed",
  "a=msid-semantic: WMS",
  "m=application 9 UDP/DTLS/SCTP webrtc-datachannel",
  "c=IN IP4 0.0.0.0",
  "a=candidate:1467250027 1 udp 2122260223 192.168.0.196 46243 typ host generation 0 network-id 1",
  "a=ice-ufrag:ETEn",
  "a=ice-pwd:OtSK0WRNBpwrGSbi8ZmWZ0Ql",
  "a=ice-options:trickle",
  "a=fingerprint:sha-256 40:E2:E9:1F:2B:33:A4:5C:1D:7E:88:0A:F3:61:9B:C2:4D:5E:6F:70:81:92:A3:B4",
  "a=setup:actpass",
  "a=mid:0",
  "a=sctp-port:5000",
  "a=max-message-size:262144",
  ""
].join("\r\n");

const ANGABE_GROSS = [
  "v=0",
  "o=- 7712399201884430022 2 IN IP4 127.0.0.1",
  "s=-",
  "t=0 0",
  "a=group:BUNDLE 0",
  "a=extmap-allow-mixed",
  "a=msid-semantic: WMS",
  "m=application 9 UDP/DTLS/SCTP webrtc-datachannel",
  "c=IN IP4 0.0.0.0",
  "a=candidate:1467250027 1 udp 2122260223 192.168.0.196 46243 typ host generation 0 network-id 1 network-cost 10",
  "a=candidate:1853887674 1 udp 2122194687 10.13.37.2 51402 typ host generation 0 network-id 2 network-cost 10",
  "a=candidate:2779090201 1 udp 1686052607 84.115.61.212 36768 typ srflx raddr 192.168.0.196 rport 46243 generation 0 network-id 1 network-cost 10",
  "a=candidate:3103093040 1 tcp 1518280447 192.168.0.196 9 typ host tcptype active generation 0 network-id 1 network-cost 10",
  "a=candidate:4011337221 1 tcp 1518149375 10.13.37.2 9 typ host tcptype active generation 0 network-id 2 network-cost 10",
  "a=ice-ufrag:9kQx",
  "a=ice-pwd:mZ2vTn7LpQrXbWc4dYe8Fg1H",
  "a=ice-options:trickle",
  "a=fingerprint:sha-256 8C:1A:44:D0:9E:23:57:B6:0F:E1:72:AB:39:CD:64:80:15:F2:7A:3E:C9:D4:6B:08:97:2F:5A:E3:B1:70:4C:D8",
  "a=setup:actpass",
  "a=mid:0",
  "a=sctp-port:5000",
  "a=max-message-size:262144",
  ""
].join("\r\n");

const PROBE_FACH = "K7QM-3F2P-angebot";

/* ══ 1 · Der Packer ═════════════════════════════════════════════════

   Erst das Werkzeug, dann das, was es trägt. Ein Packer, der bei
   irgendeiner Länge ein Byte verliert, macht jede spätere Behauptung
   dieser Datei wertlos — und zwar unauffällig, weil kurze Beispiele
   trotzdem durchkommen. */
{
  abschnitt("Packer");

  const wuerfel = macheZufall(20260906);
  const faelle = [];

  /* Die Ränder, die man beim Bitschreiben falsch macht: nichts,
     ein Byte, genau ein Byte-Rand, ein Stück länger als der längste
     Rückverweis. */
  faelle.push(new Uint8Array(0));
  faelle.push(Uint8Array.from([0]));
  faelle.push(Uint8Array.from([255]));
  faelle.push(new Uint8Array(273).fill(65));
  faelle.push(new Uint8Array(274).fill(66));
  faelle.push(new Uint8Array(9000).fill(67));

  /* Alle 256 Bytewerte — ein Schreiber, der das oberste Bit verliert,
     fällt nur hier auf. */
  const alle = new Uint8Array(256);
  for (let i = 0; i < 256; i++) alle[i] = i;
  faelle.push(alle);

  /* Zufällig, in jeder Länge von 0 bis 200 — dort sitzen die
     Füllbits am Ende. */
  for (let laenge = 0; laenge <= 200; laenge++) {
    const daten = new Uint8Array(laenge);
    for (let i = 0; i < laenge; i++) daten[i] = wuerfel.ganz(0, 255);
    faelle.push(daten);
  }

  /* Ein Rückverweis **jeder** Länge von 3 bis 40. Der Packer schreibt
     kurze Längen anders als lange, und die Grenze zwischen beiden ist
     die Stelle, an der man sich um eins verzählt. Zufälliger Text
     allein trifft sie nur mit Glück: Er besteht fast nur aus einzelnen
     Zeichen und aus sehr langen Wiederholungen. */
  for (let laenge = 3; laenge <= 40; laenge++) {
    const stueck = new Uint8Array(laenge);
    for (let i = 0; i < laenge; i++) stueck[i] = wuerfel.ganz(0, 255);
    const daten = new Uint8Array(laenge * 2 + 2);
    daten.set(stueck, 0);
    daten[laenge] = wuerfel.ganz(0, 255);
    daten.set(stueck, laenge + 1);
    daten[laenge * 2 + 1] = wuerfel.ganz(0, 255);
    faelle.push(daten);
  }

  let abweichungen = 0;
  let roh = 0;
  let gepackt = 0;
  for (const daten of faelle) {
    let zurueck = null;
    /* Ein Packer, der sich verzählt, wirft — und das ist hier eine
       Abweichung wie jede andere, kein Grund, die Prüfung abzubrechen
       und alles Weitere ungeprüft zu lassen. */
    try { zurueck = entpacke(packe(daten)); } catch { abweichungen++; continue; }
    roh += daten.length;
    gepackt += packe(daten).length;
    if (zurueck.length !== daten.length) { abweichungen++; continue; }
    for (let i = 0; i < daten.length; i++) {
      if (zurueck[i] !== daten[i]) { abweichungen++; break; }
    }
  }
  gleich(abweichungen, 0, `${faelle.length} Bytefolgen gehen unverändert durch den Packer`);
  console.log(`      · Packer: ${faelle.length} Fälle, ${roh} Byte roh, ${gepackt} Byte gepackt`);

  /* Die Gegenprobe: Ein Packer, der immer dasselbe zurückgibt, hätte
     oben ebenfalls null Abweichungen. Also muss er auch **kürzen**. */
  const wiederholung = new Uint8Array(4000).fill(88);
  behaupte(packe(wiederholung).length < 200,
    `4000 gleiche Bytes packen sich auf unter 200 (${packe(wiederholung).length})`);

  /* Und er muss an verfälschten Eingaben scheitern statt Nullen zu
     liefern — sonst wäre ein halb gelesener Code nicht zu erkennen. */
  wirft(() => entpacke(Uint8Array.from([0, 0])), "zu kurz für einen Kopf: wirft");
  wirft(() => entpacke(Uint8Array.from([0, 0, 200])), "Kopf verspricht mehr als da ist: wirft");
  wirft(() => entpacke(Uint8Array.from([255, 255, 255, 0])),
    "eine unmöglich lange Ankündigung: wirft");

  /* Zwei Ströme, die von Hand so gebaut sind, dass sie die beiden
     Wände im Entpacker treffen. Sie kommen aus keinem echten Code —
     genau deshalb stehen sie hier: Sonst wären die beiden Wände nie
     ausgeführt, und niemand wüsste, ob sie halten. */
  const bitFolge = (bits) => {
    const bytes = new Uint8Array(Math.ceil(bits.length / 8));
    bits.forEach((b, i) => { if (b) bytes[i >> 3] |= 128 >> (i & 7); });
    return bytes;
  };
  const zahlBits = (wert, breite) => {
    const raus = [];
    for (let i = breite - 1; i >= 0; i--) raus.push((wert >>> i) & 1);
    return raus;
  };

  const vorDenAnfang = Uint8Array.from([0, 0, 4,
    ...bitFolge([1, ...zahlBits(8191, 13), ...zahlBits(0, 4)])]);
  wirft(() => entpacke(vorDenAnfang), "ein Verweis vor den eigenen Anfang: wirft");

  const ueberDasEnde = Uint8Array.from([0, 0, 4,
    ...bitFolge([0, ...zahlBits(88, 8),
      1, ...zahlBits(0, 13), ...zahlBits(15, 4), ...zahlBits(255, 8)])]);
  wirft(() => entpacke(ueberDasEnde), "ein Stück über das angekündigte Ende: wirft");
}

/* ══ 2 · Die Basis-64-Schreibweise ═════════════════════════════════ */
{
  abschnitt("Basis 64");

  const wuerfel = macheZufall(4711);
  let abweichungen = 0;
  for (let laenge = 0; laenge <= 60; laenge++) {
    const daten = new Uint8Array(laenge);
    for (let i = 0; i < laenge; i++) daten[i] = wuerfel.ganz(0, 255);
    const text = nachBasis(daten);
    const zurueck = ausBasis(text);
    if (!zurueck || zurueck.length !== laenge) { abweichungen++; continue; }
    for (let i = 0; i < laenge; i++) if (zurueck[i] !== daten[i]) { abweichungen++; break; }
  }
  gleich(abweichungen, 0, "61 Bytefolgen gehen unverändert durch die Basis-64-Schreibweise");

  gleich(ausBasis("A"), null, "ein einzelnes Zeichen kann kein Byte tragen");
  gleich(ausBasis("AB*D"), null, "ein fremdes Zeichen gibt null");
  gleich(ausBasis("AB+D"), null, "auch das Pluszeichen ist hier fremd");
  behaupte(!/[+/=]/.test(nachBasis(Uint8Array.from([251, 255, 191]))),
    "die Schreibweise benutzt weder Plus noch Schrägstrich noch Gleichheitszeichen");
}

/* ══ 3 · Tausend Angaben im Kreis ══════════════════════════════════

   Zufällig in Länge und Zeichen. Ersatzzeichenpaare werden mit
   `fromCodePoint` gebildet, halbe Paare kommen nicht vor — die wären
   kein Text, sondern eine kaputte Zeichenkette, und `schreibeAngabe`
   weist sie ausdrücklich ab (unten geprüft). */
{
  abschnitt("Rundlauf");

  const wuerfel = macheZufall(99001);
  const FACH_ZEICHEN = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-";

  const zufallsZeichen = () => {
    const w = wuerfel.ganz(0, 99);
    if (w < 70) return String.fromCodePoint(wuerfel.ganz(0x20, 0x7e));
    if (w < 80) return String.fromCodePoint(wuerfel.ganz(0x09, 0x0d));
    if (w < 92) return String.fromCodePoint(wuerfel.ganz(0xa0, 0xd7ff));
    if (w < 97) return String.fromCodePoint(wuerfel.ganz(0xe000, 0xfffd));
    return String.fromCodePoint(wuerfel.ganz(0x10000, 0x10ffff));
  };

  let abweichungen = 0;
  let rohGesamt = 0;
  let codeGesamt = 0;
  let laengster = 0;
  const ANZAHL = 1000;

  for (let i = 0; i < ANZAHL; i++) {
    let fach = "";
    const fachLaenge = wuerfel.ganz(1, 40);
    for (let k = 0; k < fachLaenge; k++) {
      fach += FACH_ZEICHEN[wuerfel.ganz(0, FACH_ZEICHEN.length - 1)];
    }
    let leitung = "";
    const leitungLaenge = wuerfel.ganz(1, 900);
    for (let k = 0; k < leitungLaenge; k++) leitung += zufallsZeichen();

    const angabe = { fach, art: wuerfel.trifft(0.5) ? ANGEBOT : ANTWORT, leitung };
    const code = schreibeAngabe(angabe);
    laengster = Math.max(laengster, code.length);
    rohGesamt += rohtextVon(angabe).length;
    codeGesamt += code.length;

    const gelesen = leseAngabe(code);
    if (!gelesen.ok
      || gelesen.angabe.fach !== angabe.fach
      || gelesen.angabe.art !== angabe.art
      || gelesen.angabe.leitung !== angabe.leitung) {
      abweichungen++;
      if (abweichungen === 1) console.log(`      · erste Abweichung bei Angabe ${i}`);
    }
  }
  gleich(abweichungen, 0, `${ANZAHL} zufällige Angaben gehen verlustfrei hin und zurück`);
  console.log(`      · ${ANZAHL} Angaben: ${rohGesamt} Zeichen roh, ${codeGesamt} als Code, `
    + `längster Code ${laengster}`);

  /* Der Rundlauf über eine Leitung, die aussieht wie eine echte —
     samt Zeilenumbrüchen und dem Trennzeichen des Formats. */
  const mitTrenner = { fach: "abc", art: ANGEBOT, leitung: `a|b||c\r\n${ANGABE_KLEIN}` };
  tiefGleich(leseAngabe(schreibeAngabe(mitTrenner)).angabe, mitTrenner,
    "auch Trennzeichen im freien Stück überleben");

  /* Zeilenumbrüche im **Code** sind kein Fehler des Absenders,
     sondern seines Chatfensters. */
  const zerhackt = schreibeAngabe(mitTrenner).replace(/(.{20})/g, "$1\n  ");
  tiefGleich(leseAngabe(zerhackt).angabe, mitTrenner,
    "ein vom Chat umbrochener Code wird trotzdem gelesen");

  /* Was `schreibeAngabe` ablehnen muss. */
  wirft(() => schreibeAngabe({ fach: "abc", art: "unfug", leitung: "x" }), "fremde Art: wirft");
  /* Der Fall, der ohne Vorsatz falsch wäre: Bei einem gewöhnlichen
     Bündel liefert der Name einer geerbten Eigenschaft einen Wert,
     und „toString" ginge als Art durch. */
  for (const geerbt of ["toString", "constructor", "hasOwnProperty", "__proto__"]) {
    wirft(() => schreibeAngabe({ fach: "abc", art: geerbt, leitung: "x" }),
      `geerbter Name „${geerbt}" ist keine Art: wirft`);
  }
  wirft(() => schreibeAngabe({ fach: "a b", art: ANGEBOT, leitung: "x" }),
    "Leerzeichen im Fachnamen: wirft");
  wirft(() => schreibeAngabe({ fach: "", art: ANGEBOT, leitung: "x" }),
    "leerer Fachname: wirft");
  wirft(() => schreibeAngabe({ fach: "a".repeat(41), art: ANGEBOT, leitung: "x" }),
    "zu langer Fachname: wirft");
  wirft(() => schreibeAngabe({ fach: "abc", art: ANGEBOT, leitung: "" }),
    "leere Leitungsangabe: wirft");
  const zuLang = { fach: "abc", art: ANGEBOT, leitung: "x".repeat(ANGABE_HOECHSTENS + 1) };
  wirft(() => schreibeAngabe(zuLang), "zu lange Leitungsangabe: wirft");
  wirft(() => schreibeAngabe({ fach: "abc", art: ANGEBOT, leitung: "a\ud800b" }),
    "halbes Ersatzzeichen: wirft");
  wirft(() => pruefeAngabe(null), "gar keine Angabe: wirft");

  /* Und was `leseAngabe` als Grund zurückgeben muss, ohne zu werfen. */
  const schlechte = ["", "irgendwas", "HAT1", `${KENNUNG}9.AAAA.AAAAAA`, "HAT1.AAAA", 42, null];
  let gewuerfelt = 0;
  for (const text of schlechte) {
    const gelesen = leseAngabe(text);
    if (gelesen.ok || typeof gelesen.grund !== "string" || gelesen.grund === "") gewuerfelt++;
  }
  gleich(gewuerfelt, 0, "jeder untaugliche Code gibt einen deutschen Grund statt zu werfen");
  behaupte(leseAngabe(`${KENNUNG}9.AAAA.AAAAAA`).grund.includes(String(FASSUNG)),
    "eine fremde Fassung wird als solche benannt");
}

/* ══ 4 · Der Kürzungsgrad ═══════════════════════════════════════════

   Gemessen an echten Leitungsangaben, nicht behauptet. Die Schwelle
   ist bewusst niedriger als das Gemessene: Sie soll anschlagen, wenn
   der Vorrat kaputtgeht, und nicht bei jedem Bit, das sich
   verschiebt. */
{
  abschnitt("Kürzungsgrad");

  const proben = [
    ["eine Netzkarte", ANGABE_KLEIN],
    ["drei Netzkarten", ANGABE_GROSS]
  ];
  let schlechtester = Infinity;
  for (const [name, leitung] of proben) {
    const angabe = { fach: PROBE_FACH, art: ANGEBOT, leitung };
    const roh = rohtextVon(angabe).length;
    const code = schreibeAngabe(angabe).length;
    const faktor = roh / code;
    schlechtester = Math.min(schlechtester, faktor);
    console.log(`      · ${name}: ${roh} Zeichen roh → ${code} als Code `
      + `· Faktor ${faktor.toFixed(2)}`);
    behaupte(code < roh, `${name}: der Code ist kürzer als die Rohangabe`);
  }
  behaupte(schlechtester >= 1.9,
    `der schlechteste gemessene Faktor bleibt über 1,9 (${schlechtester.toFixed(2)})`);

  /* Der eigentliche Wächter über den Vorrat, und zwar unabhängig vom
     Faktor: Ein Text, der **nur** aus festen Bestandteilen besteht,
     muss sich auf ein paar Byte zusammenziehen. Fehlt der Vorrat, ist
     hier nichts mehr zu holen, und diese Zahl springt sofort — der
     Faktor oben täte das erst über den Umweg der ganzen Angabe. */
  const nurFestes = new TextEncoder().encode(
    "a=max-message-size:262144\r\na=sctp-port:5000\r\na=setup:actpass\r\n"
  );
  const festGepackt = packe(nurFestes).length;
  behaupte(festGepackt < 20, `fester Text zieht sich auf den Vorrat zusammen `
    + `(${nurFestes.length} Byte → ${festGepackt})`);

  /* Die Gegenprobe zur Kürzung: Ein Code, der nur wegen des Vorrats
     kurz ist, wäre bei einer Angabe **ohne** die üblichen Wörter
     nicht kürzer als der rohe Text — und genau das darf nicht in
     einen Fehler laufen. */
  const wirr = { fach: "abc", art: ANGEBOT, leitung: "qxz!ß€?7" };
  behaupte(leseAngabe(schreibeAngabe(wirr)).ok,
    "auch eine Angabe, die sich nicht kürzen lässt, bleibt lesbar");

  /* Und der feste Anteil soll klein bleiben: Ein Code, der schon
     leer achtzig Zeichen kostet, wäre für kurze Angaben ein
     Rückschritt. */
  const kleinster = schreibeAngabe(wirr).length;
  behaupte(kleinster < 80, `eine winzige Angabe bleibt ein winziger Code (${kleinster} Zeichen)`);
}

/* ══ 5 · Der verfälschte Einladungscode ════════════════════════════

   Die schärfste Behauptung dieser Datei: Kein verfälschter Code darf
   als eine **andere** gültige Angabe gelesen werden. Erkannt oder
   unverändert — ein Drittes gibt es nicht. */
{
  abschnitt("Verfälschung");

  const grundlagen = [
    { fach: PROBE_FACH, art: ANGEBOT, leitung: ANGABE_KLEIN },
    { fach: "K7QM-3F2P-antwort", art: ANTWORT, leitung: ANGABE_GROSS },
    { fach: "a", art: ANGEBOT, leitung: "x" }
  ];
  const ERSATZ = "AB0z-_9";

  let erkannt = 0;
  let unschaedlich = 0;
  let stillFalsch = 0;
  let versuche = 0;

  const pruefe = (text, soll) => {
    versuche++;
    const gelesen = leseAngabe(text);
    if (!gelesen.ok) { erkannt++; return; }
    if (gelesen.angabe.fach === soll.fach
      && gelesen.angabe.art === soll.art
      && gelesen.angabe.leitung === soll.leitung) { unschaedlich++; return; }
    stillFalsch++;
    if (stillFalsch === 1) console.log(`      · erster stiller Fehlgriff: ${text.slice(0, 50)}`);
  };

  for (const angabe of grundlagen) {
    const code = schreibeAngabe(angabe);
    for (let i = 0; i < code.length; i++) {
      const ersatz = ERSATZ[i % ERSATZ.length] === code[i]
        ? ERSATZ[(i + 1) % ERSATZ.length]
        : ERSATZ[i % ERSATZ.length];
      /* Ein Zeichen anders */
      pruefe(code.slice(0, i) + ersatz + code.slice(i + 1), angabe);
      /* Ein Zeichen weg */
      pruefe(code.slice(0, i) + code.slice(i + 1), angabe);
      /* Ein Zeichen zu viel */
      pruefe(code.slice(0, i) + ersatz + code.slice(i), angabe);
      /* Zwei benachbarte gedreht */
      if (i + 1 < code.length && code[i] !== code[i + 1]) {
        pruefe(code.slice(0, i) + code[i + 1] + code[i] + code.slice(i + 2), angabe);
      }
      /* Vorn abgeschnitten und hinten abgeschnitten */
      pruefe(code.slice(0, i), angabe);
    }
  }
  gleich(stillFalsch, 0, `kein verfälschter Code wird als andere Angabe gelesen `
    + `(${versuche} Versuche)`);
  console.log(`      · ${versuche} verfälschte Codes: ${erkannt} abgewiesen, `
    + `${unschaedlich} ohne Wirkung, ${stillFalsch} still falsch`);
  /* Die Gegenprobe: Wären alle Versuche „ohne Wirkung", prüfte diese
     Schleife nichts. */
  behaupte(erkannt > versuche / 2, "die große Mehrheit der Verfälschungen wird auch abgewiesen");
}

/* ══ 6 · Beide Vermittler, dieselben Fragen ════════════════════════

   Der Fragenkatalog steht einmal und wird zweimal gestellt. Was er
   prüft, ist nicht die Bauart, sondern das Versprechen, auf das sich
   `netz/verbindung.mjs` verlässt. */

async function frageDenVermittler(name, machePaar) {
  abschnitt(`Vermittler · ${name}`);
  const { hier, dort, schliesseAlles } = await machePaar();

  for (const stueck of ["lege", "hole", "warte", "schliesse"]) {
    behaupte(typeof hier[stueck] === "function", `${name}: „${stueck}" ist da`);
  }
  behaupte(typeof hier.art === "string" && hier.art !== "", `${name}: die Art hat einen Namen`);

  /* Ein unbekanntes Fach ist leer und **kein** Fehler. Der Fang ist
     hier absichtlich: Ein Vermittler, der stattdessen wirft, soll als
     Behauptung durchfallen und nicht die ganze Prüfung abbrechen —
     sonst bliebe alles Weitere ungeprüft. */
  const holeStill = async (wer, fach) => {
    try { return await wer.hole(fach); }
    catch (fund) { return `hat geworfen: ${fund.message}`; }
  };
  gleich(await holeStill(dort, "gibt-es-nicht"), null,
    `${name}: ein unbekanntes Fach gibt „nichts" statt eines Fehlers`);

  /* Hin und zurück, über zwei getrennte Enden. */
  const angabe = { art: ANGEBOT, leitung: ANGABE_KLEIN };
  const code = await hier.lege(PROBE_FACH, angabe);
  behaupte(typeof code === "string" && code.startsWith(KENNUNG),
    `${name}: „lege" gibt den Einladungscode zurück`);
  tiefGleich(await dort.hole(PROBE_FACH), { fach: PROBE_FACH, ...angabe },
    `${name}: die Angabe kommt unverändert am anderen Ende an`);

  /* Ein anderes Fach bleibt davon unberührt — sonst bekämen vier
     Spieler alle dieselbe Leitung. */
  gleich(await dort.hole("K7QM-3F2P-antwort"), null,
    `${name}: ein Fach hält nur seinen eigenen Zettel`);

  /* Warten heißt warten: Erst später wird abgelegt. */
  const wartend = dort.warte("K7QM-3F2P-antwort", { frist: 4000, takt: 5, ruhe });
  await ruhe(25);
  await hier.lege("K7QM-3F2P-antwort", { art: ANTWORT, leitung: ANGABE_GROSS });
  const gewartet = await wartend;
  gleich(gewartet.leitung, ANGABE_GROSS, `${name}: „warte" liefert, sobald etwas da ist`);
  gleich(gewartet.art, ANTWORT, `${name}: und liefert die richtige Art`);

  /* Und die Geduld hat ein Ende — mit einem Satz, den man verstehen
     kann, statt mit einem Stillstand. */
  let geduld = null;
  try { await dort.warte("kommt-nie", { frist: 12, takt: 4, ruhe }); }
  catch (fund) { geduld = fund.message; }
  behaupte(typeof geduld === "string" && geduld.includes("gemeldet"),
    `${name}: nach der Frist kommt ein deutscher Satz („${String(geduld).slice(0, 40)}…")`);

  /* Ein untauglicher Fachname ist ein Fehler im eigenen Haus. */
  let gefangen = false;
  try { await hier.lege("kein fach", angabe); } catch { gefangen = true; }
  behaupte(gefangen, `${name}: ein Fachname mit Leerzeichen wird abgewiesen`);

  /* Zweimal schließen tut nichts. */
  hier.schliesse();
  hier.schliesse();
  behaupte(true, `${name}: zweimal schließen ist erlaubt`);

  await schliesseAlles();
}

/* ══ 7 · Das Brett, ohne Leitung ═══════════════════════════════════

   Die Frist mit einer erfundenen Uhr — sonst dauerte diese Prüfung
   fünf Minuten und niemand ließe sie laufen. */
{
  abschnitt("Brett");

  let uhr = 1000;
  const brett = macheBrett({ frist: 60000, jetzt: () => uhr, faecherHoechstens: 3 });

  gleich(brett.hole("abc"), null, "ein leeres Fach gibt null");
  gleich(brett.lege("abc", "HAT1.xy.zz").ok, true, "ein Zettel lässt sich ablegen");
  gleich(brett.hole("abc"), "HAT1.xy.zz", "und wiederfinden");

  uhr += 59999;
  gleich(brett.hole("abc"), "HAT1.xy.zz", "kurz vor der Frist liegt er noch da");
  uhr += 1;
  gleich(brett.hole("abc"), null, "mit der Frist ist er weg");
  gleich(brett.anzahl(), 0, "und belegt kein Fach mehr");

  gleich(brett.lege("a b", "x").ok, false, "ein untauglicher Fachname wird abgewiesen");
  gleich(brett.lege("abc", "").ok, false, "ein leerer Zettel wird abgewiesen");
  gleich(brett.lege("abc", "   ").ok, false, "und ein Zettel aus Leerraum auch");
  gleich(brett.lege("abc", "x".repeat(ZETTEL_HOECHSTENS + 1)).ok, false,
    "ein zu langer Zettel wird abgewiesen");

  brett.lege("f1", "x");
  brett.lege("f2", "x");
  brett.lege("f3", "x");
  gleich(brett.lege("f4", "x").ok, false, "ist das Brett voll, kommt ein Satz und kein Absturz");
  gleich(brett.lege("f2", "y").ok, true, "ein schon belegtes Fach lässt sich trotzdem erneuern");
  gleich(brett.hole("f2"), "y", "und trägt danach den neuen Zettel");

  /* Die Antworten, ohne Anschluss. */
  const broker = macheBroker({ brett });
  gleich(broker.antwortAuf({ verfahren: "GET", pfad: "/brett/gibt-es-nicht" }).kode, 200,
    "ein unbekanntes Fach ist eine gewöhnliche Antwort, kein Fehler");
  gleich(broker.antwortAuf({ verfahren: "GET", pfad: "/brett/gibt-es-nicht" }).koerper.trim(),
    "nichts", "und sagt „nichts“");
  gleich(broker.antwortAuf({ verfahren: "GET", pfad: "/anderswo" }).kode, 404,
    "ein fremder Weg ist ein 404");
  gleich(broker.antwortAuf({ verfahren: "PUT", pfad: "/brett/f1" }).kode, 405,
    "ein fremdes Verfahren ist ein 405");
  gleich(broker.antwortAuf({ verfahren: "OPTIONS", pfad: "/brett/f1" }).kode, 204,
    "die Voranfrage des Browsers wird beantwortet");
  gleich(broker.antwortAuf({ verfahren: "GET", pfad: "/brett/%ZZ" }).kode, 400,
    "eine kaputte Adresse hält den Vermittler nicht an");
  gleich(broker.antwortAuf({ verfahren: "GET", pfad: "/" }).kode, 200,
    "die Wurzel erklärt sich selbst");
}

/* ══ 8 · Der Vermittler mit echter Leitung ═════════════════════════ */
async function frageDenBroker() {
  abschnitt("Broker über eine echte Leitung");

  const broker = macheBroker();
  const hafen = await broker.starte(0, "127.0.0.1");
  const adresse = `http://127.0.0.1:${hafen}`;
  behaupte(hafen > 0, `der Vermittler läuft auf einem freien Hafen (${hafen})`);

  /* Erst roh: Ein unbekanntes Fach muss über die Leitung als
     gewöhnliche Antwort ankommen. Ein 404 hier hieße, dass jeder
     Browser einen roten Eintrag je Sekunde protokolliert. */
  const roh = await fetch(`${adresse}/brett/gibt-es-nicht`);
  gleich(roh.status, 200, "unbekanntes Fach über die Leitung: Rückgabewert 200");
  gleich((await roh.text()).trim(), "nichts", "und der Inhalt sagt „nichts“");
  gleich(roh.headers.get("access-control-allow-origin"), "*",
    "der Browser darf von einer anderen Herkunft fragen");

  const zuGross = await fetch(`${adresse}/brett/gross`, {
    method: "POST", body: "x".repeat(ZETTEL_HOECHSTENS + 10)
  });
  behaupte(zuGross.status >= 400, `ein zu langer Zettel wird abgewiesen (${zuGross.status})`);

  await frageDenVermittler("über den Vermittler", async () => ({
    hier: vermittlerUeberBroker(adresse, { ruhe }),
    dort: vermittlerUeberBroker(`${adresse}/`, { ruhe }),
    schliesseAlles: async () => {}
  }));

  /* Ein Vermittler, den es nicht gibt, endet als Satz mit der
     Adresse darin — und nicht als englische Ausnahme. */
  const falsch = vermittlerUeberBroker("http://127.0.0.1:1", { ruhe });
  let grund = null;
  try { await falsch.hole("abc"); } catch (fund) { grund = fund.message; }
  behaupte(typeof grund === "string" && grund.includes("127.0.0.1:1"),
    "ein toter Vermittler wird mit seiner Adresse gemeldet");

  wirft(() => vermittlerUeberBroker("192.168.0.20:7788"),
    "eine Adresse ohne „http://“ wird abgewiesen");

  await broker.halt();
}

/* ══ 9 · Die Leitung ohne Browser ══════════════════════════════════ */

/* Ein erfundener Browser: gerade so viel, wie `netz/verbindung.mjs`
   anfasst. Er schreibt jeden Aufruf mit, damit die Prüfung über die
   **mitgeschriebene** Reihenfolge behaupten kann und nicht über das,
   was man erwartet.

   Die beiden Enden finden sich über die Angabe: Der Gastgeber schreibt
   seine Nummer hinein, der Gast liest sie und meldet sich zurück. */
const ANSCHLUESSE = new Map();
let naechsteNummer = 1;

function macheZiel() {
  const hoerer = new Map();
  return {
    addEventListener(art, fn) {
      if (!hoerer.has(art)) hoerer.set(art, []);
      hoerer.get(art).push(fn);
    },
    removeEventListener(art, fn) {
      const liste = hoerer.get(art) || [];
      const stelle = liste.indexOf(fn);
      if (stelle >= 0) liste.splice(stelle, 1);
    },
    melde(art, angaben = {}) {
      for (const fn of [...(hoerer.get(art) || [])]) fn(angaben);
    }
  };
}

function macheErsatzKanal(name, spur) {
  const ziel = macheZiel();
  return {
    ...ziel,
    label: name,
    readyState: "connecting",
    gegenstelle: null,
    send(text) {
      spur.push(`send:${text}`);
      const gegen = this.gegenstelle;
      queueMicrotask(() => gegen && gegen.melde("message", { data: text }));
    },
    close() { this.readyState = "closed"; ziel.melde("close"); }
  };
}

function macheErsatzBrowser(spur) {
  return function ErsatzLeitung(angaben) {
    const ziel = macheZiel();
    const nummer = naechsteNummer++;
    const selbst = {
      ...ziel,
      nummer,
      iceGatheringState: "gathering",
      connectionState: "new",
      localDescription: null,
      remoteDescription: null,
      kanal: null,
      helfer: (angaben && angaben.iceServers) || [],

      createDataChannel(name) {
        spur.push(`kanal:${name}`);
        selbst.kanal = macheErsatzKanal(name, spur);
        return selbst.kanal;
      },
      async createOffer() { spur.push("angebot"); return { type: "offer", sdp: `A:${nummer}` }; },
      async createAnswer() { spur.push("antwort"); return { type: "answer", sdp: `W:${nummer}` }; },
      async setLocalDescription(beschreibung) {
        spur.push(`lokal:${beschreibung.sdp}`);
        selbst.localDescription = beschreibung;
        /* Die Adressen kommen erst später — genau darauf wartet
           `warteAufAdressen`, und genau das soll geprüft sein. */
        setTimeout(() => {
          selbst.iceGatheringState = "complete";
          selbst.melde("icegatheringstatechange");
        }, 5);
      },
      async setRemoteDescription(beschreibung) {
        spur.push(`fremd:${beschreibung.sdp}`);
        selbst.remoteDescription = beschreibung;
        const gegen = ANSCHLUESSE.get(Number(beschreibung.sdp.split(":")[1]));
        if (!gegen) return;
        if (beschreibung.type === "answer") verbinde(selbst, gegen, spur);
      },
      close() { selbst.connectionState = "closed"; }
    };
    ANSCHLUESSE.set(nummer, selbst);
    return selbst;
  };
}

/* Beide Enden sind bekannt: Der Kanal des Gastgebers bekommt sein
   Gegenstück beim Gast, und beide gehen auf. */
function verbinde(gastgeber, gast, spur) {
  const gegenKanal = macheErsatzKanal("hatred", spur);
  gastgeber.kanal.gegenstelle = gegenKanal;
  gegenKanal.gegenstelle = gastgeber.kanal;
  queueMicrotask(() => {
    gast.melde("datachannel", { channel: gegenKanal });
    gastgeber.kanal.readyState = "open";
    gegenKanal.readyState = "open";
    gastgeber.connectionState = "connected";
    gast.connectionState = "connected";
    gastgeber.kanal.melde("open");
    gegenKanal.melde("open");
  });
}

async function pruefeLeitung() {
  abschnitt("Leitung");

  /* Zuerst der Fall, der ohne diese Arbeit falsch wäre: Die Datei
     lässt sich in Node einbinden — sonst wäre alles darüber
     ungeprüft —, und der fehlende Baustein endet als deutscher Satz. */
  behaupte(typeof globalThis.RTCPeerConnection !== "function",
    "in Node gibt es den Baustein für die direkte Verbindung nicht");
  let ohneBrowser = null;
  try { holeBauart(); } catch (fund) { ohneBrowser = fund.message; }
  behaupte(typeof ohneBrowser === "string" && ohneBrowser.includes("WebRTC"),
    "ohne Browser gibt es einen deutschen Satz, der den fehlenden Baustein benennt");
  behaupte(String(ohneBrowser).includes("Verbindung"),
    "und er sagt, worum es ging — nicht nur, was fehlt");

  /* Die Gegenprobe: Ist der Baustein da, wird er auch genommen. Ohne
     sie könnte `holeBauart` immer werfen und die Prüfung wäre grün. */
  globalThis.RTCPeerConnection = function Probe() {};
  gleich(holeBauart(), globalThis.RTCPeerConnection,
    "ist der Baustein da, wird er genommen");
  delete globalThis.RTCPeerConnection;

  /* Ein Vermittler, der die Schnittstelle nicht erfüllt, fällt beim
     Bauen auf und nicht drei Sekunden später. */
  wirft(() => macheVerbindung({ vermittler: null }), "ohne Vermittler: wirft");
  wirft(() => macheVerbindung({ vermittler: { lege() {}, hole() {} } }),
    "halber Vermittler: wirft");

  const leer = macheVerbindung({ vermittler: vermittlerVonHand(), ruhe });
  gleich(leer.stand().zustand, ZU, "eine frische Leitung ist zu");
  gleich(leer.sende("h|0"), false, "in eine geschlossene Leitung geht nichts");
  leer.schliesse();
  gleich(leer.stand().zustand, ZU, "und schließen ändert daran nichts");

  let abgesagt = null;
  try { await leer.oeffne(); } catch (fund) { abgesagt = fund.message; }
  behaupte(typeof abgesagt === "string" && abgesagt.includes("WebRTC"),
    "das Öffnen ohne Browser endet mit demselben Satz");
  gleich(leer.stand().zustand, GESCHEITERT, "und die Leitung steht danach auf „gescheitert“");

  /* ── Der ganze Ablauf, mit erfundenem Browser ────────────────────*/
  const spur = [];
  globalThis.RTCPeerConnection = macheErsatzBrowser(spur);

  /* Zwei Vermittler von Hand, dazwischen ein Mensch, der kopiert —
     genau der Weg, den Jannik ohne alles gehen kann. */
  const beimGastgeber = vermittlerVonHand({ ruhe });
  const beimGast = vermittlerVonHand({ ruhe });
  let kopiert = 0;
  beimGastgeber.beiText((text) => { kopiert++; beimGast.fuegeEin(text); });
  beimGast.beiText((text) => { kopiert++; beimGastgeber.fuegeEin(text); });

  const gastgeber = macheVerbindung({
    istGastgeber: true, vermittler: beimGastgeber, fach: "K7QM-3F2P", ruhe
  });
  const gast = macheVerbindung({
    istGastgeber: false, vermittler: beimGast, fach: "K7QM-3F2P", ruhe
  });

  const beimGastgeberAn = [];
  const beimGastAn = [];
  gastgeber.beiEmpfang((zeile) => beimGastgeberAn.push(zeile));
  gast.beiEmpfang((zeile) => beimGastAn.push(zeile));
  const zustaende = [];
  gastgeber.beiZustand((neu) => zustaende.push(neu));

  const beide = await Promise.all([
    gastgeber.oeffne(),
    gast.oeffne()
  ]);
  behaupte(beide[0] === true && beide[1] === true, "beide Seiten melden eine offene Leitung");
  gleich(gastgeber.stand().zustand, OFFEN, "der Gastgeber steht auf „offen“");
  gleich(gast.stand().zustand, OFFEN, "der Gast steht auf „offen“");
  gleich(kopiert, 2, "genau zwei Codes wurden kopiert — Angebot und Antwort");

  /* Die Reihenfolge, mitgeschrieben statt vermutet: Der Kanal
     entsteht **vor** dem Angebot. Wer ihn danach anlegt, bekommt eine
     Angabe ohne Kanal — und eine Leitung, die aufgeht und stumm
     bleibt. */
  gleich(spur[0], "kanal:hatred", "der Datenkanal entsteht als Erstes");
  gleich(spur[1], "angebot", "danach erst das Angebot");
  behaupte(spur.indexOf("antwort") > spur.indexOf("angebot"),
    "die Antwort kommt nach dem Angebot");

  /* Und jetzt das, wofür das Ganze da ist: eine Zeile hin, eine
     zurück. Der Inhalt ist eine echte Nachricht aus
     `netz/nachrichten.mjs` — Form ohne Bedeutung wäre keine Probe. */
  gleich(gastgeber.sende("h|7"), true, "der Gastgeber kann senden");
  gleich(gast.sende("b|1|Jannik"), true, "der Gast kann senden");
  await ruhe(10);
  tiefGleich(beimGastAn, ["h|7"], "die Zeile des Gastgebers kommt beim Gast an");
  tiefGleich(beimGastgeberAn, ["b|1|Jannik"], "und die des Gastes beim Gastgeber");
  gleich(gastgeber.stand().gesendet, 1, "der Gastgeber zählt eine gesendete Zeile");
  gleich(gastgeber.stand().empfangen, 1, "und eine empfangene");
  behaupte(zustaende.includes("vermittelt") && zustaende.includes("verbindet")
    && zustaende.includes(OFFEN), `alle Zustände wurden gemeldet (${zustaende.join(" → ")})`);

  gastgeber.schliesse();
  gleich(gastgeber.stand().zustand, ZU, "nach dem Schließen ist die Leitung zu");
  gleich(gastgeber.sende("h|8"), false, "und nimmt nichts mehr an");
  gast.schliesse();
  delete globalThis.RTCPeerConnection;
}

/* ══ Ablauf ════════════════════════════════════════════════════════ */

await frageDenVermittler("Einladungscode von Hand", async () => {
  const hier = vermittlerVonHand({ ruhe });
  const dort = vermittlerVonHand({ ruhe });
  /* Der Mensch dazwischen: Er kopiert, mehr tut er nicht. */
  hier.beiText((text) => dort.fuegeEin(text));
  dort.beiText((text) => hier.fuegeEin(text));
  return { hier, dort, schliesseAlles: async () => { hier.schliesse(); dort.schliesse(); } };
});

await frageDenBroker();
await pruefeLeitung();

ende("Leitung und Vermittlung");
