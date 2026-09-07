/* [Aufgabe: Netz] Die Leitung: nach genau einer Vermittlung reden zwei
   Rechner direkt miteinander — ohne dass ein fremder Rechner dazwischen
   steht.

   ── Warum es das gibt / Warum so ───────────────────────────────────

   `netz/sitzung.mjs` ist der Schiedsrichter und **kennt seine Leitung
   nicht**: Er bekommt zwei Funktionen zum Senden gereicht und eine
   Zeile zum Empfangen. Diese Datei ist eine solche Steckdose. Sie
   entscheidet keine Regel, sie kennt keine Aktion, sie liest keine
   Nachricht — sie trägt Zeilen hin und her.

   **Warum direkt und nicht über einen Spielserver.** Ein Spielserver
   wäre ein fremder Rechner, der jeden Zug sieht, laufen muss und
   bezahlt werden will. Gebraucht wird er nicht: Der Regelkern rechnet
   auf jedem Rechner bitgleich (`docs/SPIEL.md` 1), über die Leitung
   geht deshalb nur die Aktion. Zwei Browser können das unter sich
   ausmachen; ein Vermittler wird **einmal** gebraucht, damit sie
   einander finden, und danach nie wieder.

   **Warum die Vermittlung austauschbar ist.** Es gibt zwei Wege, sich
   zu finden (`netz/vermittler.mjs`), und sie kosten Verschiedenes.
   Welchen Jannik nimmt, ist seine Entscheidung — also darf diese Datei
   sie nicht treffen. Sie bekommt einen Vermittler gereicht und fragt
   ihn nie, welcher er ist.

   **Warum diese Datei ohne Browser lädt.** Die Prüfung fährt sie in
   Node, wo es kein WebRTC gibt. Ein `new RTCPeerConnection` beim
   Einlesen ließe sich dort nicht einmal einbinden, und damit wäre
   alles darunter ungeprüft. Deshalb wird der Baustein erst in `oeffne`
   geholt — und wenn er fehlt, gibt es einen deutschen Satz und keinen
   Absturz mit einem englischen Wort darin.

   **Warum erst alle Adressen gesammelt werden und dann eine einzige
   Angabe herausgeht.** Ein Browser findet seine Erreichbarkeiten nach
   und nach. Wer sie einzeln verschickt, braucht einen Vermittler, der
   dauernd zuhört — und der Einladungscode von Hand wäre unmöglich, weil
   niemand fünfmal etwas kopiert. Einmal warten, bis alles beisammen
   ist, kostet ein paar Sekunden und macht aus der Vermittlung **einen**
   Zettel.

   **Warum der Datenkanal geordnet ist.** Aktionen sind nicht
   vertauschbar (`netz/sitzung.mjs`): Wer 7 vor 6 anwendet, würfelt in
   anderer Reihenfolge und hat danach ein anderes Spiel. Ein
   ungeordneter Kanal wäre schneller und genau deshalb falsch.

   **Warum das Fach von außen kommt.** Eine Verbindung ist immer die
   zwischen **zwei** Rechnern. Bei vier Leuten hält der Gastgeber drei
   davon, und jede braucht ihr eigenes Fach — sonst läsen alle Gäste
   dasselbe Angebot und drei Antworten überschrieben einander. Der
   Aufrufer hängt deshalb an den Lobbycode die Platznummer des Gastes
   (`K7QM-3F2P-2`); diese Datei erfindet nichts dazu, sie hängt nur
   `-angebot` und `-antwort` an.

   **Warum eine Zeile eine Nachricht ist.** Ein Datenkanal erhält die
   Grenzen jeder Sendung; was als eine Zeile losgeht, kommt als eine
   Zeile an. Deshalb gibt es hier keinen Zusammenbau aus Bruchstücken —
   und damit keine Stelle, an der zwei halbe Nachrichten zu einer
   falschen ganzen werden.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `netz/vermittler.mjs` (liefert `vermittlerVonHand` und
   `vermittlerUeberBroker`; beide erfüllen dieselbe Schnittstelle, und
   diese Datei kennt nur die), `netz/sitzung.mjs` (bekommt `sende` als
   Sendefunktion und reicht jede empfangene Zeile in `empfange`),
   `netz/lobbycode.mjs` (der Name, aus dem das Fach gebaut wird),
   `docs/NETZ.md` (erklärt beide Wege in normaler Sprache),
   `werkzeuge/pruefe-leitung.mjs` (lädt diese Datei ohne Browser und
   verlangt genau die deutsche Absage). */

import { ANGEBOT, ANTWORT, FRIST_MS, standardRuhe } from "./vermittler.mjs";

/* Die fünf Zustände einer Leitung, in ihrer Reihenfolge. Sie sind für
   den Bildschirm da: Jannik soll sehen, ob es hakt, statt auf einen
   Fortschrittsbalken zu starren, der nichts weiß. */
export const ZU = "zu";
export const VERMITTELT = "vermittelt";
export const VERBINDET = "verbindet";
export const OFFEN = "offen";
export const GESCHEITERT = "gescheitert";

/* Wie lange auf die Erreichbarkeiten gewartet wird, bevor die Angabe
   auch ohne das Fertig-Zeichen herausgeht. Manche Netze melden nie
   „fertig", weil eine Adresse hängt — ohne diese Frist wartete das
   Spiel für immer, und der häufigste Fall (alles längst beisammen)
   sähe aus wie ein Absturz. */
export const SAMMEL_FRIST_MS = 8000;

/* Wie lange auf das Öffnen des Kanals gewartet wird, nachdem beide
   Seiten ihre Angaben getauscht haben. */
export const KANAL_FRIST_MS = 30000;

/* Ohne Adresshelfer redet ein Rechner nur mit dem, was er selbst
   sieht — im eigenen Heimnetz reicht das, zwischen zwei Wohnungen in
   aller Regel nicht.

   **Diese Liste ist ausdrücklich leer**, und das ist keine
   Nachlässigkeit: Ein Adresshelfer ist ein fremder Rechner, der beim
   Verbinden gefragt wird. Ob dieses Spiel einen fragen darf, ist eine
   Entscheidung des Auftraggebers und steht in `docs/SPIEL.md` 8.1 —
   sie gehört nicht in eine Voreinstellung, die niemand liest.
   `docs/NETZ.md` erklärt ihm, was daran hängt. */
export const OHNE_ADRESSHELFER = [];

export function macheVerbindung({
  istGastgeber = false,
  vermittler,
  fach = "haupt",
  adressHelfer = OHNE_ADRESSHELFER,
  kanalName = "hatred",
  frist = FRIST_MS,
  ruhe = standardRuhe
} = {}) {
  pruefeVermittler(vermittler);

  const fachAngebot = `${fach}-angebot`;
  const fachAntwort = `${fach}-antwort`;

  const empfangHoerer = [];
  const zustandHoerer = [];

  let zustand = ZU;
  let leitung = null;
  let kanal = null;
  let gesendet = 0;
  let empfangen = 0;
  let letzterGrund = null;

  function setzeZustand(neu, grund = null) {
    if (zustand === neu) return;
    zustand = neu;
    letzterGrund = grund;
    for (const fn of zustandHoerer) fn(neu, grund);
  }

  /* Der Kanal kommt beim Gastgeber aus dem eigenen Aufruf und beim
     Gast aus einem Ereignis. Beide Wege enden hier, damit es nur eine
     Stelle gibt, an der Zuhörer angehängt werden. */
  function nimmKanal(neuerKanal) {
    kanal = neuerKanal;
    kanal.addEventListener("open", () => setzeZustand(OFFEN));
    kanal.addEventListener("close", () => setzeZustand(ZU, "Die Gegenseite hat aufgelegt."));
    kanal.addEventListener("error", () => {
      setzeZustand(GESCHEITERT, "Die Leitung ist abgerissen.");
    });
    kanal.addEventListener("message", (fund) => {
      /* Nur Text. Was kein Text ist, kann keine Nachricht dieses
         Spiels sein (`netz/nachrichten.mjs` liest Zeilen) — und still
         etwas anderes durchzureichen wäre die teuerste Art, es zu
         übersehen. */
      if (typeof fund.data !== "string") return;
      empfangen++;
      for (const fn of empfangHoerer) fn(fund.data);
    });
  }

  /* Jeder Fehlschlag beim Öffnen endet sichtbar. Ohne diese Klammer
     bliebe der Zustand auf „verbindet" stehen, während schon nichts
     mehr passiert — und der Bildschirm zeigte für immer an, dass
     gleich etwas kommt. */
  async function oeffne() {
    try { return await oeffneWirklich(); }
    catch (fund) {
      setzeZustand(GESCHEITERT, fund.message);
      throw fund;
    }
  }

  async function oeffneWirklich() {
    if (zustand !== ZU || leitung !== null) {
      throw new Error("Diese Leitung wurde schon geöffnet.");
    }
    const Bauart = holeBauart();
    leitung = new Bauart({ iceServers: adressHelfer });
    setzeZustand(VERMITTELT);

    leitung.addEventListener("connectionstatechange", () => {
      if (leitung.connectionState === "failed") {
        setzeZustand(GESCHEITERT, "Die beiden Rechner haben sich nicht erreicht.");
      }
      if (leitung.connectionState === "disconnected" && zustand === OFFEN) {
        setzeZustand(GESCHEITERT, "Die Leitung ist unterwegs abgerissen.");
      }
    });

    if (istGastgeber) {
      nimmKanal(leitung.createDataChannel(kanalName, { ordered: true }));
      await leitung.setLocalDescription(await leitung.createOffer());
      await warteAufAdressen(leitung, ruhe);
      await vermittler.lege(fachAngebot, { art: ANGEBOT, leitung: leitung.localDescription.sdp });
      setzeZustand(VERBINDET);
      const angabe = await vermittler.warte(fachAntwort, { frist });
      await leitung.setRemoteDescription({ type: "answer", sdp: angabe.leitung });
    } else {
      leitung.addEventListener("datachannel", (fund) => nimmKanal(fund.channel));
      const angabe = await vermittler.warte(fachAngebot, { frist });
      await leitung.setRemoteDescription({ type: "offer", sdp: angabe.leitung });
      await leitung.setLocalDescription(await leitung.createAnswer());
      await warteAufAdressen(leitung, ruhe);
      setzeZustand(VERBINDET);
      await vermittler.lege(fachAntwort, { art: ANTWORT, leitung: leitung.localDescription.sdp });
    }

    await warteAufKanal();
    return true;
  }

  function warteAufKanal() {
    if (kanal && kanal.readyState === "open") { setzeZustand(OFFEN); return Promise.resolve(true); }
    return new Promise((fertig, gescheitert) => {
      let entschieden = false;
      const schluss = (fn, wert) => {
        if (entschieden) return;
        entschieden = true;
        fn(wert);
      };
      zustandHoerer.push((neu, grund) => {
        if (neu === OFFEN) schluss(fertig, true);
        if (neu === GESCHEITERT || neu === ZU) {
          schluss(gescheitert, new Error(grund || "Die Leitung kam nicht zustande."));
        }
      });
      ruhe(KANAL_FRIST_MS).then(() => schluss(gescheitert, new Error(
        "Die Gegenseite war erreichbar, aber der Kanal ist nicht aufgegangen "
        + `(${Math.round(KANAL_FRIST_MS / 1000)} Sekunden gewartet).`
      )));
    });
  }

  return {
    oeffne,

    /* Gibt `false` statt zu werfen: Ein Zug, der in eine gerade
       abgerissene Leitung geht, ist kein Programmfehler. Der Aufrufer
       sieht es am Rückgabewert und am Zustand — und `netz/sitzung.mjs`
       schickt dieselbe Aktion später einfach nochmal. */
    sende(text) {
      if (!kanal || kanal.readyState !== "open" || typeof text !== "string") return false;
      try { kanal.send(text); } catch { return false; }
      gesendet++;
      return true;
    },

    beiEmpfang(fn) { if (typeof fn === "function") empfangHoerer.push(fn); },
    beiZustand(fn) { if (typeof fn === "function") zustandHoerer.push(fn); },

    /* Zweimal schließen ist erlaubt und tut nichts — sonst müsste jede
       Aufräumstelle vorher fragen, ob schon jemand anders geschlossen
       hat, und genau dort wird es vergessen.

       **Der Vermittler wird hier nicht geschlossen.** Bei vier Leuten
       hält der Gastgeber drei Leitungen über **einen** Vermittler;
       schlösse die erste ihn mit, wären die anderen beiden tot. Wer
       ihn gebaut hat, schließt ihn. */
    schliesse(grund = "Die Verbindung wurde beendet.") {
      if (kanal) { try { kanal.close(); } catch { /* schon zu */ } kanal = null; }
      if (leitung) { try { leitung.close(); } catch { /* schon zu */ } leitung = null; }
      setzeZustand(ZU, grund);
    },

    /* Für Anzeige und Prüfung: Zahlen, keine Meinung. */
    stand() {
      return {
        zustand,
        grund: letzterGrund,
        istGastgeber,
        fach,
        vermittlung: vermittler.art,
        gesendet,
        empfangen,
        kanalOffen: !!kanal && kanal.readyState === "open"
      };
    }
  };
}

/* ── Die Bausteine des Browsers ─────────────────────────────────────*/

/* Erst hier geholt, nicht beim Einlesen — Begründung in der Kopfnotiz.
   Die Meldung nennt keinen englischen Begriff ohne Übersetzung: Wer
   das liest, sitzt vor einem Spiel und nicht vor einem Handbuch. */
export function holeBauart() {
  const bauart = globalThis.RTCPeerConnection;
  if (typeof bauart !== "function") {
    throw new Error("Dieses Programm kann keine direkte Verbindung aufbauen — dem "
      + "Browser fehlt der Baustein dafür (WebRTC). In einem aktuellen Firefox, "
      + "Chrome oder Edge geht es; am Spiel selbst liegt es nicht.");
  }
  return bauart;
}

/* Ein Vermittler ist alles, was diese vier Dinge kann. Geprüft wird
   beim Bauen und nicht beim ersten Aufruf: Ein Tippfehler im Namen
   soll sofort als Satz erscheinen und nicht drei Sekunden später als
   „ist keine Funktion". */
function pruefeVermittler(vermittler) {
  const noetig = ["lege", "hole", "warte", "schliesse"];
  if (!vermittler || typeof vermittler !== "object") {
    throw new Error("Ohne Vermittlung geht keine Verbindung — es fehlt der Vermittler.");
  }
  for (const name of noetig) {
    if (typeof vermittler[name] !== "function") {
      throw new Error(`Diese Vermittlung kann „${name}" nicht — sie taugt nicht als `
        + `Vermittler (nötig sind: ${noetig.join(", ")}).`);
    }
  }
}

/* Wartet, bis der Browser seine Erreichbarkeiten beisammen hat — oder
   bis die Geduld reicht. Beides endet gleich: Die Angabe geht heraus.
   Eine Angabe mit den Adressen, die schon da sind, ist schlechter als
   eine vollständige und **viel** besser als gar keine. */
function warteAufAdressen(leitung, ruhe) {
  if (leitung.iceGatheringState === "complete") return Promise.resolve();
  return new Promise((fertig) => {
    let entschieden = false;
    const schluss = () => {
      if (entschieden) return;
      entschieden = true;
      leitung.removeEventListener("icegatheringstatechange", horch);
      fertig();
    };
    function horch() {
      if (leitung.iceGatheringState === "complete") schluss();
    }
    leitung.addEventListener("icegatheringstatechange", horch);
    ruhe(SAMMEL_FRIST_MS).then(schluss);
  });
}
