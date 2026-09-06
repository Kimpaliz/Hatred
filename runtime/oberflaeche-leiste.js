/* [Aufgabe: Oberfläche] Die Aktionsleiste am unteren Rand — als Felder, die
   ein Finger trifft, nicht nur als Text, der Tasten nennt.

   ── Warum es das gibt / Warum so ───────────────────────────────────

   Der Auftrag lautet wörtlich: *„ja bitte hauptsächlich android
   compatible."* Auf einem Handy gibt es keine Tastatur. Eine Leiste, die
   „1 Gehen 1 je Feld" schreibt, nennt dort eine Taste, die niemand
   drücken kann — das Spiel ist auf dem Telefon unbedienbar, obwohl alles
   zu lesen ist. Deshalb liefert diese Datei zu jedem Eintrag ein
   **Feld**: die Stelle, an der ein Tipp dasselbe auslöst wie die Taste.
   Zwei davon gibt es **nur** am Finger — Karte und Menü —, weil man an
   diese zwei Dinge auf dem Telefon sonst gar nicht herankommt.

   Drei Entscheidungen tragen den Aufbau:

   1. **Die Felder entstehen beim Zeichnen, nicht daneben.** Jedes Feld
      wird in dem Augenblick gemeldet, in dem sein Kasten fällt — mit
      genau den Maßen, mit denen gemalt wurde. Eine zweite Rechnung für
      dieselbe Stelle liefe auseinander (Fehlerbuch E2), und zwar
      lautlos: Der Finger träfe daneben, und niemand sähe warum.
   2. **Am Finger ist jedes Feld mindestens 48 Bildschirmpunkte groß.**
      Das ist Androids Mindestmaß für einen Daumen; was für einen
      Mauszeiger reicht, trifft er nicht. Reicht die Breite nicht, wird
      die Leiste **umgebrochen** und höher — nicht enger. Ein gequetschtes
      Feld sieht auf dem Bild noch gut aus und ist trotzdem unbedienbar.
   3. **Ohne Finger bleibt alles auf den Bildpunkt genau wie vorher.**
      `finger: false` zeichnet dieselben Rechtecke in derselben
      Reihenfolge wie vor dem Umbau. Nur so ist beweisbar, dass die
      neuen Felder die alte Leiste nicht beschädigt haben (Regel 12).

   ── Warum am Finger auch das Unmögliche dasteht ────────────────────

   Ohne Finger zeigt die Leiste nur, was der Kern gerade erlaubt. Am
   Finger wäre das falsch: Die Felder sprängen bei jedem ausgegebenen
   Punkt an eine andere Stelle, und der Daumen lernt eine Stelle, die
   sich bewegt. Deshalb steht am Finger der ständige Vorrat des Wesens —
   und was gerade nicht geht, steht **matt** da (`FARBEN.hudMatt`) und
   trägt `aktiv: false`. Sonst tippt man dreimal und nichts geschieht,
   und das sieht aus wie ein kaputtes Telefon.

   ── Warum diese Datei getrennt von `oberflaeche.js` liegt ──────────

   Zusammen wären es über tausend Zeilen (Regel 8). Geteilt wurde an der
   Naht, die ohnehin da war: Die Leiste ist das einzige Stück der
   Anzeige, das **angefasst** wird; alles andere wird nur gelesen.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `runtime/oberflaeche.js` — reicht das Zeichengerät herein (`fuelle`,
   `schreibe`, `kasten`, `textBreite`, `kuerze`, `masse`) und führt die
   Feldliste, in die `merke` einträgt; von dort kommt auch die Ausfuhr
   `felder()`. Dazu `runtime/palette.js` (jede Farbe),
   `spiel/aktionen.mjs` (`moeglicheAktionen`, `kostenVon` — die eine
   Wahrheit über erlaubt und Preis), `spiel/hoehen.mjs`
   (`GEHEN_KOSTEN`), `spiel/katalog/waffen.mjs` und
   `spiel/katalog/faehigkeiten.mjs` (die Namen), `runtime/eingabe.js`
   (liest `felder()`, um einen Tipp einer Aktion zuzuordnen) und
   `werkzeuge/pruefe-oberflaeche.mjs`. Schreibt selbst **nie** in den
   Zustand. */

import { FARBEN } from "./palette.js";

import { AKTION, kostenVon, moeglicheAktionen } from "../spiel/aktionen.mjs";
import { GEHEN_KOSTEN } from "../spiel/hoehen.mjs";
import { waffe, kenntWaffe } from "../spiel/katalog/waffen.mjs";
import { faehigkeit, kenntFaehigkeit } from "../spiel/katalog/faehigkeiten.mjs";

/* Die Tasten. Sie stehen **hier** und nicht in der Eingabe, damit
   Anzeige und Tastatur nicht auseinanderlaufen können: Was die Leiste
   anzeigt, ist genau das, was die Taste auslöst. */
export const TASTEN = {
  gehen: "1",
  angriff: "2",
  stoss: "3",
  trank: "4",
  aufheben: "5",
  wacht: "W",
  zugEnde: "E"
};

/* Für die Fähigkeiten, in der Reihenfolge, in der das Wesen sie trägt. */
export const FAEHIGKEIT_TASTEN = ["6", "7", "8", "9"];

/* Androids Mindestmaß für eine Fläche, die ein Daumen sicher trifft:
   48 geräteunabhängige Punkte. Die Zahl ist nicht gewählt, sondern die
   Vorgabe der Plattform — deshalb steht sie einmal hier und wird
   nirgends nachgerechnet. */
export const FINGER_MINDESTMASS = 48;

/* Wie viel vom Bild die Leiste am Finger höchstens einnehmen darf: die
   Hälfte. Wer nur noch Felder sieht, sieht den Kerker nicht mehr, und
   ein Zug, dessen Ziel man nicht sieht, ist nicht planbar. */
const FINGER_ANTEIL = 2;

/* In welcher Folge die Aktionsleiste liest. Nicht die Folge aus
   `moeglicheAktionen` — die ist nach Prüfaufwand sortiert, diese hier
   nach dem, was man im Zug zuerst tut. */
const REIHUNG = {
  gehen: 0, angriff: 1, stoss: 2, faehigkeit: 3,
  trank: 4, aufheben: 5, wacht: 6, zugEnde: 7
};

/* Was es nur am Finger gibt. Beides ist auf dem Telefon sonst gar nicht
   erreichbar: Die Übersichtskarte hängt an `Tab`, und ein Menü hat
   überhaupt keine Taste — deshalb steht dort `null` und keine erfundene.
   Wer sie wegkürzen muss, kürzt von hinten: das Menü zuerst. */
/* Der Vorrat, der am Finger **immer** dasteht — auch ohne Punkte. Das
   ist das ständige Können eines Wesens: gehen, schlagen, stoßen,
   warten. Trank und Aufheben stehen nicht dabei; die hängen daran, was
   man trägt und was am Boden liegt, und ein Feld, das nie angeht, ist
   nur Gedränge. */
const FINGER_GRUNDVORRAT = [AKTION.gehen, AKTION.angriff, AKTION.stoss, AKTION.wacht];

const ZUSATZ_FELDER = [
  { id: "karte", art: "karte", taste: "Tab", beschriftung: "Karte" },
  { id: "menue", art: "menue", taste: null, beschriftung: "Menü" }
];

/* ── Die Leiste ─────────────────────────────────────────────────────

   `werkzeug` ist das Zeichengerät von `oberflaeche.js`: dieselbe Schere,
   dieselbe Schrift, dieselben Maße. Nichts davon wird hier nachgebaut —
   sonst gäbe es zwei Anzeigen, die verschieden aussehen. */
export function macheLeiste(werkzeug) {
  const { fuelle, schreibe, kasten, textBreite, kuerze, masse, merke } = werkzeug;

  /* Der kleine Vorrat ist keine Bequemlichkeit: Ohne ihn liefe die
     Wegsuche über alle erreichbaren Felder sechzigmal je Sekunde,
     obwohl sich zwischen zwei Bildern eines rundenbasierten Spiels
     nichts ändert. Der Schlüssel nennt alles, was das Ergebnis
     verschiebt. */
  let vorratSchluessel = null;
  let vorratGruppen = [];

  /* Die Höhe der zuletzt gezeichneten Leiste. Sie steht hier und wird
     nicht zweimal ausgerechnet — die Anzeige stapelt Lauftext und
     Zielangabe darüber und darf sie nicht raten. */
  let letzteHoehe = null;

  /* ── Die möglichen Aktionen, zu Gruppen zusammengefasst ───────────

     `moeglicheAktionen` liefert jedes einzelne Ziel und jedes einzelne
     Laufziel — auf einer offenen Karte sind das schnell hundert
     Einträge. Die Leiste zeigt **Arten**: einmal Gehen, einmal Angriff,
     je Fähigkeit einmal. Welche Arten möglich sind, entscheidet weiter
     der Kern; hier wird nur zusammengefasst. */
  function aktionsGruppen(zustand, wesen) {
    if (!zustand || !wesen) return [];
    const schluessel = `${wesen.id}|${wesen.ap}|${wesen.x},${wesen.y}|`
      + `${(zustand.protokoll || []).length}|${zustand.runde}|${wesen.lp}`;
    if (schluessel === vorratSchluessel) return vorratGruppen;

    const gesehen = new Set();
    const gruppen = [];
    for (const aktion of moeglicheAktionen(zustand, wesen)) {
      const art = aktion.typ === AKTION.faehigkeit
        ? `faehigkeit:${aktion.schluessel}`
        : aktion.typ;
      if (gesehen.has(art)) continue;
      gesehen.add(art);
      gruppen.push({ art, typ: aktion.typ, schluessel: aktion.schluessel || null, aktion });
    }
    gruppen.sort((a, b) => (REIHUNG[a.typ] || 0) - (REIHUNG[b.typ] || 0));

    vorratSchluessel = schluessel;
    vorratGruppen = gruppen;
    return gruppen;
  }

  function gruppenName(zustand, wesen, gruppe) {
    switch (gruppe.typ) {
      case AKTION.gehen: return "Gehen";
      case AKTION.angriff:
        return kenntWaffe(wesen.waffe) ? waffe(wesen.waffe).name : "Angriff";
      case AKTION.stoss: return "Stoß";
      case AKTION.trank: return "Trank";
      case AKTION.aufheben: return "Aufheben";
      case AKTION.wacht: return "Wacht";
      case AKTION.zugEnde: return "Zug beenden";
      case AKTION.faehigkeit:
        return kenntFaehigkeit(gruppe.schluessel)
          ? faehigkeit(gruppe.schluessel).name
          : "Fähigkeit";
      default: return "Aktion";
    }
  }

  /* Die Taste zu einer Gruppe. Fähigkeiten bekommen sie in der
     Reihenfolge, in der das Wesen sie trägt — nicht in der des Katalogs,
     sonst hätte derselbe Held je nach Kerker andere Tasten. */
  function gruppenTaste(wesen, gruppe) {
    if (gruppe.typ !== AKTION.faehigkeit) return TASTEN[gruppe.typ] || "?";
    const stelle = ((wesen && wesen.faehigkeiten) || []).indexOf(gruppe.schluessel);
    return FAEHIGKEIT_TASTEN[stelle] || "?";
  }

  /* Der Preis, wie er in der Leiste steht. Gehen hat kein festes Ziel,
     also steht dort der Preis **je Feld** — die einzige ehrliche Zahl,
     solange der Zeiger nirgends liegt. Ohne fertige Aktion (der matte
     Fall am Finger) steht gar kein Preis: Der Kern rechnet ihn aus einer
     Aktion, und die gibt es dann nicht. Eine erfundene Zahl wäre die
     zweite Wahrheit, die diese Datei gerade vermeiden soll. */
  function gruppenKosten(zustand, gruppe) {
    if (gruppe.typ === AKTION.gehen) return `${GEHEN_KOSTEN} je Feld`;
    if (!gruppe.aktion) return "";
    const kosten = kostenVon(zustand, gruppe.aktion);
    if (!Number.isFinite(kosten)) return "-";
    return `${kosten} AP`;
  }

  /* Welche Art in der Ansicht gerade geplant ist — als derselbe
     Schlüssel, den `aktionsGruppen` vergibt. */
  function geplanteArt(ansicht) {
    if (!ansicht || !ansicht.geplant) return null;
    return ansicht.geplant.typ === AKTION.faehigkeit
      ? `faehigkeit:${ansicht.geplant.schluessel}`
      : ansicht.geplant.typ;
  }

  /* Die Kennung eines Feldes. Sie muss **stabil** sein: Die Eingabe
     merkt sich, was der Finger zuletzt getroffen hat, und eine Kennung,
     die sich zwischen zwei Bildern ändert, verliert die Anwahl. */
  const kennung = (gruppe) =>
    gruppe.typ === AKTION.zugEnde ? "zugEnde" : `aktion:${gruppe.art}`;

  const feldArt = (gruppe) => (gruppe.typ === AKTION.zugEnde ? "zugEnde" : "aktion");

  /* Die Beschriftung eines Feldes: genau das, was darauf steht. */
  const beschriftungVon = (name, kosten) => (kosten === "" ? name : `${name} ${kosten}`);

  /* Das Maß, mit dem die Anzeige seit jeher rechnet: eine Schriftzeile
     mit Luft darüber und darunter. */
  const schmalHoehe = (mass) => mass.zeile + 2 * mass.polster;

  const eintragsBreite = (zustand, dran, gruppe, polster) => textBreite(
    `${gruppenTaste(dran, gruppe)} ${gruppenName(zustand, dran, gruppe)} `
    + `${gruppenKosten(zustand, gruppe)}`) + 2 * polster;

  /* Ein Eintrag der Leiste: Taste, Name, Preis. Gibt zurück, wie breit er
     geworden ist — die Leiste rechnet damit weiter, statt dieselbe
     Messung ein zweites Mal aufzuschreiben.

     Das gemeldete Feld umfasst das **ganze Band** über dem Eintrag, nicht
     nur die Schriftzeile: Ein Mauszeiger trifft die Schrift, ein Finger
     die Fläche. Die Felder stoßen genau aneinander — `x` rückt um `weite`
     weiter, und das Feld beginnt um dasselbe `polster` früher, um das die
     Schrift eingerückt ist. */
  function maleEintrag(zustand, dran, gruppe, x, oben, geplantArt, mass) {
    const { stufe, polster, zeile } = mass;
    const taste = gruppenTaste(dran, gruppe);
    const name = gruppenName(zustand, dran, gruppe);
    const kosten = gruppenKosten(zustand, gruppe);
    const weite = textBreite(`${taste} ${name} ${kosten}`) + 2 * polster;
    if (gruppe.art === geplantArt) fuelle(x - polster, oben + stufe, weite, zeile,
      FARBEN.hudRahmen);
    let lauf = x;
    lauf += schreibe(`${taste} `, lauf, oben + polster, FARBEN.apVoll);
    lauf += schreibe(`${name} `, lauf, oben + polster, FARBEN.hudSchrift);
    schreibe(kosten, lauf, oben + polster, FARBEN.hudWarn);

    merke({
      id: kennung(gruppe),
      art: feldArt(gruppe),
      x: x - polster,
      y: oben,
      breite: weite,
      hoehe: schmalHoehe(mass),
      taste,
      aktion: gruppe.aktion,
      beschriftung: beschriftungVon(name, kosten),
      aktiv: true
    });
    return weite;
  }

  function maleEintraege(zustand, ansicht, dran, mass, gruppen) {
    const { polster, breite } = mass;
    const oben = mass.hoehe - schmalHoehe(mass);
    const geplantArt = geplanteArt(ansicht);

    /* „Zug beenden" wird **zuerst** und rechtsbündig gesetzt, dann erst
       der Rest von links. Sonst fällt gerade die eine Aktion aus der
       Leiste, ohne die man feststeckt: Sie steht in der Reihung hinten,
       und auf einem schmalen Fenster reicht der Platz nicht bis dorthin.
       Ein Spieler, der seinen Zug nicht beenden kann, hat kein Spiel. */
    const schluss = gruppen.find((g) => g.typ === AKTION.zugEnde);
    let rechteGrenze = breite - polster;
    if (schluss) {
      const weite = eintragsBreite(zustand, dran, schluss, polster);
      const x = breite - polster - weite + polster;
      maleEintrag(zustand, dran, schluss, x, oben, geplantArt, mass);
      rechteGrenze = x - 2 * polster;
    }

    let x = polster;
    for (const gruppe of gruppen) {
      if (gruppe === schluss) continue;
      const weite = eintragsBreite(zustand, dran, gruppe, polster);
      if (x + weite > rechteGrenze) break;
      maleEintrag(zustand, dran, gruppe, x, oben, geplantArt, mass);
      x += weite;
    }
  }

  /* ── Am Finger: Felder, die ein Daumen trifft ─────────────────────*/

  const fingerFeldHoehe = (mass) =>
    Math.min(mass.hoehe, Math.max(FINGER_MINDESTMASS, schmalHoehe(mass)));

  const fingerFeldBreite = (eintrag, mass) =>
    Math.min(mass.breite, Math.max(FINGER_MINDESTMASS, eintrag.wunschBreite));

  /* Ein Eintrag, so wie er am Finger aussieht: Name, darunter der Preis.
     Die Taste steht nicht darauf — sie hilft dort niemandem und nähme
     genau die Breite weg, die der Name braucht. Im Feld steht sie
     trotzdem, damit Tastatur und Finger dieselbe Aktion auslösen. */
  /* Der ganze Vorrat des Wesens, mit der Angabe, was davon gerade geht.
     Was der Kern anbietet, trägt seine fertige Aktion; der Rest steht
     ohne Aktion da und wird matt gezeichnet. */
  function fingerVorrat(zustand, dran, gruppen) {
    const nachArt = new Map(gruppen.map((g) => [g.art, g]));
    const arten = [...FINGER_GRUNDVORRAT];
    for (const schluessel of dran.faehigkeiten || []) {
      if (kenntFaehigkeit(schluessel)) arten.push(`faehigkeit:${schluessel}`);
    }
    /* Trank und Aufheben nur, wenn der Kern sie gerade anbietet. */
    for (const g of gruppen) {
      if (g.typ === AKTION.trank || g.typ === AKTION.aufheben) arten.push(g.art);
    }
    arten.push(AKTION.zugEnde);

    const vorrat = [];
    const gesehen = new Set();
    for (const art of arten) {
      if (gesehen.has(art)) continue;
      gesehen.add(art);
      const da = nachArt.get(art) || null;
      const faehig = art.startsWith("faehigkeit:");
      vorrat.push({
        gruppe: da || {
          art,
          typ: faehig ? AKTION.faehigkeit : art,
          schluessel: faehig ? art.slice("faehigkeit:".length) : null,
          aktion: null
        },
        aktiv: da !== null
      });
    }
    vorrat.sort((a, b) => (REIHUNG[a.gruppe.typ] || 0) - (REIHUNG[b.gruppe.typ] || 0));
    return vorrat;
  }

  function fingerEintrag(zustand, dran, roh, mass) {
    const gruppe = roh.gruppe;
    const name = gruppenName(zustand, dran, gruppe);
    const kosten = gruppenKosten(zustand, gruppe);
    return {
      id: kennung(gruppe),
      art: feldArt(gruppe),
      gruppe,
      taste: gruppenTaste(dran, gruppe),
      aktion: gruppe.aktion,
      name,
      kosten,
      beschriftung: beschriftungVon(name, kosten),
      aktiv: roh.aktiv,
      wunschBreite: Math.max(textBreite(name), textBreite(kosten)) + 2 * mass.polster
    };
  }

  const zusatzEintrag = (vorlage, mass) => ({
    id: vorlage.id,
    art: vorlage.art,
    gruppe: null,
    taste: vorlage.taste,
    aktion: null,
    name: vorlage.beschriftung,
    kosten: "",
    beschriftung: vorlage.beschriftung,
    aktiv: true,
    wunschBreite: textBreite(vorlage.beschriftung) + 2 * mass.polster
  });

  /* Die Einträge in Reihen brechen. Ein Eintrag, der allein schon breiter
     als das Fenster wäre, wird auf das Fenster gestutzt — sonst ragte er
     hinaus, und ein Feld außerhalb des Fensters ist ein Feld, das der
     Finger nie trifft. */
  function breche(eintraege, mass) {
    const reihen = [[]];
    let lauf = 0;
    for (const eintrag of eintraege) {
      const breite = fingerFeldBreite(eintrag, mass);
      if (lauf > 0 && lauf + breite > mass.breite) { reihen.push([]); lauf = 0; }
      reihen[reihen.length - 1].push({ eintrag, breite });
      lauf += breite;
    }
    return reihen;
  }

  /* Ein einzelnes Feld. Das gewählte bekommt eine gefüllte Fläche statt
     nur eines Rahmens: Am Handy liegt der Daumen darauf, und ein dünner
     Rahmen verschwindet darunter. */
  function maleFingerFeld(eintrag, x, y, breite, hoehe, mass, geplantArt) {
    const { polster, zeile } = mass;
    const gewaehlt = eintrag.gruppe !== null && eintrag.gruppe.art === geplantArt;
    kasten(x, y, breite, hoehe);
    if (gewaehlt) {
      fuelle(x + polster, y + polster, breite - 2 * polster, hoehe - 2 * polster,
        FARBEN.hudRahmen);
    }

    const innen = breite - 2 * polster;
    const name = kuerze(eintrag.name, innen);
    const kosten = eintrag.kosten === "" ? "" : kuerze(eintrag.kosten, innen);
    const zeilen = kosten === "" ? 1 : 2;
    const ny = y + Math.floor((hoehe - zeilen * zeile) / 2);
    /* Matt statt hell, wenn es gerade nicht geht — sonst sieht „zu teuer"
       genauso aus wie „kostet drei", und man tippt dreimal ins Leere. */
    schreibe(name, x + Math.floor((breite - textBreite(name)) / 2), ny,
      eintrag.aktiv ? FARBEN.hudSchrift : FARBEN.hudMatt);
    if (kosten !== "") {
      schreibe(kosten, x + Math.floor((breite - textBreite(kosten)) / 2), ny + zeile,
        eintrag.aktiv ? FARBEN.hudWarn : FARBEN.hudMatt);
    }

    merke({
      id: eintrag.id,
      art: eintrag.art,
      x, y, breite, hoehe,
      taste: eintrag.taste === undefined ? null : eintrag.taste,
      aktion: eintrag.aktion,
      beschriftung: eintrag.beschriftung,
      aktiv: eintrag.aktiv
    });
  }

  function maleReihen(reihen, oben, feldHoch, mass, geplantArt) {
    for (let r = 0; r < reihen.length; r++) {
      let x = 0;
      const y = oben + r * feldHoch;
      for (const platz of reihen[r]) {
        maleFingerFeld(platz.eintrag, x, y, platz.breite, feldHoch, mass, geplantArt);
        x += platz.breite;
      }
    }
  }

  function maleFinger(zustand, ansicht, dran, mass, gruppen) {
    const geplantArt = geplanteArt(ansicht);
    const feldHoch = fingerFeldHoehe(mass);
    const hoechstens = Math.max(1, Math.floor(mass.hoehe / (FINGER_ANTEIL * feldHoch)));

    const vorrat = fingerVorrat(zustand, dran, gruppen);
    const schluss = vorrat.find((e) => e.gruppe.typ === AKTION.zugEnde) || null;
    let aktionen = vorrat.filter((e) => e !== schluss)
      .map((e) => fingerEintrag(zustand, dran, e, mass));
    let zusatz = ZUSATZ_FELDER.map((v) => zusatzEintrag(v, mass));
    const letzte = schluss ? [fingerEintrag(zustand, dran, schluss, mass)] : [];

    /* Passt nicht alles, fällt von hinten weg — erst die letzte Aktion,
       dann das Menü, dann die Karte. „Zug beenden" bleibt in jedem Fall
       stehen; ohne dieses Feld steckt man auf dem Telefon fest, denn es
       gibt keinen anderen Weg aus dem Zug. */
    let reihen = breche([...aktionen, ...zusatz, ...letzte], mass);
    while (reihen.length > hoechstens) {
      if (aktionen.length > 0) aktionen = aktionen.slice(0, -1);
      else if (zusatz.length > 0) zusatz = zusatz.slice(0, -1);
      else break;
      reihen = breche([...aktionen, ...zusatz, ...letzte], mass);
    }

    const hoch = reihen.length * feldHoch;
    const oben = mass.hoehe - hoch;
    kasten(0, oben, mass.breite, hoch);
    maleReihen(reihen, oben, feldHoch, mass, geplantArt);
    return hoch;
  }

  /* Niemand ist am Zug — und trotzdem müssen Karte und Menü erreichbar
     bleiben. Ohne sie käme man am Ende eines Laufs auf dem Telefon aus
     dem Bild nicht mehr heraus: Es gibt keine Taste, die ein Menü
     öffnet, und `Tab` drückt dort niemand. */
  function maleFingerOhneZug(mass, satz) {
    const feldHoch = fingerFeldHoehe(mass);
    const kopf = schmalHoehe(mass);
    const hoch = Math.min(mass.hoehe, kopf + feldHoch);
    const oben = mass.hoehe - hoch;
    kasten(0, oben, mass.breite, hoch);
    schreibe(satz, mass.polster, oben + mass.polster, FARBEN.hudMatt);
    const zusatz = ZUSATZ_FELDER.map((v) => zusatzEintrag(v, mass));
    maleReihen(breche(zusatz, mass), oben + kopf, hoch - kopf, mass, null);
    return hoch;
  }

  /* ── Der eine Weg herein ──────────────────────────────────────────*/

  /* Zeichnet die Leiste und meldet dabei jedes Feld. Gibt die Höhe
     zurück, die sie diesmal eingenommen hat. */
  function maleAktionsleiste(zustand, ansicht, dran, finger = false) {
    const mass = masse();
    if (!dran) {
      letzteHoehe = finger
        ? maleFingerOhneZug(mass, "Niemand ist am Zug.")
        : meldung(mass, "Niemand ist am Zug.");
      return letzteHoehe;
    }

    const gruppen = aktionsGruppen(zustand, dran);
    if (gruppen.length === 0) {
      letzteHoehe = finger
        ? maleFingerOhneZug(mass, "Keine Aktion möglich.")
        : meldung(mass, "Keine Aktion möglich.");
      return letzteHoehe;
    }

    if (finger) {
      letzteHoehe = maleFinger(zustand, ansicht, dran, mass, gruppen);
      return letzteHoehe;
    }

    const hoch = schmalHoehe(mass);
    kasten(0, mass.hoehe - hoch, mass.breite, hoch);
    maleEintraege(zustand, ansicht, dran, mass, gruppen);
    letzteHoehe = hoch;
    return hoch;
  }

  /* Ein Satz statt der Einträge — wenn niemand am Zug ist oder der Kern
     gerade nichts erlaubt. Ohne ihn stünde dort ein leeres Band, und ein
     leeres Band sieht aus wie ein Fehler. */
  function meldung(mass, satz) {
    const hoch = schmalHoehe(mass);
    const oben = mass.hoehe - hoch;
    kasten(0, oben, mass.breite, hoch);
    schreibe(satz, mass.polster, oben + mass.polster, FARBEN.hudMatt);
    letzteHoehe = hoch;
    return hoch;
  }

  /* Wie hoch die Leiste steht. Vor dem ersten Bild gibt es noch keine
     gezeichnete Leiste — dann gilt das schmale Maß. */
  const hoeheVon = () => (letzteHoehe === null ? schmalHoehe(masse()) : letzteHoehe);

  return { maleAktionsleiste, aktionsGruppen, hoeheVon };
}
