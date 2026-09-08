/* [Aufgabe: Prüfwesen] Prüft `spiel/wesen.mjs` und `spiel/kampf.mjs` —
   Figuren, Wirkungen, Trefferchance, Reichweite, Rüstung, Angriff.

   ── Warum es das gibt / Warum so ───────────────────────────────────

   Geprüft wird ausdrücklich der Fall, der **ohne die Arbeit falsch
   wäre**, nicht der, der ohnehin gewinnt. Für den Kampf sind das sechs
   Stellen, und alle sechs sind Fehler, die im Spiel unsichtbar bleiben:

   · **Die Begrenzung der Trefferchance.** Ein naiver Bau addiert und
     zieht ab und gibt das Ergebnis heraus. Bei einem gepanzerten,
     flinken Ziel in Deckung ist das eine negative Chance — die Aktion
     tut dann für immer nichts, ohne dass jemand erführe, warum.
   · **Die Richtung von Höhe und Deckung.** `ebene(angreifer) −
     ebene(ziel)` verkehrt herum getippt sieht man dem Spiel nicht an
     (man trifft von oben halt schlechter). Deshalb wird jede Richtung
     **einzeln** behauptet, nicht bloß „es ändert sich etwas"
     (Fehlerbuch A4).
   · **Rüstung größer als Schaden.** Ohne Mindestschaden ist ein
     Blutvogt gegen eine Truppe aus Dolchen unsterblich, und die
     Partie steht still, statt abzustürzen.
   · **Rüstung 0.** Der Gegenfall dazu: Wer den Mindestschaden falsch
     baut, macht aus 5 Schaden gegen einen ungepanzerten Gegner
     womöglich 1.
   · **Fernkampf durch die Wand.** Reichweite allein ist eine
     Entfernung, keine Schusslinie. Und der Gegenfall, der dieses Spiel
     ausmacht: **über** eine niedrige Mauer hinweg, von oben, muss der
     Schuss durchgehen — sonst ist das Plateau kein Vorteil, sondern
     eine Sackgasse.
   · **Derselbe Strom, derselbe Wurf.** Vier Rechner spielen dieselbe
     Runde nach. Ein Angriff, der zweimal aus derselben Saat
     verschiedene Ereignisse macht, ist ein Auseinanderlaufen mit
     Ansage — und ein **abgelehnter** Angriff, der Zufall verbraucht,
     ebenso (Fehlerbuch E2).

   Dazu die Messung am Ende: 20 000 Angriffe je Nahwaffe gegen denselben
   Gegner. Sie ist nicht Zierde, sondern der einzige Weg, die Sätze in
   der Kopfnotiz von `spiel/kampf.mjs` zu belegen — besonders den über
   `zweifach`, der sich rechnerisch leicht selbst betrügt.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `tests/helfer.mjs` (das Prüfgerüst), `spiel/wesen.mjs` und
   `spiel/kampf.mjs` (das Geprüfte), `spiel/gitter.mjs`,
   `spiel/hoehen.mjs`, `spiel/zufall.mjs`, `spiel/wegfindung.mjs`
   (`belegtPruefer` muss dort hineinpassen), `spiel/katalog/*.mjs`
   (die echten Zettel — geprüft wird mit dem, was im Spiel steht). */

import { abschnitt, behaupte, gleich, nahe, tiefGleich, wirft, ende } from "./helfer.mjs";
import { macheKarte, HINDERNIS, FLUESSIG } from "../spiel/gitter.mjs";
import { macheZufall } from "../spiel/zufall.mjs";
import { STURZ_SCHADEN_JE_STUFE, LAVA_SCHADEN } from "../spiel/hoehen.mjs";
import { erreichbareFelder } from "../spiel/wegfindung.mjs";
import { waffe } from "../spiel/katalog/waffen.mjs";
import { held } from "../spiel/katalog/helden.mjs";
import { gegner } from "../spiel/katalog/gegner.mjs";
import {
  WIRKUNGEN, SEITEN, MAX_SPIELER, macheWesen, wirkungAnhaengen, wirkungenTicken,
  hatWirkung, wirkungsStaerke, ruestungVon, sichtVon, apFuerZug,
  lebendig, istJaeger, istBrut, wesenBei, belegtPruefer
} from "../spiel/wesen.mjs";
import {
  TREFFER_MINDESTENS, TREFFER_HOECHSTENS, AUSWEICH_JE_FLINKHEIT, MINDEST_SCHADEN,
  SCHUTZ_HALB, WAFFEN_BRAND, SCHADENSGRUENDE, ausweichAnteil, trefferChance,
  reichweiteVon, inReichweite, schadenWurf, ruestungAbzug, fuehreAngriffAus
} from "../spiel/kampf.mjs";

/* ── Werkzeug für die Prüfung ───────────────────────────────────────
   Eigene Vorlagen und eigene Ströme: Ein Prüfwerkzeug darf im Gegensatz
   zu `spiel/` alles, was praktisch ist — es läuft nie im Spiel mit. */

let naechsteId = 1;

/* Eine Vorlage mit geraden Zahlen; `zusatz` überschreibt einzelne. */
function probeVorlage(zusatz = {}) {
  return {
    schluessel: "probe",
    name: "Probe",
    lpMax: 30,
    apMax: 6,
    flinkheit: 0,
    ruestung: 0,
    sicht: 8,
    waffe: "rostdolch",
    faehigkeiten: [],
    ...zusatz
  };
}

function probe(zusatz = {}, stelle = {}) {
  return macheWesen(probeVorlage(zusatz), {
    id: naechsteId++, seite: "jaeger", x: 2, y: 2, ...stelle
  });
}

/* Ein Strom mit Ansage: `zahlen` werden der Reihe nach für den
   Trefferwurf ausgegeben, `ganz` gibt immer den Höchstwert. Damit
   lassen sich Treffer und Fehlschlag einzeln prüfen, ohne auf eine
   Saat zu hoffen, bei der es zufällig passt. */
function stromAus(zahlen, ganzGibt = "hoechst") {
  let i = 0;
  return {
    zahl: () => zahlen[i++ % zahlen.length],
    ganz: (von, bis) => (ganzGibt === "hoechst" ? bis : von)
  };
}

const immerTreffer = () => stromAus([0]);
const immerFehl = () => stromAus([0.999999]);

function zustandMit(karte, wesen, zufall) {
  return {
    saat: 1, tiefe: 1, karte, zufall, wesen,
    nachId: new Map(wesen.map((w) => [w.id, w])),
    runde: 1, ordnung: wesen.map((w) => w.id), amZug: 0,
    seiteDran: "jaeger", spieler: [], vorbei: null, protokoll: []
  };
}

/* Eine leere Karte, alles Ebene 1, nichts drauf. */
const flach = (breite = 16, hoehe = 16) => macheKarte(breite, hoehe);

const arten = (ereignisse) => ereignisse.map((e) => e.art);

/* Das erste Schadensereignis einer Liste — und ein leeres Objekt, wenn
   keines darin steht. Ohne diesen Umweg bricht die Prüfung beim ersten
   fehlenden Ereignis mit einem Absturz ab, und die Meldungen aller
   übrigen Behauptungen kämen nie zur Anzeige. */
const schadenAus = (ereignisse) => ereignisse.find((e) => e.art === "schaden") || {};

/* ── Die Werte stehen fest ──────────────────────────────────────── */

abschnitt("Werte");
nahe(TREFFER_MINDESTENS, 0.05, 1e-12, "Trefferchance mindestens 5 Prozent");
nahe(TREFFER_HOECHSTENS, 0.95, 1e-12, "Trefferchance höchstens 95 Prozent");
nahe(AUSWEICH_JE_FLINKHEIT, 0.02, 1e-12, "Ausweichen: 2 Prozent je Flinkheit");
gleich(MINDEST_SCHADEN, 1, "mindestens 1 Schaden je Treffer");
gleich(WAFFEN_BRAND.runden >= 1 && WAFFEN_BRAND.schaden >= 1, true, "Waffenbrand tut etwas");
tiefGleich([...SCHUTZ_HALB].sort(), ["arkan", "feuer", "gift"],
  "halbe Rüstung gegen Feuer, Arkanes und Gift");
tiefGleich(SCHADENSGRUENDE, ["angriff", "flaeche", "sturz", "lava"], "die vier Schadensgründe");
tiefGleich(SEITEN, ["jaeger", "brut"], "zwei Seiten");
gleich(MAX_SPIELER, 4, "höchstens vier Spieler");

/* ── Figuren bauen ──────────────────────────────────────────────── */

abschnitt("Figuren bauen");
{
  const w = macheWesen(held("spaeher"), { id: 3, seite: "jaeger", x: 4, y: 5, spielerPlatz: 1 });
  gleich(w.art, "spaeher", "die Art ist der Schlüssel der Vorlage");
  gleich(w.lp, 18, "volle Lebenspunkte zu Beginn");
  gleich(w.lpMax, 18, "und das Höchstmaß dazu");
  gleich(w.ap, 7, "volle Aktionspunkte zu Beginn");
  /* Der Held nennt seine Waffe `startWaffe`, der Gegner `waffe` — am
     Wesen heißt beides `waffe`, sonst müsste jede Stelle danach fragen,
     wer da vor ihr steht. */
  gleich(w.waffe, "wurfmesser", "die Startwaffe des Helden landet in `waffe`");
  gleich(w.lebt, true, "lebt");
  gleich(w.wacht, false, "wacht nicht");
  gleich(w.spielerPlatz, 1, "sitzt auf Platz 1");
  gleich(w.wirkungen.length, 0, "trägt noch keine Wirkung");
  gleich(lebendig(w), true, "gilt als lebendig");
  gleich(istJaeger(w), true, "ist ein Jäger");
  gleich(istBrut(w), false, "und keine Brut");

  const g = macheWesen(gegner("grubenhund"), { id: 4, seite: "brut", x: 1, y: 1 });
  gleich(g.waffe, "hetzerbiss", "die Waffe des Gegners landet in `waffe`");
  gleich(g.spielerPlatz, null, "ein Gegner sitzt auf keinem Platz");
  gleich(istBrut(g), true, "ist Brut");

  /* Die Vorlage bleibt Vorlage: Wer die Fähigkeitenliste des Wesens
     anfasst, darf nicht dem ganzen Katalog etwas anhängen. */
  const held1 = macheWesen(held("bogenschuetzin"), { id: 5, seite: "jaeger", x: 0, y: 0 });
  held1.faehigkeiten.push("satzsprung");
  gleich(held("bogenschuetzin").faehigkeiten.length, 2, "die Vorlage behält ihre zwei Fähigkeiten");
  const held2 = macheWesen(held("bogenschuetzin"), { id: 6, seite: "jaeger", x: 0, y: 0 });
  gleich(held2.faehigkeiten.length, 2, "und das nächste Wesen bekommt sie unverändert");
  gleich(held2.eigenheit.art, "hoehenschuetze", "die Eigenheit kommt mit");

  /* Zwei Figuren aus derselben Vorlage müssen **byteweise** dieselbe
     Form haben — der Spielstand geht als Text über die Leitung, und
     dort ist die Reihenfolge der Felder die Einfügereihenfolge. */
  const a = macheWesen(gegner("kraetzling"), { id: 9, seite: "brut", x: 3, y: 3 });
  const b = macheWesen(gegner("kraetzling"), { id: 9, seite: "brut", x: 3, y: 3 });
  gleich(JSON.stringify(a), JSON.stringify(b), "gleiche Vorlage, byteweise gleiche Figur");
}

abschnitt("Figuren bauen: was auffallen muss");
{
  const v = probeVorlage();
  wirft(() => macheWesen(null, { id: 1, seite: "brut", x: 0, y: 0 }), "ohne Vorlage wirft es");
  wirft(() => macheWesen(v, { id: 1.5, seite: "brut", x: 0, y: 0 }), "krumme Kennnummer wirft");
  wirft(() => macheWesen(v, { id: 1, seite: "jäger", x: 0, y: 0 }), "unbekannte Seite wirft");
  wirft(() => macheWesen(v, { id: 1, seite: "brut", x: 0.5, y: 0 }), "krumme Koordinate wirft");
  wirft(() => macheWesen(v, { id: 1, seite: "brut", x: 0, y: 0, spielerPlatz: 5 }),
    "ein fünfter Spielerplatz wirft");
  /* Ohne diese Prüfung würde `lp` zu `undefined`, jeder Schaden zu
     `NaN` und die Figur gälte lautlos als tot. */
  wirft(() => macheWesen(probeVorlage({ lpMax: undefined }), { id: 1, seite: "brut", x: 0, y: 0 }),
    "eine Vorlage ohne lpMax wirft");
  wirft(() => macheWesen(probeVorlage({ lpMax: 0 }), { id: 1, seite: "brut", x: 0, y: 0 }),
    "eine Vorlage mit 0 Lebenspunkten wirft");
  wirft(() => macheWesen(probeVorlage({ ruestung: -1 }), { id: 1, seite: "brut", x: 0, y: 0 }),
    "negative Rüstung wirft");
  wirft(() => macheWesen(probeVorlage({ waffe: "morgenstern" }),
    { id: 1, seite: "brut", x: 0, y: 0 }), "ein Tippfehler im Waffenschlüssel wirft");
  wirft(() => macheWesen(probeVorlage({ faehigkeiten: ["satzsprnug"] }),
    { id: 1, seite: "brut", x: 0, y: 0 }), "ein Tippfehler im Fähigkeitsschlüssel wirft");
}

/* ── Wirkungen ─────────────────────────────────────────────────── */

abschnitt("Wirkungen anhängen");
{
  const w = probe();
  wirkungAnhaengen(w, "brennt", 2, 3);
  gleich(w.wirkungen.length, 1, "eine Wirkung liegt an");
  gleich(hatWirkung(w, "brennt"), true, "und wird gefunden");
  gleich(wirkungsStaerke(w, "brennt"), 3, "mit ihrer Stärke");
  gleich(wirkungsStaerke(w, "vergiftet"), 0, "was nicht anliegt, hat Stärke 0");

  /* Zusammenlegen statt anhängen: Sonst fesselten fünf Pechfesseln eine
     Figur für immer, und die Liste wüchse über dreißig Runden. */
  wirkungAnhaengen(w, "brennt", 5, 1);
  gleich(w.wirkungen.length, 1, "dieselbe Art bleibt ein Eintrag");
  gleich(w.wirkungen[0].runden, 5, "die längere Dauer gewinnt");
  gleich(w.wirkungen[0].staerke, 3, "und die höhere Stärke bleibt");

  wirft(() => wirkungAnhaengen(w, "verzaubert", 2, 1), "unbekannte Wirkung wirft");
  wirft(() => wirkungAnhaengen(w, "brennt", 0, 1), "null Runden wirft");
  wirft(() => wirkungAnhaengen(w, "brennt", 1.5, 1), "halbe Runden werfen");
  wirft(() => wirkungAnhaengen(w, "brennt", 2, -1), "negative Stärke wirft");
  wirft(() => wirkungAnhaengen(w, "brennt", 2, 0.5), "halbe Stärke wirft");
}

abschnitt("Wirkungen ticken");
{
  const w = probe({ lpMax: 20 });
  wirkungAnhaengen(w, "brennt", 2, 3);
  const erste = wirkungenTicken(w);
  tiefGleich(arten(erste), ["schaden"], "der Brand tut am Zugbeginn weh");
  gleich(erste[0].wieviel, 3, "drei Schaden");
  gleich(erste[0].quelle, "brennt", "die Quelle steht dran");
  gleich(erste[0].art2, "feuer", "und die Schadensart");
  gleich(erste[0].lpRest, 17, "die Restpunkte stehen im Ereignis");
  gleich(w.lp, 17, "und stimmen mit der Figur überein");
  gleich(w.wirkungen[0].runden, 1, "eine Runde ist herunter");

  wirkungenTicken(w);
  gleich(w.lp, 14, "die zweite Runde brennt auch");
  gleich(w.wirkungen.length, 0, "danach ist der Brand abgelaufen");
  tiefGleich(wirkungenTicken(w), [], "und tut nichts mehr");

  /* Rüstung hilft gegen den Brand nicht: Ein Panzer hält keine Flamme
     ab, die schon unter ihm brennt. Ohne diese Prüfung wäre die Regel
     ein Kommentar. */
  const gepanzert = probe({ ruestung: 5, lpMax: 20 });
  wirkungAnhaengen(gepanzert, "vergiftet", 1, 4);
  const gift = wirkungenTicken(gepanzert);
  gleich(gift[0].wieviel, 4, "Gift geht an der Rüstung vorbei");
  gleich(gift[0].art2, "gift", "und trägt seine eigene Schadensart");

  /* Wirkungen, die nicht auf Lebenspunkte gehen, laufen trotzdem ab —
     sonst bliebe ein Schildwall für immer stehen. */
  const gedeckt = probe({ ruestung: 1, sicht: 6, apMax: 6 });
  wirkungAnhaengen(gedeckt, "schild", 2, 3);
  wirkungAnhaengen(gedeckt, "geblendet", 2, 4);
  wirkungAnhaengen(gedeckt, "verlangsamt", 2, 2);
  gleich(ruestungVon(gedeckt), 4, "der Schild kommt auf die Rüstung");
  gleich(sichtVon(gedeckt), 2, "geblendet sieht weniger weit");
  gleich(apFuerZug(gedeckt), 4, "verlangsamt beginnt mit weniger Punkten");
  tiefGleich(wirkungenTicken(gedeckt), [], "keine davon tut Schaden");
  wirkungenTicken(gedeckt);
  gleich(gedeckt.wirkungen.length, 0, "nach zwei Runden sind alle drei weg");
  gleich(ruestungVon(gedeckt), 1, "die Rüstung ist wieder die eigene");
  gleich(sichtVon(gedeckt), 6, "die Sicht wieder die eigene");
  gleich(apFuerZug(gedeckt), 6, "die Punkte wieder die eigenen");

  /* Eine Blendung darf die Sicht nicht auf 0 drücken: Wer nicht einmal
     das Nachbarfeld kennt, hat keinen Zug mehr. */
  const blind = probe({ sicht: 3 });
  wirkungAnhaengen(blind, "geblendet", 1, 99);
  gleich(sichtVon(blind), 1, "geblendet sieht mindestens ein Feld weit");
  const lahm = probe({ apMax: 5 });
  wirkungAnhaengen(lahm, "verlangsamt", 1, 99);
  gleich(apFuerZug(lahm), 0, "verlangsamt gibt nie negative Punkte");
}

abschnitt("Wirkungen töten");
{
  const w = probe({ lpMax: 4 });
  wirkungAnhaengen(w, "brennt", 3, 9);
  const e = wirkungenTicken(w);
  tiefGleich(arten(e), ["schaden", "gestorben"], "der Brand kann töten");
  gleich(e[0].lpRest, 0, "Lebenspunkte bleiben bei 0 stehen");
  gleich(w.lebt, false, "die Figur gilt als tot");
  gleich(lebendig(w), false, "und lebt nicht mehr");
  gleich(e[1].x, w.x, "das Todesereignis nennt die Stelle");

  /* Ein Toter brennt nicht weiter — sonst stünden zwei `gestorben` in
     einer Liste und das Bild spielte den Tod zweimal ab. */
  tiefGleich(wirkungenTicken(w), [], "der Tote nimmt keinen Schaden mehr");

  const zwei = probe({ lpMax: 3 });
  wirkungAnhaengen(zwei, "brennt", 2, 5);
  wirkungAnhaengen(zwei, "vergiftet", 2, 5);
  const beide = wirkungenTicken(zwei);
  tiefGleich(arten(beide), ["schaden", "gestorben"], "zwei Wirkungen, ein Tod");
}

/* ── Wer wo steht ──────────────────────────────────────────────── */

abschnitt("Wer wo steht");
{
  const a = probe({}, { x: 4, y: 4 });
  const b = probe({}, { x: 5, y: 4 });
  const c = probe({}, { x: 4, y: 4 });
  c.lebt = false;
  const liste = [c, a, b];

  gleich(wesenBei(liste, 4, 4), a, "der Tote zählt nicht, der Lebende schon");
  gleich(wesenBei(liste, 9, 9), undefined, "auf leerem Feld steht niemand");

  const belegt = belegtPruefer(liste);
  gleich(belegt(4, 4), true, "das Feld des Lebenden ist belegt");
  gleich(belegt(5, 4), true, "das zweite auch");
  gleich(belegt(6, 4), false, "ein leeres Feld nicht");

  /* Momentaufnahme: Wer die Figuren bewegt, braucht einen neuen Prüfer.
     Ein Prüfer, der sich mitten in einer Wegsuche änderte, gäbe Wege,
     die es nie gab. */
  a.x = 9;
  gleich(belegt(4, 4), true, "der alte Prüfer bleibt bei seiner Aufnahme");
  gleich(belegtPruefer(liste)(9, 4), true, "ein neuer sieht die neue Stellung");

  /* Und er muss in die Wegfindung passen: Eine Figur in einem ein Feld
     breiten Gang sperrt ihn wirklich. */
  const karte = flach(9, 5);
  for (let x = 0; x < 9; x++) {
    for (let y = 0; y < 5; y++) if (y !== 2) karte.setze(x, y, { hindernis: HINDERNIS.wand });
  }
  const sperrer = probe({}, { x: 4, y: 2 });
  const ohne = erreichbareFelder(karte, 1, 2, 6);
  const mit = erreichbareFelder(karte, 1, 2, 6, { belegt: belegtPruefer([sperrer]) });
  gleich(ohne.has(karte.index(6, 2)), true, "ohne Figur reicht der Gang weit genug");
  gleich(mit.has(karte.index(6, 2)), false, "die Figur im Gang sperrt dahinter alles");
  gleich(mit.has(karte.index(3, 2)), true, "davor bleibt alles erreichbar");
}

/* ── Trefferchance ─────────────────────────────────────────────── */

abschnitt("Trefferchance");
{
  const karte = flach();
  const dolch = waffe("rostdolch");            /* Treffergrund 0,85 */
  const a = probe({}, { x: 5, y: 5 });
  const z = probe({ flinkheit: 0 }, { x: 6, y: 5 });
  nahe(trefferChance(karte, a, z, dolch), 0.85, 1e-9, "ohne alles gilt der Treffergrund");

  const flink = probe({ flinkheit: 5 }, { x: 6, y: 5 });
  nahe(trefferChance(karte, a, flink, dolch), 0.75, 1e-9, "Flinkheit 5 nimmt zehn Punkte weg");
  nahe(ausweichAnteil(flink), 0.10, 1e-9, "das ist der Ausweichanteil");
  gleich(ausweichAnteil({}), 0, "ein Wesen ohne Flinkheit weicht nicht aus");
}

abschnitt("Trefferchance: Höhe wirkt in die richtige Richtung");
{
  /* Fehlerbuch A4: Beide Richtungen einzeln behaupten. „Es ändert sich
     etwas" würde eine vertauschte Rechnung durchlassen. */
  const karte = flach();
  /* Der Kurzbogen (Treffergrund 0,74) und nicht der Dolch: Mit 0,85
     stieße der Höhenbonus an die Obergrenze, und die Prüfung würde
     dann die Begrenzung messen statt der Richtung. */
  const bogen = waffe("kurzbogen");
  const a = probe({}, { x: 5, y: 5 });
  const z = probe({}, { x: 6, y: 5 });

  nahe(trefferChance(karte, a, z, bogen), 0.74, 1e-9, "auf gleicher Ebene der Treffergrund");

  karte.setze(5, 5, { ebene: 2 });
  nahe(trefferChance(karte, a, z, bogen), 0.86, 1e-9,
    "von oben trifft man um 12 Punkte besser");

  karte.setze(5, 5, { ebene: 1 });
  karte.setze(6, 5, { ebene: 2 });
  nahe(trefferChance(karte, a, z, bogen), 0.62, 1e-9,
    "von unten um 12 Punkte schlechter");

  /* Drei Ebenen Unterschied wirken wie eine: Der Vorteil ist ein
     Vorzeichen, keine Entfernung. Wer ihn als Differenz rechnet,
     bekommt vom Hochplateau in den Graben 36 Punkte. */
  karte.setze(6, 5, { ebene: 0 });
  karte.setze(5, 5, { ebene: 3 });
  nahe(trefferChance(karte, a, z, bogen), 0.86, 1e-9, "drei Ebenen geben nicht dreimal so viel");

  karte.setze(5, 5, { ebene: 1 });
  karte.setze(6, 5, { ebene: 1 });
  nahe(trefferChance(karte, a, z, bogen), 0.74, 1e-9, "wieder eben, wieder der Treffergrund");
}

abschnitt("Trefferchance: Deckung nur in Angreiferrichtung");
{
  const karte = flach();
  const bogen = waffe("kurzbogen");            /* Treffergrund 0,74 */
  const a = probe({}, { x: 5, y: 8 });
  const z = probe({}, { x: 8, y: 8 });
  nahe(trefferChance(karte, a, z, bogen), 0.74, 1e-9, "freies Feld: der Treffergrund");

  /* Das Fass **vor** dem Ziel, aus Sicht des Angreifers. */
  karte.setze(7, 8, { hindernis: HINDERNIS.fass });
  nahe(trefferChance(karte, a, z, bogen), 0.54, 1e-9, "Deckung nimmt zwanzig Punkte weg");

  /* Und dasselbe Fass hinter dem Ziel deckt nichts — wer alle vier
     Nachbarn absucht, macht aus jedem Fass eine Burg. */
  karte.setze(7, 8, { hindernis: HINDERNIS.keins });
  karte.setze(9, 8, { hindernis: HINDERNIS.fass });
  nahe(trefferChance(karte, a, z, bogen), 0.74, 1e-9, "hinter dem Ziel deckt es nicht");
}

abschnitt("Trefferchance: die Grenzen halten");
{
  const karte = flach();
  const a = probe({}, { x: 5, y: 5 });
  const z = probe({}, { x: 6, y: 5 });
  const wahnsinn = { schluessel: "wahnsinn", art: "nah", ap: 1, reichweite: 1,
    trefferGrund: 5, schadensart: "hieb", wuerfel: { anzahl: 1, seiten: 4, festwert: 0 } };
  gleich(trefferChance(karte, a, z, wahnsinn), TREFFER_HOECHSTENS,
    "ein Treffergrund von 5 wird auf 95 Prozent gedeckelt");

  const jammer = { ...wahnsinn, trefferGrund: -5 };
  gleich(trefferChance(karte, a, z, jammer), TREFFER_MINDESTENS,
    "ein Treffergrund von -5 wird auf 5 Prozent angehoben");

  const aal = probe({ flinkheit: 1000 }, { x: 6, y: 5 });
  gleich(trefferChance(karte, a, aal, waffe("rostdolch")), TREFFER_MINDESTENS,
    "auch gegen Flinkheit 1000 bleiben 5 Prozent");

  /* Ein gepanzertes, flinkes Ziel in Deckung, von unten beschossen —
     der Fall, in dem ein naiver Bau eine negative Chance ausgibt. */
  karte.setze(6, 5, { ebene: 3 });
  karte.setze(5, 5, { ebene: 0 });
  const kaum = { ...wahnsinn, trefferGrund: 0.2 };
  const flink = probe({ flinkheit: 9 }, { x: 6, y: 5 });
  behaupte(trefferChance(karte, a, flink, kaum) >= TREFFER_MINDESTENS,
    "auch die schlechteste Stellung bleibt über der Untergrenze");

  wirft(() => trefferChance(karte, a, z, { schluessel: "leer" }), "Waffe ohne Treffergrund wirft");
  wirft(() => trefferChance(karte, null, z, waffe("rostdolch")), "ohne Angreifer wirft es");
}

/* ── Reichweite ────────────────────────────────────────────────── */

abschnitt("Reichweite: Nahkampf");
{
  const karte = flach();
  const dolch = waffe("rostdolch");            /* Reichweite 1 */
  const a = probe({}, { x: 5, y: 5 });
  gleich(inReichweite(karte, a, probe({}, { x: 6, y: 5 }), dolch), true, "das Nachbarfeld geht");
  gleich(inReichweite(karte, a, probe({}, { x: 6, y: 6 }), dolch), true,
    "über Eck auch — gemessen wird auf dem Schachbrett, nicht in Schritten");
  gleich(inReichweite(karte, a, probe({}, { x: 7, y: 5 }), dolch), false, "zwei Felder nicht");
  gleich(inReichweite(karte, a, probe({}, { x: 5, y: 5 }), dolch), false,
    "auf sich selbst zielt niemand");

  /* Die Hellebarde reicht zwei Felder — aber nicht durch eine Wand. */
  const hellebarde = waffe("hellebarde");
  const fern = probe({}, { x: 7, y: 5 });
  gleich(inReichweite(karte, a, fern, hellebarde), true, "die Hellebarde reicht zwei Felder");
  karte.setze(6, 5, { hindernis: HINDERNIS.wand });
  gleich(inReichweite(karte, a, fern, hellebarde), false, "aber nicht durch die Wand");
  karte.setze(6, 5, { hindernis: HINDERNIS.keins });

  /* Kein Höhenzuschlag im Nahkampf: Ein Arm wird nicht länger, weil man
     höher steht. Das ist die Stelle, an der man aus Versehen jede Waffe
     verlängert. */
  karte.setze(5, 5, { ebene: 3 });
  gleich(reichweiteVon(karte, a, fern, hellebarde), 2, "die Nahwaffe bleibt bei zwei Feldern");
  gleich(inReichweite(karte, a, probe({}, { x: 8, y: 5 }), hellebarde), false,
    "von oben reicht sie kein Feld weiter");
}

abschnitt("Reichweite: Fernkampf und Höhe");
{
  const karte = flach(20, 20);
  const bogen = waffe("kurzbogen");            /* Reichweite 7 */
  const a = probe({}, { x: 2, y: 2 });
  const sieben = probe({}, { x: 9, y: 2 });
  const acht = probe({}, { x: 10, y: 2 });
  gleich(inReichweite(karte, a, sieben, bogen), true, "sieben Felder gehen");
  gleich(inReichweite(karte, a, acht, bogen), false, "acht nicht");

  karte.setze(2, 2, { ebene: 2 });
  gleich(reichweiteVon(karte, a, acht, bogen), 8, "von oben trägt der Bogen ein Feld weiter");
  gleich(inReichweite(karte, a, acht, bogen), true, "und trifft die acht Felder");

  /* Nach unten gibt es keine Strafe auf die Reichweite — nur auf die
     Trefferchance. Diese Unsymmetrie baut man leicht falsch. */
  karte.setze(2, 2, { ebene: 0 });
  gleich(reichweiteVon(karte, a, sieben, bogen), 7, "von unten trägt er genauso weit wie sonst");
  karte.setze(2, 2, { ebene: 1 });

  /* Die Bogenschützin: ein Feld weiter, aber nur von oben. */
  const langbogen = waffe("langbogen");        /* Reichweite 9 */
  const schuetzin = macheWesen(held("bogenschuetzin"), { id: 90, seite: "jaeger", x: 2, y: 2 });
  const weit = probe({}, { x: 13, y: 2 });     /* elf Felder */
  gleich(reichweiteVon(karte, schuetzin, weit, langbogen), 9,
    "auf gleicher Ebene schießt sie wie jeder andere");
  karte.setze(2, 2, { ebene: 2 });
  gleich(reichweiteVon(karte, schuetzin, weit, langbogen), 11,
    "von oben ein Feld für die Höhe und eines für sie selbst");
  gleich(inReichweite(karte, schuetzin, weit, langbogen), true, "elf Felder gehen dann");
}

abschnitt("Reichweite: durch die Wand nicht, über die Mauer schon");
{
  /* Der Fall, um den es in diesem Spiel geht. Ohne ihn ist das Plateau
     kein Vorteil, sondern eine Sackgasse. */
  const karte = flach(20, 12);
  const bogen = waffe("kurzbogen");
  const a = probe({}, { x: 2, y: 2 });
  const z = probe({}, { x: 8, y: 2 });

  karte.setze(5, 2, { hindernis: HINDERNIS.wand });
  gleich(inReichweite(karte, a, z, bogen), false, "durch eine Wand schießt niemand");
  karte.setze(5, 2, { hindernis: HINDERNIS.keins });

  /* Eine niedrige Mauer: ein Feld auf Ebene 2 zwischen zweien auf 1. */
  karte.setze(5, 2, { ebene: 2 });
  gleich(inReichweite(karte, a, z, bogen), false, "von unten geht der Schuss nicht über die Mauer");
  karte.setze(2, 2, { ebene: 3 });
  gleich(inReichweite(karte, a, z, bogen), true, "vom Hochplateau aus schon");

  /* Und die Gegenprobe: Eine Säule blockt auch von oben, weil sie
     Sicht blockt und nicht nur hoch ist. */
  karte.setze(5, 2, { ebene: 2, hindernis: HINDERNIS.saeule });
  gleich(inReichweite(karte, a, z, bogen), false, "eine Säule blockt auch von oben");
}

/* ── Rüstung ───────────────────────────────────────────────────── */

abschnitt("Rüstung");
{
  gleich(ruestungAbzug(5, 0, "hieb"), 5, "Rüstung 0 ändert nichts");
  gleich(ruestungAbzug(5, 3, "hieb"), 2, "Rüstung 3 gegen Hieb nimmt drei weg");
  gleich(ruestungAbzug(5, 3, "stich"), 2, "gegen Stich genauso");
  gleich(ruestungAbzug(5, 3, "feuer"), 4, "gegen Feuer nur die halbe Rüstung");
  gleich(ruestungAbzug(5, 3, "arkan"), 4, "gegen Arkanes auch");
  gleich(ruestungAbzug(5, 3, "gift"), 4, "gegen Gift auch");
  gleich(ruestungAbzug(5, 2, "feuer"), 4, "halbe Rüstung wird abgerundet");
  gleich(ruestungAbzug(5, 1, "feuer"), 5, "Rüstung 1 hält gegen Feuer gar nichts");

  /* Ohne diese Regel ist ein Blutvogt gegen Dolche unsterblich. */
  gleich(ruestungAbzug(2, 9, "hieb"), MINDEST_SCHADEN, "Rüstung über Schaden lässt einen durch");
  gleich(ruestungAbzug(1, 3, "hieb"), MINDEST_SCHADEN, "und bei Schaden 1 auch");
  gleich(ruestungAbzug(0, 3, "hieb"), 0, "kein Schaden bleibt kein Schaden");
  gleich(ruestungAbzug(5, -3, "hieb"), 5, "negative Rüstung schadet dem Träger nicht");

  /* Eine unbekannte Schadensart zählt volle Rüstung: Die Waffe wird
     dadurch zu schwach und fällt auf — andersherum wäre sie heimlich
     zu stark. */
  gleich(ruestungAbzug(5, 3, "sturz"), 2, "unbekannte Schadensart: volle Rüstung");
  wirft(() => ruestungAbzug(2.5, 1, "hieb"), "krummer Schaden wirft");
  wirft(() => ruestungAbzug(5, 1.5, "hieb"), "krumme Rüstung wirft");
}

/* ── Der Schadenswurf ──────────────────────────────────────────── */

abschnitt("Schadenswurf");
{
  const sichel = waffe("knochensichel");       /* 1d8 */
  const eins = macheZufall(1234);
  const zwei = macheZufall(1234);
  const reiheA = [];
  const reiheB = [];
  for (let i = 0; i < 50; i++) {
    reiheA.push(schadenWurf(eins, sichel));
    reiheB.push(schadenWurf(zwei, sichel));
  }
  tiefGleich(reiheA, reiheB, "derselbe Strom gibt denselben Wurf");

  let kleinster = 99;
  let groesster = 0;
  const strom = macheZufall(7);
  const beil = waffe("beilpaar");              /* 2d4 */
  for (let i = 0; i < 5000; i++) {
    const wurf = schadenWurf(strom, beil);
    if (wurf < kleinster) kleinster = wurf;
    if (wurf > groesster) groesster = wurf;
  }
  gleich(kleinster, 2, "2d4 kommt nie unter 2");
  gleich(groesster, 8, "und nie über 8");

  const tot = probe();
  tot.lebt = false;
  wirft(() => schadenWurf(macheZufall(1), sichel, tot), "ein Toter würfelt nicht mehr");
  wirft(() => schadenWurf(null, sichel), "ohne Strom wirft es");
  wirft(() => schadenWurf(macheZufall(1), { schluessel: "leer" }), "ohne Würfelsatz wirft es");
}

/* ── Der ganze Angriff ─────────────────────────────────────────── */

abschnitt("Angriff: der Ablauf");
{
  const karte = flach();
  const a = probe({ apMax: 6 }, { x: 5, y: 5 });
  const z = probe({ lpMax: 30 }, { x: 6, y: 5 });
  const zu = zustandMit(karte, [a, z], immerTreffer());
  const dolch = waffe("rostdolch");            /* 2 AP, 1d4+1 */

  const e = fuehreAngriffAus(zu, a, z, dolch);
  tiefGleich(arten(e), ["apGesetzt", "angriff", "schaden"], "Punkte, Wurf, Schaden");
  gleich(e[0].ap, 4, "die Punkte der Waffe sind abgezogen");
  gleich(a.ap, 4, "und stehen so an der Figur");
  gleich(e[1].wer, a.id, "der Angreifer steht im Ereignis");
  gleich(e[1].ziel, z.id, "das Ziel auch");
  gleich(e[1].waffe, "rostdolch", "und die Waffe als Schlüssel");
  gleich(e[1].treffer, true, "der Wurf sitzt");
  gleich(schadenAus(e).wieviel, 5, "Höchstwurf 1d4+1 macht fünf Schaden");
  gleich(schadenAus(e).quelle, "angriff", "die Quelle ist der Angriff");
  gleich(schadenAus(e).art2, "stich", "die Schadensart kommt von der Waffe");
  gleich(z.lp, 25, "das Ziel hat fünf Punkte weniger");

  const fehl = zustandMit(karte, [a, z], immerFehl());
  const e2 = fuehreAngriffAus(fehl, a, z, dolch);
  tiefGleich(arten(e2), ["apGesetzt", "angriff"], "ein Fehlschlag kostet trotzdem Punkte");
  gleich(e2[1].treffer, false, "und ist als solcher vermerkt");
  gleich(z.lp, 25, "das Ziel bleibt unverletzt");
}

abschnitt("Angriff: Rüstung im Ablauf");
{
  const karte = flach();
  const a = probe({}, { x: 5, y: 5 });
  const panzer = probe({ ruestung: 9, lpMax: 30 }, { x: 6, y: 5 });
  const zu = zustandMit(karte, [a, panzer], immerTreffer());
  const e = fuehreAngriffAus(zu, a, panzer, waffe("rostdolch"));
  gleich(schadenAus(e).wieviel, MINDEST_SCHADEN, "gegen Rüstung 9 kommt ein Punkt durch");

  /* Durchschlag halbiert die Rüstung — die Hellebarde macht aus
     Rüstung 4 also Rüstung 2. */
  const panzer2 = probe({ ruestung: 4, lpMax: 30 }, { x: 6, y: 5 });
  const zu2 = zustandMit(karte, [a, panzer2], immerTreffer());
  a.ap = 6;
  const e2 = fuehreAngriffAus(zu2, a, panzer2, waffe("hellebarde"));  /* 1d8+1, Durchschlag */
  gleich(schadenAus(e2).wieviel, 7, "Höchstwurf 9 minus halbe Rüstung 2");

  /* Und ein Schild zählt wie Rüstung. */
  const geschildet = probe({ ruestung: 0, lpMax: 30 }, { x: 6, y: 5 });
  wirkungAnhaengen(geschildet, "schild", 2, 3);
  const zu3 = zustandMit(karte, [a, geschildet], immerTreffer());
  a.ap = 6;
  const e3 = fuehreAngriffAus(zu3, a, geschildet, waffe("rostdolch"));
  gleich(schadenAus(e3).wieviel, 2, "fünf Schaden minus drei Schild");
}

abschnitt("Angriff: was abgelehnt wird, ändert nichts");
{
  const karte = flach();
  const a = probe({}, { x: 2, y: 2 });
  const weit = probe({}, { x: 12, y: 12 });
  const strom = macheZufall(99);
  const zu = zustandMit(karte, [a, weit], strom);
  const vorherAp = a.ap;
  const vorherLp = weit.lp;
  const vorherStrom = strom.zustand();

  wirft(() => fuehreAngriffAus(zu, a, weit, waffe("rostdolch")), "außer Reichweite wirft es");
  gleich(a.ap, vorherAp, "die Punkte sind unangetastet");
  gleich(weit.lp, vorherLp, "die Lebenspunkte auch");
  /* Der wichtigste der drei: Ein abgelehnter Angriff, der Zufall
     verbraucht, verschiebt jeden späteren Wurf — und im Netz-Koop nur
     auf dem einen Rechner, der ihn abgelehnt hat (Fehlerbuch B4). */
  gleich(strom.zustand(), vorherStrom, "und der Zufallsstrom steht noch, wo er stand");

  const nah = probe({}, { x: 3, y: 2 });
  const zu2 = zustandMit(karte, [a, nah], strom);
  a.ap = 1;
  wirft(() => fuehreAngriffAus(zu2, a, nah, waffe("rostdolch")), "zu wenig Punkte wirft");
  gleich(a.ap, 1, "und kostet nichts");
  a.ap = 6;
  wirft(() => fuehreAngriffAus(zu2, a, a, waffe("rostdolch")), "auf sich selbst wirft");
  nah.lebt = false;
  wirft(() => fuehreAngriffAus(zu2, a, nah, waffe("rostdolch")), "auf einen Toten wirft");
  nah.lebt = true;
  a.lebt = false;
  wirft(() => fuehreAngriffAus(zu2, a, nah, waffe("rostdolch")), "ein Toter greift nicht an");
}

abschnitt("Angriff: Tod");
{
  const karte = flach();
  const a = probe({}, { x: 5, y: 5 });
  const schwach = probe({ lpMax: 3 }, { x: 6, y: 5 });
  const zu = zustandMit(karte, [a, schwach], immerTreffer());
  const e = fuehreAngriffAus(zu, a, schwach, waffe("rostdolch"));
  tiefGleich(arten(e), ["apGesetzt", "angriff", "schaden", "gestorben"], "der Treffer tötet");
  gleich(schadenAus(e).lpRest, 0, "die Lebenspunkte bleiben bei 0");
  gleich(schwach.lebt, false, "die Figur ist tot");
  gleich(wesenBei([a, schwach], 6, 5), undefined, "und blockt das Feld nicht mehr");
}

abschnitt("Angriff: zweifach");
{
  const karte = flach();
  const beil = waffe("beilpaar");              /* 3 AP, zweifach */
  const a = probe({}, { x: 5, y: 5 });
  const z = probe({ lpMax: 40 }, { x: 6, y: 5 });

  const trifftSofort = zustandMit(karte, [a, z], stromAus([0, 0]));
  const e1 = fuehreAngriffAus(trifftSofort, a, z, beil);
  tiefGleich(arten(e1), ["apGesetzt", "angriff", "schaden"],
    "sitzt der erste Wurf, wird kein zweiter geworfen");

  a.ap = 6;
  const zweiter = zustandMit(karte, [a, z], stromAus([0.999, 0]));
  const e2 = fuehreAngriffAus(zweiter, a, z, beil);
  tiefGleich(arten(e2), ["apGesetzt", "angriff", "angriff", "schaden"],
    "geht der erste daneben, gibt es einen zweiten Wurf");
  gleich(e2[1].treffer, false, "der erste ging daneben");
  gleich(e2[2].treffer, true, "der zweite sitzt");

  a.ap = 6;
  const beide = zustandMit(karte, [a, z], stromAus([0.999, 0.999]));
  const e3 = fuehreAngriffAus(beide, a, z, beil);
  tiefGleich(arten(e3), ["apGesetzt", "angriff", "angriff"], "zweimal daneben ist ein Fehlschlag");
}

abschnitt("Angriff: brennt");
{
  const karte = flach();
  const zunge = waffe("flammenzunge");
  const a = probe({}, { x: 5, y: 5 });
  const z = probe({ lpMax: 40 }, { x: 6, y: 5 });
  const zu = zustandMit(karte, [a, z], immerTreffer());
  fuehreAngriffAus(zu, a, z, zunge);
  gleich(hatWirkung(z, "brennt"), true, "die Flammenzunge steckt an");
  gleich(wirkungsStaerke(z, "brennt"), WAFFEN_BRAND.schaden, "mit der Stärke aus dem Kern");
  const vorher = z.lp;
  wirkungenTicken(z);
  gleich(z.lp, vorher - WAFFEN_BRAND.schaden, "und brennt am Zugbeginn weiter");
}

abschnitt("Angriff: stoesst");
{
  /* Der Kriegshammer schiebt über die Kante — die Aktion, die aus den
     Höhen ein Spiel macht. */
  const karte = flach();
  const hammer = waffe("kriegshammer");
  const a = probe({ apMax: 6 }, { x: 5, y: 5 });
  const z = probe({ lpMax: 40 }, { x: 6, y: 5 });
  karte.setze(6, 5, { ebene: 3 });
  karte.setze(7, 5, { ebene: 1 });
  const zu = zustandMit(karte, [a, z], immerTreffer());

  const e = fuehreAngriffAus(zu, a, z, hammer);
  tiefGleich(arten(e),
    ["apGesetzt", "angriff", "schaden", "gestossen", "ebeneGewechselt", "gestuerzt",
      "schaden", "apGesetzt"],
    "Treffer, Stoß, Ebenenwechsel, Sturz, Sturzschaden, Punkte weg");
  gleich(z.x, 7, "das Ziel steht ein Feld weiter");
  const gestuerzt = e.find((x) => x.art === "gestuerzt");
  gleich(gestuerzt.stufen, 2, "zwei Ebenen tief");
  gleich(gestuerzt.schaden, STURZ_SCHADEN_JE_STUFE, "die erste Stufe ist frei");
  gleich(e[6].quelle, "sturz", "der Sturzschaden nennt seinen Grund");
  gleich(e[7].ap, 0, "und die Figur verliert alle restlichen Punkte");
  gleich(z.ap, 0, "auch an der Figur selbst");

  /* Steht dort jemand, wird nicht geschoben — Kettenreaktionen sind
     nicht gefordert. */
  const b = probe({}, { x: 5, y: 8 });
  const opfer = probe({ lpMax: 40 }, { x: 6, y: 8 });
  const imWeg = probe({}, { x: 7, y: 8 });
  const zu2 = zustandMit(karte, [b, opfer, imWeg], immerTreffer());
  const e2 = fuehreAngriffAus(zu2, b, opfer, hammer);
  tiefGleich(arten(e2), ["apGesetzt", "angriff", "schaden"],
    "wo jemand steht, wird nicht geschoben");
  gleich(opfer.x, 6, "das Ziel bleibt stehen");

  /* In die Lava geschoben: derselbe Schaden wie beim Hineingehen. */
  const c = probe({}, { x: 5, y: 11 });
  const brenner = probe({ lpMax: 40 }, { x: 6, y: 11 });
  karte.setze(7, 11, { fluessig: FLUESSIG.lava });
  const zu3 = zustandMit(karte, [c, brenner], immerTreffer());
  const e3 = fuehreAngriffAus(zu3, c, brenner, hammer);
  const lava = e3.filter((x) => x.quelle === "lava");
  gleich(lava.length, 1, "in der Lava brennt es sofort");
  gleich(lava[0].wieviel, LAVA_SCHADEN, "mit dem Lavaschaden aus den Höhenregeln");
  gleich(lava[0].art2, "feuer", "als Feuerschaden");
}

abschnitt("Angriff: flaeche2");
{
  const karte = flach();
  const kelch = waffe("feuerkelch");           /* 4 AP, 2d4+3, Fläche */
  const a = probe({ apMax: 6 }, { x: 2, y: 8 });
  const z = probe({ lpMax: 40 }, { x: 8, y: 8 });
  /* Die Nachbarn des Ziels (8,8). Zeile 8 ist gerade, dort liegt der
     Nachbar nach Nordosten auf (8,7) und der nach Osten auf (9,8).
     Welcher zuerst drankommt, entscheidet die Reihenfolge in
     `richtungen` — und dass sie **feststeht**, ist der Punkt: Zwei
     Rechner müssen dieselbe Folge von Ereignissen erzeugen, sonst
     bricht die Runde ab (Fehlerbuch B2). Seit dem Sechseck steht Osten
     an erster Stelle, vorher stand Norden dort. */
  const nordost = probe({ lpMax: 40 }, { x: 8, y: 7 });
  const ost = probe({ lpMax: 40 }, { x: 9, y: 8 });
  const fern = probe({ lpMax: 40 }, { x: 12, y: 8 });
  const zu = zustandMit(karte, [a, z, nordost, ost, fern], immerTreffer());

  const e = fuehreAngriffAus(zu, a, z, kelch);
  const flaeche = e.filter((x) => x.quelle === "flaeche");
  gleich(flaeche.length, 2, "beide Nachbarn bekommen etwas ab");
  gleich(flaeche[0].wer, ost.id, "erst nach Osten");
  gleich(flaeche[1].wer, nordost.id, "dann nach Nordosten — die Reihenfolge steht fest");
  gleich(fern.lp, 40, "wer weiter weg steht, bleibt heil");
  behaupte(nordost.lp < 40 && ost.lp < 40, "die Nachbarn haben Schaden");
}

abschnitt("Angriff: Gleichlauf");
{
  /* Zweimal dieselbe Saat, zweimal dieselbe Folge von Ereignissen —
     byteweise. Ohne das rechnen vier Rechner verschiedene Runden. */
  const lauf = (saat) => {
    naechsteId = 500;
    const karte = flach();
    karte.setze(7, 5, { ebene: 2 });
    karte.setze(4, 5, { hindernis: HINDERNIS.fass });
    const a = probe({ apMax: 60, flinkheit: 4 }, { x: 5, y: 5 });
    const z = probe({ lpMax: 400, flinkheit: 6, ruestung: 2 }, { x: 6, y: 5 });
    const zu = zustandMit(karte, [a, z], macheZufall(saat));
    const alle = [];
    for (let i = 0; i < 25; i++) {
      a.ap = 6;
      for (const e of fuehreAngriffAus(zu, a, z, waffe("knochensichel"))) alle.push(e);
    }
    return JSON.stringify(alle);
  };
  gleich(lauf(2026) === lauf(2026), true, "gleiche Saat, byteweise gleiche Ereignisse");
  behaupte(lauf(2026) !== lauf(2027), "andere Saat, andere Ereignisse");
}

/* ── Die Messung ───────────────────────────────────────────────────

   Zahlen werden hier gemessen, nicht geschätzt: 20 000 Angriffe je
   Waffe, aus gesätem Strom, auf ebenem Boden, ohne Deckung, Feld an
   Feld. Zwei Ziele, weil die halbe Rüstung gegen Feuer, Arkanes und
   Gift sonst gar nicht sichtbar würde:

   · **Knochendiener** — Rüstung 1, Flinkheit 3. Der einfachste
     Fußsoldat der Brut und der Standardfall dieser Messung.
   · **Krätzling** — Rüstung 0, Flinkheit 9. Der ungepanzerte
     Gegenfall.

   Der Brand einer Waffe wird zu Ende getickt und mitgezählt: Er ist
   Schaden der Waffe, auch wenn er erst in der nächsten Runde kommt. */

abschnitt("Messung");

const VERSUCHE = 20000;

function messeWaffe(schluessel, saat, gegnerArt, doppelt = false) {
  const karte = flach(8, 8);
  const heldWesen = macheWesen(held("bluthexer"), { id: 1, seite: "jaeger", x: 3, y: 3 });
  const brutWesen = macheWesen(gegner(gegnerArt), { id: 2, seite: "brut", x: 4, y: 3 });
  const zu = zustandMit(karte, [heldWesen, brutWesen], macheZufall(saat));
  const w = waffe(schluessel);
  /* Für den Vergleich: dieselbe Waffe ohne ihre Besonderheit, zweimal
     hintereinander geführt. Das ist die andere Lesart von `zweifach` —
     zwei volle Schläge zum Preis **eines** Angriffs, deshalb wird auch
     nur einmal `waffe.ap` als Preis gerechnet. */
  const wOhne = { ...w, besonderheit: undefined };
  let treffer = 0;
  let wuerfe = 0;
  let schaden = 0;

  for (let i = 0; i < VERSUCHE; i++) {
    brutWesen.lp = brutWesen.lpMax;
    brutWesen.lebt = true;
    brutWesen.wirkungen = [];
    brutWesen.x = 4;
    brutWesen.y = 3;
    heldWesen.ap = 60;
    const vorher = brutWesen.lp;

    const runde = doppelt
      ? [...fuehreAngriffAus(zu, heldWesen, brutWesen, wOhne),
        ...(lebendig(brutWesen) ? fuehreAngriffAus(zu, heldWesen, brutWesen, wOhne) : [])]
      : fuehreAngriffAus(zu, heldWesen, brutWesen, w);
    for (const e of runde) {
      if (e.art !== "angriff") continue;
      wuerfe++;
      if (e.treffer) treffer++;
    }
    let sicherung = 20;
    while (brutWesen.wirkungen.length > 0 && lebendig(brutWesen) && sicherung-- > 0) {
      wirkungenTicken(brutWesen);
    }
    schaden += vorher - brutWesen.lp;
  }
  return {
    schluessel,
    quoteJeWurf: treffer / wuerfe,
    quoteJeAngriff: treffer / VERSUCHE,
    jeAp: schaden / (VERSUCHE * w.ap)
  };
}

const NAHWAFFEN = ["rostdolch", "hetzerbiss", "knochensichel", "beilpaar",
  "hellebarde", "flammenzunge", "richtschwert", "kriegshammer"];
const gegenDiener = NAHWAFFEN.map((s, i) => messeWaffe(s, 4711 + i, "knochendiener"));
const gegenKraetzling = NAHWAFFEN.map((s, i) => messeWaffe(s, 8100 + i, "kraetzling"));
const beilDoppelt = messeWaffe("beilpaar", 4714, "knochendiener", true);

const mittel = (liste) => liste.reduce((s, m) => s + m.jeAp, 0) / liste.length;
const nach = (liste, s) => liste.find((m) => m.schluessel === s);
/* Um wie viel die beste Waffe vor der zweitbesten liegt. */
function vorsprung(liste) {
  const sortiert = [...liste].map((m) => m.jeAp).sort((a, b) => b - a);
  return sortiert[0] / sortiert[1];
}

/* Der Standardfall: Bluthexer mit der Knochensichel gegen den
   Knochendiener. Gift geht an dessen Rüstung 1 vorbei (halbe Rüstung,
   abgerundet), die Flinkheit 3 nimmt sechs Punkte Trefferchance. Die
   Messung prüft die Rechnung — läge der Trefferwurf schief, etwa weil
   `wurf <= chance` statt `<` verglichen würde, fiele es hier auf. */
const standard = nach(gegenDiener, "knochensichel");
const sichelChance = waffe("knochensichel").trefferGrund - 3 * AUSWEICH_JE_FLINKHEIT;
nahe(standard.quoteJeWurf, sichelChance, 0.02,
  "gemessene Trefferquote passt zur gerechneten Chance");
nahe(standard.jeAp, sichelChance * 4.5 / 2, 0.08,
  "gemessener Schaden je Punkt passt zum Mittelwert von 1d8");

/* Die beiden Sätze aus der Kopfnotiz von `spiel/kampf.mjs`, hier
   belegt: Würfe **und** Schaden zu verdoppeln machte das Beilpaar zur
   mit Abstand besten Nahwaffe; der wiederholte Trefferwurf hält es
   beim Durchschnitt. */
const beil = nach(gegenDiener, "beilpaar");
const hammer = nach(gegenDiener, "kriegshammer");
behaupte(beilDoppelt.jeAp > hammer.jeAp * 1.4,
  "zwei volle Schläge wären weit stärker als der Kriegshammer");
behaupte(Math.abs(beil.jeAp - mittel(gegenDiener)) < 0.15,
  "der wiederholte Trefferwurf hält das Beilpaar beim Durchschnitt");
behaupte(beil.quoteJeAngriff > beil.quoteJeWurf + 0.15,
  "der zweite Wurf macht das Beilpaar verlässlich, nicht stark");

/* Und der Satz über die halbe Rüstung: Eine Feuerwaffe lohnt sich
   gegen Gepanzerte. Gegen einen ungepanzerten Gegner schrumpft ihr
   Vorsprung — sonst wäre sie nicht die Antwort auf Rüstung, sondern
   schlicht die beste Waffe. */
behaupte(vorsprung(gegenKraetzling) < vorsprung(gegenDiener),
  "gegen Ungepanzerte liegt die beste Nahwaffe weniger weit vorn");

console.log("");
console.log(`  Gemessen über je ${VERSUCHE} Angriffe des Bluthexers, ebener Boden,`);
console.log("  ohne Deckung, Feld an Feld — Schaden je Aktionspunkt:");
console.log("");
console.log(`    ${"Waffe".padEnd(14)}${"Knochendiener (R 1, F 3)".padEnd(28)}`
  + "Krätzling (R 0, F 9)");
for (let i = 0; i < NAHWAFFEN.length; i++) {
  const d = gegenDiener[i];
  const k = gegenKraetzling[i];
  console.log(`    ${d.schluessel.padEnd(14)}`
    + `${(d.quoteJeWurf * 100).toFixed(2).padStart(6)} % Treffer  ${d.jeAp.toFixed(3)}`
    + `          ${(k.quoteJeWurf * 100).toFixed(2).padStart(6)} % Treffer  ${k.jeAp.toFixed(3)}`);
}
console.log(`    ${"Mittel".padEnd(14)}${" ".repeat(17)}${mittel(gegenDiener).toFixed(3)}`
  + `          ${" ".repeat(17)}${mittel(gegenKraetzling).toFixed(3)}`);
console.log("");
console.log(`  Standardfall Bluthexer (Knochensichel) gegen Knochendiener:`);
console.log(`    mittlere Trefferquote  ${(standard.quoteJeWurf * 100).toFixed(2)} %`);
console.log(`    mittlerer Schaden je AP ${standard.jeAp.toFixed(3)}`);
console.log("");
console.log(`  Beilpaar: ${(beil.quoteJeAngriff * 100).toFixed(2)} % der Angriffe landen `
  + `(je Wurf ${(beil.quoteJeWurf * 100).toFixed(2)} %),`);
console.log(`    Schaden je AP ${beil.jeAp.toFixed(3)} — mit zwei vollen Schlägen statt `
  + `Wiederholung wären es ${beilDoppelt.jeAp.toFixed(3)}.`);
console.log("");

ende("Kampf und Wesen");
