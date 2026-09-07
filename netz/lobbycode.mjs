/* [Aufgabe: Netz] Der Lobbycode — acht Zeichen, die man am Telefon
   vorlesen kann, ohne buchstabieren zu müssen.

   ── Warum es das gibt / Warum so ───────────────────────────────────

   Jannik und seine Freunde sitzen nicht am selben Tisch. Einer öffnet
   die Runde, die anderen brauchen **eine** kurze Angabe, um
   hineinzufinden. Alles, was dafür nötig ist, steckt in dieser Zeile:
   die Saat, aus der `spiel/lauf.mjs → macheLauf` denselben Kerker baut,
   und der Hafen, über den die Leitung zustande kommt.

   **Warum diese Zeichen und keine anderen.** Ein Code wird
   **vorgelesen**, nicht abgeschrieben. `0` und `O` klingen gleich,
   `1`, `I` und `l` sehen gleich aus — jedes davon fehlt hier. Übrig
   bleiben 31 Zeichen, und 31 ist eine Primzahl. Das ist kein Zufall,
   sondern der ganze Trick der Prüfziffer: In einem Zahlenkörper mit
   Primzahlgröße hat jedes Gewicht ein Gegenstück, und deshalb kann
   **kein** einzelner vertippter Buchstabe die gewichtete Summe wieder
   auf null bringen.

   **Warum die Prüfziffer gewichtet ist.** Eine ungewichtete Summe
   fängt jeden einzelnen Tippfehler, aber keinen Dreher: `AB` und `BA`
   ergeben dieselbe Summe. Mit den Gewichten 1 bis 8 ändert ein Dreher
   benachbarter Zeichen die Summe um die Differenz der beiden Zeichen —
   und die ist nur dann null, wenn beide gleich sind, also gar kein
   Dreher vorliegt. Zwei Fehlerarten mit einem Zeichen.

   **Warum die Saat kleiner ist als eine Laufsaat.** Sieben Zeichen
   tragen 31⁷ ≈ 2,75·10¹⁰ verschiedene Werte; Saat und Hafen zusammen
   brauchen 2²⁴ · 1024 ≈ 1,72·10¹⁰. Es passt, aber nicht mit einer
   vollen 32-Bit-Saat — die bräuchte ein neuntes Zeichen, und dann ist
   der Code am Telefon nicht mehr kurz. Sechzehn Millionen Kerker sind
   für vier Freunde genug; `macheLauf` nimmt jede ganze Zahl, also
   verliert das Spiel dadurch nichts.

   **Warum `leseCode` bei jedem Zweifel `null` gibt.** Ein halb
   richtiger Code führt zwei Freunde in zwei verschiedene Kerker, und
   das merkt erst die Rundensumme — eine Runde später. Lieber sofort
   „Der Code stimmt nicht" als später „auseinandergelaufen".

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `netz/sitzung.mjs` (nimmt die Saat für `macheLauf` und den Hafen für
   die Leitung), `spiel/lauf.mjs` (`macheLauf({saat})` — dieselbe Zahl
   baut denselben Kerker), `netz/nachrichten.mjs` (dieselbe Saat steht
   im `willkommen` und wird dort gegengeprüft),
   `werkzeuge/pruefe-netz.mjs` (vertippt 2.000 Codes an jeder Stelle). */

/* 31 Zeichen: die Ziffern ohne 0 und 1, die Großbuchstaben ohne I, L
   und O. Die Reihenfolge ist der Zahlenwert und darf sich nie ändern —
   ein Code, der gestern galt, muss morgen denselben Kerker öffnen. */
export const ZEICHEN = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export const BASIS = ZEICHEN.length;
export const LAENGE = 8;
export const NUTZ_LAENGE = LAENGE - 1;

/* Die Saat, die in einen Code passt. Begründung in der Kopfnotiz. */
export const SAAT_HOECHSTENS = 16777215;

/* Der Hafenbereich. 49152 ist der erste Hafen, den kein Dienst für
   sich beansprucht; tausend Häfen reichen für jeden Rechner, auf dem
   gleichzeitig mehr als eine Runde offen ist. */
export const HAFEN_ERSTER = 49152;
export const HAFEN_ANZAHL = 1024;

const WERT_NACH_ZEICHEN = new Map();
for (let i = 0; i < ZEICHEN.length; i++) WERT_NACH_ZEICHEN.set(ZEICHEN[i], i);

/* Das Gegenstück von 8 im Körper mit 31 Elementen: 8 · 4 = 32 ≡ 1.
   Es steht als Zahl da und wird in der Prüfung nachgerechnet — eine
   Zahl im Kommentar ist keine gemessene Zahl. */
export const GEGENSTUECK_ACHT = 4;

/* Die gewichtete Summe. Gewicht 1 bis 8, von links nach rechts. */
function gewichteteSumme(werte) {
  let summe = 0;
  for (let i = 0; i < werte.length; i++) summe = (summe + (i + 1) * werte[i]) % BASIS;
  return summe;
}

/* Aus den Hafenangaben eine Nummer 0 bis 1023. Angenommen wird ein
   Bündel `{hafen}`, eine nackte Zahl oder gar nichts — die Sitzung
   ruft das aus drei verschiedenen Ecken. */
function hafenNummerVon(hafenAngaben) {
  if (hafenAngaben === null || hafenAngaben === undefined) return 0;
  const hafen = typeof hafenAngaben === "number" ? hafenAngaben : hafenAngaben.hafen;
  if (!Number.isSafeInteger(hafen)) {
    throw new Error("macheCode: der Hafen muss eine ganze Zahl sein");
  }
  const nummer = hafen - HAFEN_ERSTER;
  if (nummer < 0 || nummer >= HAFEN_ANZAHL) {
    throw new Error(`macheCode: der Hafen muss ${HAFEN_ERSTER} bis `
      + `${HAFEN_ERSTER + HAFEN_ANZAHL - 1} sein (${hafen})`);
  }
  return nummer;
}

/* ── Schreiben ─────────────────────────────────────────────────────*/

export function macheCode(saat, hafenAngaben = null) {
  if (!Number.isSafeInteger(saat) || saat < 0 || saat > SAAT_HOECHSTENS) {
    throw new Error(`macheCode: die Saat muss 0 bis ${SAAT_HOECHSTENS} sein (${saat})`);
  }
  const hafenNummer = hafenNummerVon(hafenAngaben);

  /* Saat und Hafen stecken in **einer** Zahl. Zwei getrennte Felder
     wären zwei Stellen, an denen man sich um ein Zeichen verzählt. */
  let wert = saat * HAFEN_ANZAHL + hafenNummer;

  const werte = new Array(NUTZ_LAENGE).fill(0);
  for (let i = NUTZ_LAENGE - 1; i >= 0; i--) {
    werte[i] = wert % BASIS;
    wert = Math.floor(wert / BASIS);
  }

  /* Die Prüfziffer so wählen, dass die ganze gewichtete Summe null
     wird: 8 · p ≡ −S, also p ≡ −S · 4. */
  const summe = gewichteteSumme(werte);
  const pruefwert = ((BASIS - summe) * GEGENSTUECK_ACHT) % BASIS;
  werte.push(pruefwert);

  const zeichen = werte.map((w) => ZEICHEN[w]).join("");
  return `${zeichen.slice(0, 4)}-${zeichen.slice(4)}`;
}

/* ── Lesen ─────────────────────────────────────────────────────────

   Nachsichtig, wo es nichts kostet: Kleinbuchstaben, Leerraum und ein
   fehlender Bindestrich sind kein Fehler des Anrufers, sondern seiner
   Tastatur. Streng, wo es etwas kostet: Ein Zeichen, das es im Vorrat
   nicht gibt, und eine Prüfziffer, die nicht aufgeht, sind `null`. */
export function leseCode(text) {
  if (typeof text !== "string") return null;
  const knapp = text.toUpperCase().replace(/[\s-]/g, "");
  if (knapp.length !== LAENGE) return null;

  const werte = [];
  for (const zeichen of knapp) {
    const wert = WERT_NACH_ZEICHEN.get(zeichen);
    if (wert === undefined) return null;
    werte.push(wert);
  }
  if (gewichteteSumme(werte) !== 0) return null;

  let wert = 0;
  for (let i = 0; i < NUTZ_LAENGE; i++) wert = wert * BASIS + werte[i];

  /* Sieben Zeichen tragen mehr Werte, als Saat und Hafen brauchen. Was
     darüber liegt, ist ein Code mit stimmiger Prüfziffer, den dieses
     Spiel nie ausgegeben hat — und der deshalb keiner ist. */
  const hoechstens = (SAAT_HOECHSTENS + 1) * HAFEN_ANZAHL - 1;
  if (wert > hoechstens) return null;

  const hafenNummer = wert % HAFEN_ANZAHL;
  return {
    saat: (wert - hafenNummer) / HAFEN_ANZAHL,
    hafen: HAFEN_ERSTER + hafenNummer,
    hafenNummer,
    code: `${knapp.slice(0, 4)}-${knapp.slice(4)}`
  };
}
