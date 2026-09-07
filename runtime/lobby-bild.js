/* [Aufgabe: Oberfläche] Der Vorlauf als ruhige Zeilen in warmem Creme.

   ── Warum es das gibt ──────────────────────────────────────────────

   Die Lobby verwaltet Seiten, Eingaben und Verbindungen. Dieses Blatt
   liest nur den bereits gelegten Aufbau. So passen Änderungen am Bild
   in eine eigene Datei, ohne die Abläufe des Vorlaufs zu verändern.
   Scotophobias Menü ist das Vorbild: fast Schwarz, warmer Titel, dünne
   Linien statt Kästen. Fokus bekommt eine Seitenmarke, Auswahl eine
   warme Fläche. Beide bleiben auch zusammen voneinander unterscheidbar.

   Alle Flächen liegen auf ganzen Bildpunkten. Es gibt weder Animation
   noch eine zusätzliche Lichtberechnung für das ruhende Menü.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `runtime/lobby.js` reicht Zeilen, Trefferflächen und Eingabezustand;
   `runtime/palette.js` trägt die Vorlauffarben, `runtime/schrift.js`
   malt die vorhandene Pixelschrift. `werkzeuge/pruefe-vorlauf.mjs`
   misst Stil und Bedienbarkeit, `pruefe-einstieg.mjs` den Startablauf. */

import * as schrift from "./schrift.js";
import { VORLAUF } from "./palette.js";

export function zeichneVorlauf(ctx, bild, lesbar, umbrich) {
  const {
    breite, hoehe, stufe, zeilen, stellen, zeiger, unterZeiger,
    aktivesFeld, werte, leitungsSatz, meldung, meldungGut, textHoehe
  } = bild;
  let gezeichnet = 0;

  function male(x, y, b, h, farbe) {
    if (b <= 0 || h <= 0) return;
    ctx.fillStyle = farbe;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(b), Math.round(h));
    gezeichnet++;
  }

  function text(inhalt, x, y, farbe, gross = stufe) {
    return schrift.zeichne(ctx, lesbar(inhalt), x, y, farbe, { gross });
  }

  function mittig(inhalt, x, y, b, farbe, gross = stufe) {
    const weite = schrift.breiteVon(lesbar(inhalt)) * gross;
    return text(inhalt, x + Math.round((b - weite) / 2), y, farbe, gross);
  }

  function mitteY(hoch) {
    return Math.max(0, Math.round((hoch - stufe - schrift.ZEICHEN_HOCH * stufe) / 2));
  }

  function maleKnopf(stelle, beschriftung, gewaehlt, reihe = false) {
    const fokus = stellen[zeiger]?.schluessel === stelle.schluessel;
    const drueber = unterZeiger === stelle.schluessel;
    const betont = fokus || drueber;
    const { x, y, breite: b, hoehe: h } = stelle;
    male(x, y, b, h - stufe, gewaehlt ? VORLAUF.aktiv : VORLAUF.flaeche);
    male(x, y + h - 2 * stufe, b, stufe,
      betont ? VORLAUF.akzent : gewaehlt ? VORLAUF.schrift : VORLAUF.linie);
    if (betont) male(x, y + 12 * stufe, 2 * stufe, h - 25 * stufe, VORLAUF.akzent);
    const farbe = gewaehlt ? VORLAUF.titel : VORLAUF.schrift;
    if (reihe) mittig(beschriftung, x, y + mitteY(h), b, farbe);
    else text(beschriftung, x + 12 * stufe, y + mitteY(h), farbe);
  }

  function maleFeld(zeile) {
    const marke = `${zeile.marke}:`;
    const markeBreite = schrift.breiteVon(lesbar(marke)) * stufe + 3 * stufe;
    const x = zeile.x + markeBreite;
    const b = zeile.breite - markeBreite;
    const dran = aktivesFeld === zeile.schluessel;
    const mitte = mitteY(zeile.hoehe);
    text(marke, zeile.x, zeile.y + mitte, VORLAUF.matt);
    male(x, zeile.y, b, zeile.hoehe - stufe, dran ? VORLAUF.aktiv : VORLAUF.flaeche);
    male(x, zeile.y + zeile.hoehe - 2 * stufe, b, stufe,
      dran ? VORLAUF.akzent : VORLAUF.linie);
    /* Wie bisher steht bei langen Codes das Ende im Feld. Das letzte
       Zeichen bleibt damit beim Tippen sichtbar; der ganze Wert bleibt. */
    const passt = Math.max(1, Math.floor(b / stufe / schrift.VORSCHUB) - 1);
    const roh = werte[zeile.schluessel] || "";
    const sicht = roh.length > passt ? roh.slice(roh.length - passt) : roh;
    text(sicht + (dran ? "_" : ""), x + 2 * stufe, zeile.y + mitte, VORLAUF.schrift);
  }

  ctx.imageSmoothingEnabled = false;
  male(0, 0, breite, hoehe, VORLAUF.grund);
  for (const zeile of zeilen) {
    if (zeile.art === "titel") {
      text(zeile.text, zeile.x, zeile.y, VORLAUF.titel, 4 * stufe);
    } else if (zeile.art === "unter") {
      text(zeile.text, zeile.x, zeile.y, VORLAUF.matt);
    } else if (zeile.art === "text") {
      text(zeile.text, zeile.x, zeile.y, zeile.farbe || VORLAUF.schrift);
    } else if (zeile.art === "knopf") {
      maleKnopf(zeile, zeile.text, false);
    } else if (zeile.art === "reihe") {
      for (const teil of zeile.teile) maleKnopf(teil, teil.text, teil.an === true, true);
    } else if (zeile.art === "feld") {
      maleFeld(zeile);
    }
  }
  if (leitungsSatz !== "") {
    mittig(leitungsSatz, 0, hoehe - 3 * textHoehe * stufe, breite, VORLAUF.matt);
  }
  if (meldung !== "") {
    const zeichen = Math.floor(breite / stufe / schrift.VORSCHUB) - 2;
    for (const [i, zeile] of umbrich(meldung, zeichen).slice(0, 2).entries()) {
      mittig(zeile, 0, hoehe - (2 - i) * textHoehe * stufe, breite,
        meldungGut ? VORLAUF.gut : VORLAUF.warn);
    }
  }
  return gezeichnet;
}
