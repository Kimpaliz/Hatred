/* [Aufgabe: Netz] Die Sitzung: ein Rechner ist Gastgeber und
   entscheidet, alle anderen rechnen dieselbe Runde nach.

   ── Warum es das gibt / Warum so ───────────────────────────────────

   Der ganze Regelkern ist deterministisch gebaut, damit **hier** etwas
   sehr Billiges möglich wird: Über die Leitung geht eine **Aktion**,
   nie ein Zustand. Vier Rechner bekommen dieselbe kurze Zeile und
   rechnen jeder für sich aus, was daraus folgt (`spiel/aktionen.mjs →
   wendeAn`). Ein Spielstand wären Kilobyte je Zug, eine Aktion ist ein
   Dutzend Zeichen.

   **Warum ein Schiedsrichter und keine Gleichberechtigung.** Zwei
   Rechner, die beide entscheiden dürfen, können denselben Zug
   gleichzeitig für erlaubt halten — und danach zwei verschiedene
   Reihenfolgen haben. Deshalb schickt ein Gast eine **Absicht**, und
   erst der Gastgeber macht daraus eine Aktion **mit Nummer**. Die
   Nummer ist die ganze Ordnung: Wer sie hat, weiß, was wann gilt.

   **Warum der Gastgeber gegen den eigenen Zustand prüft.** Ein Gast
   könnte lügen (böse) oder hinterherhinken (harmlos) — beides sieht in
   der Leitung gleich aus. `pruefeAktion` läuft deshalb noch einmal auf
   dem Zustand des Gastgebers, und dieser Zustand ist der einzige, der
   zählt. Dazu kommt die Frage, die der Regelkern gar nicht stellen
   kann, weil er von Plätzen nichts weiß: **Gehört diese Figur dem
   Absender?** Ohne sie könnte Platz 3 den Helden von Platz 1 in die
   Lava schicken.

   **Warum eine Lücke gepuffert und nicht übersprungen wird.** Aktionen
   sind nicht vertauschbar: Wer 7 vor 6 anwendet, würfelt in einer
   anderen Reihenfolge (`spiel/zufall.mjs` ist ein Strom) und hat danach
   ein anderes Spiel. Kommt 7 zuerst, wartet sie, bis 6 da ist.
   Übersprungen wird nie.

   **Warum die Rundensumme und warum am Rundenende.** Nach jeder Aktion
   zu vergleichen wäre eine Nachricht je Zug für nichts; einmal am Ende
   des Laufes zu vergleichen fände den Unterschied, wenn ihn niemand
   mehr zuordnen kann. Das Rundenende ist die Stelle, an der ohnehin
   alle stehen. Weicht eine Summe ab, endet die Sitzung mit einem
   deutschen Satz — denn zwei verschiedene Spiele weiterzuspielen ist
   das einzige Ergebnis, das schlimmer ist als ein Abbruch.

   **Warum ein abgelehnter Zug die Sitzung nicht beendet.** Ein
   verklickter Angriff ist keine Störung, sondern der Alltag. Er kommt
   als `entlassen` mit dem Grund zum Absender zurück, wörtlich so, wie
   `pruefeAktion` ihn formuliert — und die Runde läuft weiter.

   **Warum diese Datei nicht in den Zustand schreibt.** Nur `wendeAn`
   ändert etwas, und nur über eine Aktion. Namen und Verbindungen
   liegen deshalb hier und nicht in `zustand.spieler`: Sie sind keine
   Spielregel, und `zustandsSumme` kennt sie zu Recht nicht — sonst
   liefe eine Sitzung auseinander, weil jemand seinen Namen ändert.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `netz/nachrichten.mjs` (Form und Empfangsprüfung jeder Zeile),
   `spiel/aktionen.mjs` (`pruefeAktion` und `wendeAn` — die einzige
   Stelle, die den Zustand ändert), `spiel/lauf.mjs` (`zustandsSumme`
   für den Rundenvergleich), `spiel/zug.mjs` (`wesenMitId`),
   `netz/lobbycode.mjs` (die Saat, aus der beide Seiten denselben
   Kerker bauen), `werkzeuge/pruefe-netz.mjs` (spielt zwei Zustände in
   einem Prozess gegeneinander). */

import { pruefeAktion, wendeAn } from "../spiel/aktionen.mjs";
import { zustandsSumme } from "../spiel/lauf.mjs";
import { wesenMitId } from "../spiel/zug.mjs";
import { NACHRICHT, FASSUNG, baue, schreibe, lies } from "./nachrichten.mjs";

/* Der Gastgeber sitzt auf Platz 1. Das ist keine Bequemlichkeit,
   sondern die Antwort auf „wer führt die Brut": Die Brut gehört
   keinem Spieler, und genau ein Rechner muss sie ziehen. */
export const GASTGEBER_PLATZ = 1;

/* Wie viele Aktionen aus der Zukunft gepuffert werden, bevor die
   Sitzung aufgibt. Ein Rechner, dem 256 Aktionen fehlen, hat keine
   Lücke mehr, sondern keine Leitung. */
export const PUFFER_HOECHSTENS = 256;

/* Wie viele Aktionen ein Herzschlag höchstens nachreicht. Ohne
   Obergrenze schickte ein Gast mit Nummer 0 das ganze Protokoll
   zurück — und zwar bei jedem Herzschlag erneut. */
export const NACHHOLEN_HOECHSTENS = 64;

/* Ein Platz, den es noch nicht gibt. `0` und nicht `null`, damit jeder
   Vergleich eine Zahl gegen eine Zahl ist. */
export const OHNE_PLATZ = 0;

export function macheSitzung({ istGastgeber = false, zustand, sendeAn, alleSenden } = {}) {
  if (!zustand || !zustand.karte) throw new Error("macheSitzung: ohne Spielstand geht nichts");

  const anEinen = typeof sendeAn === "function" ? sendeAn : () => {};
  const anAlle = typeof alleSenden === "function" ? alleSenden : () => {};

  let platz = istGastgeber ? GASTGEBER_PLATZ : OHNE_PLATZ;
  let beendet = null;

  /* Die Nummer, die als Nächstes **angewandt** wird. Beim Gastgeber
     ist es zugleich die Nummer, die er als Nächstes vergibt — zwei
     Zähler für dieselbe Sache liefen auseinander. */
  let naechsteNummer = 1;

  const puffer = new Map();
  const namen = new Map();
  const platzVonWem = new Map();
  const wemVonPlatz = new Map();
  const eigeneSummen = new Map();
  const fremdeSummen = new Map();
  const gleichstandGesagt = new Set();
  const ereignisHoerer = [];
  const fehlerHoerer = [];

  /* Ab hier steht das Protokoll dieser Sitzung. Nummer n ist der
     Eintrag `protokoll[anfang + n - 1]` — deshalb braucht das
     Nachreichen keine zweite Liste, die von der ersten abweichen
     könnte. */
  const protokollAnfang = Array.isArray(zustand.protokoll) ? zustand.protokoll.length : 0;

  /* ── Melden ──────────────────────────────────────────────────────*/

  function meldeEreignisse(ereignisse, angaben) {
    for (const hoerer of ereignisHoerer) hoerer(ereignisse, angaben);
  }

  function meldeFehler(text, angaben = {}) {
    for (const hoerer of fehlerHoerer) hoerer(text, angaben);
  }

  /* ── Schicken ────────────────────────────────────────────────────

     Eine Nachricht, die sich nicht schreiben lässt, ist ein Fehler im
     eigenen Haus — sie darf nicht still verschwinden, aber sie darf
     auch nicht die Runde abreißen. */
  function sendeEinem(wem, nachricht) {
    try { anEinen(wem, schreibe(nachricht)); }
    catch (fund) { meldeFehler(`Nachricht nicht verschickt: ${fund.message}`, { wem }); }
  }

  function sendeAllen(nachricht) {
    try { anAlle(schreibe(nachricht)); }
    catch (fund) { meldeFehler(`Nachricht nicht verschickt: ${fund.message}`); }
  }

  /* ── Abbrechen ───────────────────────────────────────────────────*/

  function brichAb(grund) {
    if (beendet) return false;
    beendet = grund;
    sendeAllen(baue(NACHRICHT.abbruch, { grund: kurzerGrund(grund) }));
    meldeFehler(grund, { abbruch: true });
    return false;
  }

  /* Ein empfangener Abbruch wird nicht weitergereicht: Sonst schickten
     sich zwei Rechner den Abbruch gegenseitig zu, bis einer aufgibt. */
  function beendeStill(grund) {
    if (beendet) return false;
    beendet = grund;
    meldeFehler(grund, { abbruch: true });
    return false;
  }

  /* Der Grund geht als Text über die Leitung und hat dort eine
     Höchstlänge. Gekürzt wird hier und nicht in `nachrichten.mjs` —
     dort würde aus einer zu langen Meldung ein Wurf, und ein Abbruch,
     der am Abbrechen scheitert, ist der schlechteste aller Fälle. */
  function kurzerGrund(grund) {
    const text = String(grund).replace(/\s+/g, " ").trim();
    return text.length > 280 ? text.slice(0, 279) + "…" : (text || "Abbruch ohne Grund");
  }

  /* ── Wer darf für diese Figur handeln ────────────────────────────*/

  function besitzGrund(aktion, vonPlatz) {
    if (!aktion || typeof aktion !== "object") return "Das ist keine Aktion.";
    const wesen = wesenMitId(zustand, aktion.wer);
    if (!wesen) return "Dieses Wesen gibt es nicht.";
    const eigner = wesen.spielerPlatz;
    if (eigner === null || eigner === undefined) {
      return vonPlatz === GASTGEBER_PLATZ ? null : "Die Brut führt der Gastgeber.";
    }
    if (eigner !== vonPlatz) return `Diese Figur gehört Platz ${eigner}, nicht Platz ${vonPlatz}.`;
    return null;
  }

  /* ── Anwenden ────────────────────────────────────────────────────

     Die einzige Stelle, an der sich der Zustand ändert. Wirft `wendeAn`
     hier, obwohl der Gastgeber die Aktion für erlaubt hielt, dann sind
     die beiden Spielstände schon auseinander — und das ist ein Abbruch
     und keine Fehlermeldung. */
  function wendeAktionAn(nummer, aktion, verteile) {
    const alteRunde = zustand.runde;
    let ereignisse;
    try {
      ereignisse = wendeAn(zustand, aktion);
    } catch (fund) {
      return brichAb(`Aktion ${nummer} ließ sich hier nicht anwenden — die Spielstände sind `
        + `auseinandergelaufen. (${fund.message})`);
    }
    naechsteNummer = nummer + 1;
    if (verteile) sendeAllen(baue(NACHRICHT.aktion, { nummer, aktion }));
    meldeEreignisse(ereignisse, { nummer, aktion });
    rundenWechsel(alteRunde);
    return true;
  }

  /* Nach der Aktion, die die Runde gedreht hat, steht die Prüfzahl
     fest. Der Gastgeber meldet sie nicht — er **ist** der Maßstab. */
  function rundenWechsel(alteRunde) {
    if (beendet || zustand.runde === alteRunde) return;
    const summe = zustandsSumme(zustand);
    eigeneSummen.set(alteRunde, summe);
    if (!istGastgeber) sendeAllen(baue(NACHRICHT.rundenSumme, { runde: alteRunde, summe }));
    vergleiche(alteRunde);
  }

  function merkeFremdeSumme(runde, vonPlatz, summe) {
    if (!fremdeSummen.has(runde)) fremdeSummen.set(runde, new Map());
    fremdeSummen.get(runde).set(vonPlatz, summe);
    vergleiche(runde);
  }

  /* Der Vergleich läuft, sobald **beide** Zahlen für eine Runde da
     sind — gleichgültig, welche zuerst ankam. Eine Summe, die man
     wegwirft, weil die eigene noch fehlt, prüfte nichts. */
  function vergleiche(runde) {
    if (beendet) return;
    const eigene = eigeneSummen.get(runde);
    const fremde = fremdeSummen.get(runde);
    if (eigene === undefined || !fremde) return;
    for (const [vonPlatz, summe] of fremde) {
      if (summe === eigene) continue;
      brichAb(`Runde ${runde} ist auseinandergelaufen: Platz ${vonPlatz} rechnet die `
        + `Prüfzahl ${summe}, Platz ${platz} rechnet ${eigene}. Die Sitzung endet hier — `
        + "sonst spielten zwei Rechner ab jetzt zwei verschiedene Spiele.");
      return;
    }
    if (istGastgeber && !gleichstandGesagt.has(runde)) {
      gleichstandGesagt.add(runde);
      sendeAllen(baue(NACHRICHT.gleichstand, { runde, summe: eigene }));
    }
  }

  /* ── Der Gastgeber entscheidet ───────────────────────────────────*/

  function entscheide(aktion, vonPlatz, wem) {
    const grund = besitzGrund(aktion, vonPlatz) || pruefeAktion(zustand, aktion);
    if (grund) {
      if (wem === null) meldeFehler(grund, { aktion, abgelehnt: true });
      else sendeEinem(wem, baue(NACHRICHT.entlassen, { platz: vonPlatz, grund }));
      return false;
    }
    return wendeAktionAn(naechsteNummer, aktion, true);
  }

  /* ── Nummern in Folge ────────────────────────────────────────────*/

  function nimmNummeriert(nummer, aktion) {
    /* Schon angewandt: Ein Doppel ist im Netz normal (Nachreichen,
       zweimal zugestellt) und darf nichts tun — auf keinen Fall die
       Aktion ein zweites Mal. */
    if (nummer < naechsteNummer) return true;
    if (nummer > naechsteNummer) {
      if (puffer.size >= PUFFER_HOECHSTENS) {
        return brichAb(`Es fehlen mehr als ${PUFFER_HOECHSTENS} Aktionen — die Leitung `
          + "trägt nicht mehr. Die Sitzung endet.");
      }
      if (!puffer.has(nummer)) puffer.set(nummer, aktion);
      return true;
    }
    if (!wendeAktionAn(nummer, aktion, false)) return false;
    /* Und nun alles, was schon wartete — streng der Reihe nach. */
    while (!beendet && puffer.has(naechsteNummer)) {
      const naechste = puffer.get(naechsteNummer);
      puffer.delete(naechsteNummer);
      if (!wendeAktionAn(naechsteNummer, naechste, false)) return false;
    }
    return true;
  }

  /* ── Plätze ──────────────────────────────────────────────────────*/

  function ersterFreierPlatz() {
    for (const eintrag of zustand.spieler || []) {
      if (eintrag.platz === GASTGEBER_PLATZ) continue;
      if (!wemVonPlatz.has(eintrag.platz)) return eintrag.platz;
    }
    return OHNE_PLATZ;
  }

  function nimmBeitritt(nachricht, wem) {
    if (!istGastgeber) return;
    if (nachricht.fassung !== FASSUNG) {
      sendeEinem(wem, baue(NACHRICHT.abbruch, {
        grund: `Andere Fassung: hier ${FASSUNG}, dort ${nachricht.fassung}. Erst müssen `
          + "beide dasselbe Spiel haben."
      }));
      return;
    }
    let neuerPlatz = platzVonWem.get(wem) || OHNE_PLATZ;
    if (neuerPlatz === OHNE_PLATZ) {
      neuerPlatz = ersterFreierPlatz();
      if (neuerPlatz === OHNE_PLATZ) {
        sendeEinem(wem, baue(NACHRICHT.abbruch, { grund: "Die Runde ist voll." }));
        return;
      }
      platzVonWem.set(wem, neuerPlatz);
      wemVonPlatz.set(neuerPlatz, wem);
    }
    namen.set(neuerPlatz, nachricht.name);
    sendeEinem(wem, baue(NACHRICHT.willkommen, {
      platz: neuerPlatz,
      saat: zustand.saat >>> 0,
      spielerZahl: (zustand.spieler || []).length,
      tiefe: zustand.tiefe,
      summe: zustandsSumme(zustand)
    }));
    sendeAllen(baue(NACHRICHT.name, { platz: neuerPlatz, name: nachricht.name }));
  }

  /* Das `willkommen` ist der einzige Augenblick, in dem sich beweisen
     lässt, dass beide denselben Kerker vor sich haben — später sagt es
     nur noch die Rundensumme, und dann ist schon gespielt worden. */
  function nimmWillkommen(nachricht) {
    if (istGastgeber || platz !== OHNE_PLATZ) return;
    const eigene = zustandsSumme(zustand);
    const passt = nachricht.saat === (zustand.saat >>> 0)
      && nachricht.tiefe === zustand.tiefe
      && nachricht.spielerZahl === (zustand.spieler || []).length
      && nachricht.summe === eigene;
    if (!passt) {
      brichAb("Der Gastgeber spielt einen anderen Spielstand: Saat, Tiefe, Spielerzahl "
        + `oder Prüfzahl weichen ab (dort ${nachricht.summe}, hier ${eigene}). `
        + "Beide müssen denselben Lobbycode benutzt haben.");
      return;
    }
    platz = nachricht.platz;
  }

  /* ── Nachreichen ─────────────────────────────────────────────────*/

  function aktionMitNummer(nummer) {
    const stelle = protokollAnfang + nummer - 1;
    const liste = zustand.protokoll;
    if (!Array.isArray(liste) || stelle < 0 || stelle >= liste.length) return null;
    return liste[stelle];
  }

  function reicheNach(wem, ab) {
    let geschickt = 0;
    for (let nummer = ab; nummer < naechsteNummer; nummer++) {
      if (geschickt >= NACHHOLEN_HOECHSTENS) break;
      const aktion = aktionMitNummer(nummer);
      if (!aktion) continue;
      sendeEinem(wem, baue(NACHRICHT.aktion, { nummer, aktion }));
      geschickt++;
    }
    return geschickt;
  }

  function nimmHerzschlag(nachricht, wem) {
    const dort = nachricht.nummer;
    if (istGastgeber) {
      if (dort < naechsteNummer - 1) reicheNach(wem, dort + 1);
      return;
    }
    /* Der Gast antwortet nur, wenn er zurückliegt — sonst schlügen
       zwei Herzen einander im Kreis. */
    if (dort >= naechsteNummer) {
      sendeAllen(baue(NACHRICHT.herzschlag, { nummer: naechsteNummer - 1 }));
    }
  }

  /* ── Empfangen ───────────────────────────────────────────────────*/

  function verarbeite(nachricht, vonWem) {
    switch (nachricht.art) {
      case NACHRICHT.beitritt:
        if (!istGastgeber) { meldeFehler("Ein Beitritt kann nur zum Gastgeber."); return; }
        nimmBeitritt(nachricht, vonWem);
        return;

      case NACHRICHT.willkommen:
        nimmWillkommen(nachricht);
        return;

      case NACHRICHT.aktion: {
        if (nachricht.nummer === 0) {
          if (!istGastgeber) { meldeFehler("Eine Absicht kann nur zum Gastgeber."); return; }
          const vonPlatz = platzVonWem.get(vonWem) || OHNE_PLATZ;
          if (vonPlatz === OHNE_PLATZ) {
            meldeFehler("Eine Absicht von einem Rechner ohne Platz wurde verworfen.",
              { vonWem });
            return;
          }
          entscheide(nachricht.aktion, vonPlatz, vonWem);
          return;
        }
        if (istGastgeber) {
          meldeFehler("Nummern vergibt allein der Gastgeber — die Aktion wurde verworfen.",
            { vonWem });
          return;
        }
        nimmNummeriert(nachricht.nummer, nachricht.aktion);
        return;
      }

      case NACHRICHT.rundenSumme: {
        if (!istGastgeber) return;
        const vonPlatz = platzVonWem.get(vonWem) || OHNE_PLATZ;
        if (vonPlatz === OHNE_PLATZ) {
          meldeFehler("Eine Rundensumme von einem Rechner ohne Platz wurde verworfen.");
          return;
        }
        merkeFremdeSumme(nachricht.runde, vonPlatz, nachricht.summe);
        return;
      }

      case NACHRICHT.gleichstand:
        if (istGastgeber) return;
        merkeFremdeSumme(nachricht.runde, GASTGEBER_PLATZ, nachricht.summe);
        return;

      case NACHRICHT.entlassen:
        if (istGastgeber) { meldeFehler("Absichten entlässt allein der Gastgeber."); return; }
        meldeFehler(`Der Gastgeber hat die Absicht nicht gespielt: ${nachricht.grund}`,
          { abgelehnt: true, platz: nachricht.platz });
        return;

      case NACHRICHT.name: {
        if (istGastgeber) {
          const vonPlatz = platzVonWem.get(vonWem) || OHNE_PLATZ;
          if (vonPlatz === OHNE_PLATZ || vonPlatz !== nachricht.platz) {
            meldeFehler("Einen fremden Platz benennt niemand um.", { vonWem });
            return;
          }
          namen.set(vonPlatz, nachricht.name);
          sendeAllen(baue(NACHRICHT.name, { platz: vonPlatz, name: nachricht.name }));
          return;
        }
        namen.set(nachricht.platz, nachricht.name);
        return;
      }

      case NACHRICHT.abbruch:
        beendeStill(`Die Gegenseite hat die Sitzung beendet: ${nachricht.grund}`);
        return;

      case NACHRICHT.herzschlag:
        nimmHerzschlag(nachricht, vonWem);
        return;

      default:
        meldeFehler(`Mit „${nachricht.art}" weiß diese Sitzung nichts anzufangen.`);
    }
  }

  /* ── Die Sitzung nach außen ──────────────────────────────────────*/

  const sitzung = {
    /* Vom eigenen Spieler. Der Gastgeber entscheidet sofort, ein Gast
       schickt eine Absicht — und wartet auf die Nummer. */
    willAktion(aktion) {
      if (beendet) { meldeFehler(`Die Sitzung ist beendet: ${beendet}`); return false; }
      if (platz === OHNE_PLATZ) {
        meldeFehler("Noch kein Platz in der Runde — der Beitritt steht aus.");
        return false;
      }
      const grund = besitzGrund(aktion, platz);
      if (grund) { meldeFehler(grund, { aktion, abgelehnt: true }); return false; }
      if (istGastgeber) return entscheide(aktion, platz, null);
      try {
        sendeAllen(baue(NACHRICHT.aktion, { nummer: 0, aktion }));
      } catch (fund) {
        meldeFehler(`Diese Aktion lässt sich nicht verschicken: ${fund.message}`);
        return false;
      }
      return true;
    },

    /* Jede Zeile von außen kommt hier herein — und keine wird
       geglaubt, bevor `lies` sie zerlegt hat. */
    empfange(text, vonWem = null) {
      if (beendet) return false;
      const gelesen = lies(text);
      if (!gelesen.ok) {
        meldeFehler(`Eine Nachricht wurde verworfen: ${gelesen.grund}`, { vonWem, text });
        return false;
      }
      try {
        verarbeite(gelesen.nachricht, vonWem);
      } catch (fund) {
        return brichAb(`Beim Verarbeiten einer Nachricht ging etwas schief: ${fund.message}`);
      }
      return !beendet;
    },

    beiEreignissen(fn) { if (typeof fn === "function") ereignisHoerer.push(fn); },
    beiFehler(fn) { if (typeof fn === "function") fehlerHoerer.push(fn); },

    /* Ein Gast meldet sich an. Der Name ist Zierde und geht nicht in
       die Prüfzahl ein — deshalb darf er sich jederzeit ändern. */
    beitreten(name) {
      if (istGastgeber) { meldeFehler("Der Gastgeber tritt nicht bei."); return false; }
      if (beendet) return false;
      sendeAllen(baue(NACHRICHT.beitritt, { fassung: FASSUNG, name }));
      return true;
    },

    setzeName(name) {
      if (beendet || platz === OHNE_PLATZ) return false;
      const nachricht = baue(NACHRICHT.name, { platz, name });
      namen.set(platz, nachricht.name);
      sendeAllen(nachricht);
      return true;
    },

    /* Hält die Leitung warm **und** deckt eine Lücke auf: Wer die
       Nummer der Gegenseite hört, weiß, ob ihm etwas fehlt. */
    herzschlag() {
      if (beendet) return false;
      sendeAllen(baue(NACHRICHT.herzschlag, { nummer: naechsteNummer - 1 }));
      return true;
    },

    spielerListe() {
      return (zustand.spieler || []).map((eintrag) => ({
        platz: eintrag.platz,
        wesenId: eintrag.wesenId,
        name: namen.get(eintrag.platz) || eintrag.name,
        selbst: eintrag.platz === platz,
        verbunden: eintrag.platz === platz
          || (istGastgeber ? wemVonPlatz.has(eintrag.platz) : namen.has(eintrag.platz))
      }));
    },

    /* Für Anzeige und Prüfung: Zahlen, keine Meinung. */
    stand() {
      return {
        istGastgeber, platz, beendet,
        naechsteNummer,
        gepuffert: puffer.size,
        runde: zustand.runde,
        summe: zustandsSumme(zustand)
      };
    }
  };
  return sitzung;
}
