/* [Aufgabe: Netz] Die Vermittlung: zwei Rechner tauschen genau einmal
   eine Angabe aus — von Hand als Einladungscode oder über einen
   selbst betriebenen Vermittler.

   ── Warum es das gibt / Warum so ───────────────────────────────────

   Zwei Rechner in zwei Wohnungen kennen einander nicht. Bevor sie
   direkt miteinander reden können (`netz/verbindung.mjs`), muss jeder
   dem anderen **einmal** sagen, wo und wie er erreichbar ist. Das ist
   alles, was hier passiert: eine Angabe hin, eine Angabe zurück.
   Danach wird diese Datei nicht mehr gebraucht — kein Spielzug, kein
   Bild und kein Byte des Spiels läuft je durch sie.

   **Warum zwei Wege und nicht einer.** Sie kosten Verschiedenes, und
   die Wahl gehört dem Auftraggeber, nicht uns. Der Einladungscode
   braucht **nichts** — kein Konto, keinen Server, keinen Dienst —,
   verlangt dafür aber zwei Kopiervorgänge je Mitspieler. Der eigene
   Vermittler nimmt das ab, verlangt aber, dass einer der Freunde ein
   kleines Programm laufen lässt. Beide erfüllen dieselbe
   Schnittstelle, deshalb kennt `netz/verbindung.mjs` den Unterschied
   nicht und muss ihn nie kennen.

   **Warum eine eigene Kodierung und nicht der rohe Text.** Die
   Rohangabe einer Leitung ist eine Bildschirmseite lang und
   wiederholt sich stark: dieselben Zeilenanfänge, dieselben festen
   Wörter, dieselben Adressen mehrfach. So etwas klebt niemand in einen
   Chat. Deshalb wird sie gepackt (Rückverweise auf schon Gesagtes)
   und mit einem **Vorrat** vorgeladen, der die festen Wortteile einer
   solchen Angabe bereits enthält — der erste Rückverweis kann so schon
   auf Text zeigen, der noch gar nicht geschrieben wurde. Den erreichten
   Kürzungsgrad misst `werkzeuge/pruefe-leitung.mjs`; er steht nirgends
   als Behauptung, sondern wird bei jedem Lauf ausgerechnet.

   **Warum eine Prüfzahl am Ende des Codes.** Ein Code wird kopiert,
   und beim Kopieren geht das letzte Zeichen verloren, oder ein
   Chatprogramm bricht die Zeile um und schluckt ein Stück. Ohne
   Prüfzahl entstünde daraus eine Angabe, die sich **halb** lesen
   lässt — und zwei Freunde säßen mit zwei verschiedenen Leitungen da,
   ohne dass jemand etwas gemerkt hätte. Mit ihr ist der Fall ein Satz
   auf dem Bildschirm: „Der Code ist verfälscht."

   **Warum aller Leerraum vor dem Lesen wegfällt.** Ein Chat bricht
   lange Zeilen um. Der Umbruch ist kein Fehler des Absenders, sondern
   des Fensters, in dem er getippt hat — und ein Werkzeug, das daran
   scheitert, ist im Alltag unbrauchbar.

   **Warum das Fach den Lobbycode trägt.** Der Vermittler kennt nur
   Fächer, ein Fach ist ein Name. Wer den Lobbycode voranstellt
   (`K7QM-3F2P-angebot`), bekommt getrennte Runden geschenkt, ohne dass
   der Vermittler je erfahren müsste, was eine Lobby ist. Ein zweiter
   Begriff wäre eine zweite Wahrheit (Fehlerbuch E2).

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `netz/verbindung.mjs` (der einzige Aufrufer im Spiel: legt seine
   Angabe ab und wartet auf die der Gegenseite), `netz/broker.mjs`
   (die Gegenstelle des zweiten Weges — hier **nicht** eingebunden,
   damit diese Datei im Browser lädt), `netz/lobbycode.mjs` (liefert
   den Namen, aus dem das Fach gebaut wird), `docs/NETZ.md` (erklärt
   beide Wege in normaler Sprache), `werkzeuge/pruefe-leitung.mjs`
   (fährt 1.000 Angaben im Kreis, verfälscht Codes an jeder Stelle und
   stellt an beide Vermittler dieselben Fragen). */

/* Die Fassung des Codeformats. Sie steht **im** Code, weil sich sonst
   ein Code aus einer alten Fassung stumm falsch lesen ließe: Der
   Vorrat unten ist Teil des Formats, und wer ihn ändert, ändert die
   Bedeutung jedes Rückverweises. */
export const FASSUNG = 1;
export const KENNUNG = "HAT";

export const ANGEBOT = "angebot";
export const ANTWORT = "antwort";

/* Ein Buchstabe je Art. Der Code soll kurz sein, und ein ganzes Wort
   in der Rohangabe kostet nach dem Packen zwar fast nichts — aber die
   Kürzel sind zugleich die Prüfung, dass nichts anderes durchkommt.

   **Warum eine Abbildung und kein gewöhnliches Bündel.** Bei einem
   Bündel liefert `bündel["toString"]` eine Funktion aus dem Erbe und
   damit einen Wert, der als „ja, diese Art gibt es" durchgeht. Die
   Art käme von außen — aus einem Code, den jemand geschickt hat —,
   und damit wäre der Name einer geerbten Eigenschaft eine gültige
   Nachricht. Eine Abbildung kennt nur, was hineingelegt wurde. */
const ART_NACH_KUERZEL = new Map([["a", ANGEBOT], ["w", ANTWORT]]);
const KUERZEL_NACH_ART = new Map([[ANGEBOT, "a"], [ANTWORT, "w"]]);

/* Ein Fachname ist ein Lobbycode plus Rolle. Buchstaben, Ziffern und
   Bindestrich — mehr braucht er nicht, und mehr wäre in einer Adresse
   des Vermittlers zu maskieren. */
export const FACH_MUSTER = /^[A-Za-z0-9-]{1,40}$/;

/* Wie lang eine Angabe höchstens sein darf. Eine echte Angabe mit
   allen Adressen liegt weit darunter; was darüber liegt, ist nichts,
   was dieses Spiel je erzeugt hat. */
export const ANGABE_HOECHSTENS = 60000;

const TRENNER = "|";
const PUNKT = ".";

/* ── Der Vorrat ─────────────────────────────────────────────────────

   Vorgeladener Text für den Packer: die festen Bestandteile einer
   Leitungsangabe, so wie ein Browser sie schreibt. Er wird **nie
   mitgeschickt** — beide Seiten haben ihn, weil beide diese Datei
   haben. Deshalb kostet ein Rückverweis hierhin genau so viel wie ein
   Rückverweis in den eigenen Text: knapp zwei Byte für bis zu 273
   Zeichen.

   **Diese Zeilen und ihre Reihenfolge dürfen sich nie ändern**, ohne
   dass `FASSUNG` steigt. Sie sind Teil der Sprache, nicht Zierde:
   Ein Code, der gestern galt, muss morgen dieselbe Angabe ergeben. */
const VORRAT_ZEILEN = [
  "v=0\r\no=- 0 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n",
  "a=group:BUNDLE 0\r\na=extmap-allow-mixed\r\na=msid-semantic: WMS\r\n",
  "m=application 9 UDP/DTLS/SCTP webrtc-datachannel\r\nc=IN IP4 0.0.0.0\r\nb=AS:30\r\n",
  "a=ice-ufrag:\r\na=ice-pwd:\r\na=ice-options:trickle\r\na=ice-lite\r\n",
  "a=fingerprint:sha-256 00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF\r\n",
  "a=setup:actpass\r\na=setup:active\r\na=setup:passive\r\na=mid:0\r\n",
  "a=sctp-port:5000\r\na=max-message-size:262144\r\na=end-of-candidates\r\n",
  "a=candidate:0 1 udp 2122260223 192.168.0.0 50000 typ host generation 0 ",
  "network-id 1 network-cost 10\r\n",
  "a=candidate:1 1 udp 1686052607 10.0.0.0 50000 typ srflx raddr 192.168.0.0 rport 50000 ",
  "a=candidate:2 1 tcp 1518280447 127.0.0.1 9 typ host tcptype active ",
  "typ relay raddr 0.0.0.0 rport 0 ufrag ",
  "angebot|antwort|"
];
const VORRAT = VORRAT_ZEILEN.join("");

/* ── Text und Bytes ─────────────────────────────────────────────────*/

const NACH_BYTES = new TextEncoder();
const NACH_TEXT = new TextDecoder();

const zuBytes = (text) => NACH_BYTES.encode(text);
const zuText = (bytes) => NACH_TEXT.decode(bytes);

const VORRAT_BYTES = zuBytes(VORRAT);

/* ── Die Prüfzahl ───────────────────────────────────────────────────

   FNV-1a über 32 Bit. Sie soll keinen Angreifer aufhalten (dafür wäre
   sie das falsche Werkzeug), sondern den Alltagsfall fangen: ein
   Zeichen vertippt, ein Stück abgeschnitten, zwei Zeichen vertauscht.
   Gerechnet wird über den **rohen** Text, nicht über die gepackten
   Bytes — so deckt sie die ganze Kette ab und nicht nur ihr Ende. */
function pruefzahl(bytes) {
  let wert = 0x811c9dc5;
  for (let i = 0; i < bytes.length; i++) {
    wert = (wert ^ bytes[i]) >>> 0;
    wert = Math.imul(wert, 0x01000193) >>> 0;
  }
  return wert >>> 0;
}

/* ── Basis 64, in der Schreibweise für Adressen ─────────────────────

   Kein Pluszeichen, kein Schrägstrich, kein Gleichheitszeichen: Ein
   Code landet in einem Chat, in einer Adresse und in einer Textdatei,
   und jedes dieser drei Dinge tut mit genau diesen Zeichen etwas
   Eigenes. Übrig bleiben Buchstaben, Ziffern, Strich und Unterstrich —
   die kann man überall hineinkleben. */
const BASIS_ZEICHEN = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const BASIS_WERTE = new Map();
for (let i = 0; i < BASIS_ZEICHEN.length; i++) BASIS_WERTE.set(BASIS_ZEICHEN[i], i);

export function nachBasis(bytes) {
  let aus = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const rest = bytes.length - i;
    const a = bytes[i], b = rest > 1 ? bytes[i + 1] : 0, c = rest > 2 ? bytes[i + 2] : 0;
    aus += BASIS_ZEICHEN[a >>> 2];
    aus += BASIS_ZEICHEN[((a & 3) << 4) | (b >>> 4)];
    if (rest > 1) aus += BASIS_ZEICHEN[((b & 15) << 2) | (c >>> 6)];
    if (rest > 2) aus += BASIS_ZEICHEN[c & 63];
  }
  return aus;
}

/* Gibt `null` statt zu werfen: Ein fremdes Zeichen im Code ist der
   Normalfall eines vertippten Codes, kein Programmfehler. */
export function ausBasis(text) {
  const anzahl = text.length;
  /* Ein einzelnes übriges Zeichen kann nie ein Byte tragen — so ein
     Code ist abgeschnitten und keine gültige Gruppe. */
  if (anzahl % 4 === 1) return null;
  const bytes = new Uint8Array(Math.floor((anzahl * 3) / 4));
  let hin = 0;
  for (let i = 0; i < anzahl; i += 4) {
    const rest = anzahl - i;
    const a = BASIS_WERTE.get(text[i]);
    const b = BASIS_WERTE.get(text[i + 1]);
    if (a === undefined || b === undefined) return null;
    bytes[hin++] = ((a << 2) | (b >>> 4)) & 255;
    if (rest > 2) {
      const c = BASIS_WERTE.get(text[i + 2]);
      if (c === undefined) return null;
      bytes[hin++] = (((b & 15) << 4) | (c >>> 2)) & 255;
      if (rest > 3) {
        const d = BASIS_WERTE.get(text[i + 3]);
        if (d === undefined) return null;
        bytes[hin++] = (((c & 3) << 6) | d) & 255;
      }
    }
  }
  return bytes.subarray(0, hin);
}

/* ── Der Packer ─────────────────────────────────────────────────────

   Rückverweise auf schon Gesagtes, bitweise geschrieben. Ein Stück
   Text ist entweder ein einzelnes Zeichen (1 + 8 Bit) oder ein
   Rückverweis „gehe V Zeichen zurück und nimm von dort L Zeichen"
   (1 + 13 + 4 Bit, bei langen Stücken 8 Bit mehr). Ab drei gleichen
   Zeichen lohnt der Verweis — 18 Bit gegen 27.

   **Warum bitweise und nicht in ganzen Bytes.** Ein byteweiser
   Rückverweis kostet mindestens drei Byte; damit lohnt er erst ab
   vier gleichen Zeichen, und genau die kurzen Wiederholungen (`:`,
   ` 1 `, `typ `) sind es, aus denen eine Leitungsangabe besteht.

   **Warum eine Streutabelle und keine geradlinige Suche.** Für jedes
   Zeichen 8192 Stellen durchzusehen sind bei einer Angabe von zwei
   Kilobyte sechzehn Millionen Vergleiche — und die Prüfung fährt
   tausend Angaben. Die Tabelle merkt sich, wo drei gleiche Zeichen
   zuletzt standen, und daraus wird eine kurze Kette. */
const FENSTER = 8192;
const VERSATZ_BITS = 13;
const LAENGE_KLEIN = 3;
const LAENGE_GROSS = 273;
const STREU_BITS = 15;
const STREU_ANZAHL = 1 << STREU_BITS;
const KETTE_TIEFE = 96;

function macheSchreiber() {
  const bytes = [];
  let sammler = 0;
  let bits = 0;
  const bit = (wert) => {
    sammler = ((sammler << 1) | (wert & 1)) & 255;
    if (++bits === 8) { bytes.push(sammler); sammler = 0; bits = 0; }
  };
  return {
    bit,
    zahl(wert, breite) { for (let i = breite - 1; i >= 0; i--) bit((wert >>> i) & 1); },
    fertig() {
      while (bits !== 0) bit(0);
      return Uint8Array.from(bytes);
    }
  };
}

function macheLeser(bytes) {
  let stelle = 0;
  let bits = 0;
  const bit = () => {
    if (stelle >= bytes.length) throw new Error("Der Code hört mitten in einer Angabe auf.");
    const wert = (bytes[stelle] >>> (7 - bits)) & 1;
    if (++bits === 8) { bits = 0; stelle++; }
    return wert;
  };
  return {
    bit,
    zahl(breite) {
      let wert = 0;
      for (let i = 0; i < breite; i++) wert = ((wert << 1) | bit()) >>> 0;
      return wert;
    }
  };
}

export function packe(daten) {
  const anfang = VORRAT_BYTES.length;
  const gesamt = new Uint8Array(anfang + daten.length);
  gesamt.set(VORRAT_BYTES, 0);
  gesamt.set(daten, anfang);
  const schluss = gesamt.length;

  const kopf = new Int32Array(STREU_ANZAHL).fill(-1);
  const vorher = new Int32Array(schluss).fill(-1);
  const streu = (p) =>
    (((gesamt[p] << 10) ^ (gesamt[p + 1] << 5) ^ gesamt[p + 2]) >>> 0) & (STREU_ANZAHL - 1);
  const trageEin = (p) => { const h = streu(p); vorher[p] = kopf[h]; kopf[h] = p; };

  /* Der Vorrat kommt vollständig in die Tabelle, bevor das erste
     Zeichen der Angabe geschrieben wird — sonst fände der erste
     Rückverweis ihn nie. */
  for (let p = 0; p + 2 < anfang; p++) trageEin(p);

  const schreiber = macheSchreiber();
  let p = anfang;
  while (p < schluss) {
    let besteLaenge = 0;
    let besterVersatz = 0;
    if (p + 2 < schluss) {
      const grenze = p - FENSTER;
      const hoechstens = Math.min(LAENGE_GROSS, schluss - p);
      let kandidat = kopf[streu(p)];
      let versuche = KETTE_TIEFE;
      while (kandidat >= 0 && kandidat > grenze && versuche-- > 0) {
        let laenge = 0;
        while (laenge < hoechstens && gesamt[kandidat + laenge] === gesamt[p + laenge]) laenge++;
        if (laenge > besteLaenge) {
          besteLaenge = laenge;
          besterVersatz = p - kandidat;
          if (laenge === hoechstens) break;
        }
        kandidat = vorher[kandidat];
      }
    }

    if (besteLaenge >= LAENGE_KLEIN) {
      schreiber.bit(1);
      schreiber.zahl(besterVersatz - 1, VERSATZ_BITS);
      const rest = besteLaenge - LAENGE_KLEIN;
      if (rest < 15) schreiber.zahl(rest, 4);
      else { schreiber.zahl(15, 4); schreiber.zahl(rest - 15, 8); }
      for (let i = 0; i < besteLaenge; i++) {
        if (p + 2 < schluss) trageEin(p);
        p++;
      }
      continue;
    }
    schreiber.bit(0);
    schreiber.zahl(gesamt[p], 8);
    if (p + 2 < schluss) trageEin(p);
    p++;
  }

  /* Drei Byte Länge vorweg. Ohne sie wüsste der Leser nicht, wo die
     Angabe aufhört und die Füllbits anfangen — und ein Füllbit sieht
     aus wie der Anfang eines Zeichens. */
  const stuecke = schreiber.fertig();
  const aus = new Uint8Array(3 + stuecke.length);
  aus[0] = (daten.length >>> 16) & 255;
  aus[1] = (daten.length >>> 8) & 255;
  aus[2] = daten.length & 255;
  aus.set(stuecke, 3);
  return aus;
}

export function entpacke(roh) {
  if (roh.length < 3) throw new Error("Der Code ist zu kurz für eine Angabe.");
  const laenge = (roh[0] << 16) | (roh[1] << 8) | roh[2];
  if (laenge > ANGABE_HOECHSTENS * 4) {
    throw new Error("Der Code kündigt mehr Text an, als eine Angabe je hat.");
  }
  const anfang = VORRAT_BYTES.length;
  const gesamt = new Uint8Array(anfang + laenge);
  gesamt.set(VORRAT_BYTES, 0);
  const schluss = anfang + laenge;
  const leser = macheLeser(roh.subarray(3));

  let p = anfang;
  while (p < schluss) {
    if (leser.bit() === 0) { gesamt[p++] = leser.zahl(8); continue; }
    const versatz = leser.zahl(VERSATZ_BITS) + 1;
    let rest = leser.zahl(4);
    if (rest === 15) rest = 15 + leser.zahl(8);
    const laengeStueck = rest + LAENGE_KLEIN;
    /* Beide Wände: ein Verweis vor den Anfang und ein Stück über das
       angekündigte Ende hinaus. Ohne sie liest ein verfälschter Code
       Nullen statt zu scheitern — genau das stille Halblesen, das
       diese Datei verhindern soll. */
    if (versatz > p) throw new Error("Der Code verweist hinter seinen eigenen Anfang.");
    if (p + laengeStueck > schluss) throw new Error("Der Code ist länger als angekündigt.");
    for (let i = 0; i < laengeStueck; i++) { gesamt[p] = gesamt[p - versatz]; p++; }
  }
  return gesamt.subarray(anfang);
}

/* ── Die Angabe ─────────────────────────────────────────────────────

   `{ fach, art, leitung }` — mehr steht nicht darin, und das ist
   Absicht. `leitung` ist der Text, den der Browser über seine eigene
   Erreichbarkeit schreibt; dieses Spiel legt ihn nur ab und holt ihn
   wieder, es liest ihn nie aus. Wer hier ein Feld dazuerfindet, muss
   `FASSUNG` erhöhen.

   Das freie Stück steht hinten, damit es nicht maskiert werden muss —
   dieselbe Begründung wie in `netz/nachrichten.mjs`. */
function rohVon(angabe) {
  const kuerzel = KUERZEL_NACH_ART.get(angabe.art);
  return `${kuerzel}${TRENNER}${angabe.fach}${TRENNER}${angabe.leitung}`;
}

/* Für die Messung des Kürzungsgrads: der Text, den der Code ersetzt. */
export function rohtextVon(angabe) {
  return rohVon(pruefeAngabe(angabe));
}

export function pruefeAngabe(angabe) {
  if (!angabe || typeof angabe !== "object") {
    throw new Error("Die Angabe fehlt.");
  }
  if (!KUERZEL_NACH_ART.has(angabe.art)) {
    throw new Error(`Die Angabe „${angabe.art}" gibt es nicht — nur „${ANGEBOT}" `
      + `und „${ANTWORT}".`);
  }
  if (typeof angabe.fach !== "string" || !FACH_MUSTER.test(angabe.fach)) {
    throw new Error("Der Fachname darf nur Buchstaben, Ziffern und Striche haben "
      + "(1 bis 40 Zeichen).");
  }
  if (typeof angabe.leitung !== "string" || angabe.leitung === "") {
    throw new Error("Die Angabe zur Leitung fehlt.");
  }
  if (angabe.leitung.length > ANGABE_HOECHSTENS) {
    throw new Error(`Die Angabe zur Leitung ist länger als ${ANGABE_HOECHSTENS} Zeichen.`);
  }
  return { fach: angabe.fach, art: angabe.art, leitung: angabe.leitung };
}

/* ── Schreiben und Lesen des Codes ──────────────────────────────────*/

export function schreibeAngabe(angabe) {
  const geprueft = pruefeAngabe(angabe);
  const roh = rohVon(geprueft);
  const bytes = zuBytes(roh);
  /* Ein halbes Ersatzzeichen überlebt den Weg durch die Bytes nicht.
     Es käme auf der anderen Seite als Fragezeichen an — also lieber
     hier laut werden, im eigenen Haus. */
  if (zuText(bytes) !== roh) {
    throw new Error("Die Angabe trägt ein halbes Ersatzzeichen und lässt sich nicht "
      + "verschicken.");
  }
  const nutz = nachBasis(packe(bytes));
  const zahl = pruefzahl(bytes);
  const pruef = nachBasis(Uint8Array.from([
    (zahl >>> 24) & 255, (zahl >>> 16) & 255, (zahl >>> 8) & 255, zahl & 255
  ]));
  return `${KENNUNG}${FASSUNG}${PUNKT}${nutz}${PUNKT}${pruef}`;
}

const schlecht = (grund) => ({ ok: false, grund });

export function leseAngabe(text) {
  if (typeof text !== "string") return schlecht("Das ist kein Text.");
  /* Aller Leerraum fällt weg — Begründung in der Kopfnotiz. */
  const knapp = text.replace(/\s+/g, "");
  if (knapp === "") return schlecht("Da steht nichts.");
  if (!knapp.startsWith(KENNUNG)) {
    return schlecht(`Das ist kein Einladungscode — er beginnt mit „${KENNUNG}".`);
  }

  const stuecke = knapp.split(PUNKT);
  if (stuecke.length !== 3) {
    return schlecht("Der Code ist unvollständig — es fehlt ein Teil.");
  }
  const fassung = Number(stuecke[0].slice(KENNUNG.length));
  if (!Number.isSafeInteger(fassung) || fassung < 1) {
    return schlecht("Der Code nennt keine Fassung.");
  }
  if (fassung !== FASSUNG) {
    return schlecht(`Der Code stammt aus Fassung ${fassung}, dieses Spiel spricht `
      + `Fassung ${FASSUNG}. Beide brauchen denselben Stand.`);
  }

  const nutz = ausBasis(stuecke[1]);
  const pruef = ausBasis(stuecke[2]);
  if (nutz === null || pruef === null || pruef.length !== 4) {
    return schlecht("Der Code trägt ein Zeichen, das darin nicht vorkommen kann.");
  }

  let bytes;
  try { bytes = entpacke(nutz); }
  catch (fund) { return schlecht(`Der Code ist verfälscht — ${fund.message}`); }

  const soll = ((pruef[0] << 24) | (pruef[1] << 16) | (pruef[2] << 8) | pruef[3]) >>> 0;
  if (pruefzahl(bytes) !== soll) {
    return schlecht("Der Code ist verfälscht — bitte noch einmal ganz kopieren, "
      + "vom ersten bis zum letzten Zeichen.");
  }

  const roh = zuText(bytes);
  const erster = roh.indexOf(TRENNER);
  const zweiter = roh.indexOf(TRENNER, erster + 1);
  if (erster < 0 || zweiter < 0) return schlecht("Der Code ist verfälscht — er hat keine Form.");
  const art = ART_NACH_KUERZEL.get(roh.slice(0, erster));
  const fach = roh.slice(erster + 1, zweiter);
  const leitung = roh.slice(zweiter + 1);
  if (!art) return schlecht("Der Code nennt eine Art, die es nicht gibt.");

  try { return { ok: true, angabe: pruefeAngabe({ art, fach, leitung }) }; }
  catch (fund) { return schlecht(`Der Code ist verfälscht — ${fund.message}`); }
}

/* ── Warten ─────────────────────────────────────────────────────────

   Beide Vermittler warten gleich: nachsehen, ruhen, wieder nachsehen.
   Für den Einladungscode heißt „ruhen", dass ein Mensch tippt; für den
   Vermittler, dass eine Leitung antwortet. Weil beide dieselbe
   Schleife benutzen, gibt es die Wartefrist nur einmal — und damit nur
   eine Stelle, an der sie falsch sein kann.

   `ruhe` wird gereicht und nicht geholt: Sonst dauerte jede Prüfung
   dieser Datei echte Minuten. */
export const TAKT_MS = 1000;
export const FRIST_MS = 180000;

export const standardRuhe = (ms) => new Promise((fertig) => {
  const uhr = globalThis.setTimeout;
  if (typeof uhr !== "function") { fertig(); return; }
  uhr(fertig, ms);
});

async function warteAufFach(vermittler, fach, { frist = FRIST_MS, takt = TAKT_MS, ruhe }) {
  const versuche = Math.max(1, Math.ceil(frist / takt));
  for (let i = 0; i < versuche; i++) {
    const angabe = await vermittler.hole(fach);
    if (angabe) return angabe;
    await ruhe(takt);
  }
  throw new Error(`Es hat sich niemand gemeldet (${Math.round(frist / 1000)} Sekunden `
    + `gewartet, Fach „${fach}").`);
}

function pruefeFach(fach) {
  if (typeof fach !== "string" || !FACH_MUSTER.test(fach)) {
    throw new Error("Der Fachname darf nur Buchstaben, Ziffern und Striche haben "
      + "(1 bis 40 Zeichen).");
  }
  return fach;
}

/* ── Weg 1: der Einladungscode ──────────────────────────────────────

   Braucht gar nichts. `lege` gibt den Code zurück **und** meldet ihn
   an jeden, der zuhört; `fuegeEin` nimmt den Code der Gegenseite
   entgegen, und danach findet `hole` ihn.

   **Warum `lege` den Code zurückgibt und nicht nur meldet.** Ein
   Rückgabewert lässt sich anzeigen, in die Zwischenablage legen und
   prüfen. Ein reiner Melder zwänge jeden Aufrufer, sich vorher
   anzumelden — und wer das vergisst, bekommt keinen Fehler, sondern
   einen Code, den niemand je sieht. */
export function vermittlerVonHand({ ruhe = standardRuhe, takt = TAKT_MS } = {}) {
  const eingang = new Map();
  const hoerer = [];
  let geschlossen = false;

  const selbst = {
    art: "vonHand",
    name: "Einladungscode von Hand",

    async lege(fach, angabe) {
      if (geschlossen) throw new Error("Diese Vermittlung ist geschlossen.");
      const code = schreibeAngabe({ ...angabe, fach: pruefeFach(fach) });
      for (const fn of hoerer) fn(code, fach);
      return code;
    },

    async hole(fach) {
      pruefeFach(fach);
      if (geschlossen) return null;
      return eingang.get(fach) || null;
    },

    warte(fach, angaben = {}) {
      return warteAufFach(selbst, pruefeFach(fach), { ruhe, takt, ...angaben });
    },

    schliesse() {
      geschlossen = true;
      hoerer.length = 0;
      eingang.clear();
    },

    /* Nur dieser Weg hat sie: der Draht zum Menschen davor. */
    beiText(fn) { if (typeof fn === "function") hoerer.push(fn); },

    /* Gibt `{ok, grund}` statt zu werfen: Ein vertippter Code ist der
       Normalfall, und der Bildschirm soll den Grund zeigen können. */
    fuegeEin(text) {
      if (geschlossen) return schlecht("Diese Vermittlung ist geschlossen.");
      const gelesen = leseAngabe(text);
      if (!gelesen.ok) return gelesen;
      eingang.set(gelesen.angabe.fach, gelesen.angabe);
      return gelesen;
    }
  };
  return selbst;
}

/* ── Weg 2: der eigene Vermittler ───────────────────────────────────

   Spricht mit `netz/broker.mjs` über zwei gewöhnliche Anfragen:
   ablegen und abholen. Kein Dauerdraht, kein fremdes Paket — und das
   ist keine Notlösung: Vermittelt wird **einmal**, beim Verbinden.
   Danach läuft kein Byte des Spiels mehr über ihn, also wäre ein
   ständig offener Draht Aufwand für nichts.

   **Warum `holen` und `ruhe` gereicht werden.** Damit die Prüfung
   diesen Vermittler ohne Wartezeit und mit einer erfundenen Leitung
   fahren kann — und damit dieselbe Datei im Browser und in Node
   läuft, wo `fetch` verschieden herkommt. */
export function vermittlerUeberBroker(adresse, {
  holen = null, ruhe = standardRuhe, takt = TAKT_MS
} = {}) {
  if (typeof adresse !== "string" || !/^https?:\/\/\S+$/.test(adresse)) {
    throw new Error("Die Adresse des Vermittlers muss mit „http://\" oder „https://\" "
      + "anfangen, zum Beispiel „http://192.168.0.20:7788\".");
  }
  const wurzel = adresse.replace(/\/+$/, "");
  let geschlossen = false;

  const frage = async (fach, angaben) => {
    const nimm = holen || globalThis.fetch;
    if (typeof nimm !== "function") {
      throw new Error("Dieser Browser kann keine Anfragen stellen — der Vermittler ist "
        + "so nicht erreichbar.");
    }
    const ziel = `${wurzel}/brett/${fach}`;
    let antwort;
    try { antwort = await nimm(ziel, angaben); }
    catch (fund) {
      throw new Error(`Der Vermittler unter ${wurzel} antwortet nicht (${fund.message}). `
        + "Läuft er, und stimmt die Adresse?");
    }
    const text = await antwort.text();
    if (!antwort.ok) {
      throw new Error(`Der Vermittler weist die Anfrage ab: ${text.trim() || antwort.status}`);
    }
    return text;
  };

  const selbst = {
    art: "broker",
    name: `eigener Vermittler unter ${wurzel}`,
    adresse: wurzel,

    async lege(fach, angabe) {
      if (geschlossen) throw new Error("Diese Vermittlung ist geschlossen.");
      const code = schreibeAngabe({ ...angabe, fach: pruefeFach(fach) });
      const antwort = await frage(fach, {
        method: "POST",
        headers: { "content-type": "text/plain;charset=utf-8" },
        body: code
      });
      if (!antwort.startsWith("abgelegt")) {
        throw new Error(`Der Vermittler hat den Code nicht angenommen: ${antwort.trim()}`);
      }
      return code;
    },

    /* „Noch nichts da" ist **kein** Fehler, sondern der Normalfall:
       Der Gast fragt, bevor der Gastgeber abgelegt hat. Deshalb `null`
       und keine Ausnahme — sonst müsste jeder Aufrufer einen Fehler
       abfangen, der gar keiner ist. */
    async hole(fach) {
      pruefeFach(fach);
      if (geschlossen) return null;
      const antwort = await frage(fach, { method: "GET" });
      if (antwort.startsWith("nichts")) return null;
      if (!antwort.startsWith("da\n")) {
        throw new Error(`Der Vermittler antwortet etwas Unbekanntes: ${antwort.slice(0, 60)}`);
      }
      const gelesen = leseAngabe(antwort.slice(3));
      if (!gelesen.ok) {
        throw new Error(`Im Fach „${fach}" liegt kein brauchbarer Code: ${gelesen.grund}`);
      }
      return gelesen.angabe;
    },

    warte(fach, angaben = {}) {
      return warteAufFach(selbst, pruefeFach(fach), { ruhe, takt, ...angaben });
    },

    schliesse() { geschlossen = true; }
  };
  return selbst;
}
