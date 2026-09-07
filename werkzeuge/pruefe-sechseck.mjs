/* [Aufgabe: Prüfwesen] Das Sechseckraster — sechs Nachbarn, ein Maß,
   und beides muss zueinander passen.

   ── Warum es das gibt / Warum so ───────────────────────────────────

   Am 07.09.2026 hat Jannik entschieden: *„ja hexagon. raster form."*
   (Vorgang #6). Das Raster wird als Versatzzeilen geführt — jede
   ungerade Zeile ein halbes Feld weiter rechts, wie Ziegel in einer
   Mauer.

   An dieser Bauform gehen zwei Dinge schief, und beide **lautlos**:

   · **Die Nachbarschaft wird einseitig.** Wer für gerade und ungerade
     Zeilen dieselbe Richtungstabelle nimmt, bekommt ein Raster, in dem
     A den Nachbarn B sieht, B aber nicht A. Nichts stürzt ab. Im Spiel
     heißt es: Man wird von jemandem geschlagen, den man selbst nicht
     erreichen kann — und niemand versteht warum.
   · **Tabelle und Entfernung gehören verschiedenen Rastern.** Die
     Richtungstabelle sagt, wohin man tritt; die Entfernungsformel sagt,
     wie weit es ist. Sind sie nicht dasselbe Raster, stimmt jede
     einzelne für sich und zusammen nichts: Eine Figur läuft sieben
     Schritte für eine Entfernung von fünf, und die Aktionspunkte
     stimmen nie.

   Geprüft wird deshalb der Fall, der ohne diese Arbeit falsch wäre —
   und zwar so, dass die beiden Hälften **gegeneinander** geprüft
   werden statt jede gegen sich selbst:

   · **Nachbarschaft ist gegenseitig.** Über jedes Feld einer Karte,
     nicht über ein Beispiel.
   · **Jeder Nachbar hat Entfernung 1.** Das bindet die Formel an die
     Tabelle.
   · **Gezählte Schritte gleich gerechnete Entfernung.** Eine
     Breitensuche läuft über die Richtungstabelle und zählt Schritte;
     die Formel rechnet dieselbe Strecke. Beide Zahlen müssen für
     **jedes** Feldpaar gleich sein. Das ist die Behauptung, die alles
     zusammenhält — sie kann nur grün sein, wenn Tabelle und Formel
     dasselbe Raster meinen.
   · **Ein Ring im Abstand n hat 6n Felder.** Die Signatur eines
     Sechseckrasters. Auf einem Quadratraster wäre sie 4n.

   ── Was hier bewusst nicht geprüft wird ────────────────────────────

   Wie ein Sechseck **aussieht**. Diese Datei redet nur über
   Nachbarschaft und Entfernung; gezeichnet wird noch gar nichts. Das
   ist Absicht: Erst die Regeln, dann das Bild (Vorgang #6).

   Und: Das alte Vierer-Raster ist **noch in Betrieb**. Nichts hier
   schaltet um. Diese Datei beweist nur, dass die neue Rechnung stimmt,
   bevor irgendetwas von ihr abhängt.

   ── Arbeitet zusammen mit ──────────────────────────────────────────

   `spiel/gitter.mjs` (`SECHS_GERADE`, `SECHS_UNGERADE`,
   `sechsRichtungen`, `sechsNachbarn`, `sechsAbstand`),
   `werkzeuge/helfer.mjs`, `werkzeuge/pruefe-alles.mjs`. */

import { abschnitt, behaupte, gleich, ende } from "./helfer.mjs";
import {
  SECHS_GERADE, SECHS_UNGERADE, macheKarte, sechsAbstand, sechsNachbarn, sechsRichtungen
} from "../spiel/gitter.mjs";

const messungen = [];

/* Eine offene Karte — hier interessiert die Geometrie, nicht der Inhalt.
   Ungerade Maße mit Absicht: Ein Fehler in der Zeilenparität versteckt
   sich am liebsten hinter geraden Zahlen. */
const BREITE = 21;
const HOEHE = 17;
const karte = macheKarte(BREITE, HOEHE);

/* ══════════════════════════════════════════════════════════════════
   1 · Die Tabellen selbst
   ══════════════════════════════════════════════════════════════════ */
{
  abschnitt("Die zwei Richtungstabellen");

  gleich(SECHS_GERADE.length, 6, "die gerade Zeile hat sechs Richtungen");
  gleich(SECHS_UNGERADE.length, 6, "die ungerade Zeile hat sechs Richtungen");

  /* Beide Tabellen müssen dieselben Namen führen — sonst hieße dieselbe
     Himmelsrichtung je nach Zeile anders, und jeder Aufrufer, der über
     den Namen geht, läge in jeder zweiten Zeile falsch. */
  const nGerade = SECHS_GERADE.map((r) => r.name).sort().join(",");
  const nUngerade = SECHS_UNGERADE.map((r) => r.name).sort().join(",");
  gleich(nUngerade, nGerade, "beide Tabellen führen dieselben sechs Namen");

  /* Kein Eintrag darf auf der Stelle stehen bleiben. */
  for (const [wie, tabelle] of [["gerade", SECHS_GERADE], ["ungerade", SECHS_UNGERADE]]) {
    const still = tabelle.filter((r) => r.dx === 0 && r.dy === 0);
    gleich(still.length, 0, `keine Richtung bleibt stehen (${wie})`);
    const doppelt = new Set(tabelle.map((r) => `${r.dx},${r.dy}`));
    gleich(doppelt.size, 6, `keine Richtung steht zweimal drin (${wie})`);
  }

  gleich(sechsRichtungen(0), SECHS_GERADE, "Zeile 0 nimmt die gerade Tabelle");
  gleich(sechsRichtungen(1), SECHS_UNGERADE, "Zeile 1 nimmt die ungerade Tabelle");
  gleich(sechsRichtungen(4), SECHS_GERADE, "Zeile 4 nimmt die gerade Tabelle");
  gleich(sechsRichtungen(7), SECHS_UNGERADE, "Zeile 7 nimmt die ungerade Tabelle");
}

/* ══════════════════════════════════════════════════════════════════
   2 · Sechs Nachbarn, und die Nachbarschaft ist gegenseitig
   ══════════════════════════════════════════════════════════════════

   Der Fehler, den diese beiden Behauptungen fangen, ist der teuerste
   dieser Bauform — und er sieht auf dem Papier richtig aus. */
{
  abschnitt("Nachbarschaft");

  let innenSechs = 0, innen = 0, einseitig = 0, ersteStelle = "";
  for (let y = 0; y < HOEHE; y++) {
    for (let x = 0; x < BREITE; x++) {
      const nb = sechsNachbarn(karte, x, y);

      /* Innen heißt: kein Nachbar fällt aus der Karte. */
      const alleDrin = sechsRichtungen(y)
        .every((r) => karte.drin(x + r.dx, y + r.dy));
      if (alleDrin) { innen++; if (nb.length === 6) innenSechs++; }

      for (const n of nb) {
        const zurueck = sechsNachbarn(karte, n.x, n.y);
        if (!zurueck.some((z) => z.x === x && z.y === y)) {
          einseitig++;
          if (!ersteStelle) ersteStelle = `(${x},${y}) sieht (${n.x},${n.y}), umgekehrt nicht`;
        }
      }
    }
  }

  gleich(innenSechs, innen, `jedes Feld im Inneren hat sechs Nachbarn (${innen} geprüft)`);
  gleich(einseitig, 0,
    `Nachbarschaft ist gegenseitig${ersteStelle ? ` — ${ersteStelle}` : ""}`);
  messungen.push(`${BREITE}x${HOEHE}: ${innen} Felder im Inneren, alle mit sechs Nachbarn, `
    + "keine einseitige Nachbarschaft");
}

/* ══════════════════════════════════════════════════════════════════
   3 · Die Entfernung gehört zur Tabelle
   ══════════════════════════════════════════════════════════════════ */
{
  abschnitt("Entfernung und Tabelle passen zusammen");

  /* Jeder Nachbar ist genau einen Schritt weit. Ohne diese Behauptung
     könnten Tabelle und Formel zwei verschiedene Raster meinen. */
  let nichtEins = 0, beispiel = "";
  for (let y = 0; y < HOEHE; y++) {
    for (let x = 0; x < BREITE; x++) {
      for (const n of sechsNachbarn(karte, x, y)) {
        const d = sechsAbstand(x, y, n.x, n.y);
        if (d !== 1) {
          nichtEins++;
          if (!beispiel) beispiel = `(${x},${y})→(${n.x},${n.y}) ist ${d}`;
        }
      }
    }
  }
  gleich(nichtEins, 0, `jeder Nachbar ist genau 1 weit${beispiel ? ` — ${beispiel}` : ""}`);

  gleich(sechsAbstand(5, 5, 5, 5), 0, "ein Feld zu sich selbst ist 0 weit");

  /* Gegenseitig, wie die Nachbarschaft. */
  let unsymmetrisch = 0;
  for (let i = 0; i < 400; i++) {
    const ax = i % BREITE, ay = (i * 7) % HOEHE;
    const bx = (i * 3) % BREITE, by = (i * 11) % HOEHE;
    if (sechsAbstand(ax, ay, bx, by) !== sechsAbstand(bx, by, ax, ay)) unsymmetrisch++;
  }
  gleich(unsymmetrisch, 0, "die Entfernung ist in beide Richtungen gleich");
}

/* ══════════════════════════════════════════════════════════════════
   4 · Gezählte Schritte gleich gerechnete Entfernung
   ══════════════════════════════════════════════════════════════════

   Die Behauptung, die alles zusammenhält. Eine Breitensuche läuft
   ausschließlich über die Richtungstabelle und zählt Schritte; die
   Formel rechnet dieselbe Strecke, ohne die Tabelle je anzusehen.
   Stimmen beide für jedes Feldpaar überein, meinen sie dasselbe
   Raster — und nur dann. */
{
  abschnitt("Schritte zählen gegen Entfernung rechnen");

  /* Von der Mitte aus, damit der Rand die Wege nicht verkürzt. */
  const sx = BREITE >> 1, sy = HOEHE >> 1;
  const schritte = new Map([[`${sx},${sy}`, 0]]);
  let welle = [[sx, sy]];
  while (welle.length) {
    const naechste = [];
    for (const [x, y] of welle) {
      const d = schritte.get(`${x},${y}`);
      for (const n of sechsNachbarn(karte, x, y)) {
        const k = `${n.x},${n.y}`;
        if (schritte.has(k)) continue;
        schritte.set(k, d + 1);
        naechste.push([n.x, n.y]);
      }
    }
    welle = naechste;
  }

  gleich(schritte.size, BREITE * HOEHE, "die Suche erreicht jedes Feld der Karte");

  let ungleich = 0, wo = "", groesste = 0;
  for (const [k, gelaufen] of schritte) {
    const [x, y] = k.split(",").map(Number);
    const gerechnet = sechsAbstand(sx, sy, x, y);
    if (gerechnet > groesste) groesste = gerechnet;
    if (gelaufen !== gerechnet) {
      ungleich++;
      if (!wo) wo = `(${x},${y}): gelaufen ${gelaufen}, gerechnet ${gerechnet}`;
    }
  }
  gleich(ungleich, 0,
    `gezählte Schritte gleich gerechnete Entfernung${wo ? ` — ${wo}` : ""}`);
  messungen.push(`${schritte.size} Felder von (${sx},${sy}) durchgezählt, `
    + `weiteste Entfernung ${groesste} — Schritte und Formel überall gleich`);
}

/* ══════════════════════════════════════════════════════════════════
   5 · Die Signatur des Sechsecks: ein Ring im Abstand n hat 6n Felder
   ══════════════════════════════════════════════════════════════════

   Auf einem Quadratraster mit vier Richtungen wären es 4n. Diese
   Behauptung allein unterscheidet die beiden Raster. */
{
  abschnitt("Ringe");

  /* Groß genug, dass die Ringe bis 5 vollständig in der Karte liegen. */
  const weit = macheKarte(41, 41);
  const mx = 20, my = 20;
  const zaehler = new Map();
  for (let y = 0; y < 41; y++) {
    for (let x = 0; x < 41; x++) {
      const d = sechsAbstand(mx, my, x, y);
      zaehler.set(d, (zaehler.get(d) || 0) + 1);
    }
  }
  void weit;

  gleich(zaehler.get(0), 1, "im Abstand 0 liegt genau ein Feld");
  for (let n = 1; n <= 5; n++) {
    gleich(zaehler.get(n), 6 * n, `im Abstand ${n} liegen ${6 * n} Felder`);
  }
  messungen.push("Ringe um (20,20) in 41x41: "
    + [0, 1, 2, 3, 4, 5].map((n) => `${n}→${zaehler.get(n)}`).join(", "));
}

/* ══════════════════════════════════════════════════════════════════
   6 · Das alte Raster läuft noch
   ══════════════════════════════════════════════════════════════════

   Diese Datei schaltet nichts um. Ginge das hier verloren, hätte
   jemand mitten in der Vorbereitung den Kern umgestellt — und die
   Umstellung soll ein eigener, beweisbarer Schritt sein. */
{
  abschnitt("Nichts ist umgeschaltet");
  const gitter = await import("../spiel/gitter.mjs");
  gleich(gitter.RICHTUNGEN.length, 4,
    "das alte Vierer-Raster ist noch in Betrieb (Umstellung ist ein eigener Schritt)");
  behaupte(typeof gitter.schussweite === "function",
    "die Schachbrett-Schussweite gibt es noch — sie entfällt erst mit der Umstellung");
}

for (const zeile of messungen) console.log(`      · ${zeile}`);
ende("Das Sechseckraster");
