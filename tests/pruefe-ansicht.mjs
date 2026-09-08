/* [Aufgabe: Prüfwesen] Prüft Zoom und Touch-Abgrenzung am DOM-Ereignisweg.

   ── Warum die Reihenfolge gemessen wird ────────────────────────────

   Der erste Finger einer Zoomgeste könnte schon einen ausgewählten Weg
   bestätigen oder einen Aktionsknopf drücken. Deshalb genügt es nicht,
   am Ende eine andere Zoomstufe zu sehen: Vor dem Loslassen darf kein
   Tipp zur Eingabe und kein Touch-Druck zu deren Hörer gelangen.

   Die kleine Bühne bildet Capture, Ziel und Bubble getrennt ab. Auch
   ein auf der Toolbar begonnener Finger läuft dabei durch das Dokument.
   Die Kamera ist echt, die Spieleingabe schreibt nur ihre Aufrufe mit.
   Browser-Vollbild selbst braucht weiterhin eine echte Browserprüfung.

   ── Arbeitet zusammen mit ─────────────────────────────────────────

   `runtime/ansicht.js` (Controller), `runtime/kamera.js` (echte Zoomgrenzen),
   `tests/helfer.mjs` (Behauptungen), `werkzeuge/pruefe-alles.mjs`
   (startet diese Prüfung), `runtime/start.js` (verdrahtet dieselben Ausgänge). */

import { abschnitt, behaupte, gleich, tiefGleich, ende } from "./helfer.mjs";
import { macheAnsicht } from "../runtime/ansicht.js";
import { macheKamera } from "../runtime/kamera.js";

function macheKnoten(eltern = null, tagName = "DIV") {
  const hoerer = [];
  const attribute = new Map();
  const capture = (art) => art === true || art?.capture === true;
  return {
    eltern, tagName, hoerer, hidden: false, disabled: false, style: {}, textContent: "",
    addEventListener(art, tue, optionen = false) {
      hoerer.push({ art, tue, capture: capture(optionen), optionen });
    },
    removeEventListener(art, tue, optionen = false) {
      const i = hoerer.findIndex((h) => h.art === art && h.tue === tue
        && h.capture === capture(optionen));
      if (i >= 0) hoerer.splice(i, 1);
    },
    setAttribute(name, wert) { attribute.set(name, wert); },
    getAttribute(name) { return attribute.get(name); },
    closest(selector) {
      const tags = selector.split(",").map((s) => s.trim().toUpperCase());
      for (let k = this; k; k = k.eltern) {
        if (tags.includes(k.tagName)) return k;
        if (selector.includes("[contenteditable]")
          && k.getAttribute("contenteditable") !== undefined) return k;
      }
      return null;
    }
  };
}

function feuere(ziel, type, zusatz = {}) {
  const fund = {
    type, target: ziel, pointerType: "touch", pointerId: 1,
    clientX: 210, clientY: 120, defaultPrevented: false, gestoppt: false, sofort: false,
    preventDefault() { this.defaultPrevented = true; },
    stopPropagation() { this.gestoppt = true; },
    stopImmediatePropagation() { this.gestoppt = true; this.sofort = true; },
    ...zusatz
  };
  const weg = [];
  for (let k = ziel; k; k = k.eltern) weg.push(k);
  const rufe = (k, capture) => {
    for (const h of [...k.hoerer]) {
      if (h.art === type && h.capture === capture) h.tue(fund);
      if (fund.sofort) break;
    }
  };
  for (const k of [...weg].reverse()) {
    rufe(k, true);
    if (fund.gestoppt) return fund;
  }
  for (const k of weg) {
    rufe(k, false);
    if (fund.gestoppt) break;
  }
  return fund;
}

function mitProbe(tue) {
  const fenster = macheKnoten(null, "WINDOW");
  const doc = macheKnoten(null, "DOCUMENT");
  const blatt = macheKnoten(doc, "CANVAS");
  const leiste = macheKnoten(doc);
  const elemente = new Map([["ansicht", leiste]]);
  for (const id of ["zoom-kleiner", "zoom-groesser", "zoom-standard", "vollbild"]) {
    elemente.set(id, macheKnoten(leiste, "BUTTON"));
  }
  elemente.set("ansicht-meldung", macheKnoten(leiste));
  doc.getElementById = (id) => elemente.get(id) || null;
  doc.visibilityState = "visible";
  doc.fullscreenElement = null;
  blatt.ownerDocument = doc;
  blatt.width = 800;
  blatt.height = 400;
  blatt.getBoundingClientRect = () => ({ left: 10, top: 20, width: 400, height: 200 });
  const spiele = [];
  function neuesSpiel() {
    const tipps = [], tasten = [];
    const spiel = {
      kamera: macheKamera({ fensterBreite: 960, fensterHoehe: 640,
        karte: { breite: 30, hoehe: 20 } }),
      eingabe: {
        beiTipp: (x, y) => tipps.push({ x, y }),
        beiTaste: (taste) => tasten.push(taste)
      },
      tipps, tasten
    };
    spiele.push(spiel);
    return spiel;
  }
  let spiel = neuesSpiel();
  let vollbilder = 0, einzelrufe = 0, verbrauche = false;
  const alte = new Map();
  for (const name of ["addEventListener", "removeEventListener"]) {
    alte.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, { configurable: true,
      value: fenster[name].bind(fenster) });
  }
  let ansicht;
  try {
    ansicht = macheAnsicht({ blatt, spielLesen: () => spiel,
      vollbild: () => { vollbilder++; },
      beiEinzeltipp: () => { einzelrufe++; return verbrauche; } });
    tue({ doc, blatt, leiste, fenster, ansicht, spiele,
      element: (id) => elemente.get(id), neuesSpiel,
      spiel: () => spiel,
      setzeSpiel: (neu) => { spiel = neu; ansicht.aktualisiere(); },
      verbraucheTipp: () => { verbrauche = true; },
      einzelrufe: () => einzelrufe, vollbilder: () => vollbilder,
      finger: (type, id = 1, x = 210, y = 120, ziel = blatt) =>
        feuere(ziel, type, { pointerId: id, clientX: x, clientY: y }),
      alleKnoten: [doc, blatt, fenster, ...elemente.values()]
    });
  } finally {
    ansicht?.loese();
    for (const [name, alt] of alte) {
      if (alt) Object.defineProperty(globalThis, name, alt);
      else delete globalThis[name];
    }
  }
}

abschnitt("Einzeltipp und Ereignisweg");
mitProbe((p) => {
  let durchgekommen = 0;
  p.blatt.addEventListener("pointerdown", () => { durchgekommen++; });
  const unten = p.finger("pointerdown");
  gleich(p.spiel().tipps.length, 0, "pointerdown führt noch keinen Tipp aus");
  gleich(p.einzelrufe(), 0, "auch der Startausgang wartet auf pointerup");
  gleich(durchgekommen, 0, "Capture schützt den bisherigen Spieleingabe-Hörer");
  behaupte(unten.defaultPrevented, "Touch-Druck unterdrückt Browser-Nachschläge");
  p.finger("pointerup");
  tiefGleich(p.spiel().tipps, [{ x: 400, y: 200 }],
    "genau ein Loslassen liefert korrekt umgerechnete Canvas-Koordinaten");
  gleich(p.einzelrufe(), 1, "der Startausgang wird genau einmal gefragt");
  p.finger("pointerup");
  gleich(p.spiel().tipps.length, 1, "ein doppeltes Up wiederholt den Tipp nicht");
  for (const pointerType of ["mouse", "pen"]) {
    const e = feuere(p.blatt, "pointerdown", { pointerType });
    behaupte(!e.defaultPrevented, `${pointerType} behält seinen bisherigen Ereignisweg`);
  }
  gleich(durchgekommen, 2, "Maus und Stift erreichen den bisherigen Hörer");
  gleich(p.spiel().tipps.length, 1, "der Controller verdoppelt Maus und Stift nicht");
});

mitProbe((p) => {
  p.verbraucheTipp();
  p.finger("pointerdown"); p.finger("pointerup");
  gleich(p.einzelrufe(), 1, "Pause oder Abstieg kann den Einzeltipp verbrauchen");
  gleich(p.spiel().tipps.length, 0, "ein verbrauchter Tipp fällt nicht in die Spieleingabe");
});

abschnitt("Mehrere Finger bleiben bis zum letzten Up eine Geste");
for (const ersterOben of [1, 2]) {
  mitProbe((p) => {
    p.finger("pointerdown", 1, 110, 120);
    p.finger("pointerdown", 2, 115, 120);
    p.finger("pointerup", ersterOben, ersterOben === 1 ? 110 : 115, 120);
    gleich(p.spiel().tipps.length, 0, `${ersterOben} zuerst oben: kein vorzeitiger Tipp`);
    const letzter = ersterOben === 1 ? 2 : 1;
    p.finger("pointerup", letzter, letzter === 1 ? 110 : 115, 120);
    gleich(p.spiel().tipps.length, 0, `${ersterOben} zuerst oben: auch am Ende kein Tipp`);
    gleich(p.einzelrufe(), 0, "die Mehrfingergeste löst auch keinen Abstieg aus");
    p.finger("pointerdown", 3); p.finger("pointerup", 3);
    gleich(p.spiel().tipps.length, 1, "ein neuer einzelner Kontakt funktioniert danach");
  });
}

mitProbe((p) => {
  const vorher = p.spiel().kamera.vergroesserung;
  p.finger("pointerdown", 1, 110, 120);
  p.finger("pointerdown", 2, 210, 120);
  p.finger("pointermove", 2, 310, 120);
  gleich(p.spiel().kamera.vergroesserung, vorher * 2,
    "doppelter Fingerabstand verdoppelt die ganzzahlige Zoomstufe");
  p.finger("pointerup", 1, 110, 120);
  p.finger("pointermove", 2, 308, 120);
  p.finger("pointerup", 2, 308, 120);
  gleich(p.spiel().tipps.length, 0, "ein verbleibender Finger wird nach dem Pinch kein Tipp");
  behaupte(p.spiel().tasten.every((taste) => taste === "Escape"),
    "die Ansicht räumt nur die Anwahl auf und ruft keinen Spielbefehl auf");
});

abschnitt("Abbruch, Bewegung und Sitzungswechsel");
for (const abbruch of ["pointercancel", "blur", "visibilitychange"]) {
  mitProbe((p) => {
    p.finger("pointerdown");
    if (abbruch === "pointercancel") p.finger(abbruch);
    else if (abbruch === "blur") feuere(p.fenster, abbruch);
    else { p.doc.visibilityState = "hidden"; feuere(p.doc, abbruch); }
    p.finger("pointerup");
    gleich(p.spiel().tipps.length, 0, `${abbruch} verwirft den begonnenen Tipp`);
    p.doc.visibilityState = "visible";
    p.finger("pointerdown", 2); p.finger("pointerup", 2);
    gleich(p.spiel().tipps.length, 1, `${abbruch} lässt keinen Zeiger dauerhaft hängen`);
  });
}

for (const mitBewegung of [true, false]) {
  mitProbe((p) => {
    p.finger("pointerdown", 1, 110, 120);
    if (mitBewegung) p.finger("pointermove", 1, 210, 120);
    p.finger("pointerup", 1, 210, 120);
    gleich(p.spiel().tipps.length, 0,
      `deutlich versetztes Loslassen ist kein Tipp, mit pointermove: ${mitBewegung}`);
  });
}

mitProbe((p) => {
  p.finger("pointerdown"); p.finger("pointerup", 1, 500, 120);
  gleich(p.spiel().tipps.length, 0, "Loslassen außerhalb des Blatts ist kein Tipp");
  p.finger("pointerdown");
  p.setzeSpiel(p.neuesSpiel());
  p.finger("pointerup");
  behaupte(p.spiele.every((s) => s.tipps.length === 0),
    "ein Sitzungswechsel verwirft den Tipp für die alte und neue Sitzung");
});

abschnitt("Kontakte über Vorlauf und Toolbar hinweg");
mitProbe((p) => {
  const spiel = p.spiel();
  p.setzeSpiel(null);
  const los = p.finger("pointerdown", 1, 110, 120);
  behaupte(!los.defaultPrevented, "der Vorlauf behält seinen Tipp auf Los");
  p.setzeSpiel(spiel);
  p.finger("pointerdown", 2, 115, 120);
  p.finger("pointerup", 1, 110, 120);
  p.finger("pointerup", 2, 115, 120);
  gleich(spiel.tipps.length, 0, "der überlappende Spielfinger wird kein Einzeltipp");
  gleich(p.einzelrufe(), 0, "die Vorlauf-Überlappung erreicht auch keinen Startausgang");
});

for (const toolbarZuerst of [true, false]) {
  mitProbe((p) => {
    const taste = p.element("zoom-groesser");
    const eins = toolbarZuerst ? taste : p.blatt;
    const zwei = toolbarZuerst ? p.blatt : taste;
    p.finger("pointerdown", 1, 110, 120, eins);
    p.finger("pointerdown", 2, 115, 120, zwei);
    p.finger("pointerup", 2, 115, 120, zwei);
    p.finger("pointerup", 1, 110, 120, eins);
    gleich(p.spiel().tipps.length, 0,
      `Toolbar und Karte überlappen ohne Spielkommando, Toolbar zuerst: ${toolbarZuerst}`);
  });
}

mitProbe((p) => {
  const vorher = p.spiel().kamera.vergroesserung;
  p.finger("pointerdown", 1, 110, 120);
  p.finger("pointerdown", 2, 210, 120);
  const taste = p.element("zoom-groesser");
  p.finger("pointerdown", 3, 310, 120, taste);
  p.finger("pointerup", 1, 110, 120);
  p.finger("pointermove", 3, 410, 120, taste);
  gleich(p.spiel().kamera.vergroesserung, vorher,
    "nach einem dritten Kontakt zoomt ein verbliebener Toolbar-Finger nicht die Karte");
  p.finger("pointerup", 2, 210, 120);
  p.finger("pointerup", 3, 310, 120, taste);
  gleich(p.spiel().tipps.length, 0, "auch drei überlappende Finger erzeugen keinen Tipp");
});

abschnitt("Knöpfe, Mausrad und Zoomtasten");
mitProbe((p) => {
  const kamera = p.spiel().kamera;
  const normal = kamera.vergroesserung;
  const plus = p.element("zoom-groesser"), minus = p.element("zoom-kleiner");
  const standard = p.element("zoom-standard");
  behaupte(!p.leiste.hidden, "die Leiste ist im Spiel sichtbar");
  feuere(plus, "click");
  gleich(kamera.vergroesserung, normal + 1, "Plus vergrößert um eine Stufe");
  gleich(standard.textContent, `${normal + 1}×`, "der Knopf zeigt die echte Stufe");
  feuere(minus, "click");
  gleich(kamera.vergroesserung, normal, "Minus verkleinert um eine Stufe");
  feuere(plus, "click"); feuere(standard, "click");
  behaupte(kamera.zoomStand().automatisch, "Reset stellt den automatischen Zoom wieder her");
  gleich(kamera.vergroesserung, normal, "Reset stellt die Standardstufe her");
  for (let i = 0; i < 20; i++) feuere(plus, "click");
  gleich(kamera.vergroesserung, kamera.zoomStand().max, "Plus hält die Obergrenze ein");
  behaupte(plus.disabled, "Plus wird an der Obergrenze gesperrt");
  for (let i = 0; i < 20; i++) feuere(minus, "click");
  gleich(kamera.vergroesserung, 1, "Minus hält die Untergrenze ein");
  behaupte(minus.disabled, "Minus wird an der Untergrenze gesperrt");
  feuere(standard, "click");
  const rad = (deltaY, deltaMode = 0) => feuere(p.blatt, "wheel", { deltaY, deltaMode });
  rad(-30); rad(-30);
  gleich(kamera.vergroesserung, normal, "kleine Raddeltas lösen nicht sofort mehrfach Zoom aus");
  const e = rad(-20);
  gleich(kamera.vergroesserung, normal + 1, "angesammelte Raddeltas lösen eine Stufe aus");
  behaupte(e.defaultPrevented, "Zoomrad rollt nicht gleichzeitig die Seite");
  rad(5, 1);
  gleich(kamera.vergroesserung, normal, "Zeilen-Raddeltas werden berücksichtigt");
  rad(-1, 2);
  gleich(kamera.vergroesserung, normal + 1, "Seiten-Raddeltas werden berücksichtigt");
  feuere(p.blatt, "keydown", { key: "0" });
  gleich(kamera.vergroesserung, normal, "Taste 0 setzt den Zoom zurück");
  feuere(p.blatt, "keydown", { key: "+" });
  gleich(kamera.vergroesserung, normal + 1, "Plus-Taste vergrößert");
  feuere(p.blatt, "keydown", { key: "-" });
  gleich(kamera.vergroesserung, normal, "Minus-Taste verkleinert");
  const fremd = feuere(p.blatt, "keydown", { key: "+", ctrlKey: true });
  behaupte(!fremd.defaultPrevented, "Strg-Plus bleibt beim Browser");
  gleich(kamera.vergroesserung, normal, "Strg-Plus verändert die Spielkamera nicht");
  gleich(p.spiel().tipps.length, 0, "sämtliche Zoomwege schicken keinen Kartentipp");
  p.setzeSpiel(null);
  behaupte(p.leiste.hidden, "die Leiste bleibt im Vorlauf verborgen");
  behaupte(!rad(-100).defaultPrevented, "das Mausrad wird im Vorlauf nicht beansprucht");
  gleich(kamera.vergroesserung, normal, "der Vorlauf verändert die alte Spielkamera nicht");
});

abschnitt("Toolbar-Tastatur und Aufräumen");
mitProbe((p) => {
  let spielTasten = 0;
  p.doc.addEventListener("keydown", () => { spielTasten++; });
  p.doc.addEventListener("keyup", () => { spielTasten++; });
  const taste = p.element("zoom-groesser");
  const kind = macheKnoten(taste, "SPAN");
  const vorher = p.spiel().kamera.vergroesserung;
  for (const key of ["Enter", " "]) {
    for (const type of ["keydown", "keyup"]) {
      const e = feuere(kind, type, { key });
      behaupte(e.gestoppt, `${type} ${JSON.stringify(key)} bleibt in der Toolbar`);
      behaupte(!e.defaultPrevented, `${type} ${JSON.stringify(key)} behält die native Bedienung`);
    }
  }
  for (const key of ["f", "F"]) {
    const davor = p.vollbilder();
    const e = feuere(kind, "keydown", { key });
    behaupte(e.gestoppt && e.defaultPrevented, `${key} gehört dem Vollbildknopf`);
    gleich(p.vollbilder(), davor + 1, `${key} schaltet auch mit Knopffokus einmal Vollbild`);
    feuere(kind, "keyup", { key });
  }
  const plus = feuere(kind, "keydown", { key: "+" });
  behaupte(plus.gestoppt && plus.defaultPrevented, "Plus mit Knopffokus gehört der Kamera");
  feuere(kind, "keyup", { key: "+" });
  gleich(spielTasten, 0, "kein Toolbar-Tastendruck erreicht die Spiel-Dokumentlistener");
  gleich(p.spiel().kamera.vergroesserung, vorher + 1,
    "Plus mit Knopffokus vergrößert um genau eine Stufe");
  const vorKlick = p.vollbilder();
  feuere(p.element("vollbild"), "click");
  gleich(p.vollbilder(), vorKlick + 1, "der Vollbildknopf reicht genau einen Aufruf weiter");
  p.doc.fullscreenElement = p.doc;
  feuere(p.doc, "fullscreenchange");
  gleich(p.element("vollbild").textContent, "Fenster", "Vollbild aktualisiert den Knopftext");
  gleich(p.element("vollbild").getAttribute("aria-pressed"), "true",
    "Vollbild meldet seinen Zustand auch für Hilfstechnik");
  p.ansicht.melde("Vollbild steht hier nicht zur Verfügung.");
  gleich(p.element("ansicht-meldung").textContent, "Vollbild steht hier nicht zur Verfügung.",
    "eine Rückmeldung wird im vorgesehenen Feld gezeigt");
  const fremde = 2;
  p.finger("pointerdown");
  p.ansicht.loese();
  gleich(p.alleKnoten.reduce((n, k) => n + k.hoerer.length, 0), fremde,
    "loese entfernt alle eigenen Hörer und lässt fremde stehen");
  p.finger("pointerup");
  gleich(p.spiel().tipps.length, 0, "nach loese wird kein angefangener Tipp mehr ausgeführt");
});

mitProbe((p) => {
  const vorher = p.spiel().kamera.vergroesserung;
  for (const tag of ["INPUT", "TEXTAREA", "SELECT", "DIV"]) {
    const feld = macheKnoten(p.doc, tag);
    if (tag === "DIV") feld.setAttribute("contenteditable", "true");
    const e = feuere(feld, "keydown", { key: "+" });
    behaupte(!e.defaultPrevented, `${tag} darf weiterhin Plus eingeben`);
    gleich(p.spiel().kamera.vergroesserung, vorher, `${tag} verändert die Kamera nicht`);
  }
});

ende("Ansicht, Zoom und Touch-Abgrenzung");
