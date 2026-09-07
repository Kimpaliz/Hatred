/* [Aufgabe: Regelkern] Der Zufall dieses Spiels — gesät, nie `Math.random`.

   ── Warum das hier die wichtigste Datei im Kern ist ─────────────────

   Drei Dinge hängen an dieser einen Entscheidung:

   1. **Netz-Koop.** Rechnen vier Rechner dieselbe Runde aus derselben
      Aktionsliste, muss nur die Aktionsliste über die Leitung — aber
      nur, wenn der Zufall auf allen vier bitgleich fällt. Genau das ist
      der Grund, warum `Hatred` über das Internet spielbar ist, ohne
      dass ein Server den ganzen Spielstand hin- und herschickt.
   2. **Fehlersuche.** „Bei Saat 41 stürzt der Hetzer in Runde 6 in die
      Lava" ist ein Befund. „Manchmal passiert etwas Komisches" nicht.
   3. **Prüfbarkeit.** Eine Landschaftsprüfung, die bei jedem Aufruf
      andere Karten bekommt, misst nichts.

   Gewürfelt wird deshalb an **einer** Stelle: beim Start eines Laufs.
   Alles darunter bekommt den Strom gereicht.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `spiel/landschaft.mjs`, `spiel/kampf.mjs`, `spiel/gegner-ki.mjs`,
   `spiel/lauf.mjs`. Kennt selbst nichts vom Spiel. */

/* mulberry32 — 32 Bit Zustand. Klein, schnell, für Spielzwecke gut
   genug verteilt. Wichtiger als die Qualität ist, dass er auf jedem
   Rechner **bitgleich** dasselbe liefert: nur ganzzahlige Operationen,
   kein Gleitkomma-Zwischenschritt, der sich zwischen Browsern
   unterscheiden könnte. */
export function macheZufall(saat) {
  let zustand = (saat >>> 0) || 1;

  const roh = () => {
    zustand = (zustand + 0x6d2b79f5) >>> 0;
    let t = zustand;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (t ^ (t >>> 14)) >>> 0;
  };

  const zahl = () => roh() / 4294967296;

  const strom = {
    /* [0, 1) */
    zahl,
    /* [von, bis) als Gleitkomma. */
    zwischen: (von, bis) => von + zahl() * (bis - von),
    /* [von, bis] als ganze Zahl, beide Enden eingeschlossen. Über den
       Rest der Rohzahl statt über `Math.floor(zahl() * n)` — das
       vermeidet den Gleitkommaschritt ganz. */
    ganz: (von, bis) => {
      const spanne = bis - von + 1;
      return spanne <= 0 ? von : von + (roh() % spanne);
    },
    /* Ein Element aus einer Liste; `undefined` bei leerer Liste. */
    ausListe: (liste) => liste.length ? liste[roh() % liste.length] : undefined,
    /* Trifft mit der Wahrscheinlichkeit p (0…1). */
    trifft: (p) => zahl() < p,
    /* Mischt **an Ort und Stelle** (Fisher-Yates) und gibt dieselbe
       Liste zurück. Wer das Original behalten will, kopiert vorher. */
    mischen: (liste) => {
      for (let i = liste.length - 1; i > 0; i--) {
        const j = roh() % (i + 1);
        const h = liste[i]; liste[i] = liste[j]; liste[j] = h;
      }
      return liste;
    },
    /* Ein Eintrag nach Gewichten. `gewichte` ist gleich lang wie
       `liste`; Gewicht 0 kommt nie. */
    nachGewicht: (liste, gewichte) => {
      let summe = 0;
      for (const g of gewichte) summe += g;
      if (summe <= 0) return undefined;
      let wurf = zahl() * summe;
      for (let i = 0; i < liste.length; i++) {
        wurf -= gewichte[i];
        if (wurf < 0) return liste[i];
      }
      return liste[liste.length - 1];
    },
    /* Ein eigener Strom, abgeleitet aus diesem. Damit kann die
       Landschaft würfeln, ohne den Kampfstrom zu verschieben — sonst
       verschöbe eine zusätzliche Fackel jeden späteren Trefferwurf. */
    zweig: () => macheZufall(roh()),
    /* Für Speicherstand und Desync-Erkennung. */
    zustand: () => zustand >>> 0,
    setzeZustand: (z) => { zustand = (z >>> 0) || 1; }
  };
  return strom;
}
