/* [Aufgabe: Regelkern] Weltfeld — die Höhle als Formel, nicht als Karte.

   `feldBei(x, y)` liefert für jeden Punkt eine vorzeichenbehaftete
   Distanz in Bildpunkten: **> 0 Fels, < 0 offen**. Daraus fällt alles
   Weitere — die Wände, die Deckung, die Erreichbarkeit.

   ── Woher das kommt ────────────────────────────────────────────────

   Aus Janniks eigener Engine (`Kimpaliz/granithoehle`, „Scotophobia:
   Shapes in the Dark", `spiel/welt-feld.mjs`). Sein Auftrag wörtlich:
   *„benutze meine pixelslop engine aus scotophobia, aber erst mal nur
   mit wasser und ohne gase."* Die Formel ist übernommen; was hier
   fehlt, fehlt mit Absicht:

   - **Kein Gas.** Ausdrücklich nicht gewollt.
   - **Nur Wasser** als Flüssigkeit. Lava, Schleim und Öl kennt
     `spiel/gitter.mjs` als Schlüssel, aber niemand setzt sie.
   - **Keine Kristalle, kein Material-Pass, kein Beleuchtungsrelief.**
     Das sind Bildsachen; hier geht es um Spielregeln.
   - **Neu dazu: `hoeheBei`.** Scotophobia kennt Höhe nur als Relief
     der Oberfläche. Hier ist sie eine Regel — vier Ebenen, an denen
     Bewegung, Sicht und Kampf hängen.

   ── Drei Dinge übereinander ────────────────────────────────────────

   1. Das **Höhlenrauschen** macht die Form.
   2. Das **Skelett** aus Räumen und Gängen garantiert Erreichbarkeit.
   3. Die **Verzerrung** biegt die Abtaststelle, bevor 1 und 2 gelesen
      werden — deshalb sieht kein Gang wie eine Röhre aus.

   Warum das die Begehbarkeit nicht zerstört, steht in `bauart.mjs`.

   ── Warum eine Formel und keine gespeicherte Karte ──────────────────

   Weil man sie an **jeder** Stelle fragen kann, auch zwischen zwei
   Kacheln. Genau das braucht `spiel/landschaft.mjs`: Es tastet je
   Kachel mehrfach ab und entscheidet erst danach, ob die Kachel Wand
   ist. So bekommt man Janniks Vorgabe — *„wände im raster muster, aber
   trotzdem natürliche wände"* — ohne die Wände an ein Raster zu
   zeichnen.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   Liest `bauart.mjs` (alle Werte) und `rauschen.mjs`. Gelesen von
   `spiel/landschaft.mjs` (macht Kacheln daraus) und
   `werkzeuge/pruefe-landschaft.mjs`. Kennt weder Kacheln noch Wesen. */

import { hash, fbm, smin, smax, sstep } from "./welt-rauschen.mjs";
import { BAUART, ENTZERR_RUNDEN } from "./bauart.mjs";

/* ── Die Fassung der Weltformel ──────────────────────────────────────
   Dieselbe Saat ergibt dieselbe Welt — aber nur, solange die Formel
   dieselbe ist. Wer hier etwas ändert, verschiebt jeden Raum und jeden
   Gang, ohne dass die Saat sich rührt.

   Für den Internet-Koop ist das der teuerste Fehler, den es gibt: Zwei
   Rechner mit verschiedenen Fassungen bauen aus derselben Saat
   verschiedene Karten, und beide halten sich für richtig. Deshalb steht
   die Zahl hier, direkt über der Formel, und wandert in den
   Lobby-Handschlag (`netz/nachrichten.mjs`).

   | Fassung | was sich änderte |
   | --- | --- |
   | 1 | der Ausgangsstand — portiert aus Scotophobia | */
export const WELTFASSUNG = 1;

const STUETZEN = 14;      /* Stützpunkte je Gangpfad */
const INSEL_RAND = 24;    /* Randpunkte, mit denen eine Insel vermessen wird */

/* Ein Schlüssel aus zwei Sektorkoordinaten. Zahlen statt Zeichenketten,
   weil `feldBei` das beim Erzeugen hunderttausendfach nachschlägt. */
const schluessel = (a, b) => (a + 32768) * 65536 + (b + 32768);

export function macheWeltfeld(saat, bauart) {
  const p = bauart ? { ...BAUART, ...bauart } : BAUART;
  const S = p.sektor * p.sektorFaktor;
  const raeume = new Map(), gaenge = new Map(), weltPfade = new Map(), inseln = new Map();

  /* ── Die Verzerrung ────────────────────────────────────────────────
     Zwei Felder biegen die Abtaststelle: ein grobes für die große Form,
     ein feines, das *jeden* Rand zugleich aufrauht — Raumhüllen,
     Gangwände und Rauschkammern. Einzeln nachgerüstet wäre das dreimal
     dieselbe Arbeit an drei Stellen. */
  const versatz = (X, Y, raus) => {
    const wx = fbm(X * p.wf, Y * p.wf, saat + 901, 2) - 0.5;
    const wy = fbm(X * p.wf + 7.3, Y * p.wf + 3.1, saat + 902, 2) - 0.5;
    const ux = fbm(X * p.wf2 + 1.7, Y * p.wf2 + 9.4, saat + 904, 2) - 0.5;
    const uy = fbm(X * p.wf2 + 5.2, Y * p.wf2 + 2.8, saat + 905, 2) - 0.5;
    raus[0] = wx * p.wamp + ux * p.wamp2;
    raus[1] = wy * p.wamp + uy * p.wamp2;
  };

  /* Rückverzerrung: zu einer Stelle im verzerrten Raum die Weltstelle
     finden. Fixpunkt X ← T − versatz(X); er läuft zusammen, weil
     Amplitude mal Frequenz unter 1 liegt (`bauart.mjs`). Gebraucht
     überall dort, wo etwas aus dem Skelett in der **Welt** stehen muss:
     Startplatz, Erreichbarkeitsprüfung, Inseln. */
  const ev = [0, 0];
  const entzerre = (TX, TY, raus) => {
    let x = TX, y = TY;
    for (let k = 0; k < ENTZERR_RUNDEN; k++) {
      versatz(x, y, ev);
      x = TX - ev[0]; y = TY - ev[1];
    }
    raus[0] = x; raus[1] = y;
  };

  const hoehleSD = (X, Y) =>
    (p.schwelle - fbm(X * p.hf, Y * p.hf, saat + 903, p.okt)) * p.steil;

  /* ── Ein Raum je Skelettzelle ──
     Das klingt streng, ist aber der Grund für zwei gute Eigenschaften:
     garantierter Mindestabstand (zwei Kammern laufen nie ineinander)
     und keine spitzen Restflächen zwischen Nachbarkammern. */
  const raumBei = (sx, sy) => {
    const k = schluessel(sx, sy);
    let r = raeume.get(k);
    if (r) return r;
    const h = (i) => hash(sx, sy, saat + i);
    const halle = h(1) < 0.24;
    const wink = h(6) * 3.14159;
    r = {
      x: (sx + 0.32 + 0.36 * h(3)) * S,
      y: (sy + 0.32 + 0.36 * h(4)) * S,
      r: Math.min((29 + 30 * h(2)) * (halle ? 1.7 : 1), S * 0.36) * p.raumFaktor,
      /* Ob ein Raum eine Halle ist, steht hier — und wird nicht aus dem
         Radius zurückgeschlossen. Eine feste Schwelle wandert nicht mit,
         wenn `raumFaktor` sich ändert; ein Merkmal, das der Erzeuger
         kennt, gehört nicht erraten. */
      halle,
      sq: 0.64 + 0.6 * h(5),
      ca: Math.cos(wink), sa: Math.sin(wink),
      lob: 2 + ((h(7) * 3) | 0), ph: h(8) * 6.283, amp: 0.14 + 0.19 * h(9)
    };
    raeume.set(k, r);
    return r;
  };

  /* Abstand zur Raumhülle: gedrehte Ellipse, über den Winkel gelappt.
     Kein zusätzliches Rauschen auf der Hülle — die Verzerrung macht
     dieselbe Arbeit für alle Ränder gemeinsam und billiger. */
  const raumSD = (rm, X, Y) => {
    const dx = X - rm.x, dy = Y - rm.y;
    const px = dx * rm.ca + dy * rm.sa, py = (-dx * rm.sa + dy * rm.ca) / rm.sq;
    const d = Math.sqrt(px * px + py * py);
    const a = Math.atan2(py, px);
    const rr = rm.r * (1 + rm.amp * Math.sin(a * rm.lob + rm.ph));
    return (d - rr) * (rm.sq < 1 ? rm.sq : 1);
  };

  /* ── Gänge: kubische Bezier zwischen zwei Raumzentren, beide
     Kontrollpunkte senkrecht ausgelenkt. ── */
  const machePfad = (A, B, marke, sx, sy, spitz) => {
    const h = (i) => hash(sx * 3 + marke, sy * 5 + marke * 7, saat + i);
    const dx = B.x - A.x, dy = B.y - A.y;
    const len = Math.sqrt(dx * dx + dy * dy) + 1e-6;
    const bogen = (h(11) - 0.5) * len * 0.5, bogen2 = (h(15) - 0.5) * len * 0.3;
    const c1x = A.x + dx * 0.33 - dy / len * bogen, c1y = A.y + dy * 0.33 + dx / len * bogen;
    const c2x = A.x + dx * 0.66 - dy / len * bogen2, c2y = A.y + dy * 0.66 + dx / len * bogen2;
    const N = STUETZEN, pts = new Float32Array(N * 3);
    const wB = (6.2 + 5.6 * h(12)) * p.gangBreite;
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1), it = 1 - t;
      pts[i * 3] = it * it * it * A.x + 3 * it * it * t * c1x +
        3 * it * t * t * c2x + t * t * t * B.x;
      pts[i * 3 + 1] = it * it * it * A.y + 3 * it * it * t * c1y +
        3 * it * t * t * c2y + t * t * t * B.y;
      /* Die Breite atmet. Ein Gang gleicher Breite über seine ganze
         Länge liest sich als Band, nicht als Höhlengang. Zwei Wellen:
         eine lange für „hier wird es zur Halle", eine kurze für die
         Engstellen. */
      const lang = fbm(t * 1.6 + marke * 2.3, 0.5, saat + 21 + marke, 2) - 0.5;
      const kurz = fbm(t * 5.0 + marke * 3.7, 0.5, saat + 13 + marke, 3) - 0.5;
      let w = wB * Math.max(0.30, 1 + p.gangSchwankung * (lang * 1.1 + kurz * 0.7));
      if (spitz) w *= 1 - 0.7 * t;
      /* Untergrenze in Bildpunkten. Sie ist der Grund, warum ein Gang
         nach dem Rastern nie unter eine Kachel Breite fällt und
         dadurch verschwindet. */
      pts[i * 3 + 2] = w < 9 ? 9 : w;
    }
    return pts;
  };

  /* Jede Skelettzelle besitzt die Gänge zu ihrem **rechten und unteren**
     Nachbarn. Diese eine Regel genügt, damit das ganze Netz
     zusammenhängt — ohne dass irgendwo global geplant werden müsste. */
  const gaengeVon = (sx, sy) => {
    const k = schluessel(sx, sy);
    let l = gaenge.get(k);
    if (l) return l;
    l = [];
    const A = raumBei(sx, sy);
    l.push(machePfad(A, raumBei(sx + 1, sy), 1, sx, sy, false));
    l.push(machePfad(A, raumBei(sx, sy + 1), 2, sx, sy, false));
    if (hash(sx, sy, saat + 61) < p.diagonal)
      l.push(machePfad(A, raumBei(sx + 1, sy + 1), 3, sx, sy, false));
    if (hash(sx, sy, saat + 63) < p.diagonal * 0.8)
      l.push(machePfad(A, raumBei(sx + 1, sy - 1), 4, sx, sy, false));
    if (hash(sx, sy, saat + 65) < p.sackgasse) {
      const grund = l[0], m = 7 * 3;
      const a = hash(sx, sy, saat + 67) * 6.283;
      const len = 40 + 70 * hash(sx, sy, saat + 69);
      l.push(machePfad({ x: grund[m], y: grund[m + 1] },
        { x: grund[m] + Math.cos(a) * len, y: grund[m + 1] + Math.sin(a) * len },
        5, sx, sy, true));
    }
    gaenge.set(k, l);
    return l;
  };

  /* Dieselben Pfade, aber in **Weltkoordinaten**. Alles, was in der
     Welt neben einem Gang stehen soll (oder gerade nicht), misst hier. */
  const gaengeWeltVon = (sx, sy) => {
    const k = schluessel(sx, sy);
    let l = weltPfade.get(k);
    if (l) return l;
    const o = [0, 0];
    l = gaengeVon(sx, sy).map((quelle) => {
      const ziel = new Float32Array(quelle.length);
      for (let i = 0; i < STUETZEN; i++) {
        entzerre(quelle[i * 3], quelle[i * 3 + 1], o);
        ziel[i * 3] = o[0]; ziel[i * 3 + 1] = o[1]; ziel[i * 3 + 2] = quelle[i * 3 + 2];
      }
      return ziel;
    });
    weltPfade.set(k, l);
    return l;
  };

  /* Abstand zum Gang: kürzester Abstand zu einem der 13 Segmente,
     abzüglich der dort geltenden Halbbreite. */
  const pfadSD = (pp, X, Y) => {
    let best = 1e9;
    for (let i = 0; i + 1 < STUETZEN; i++) {
      const o = i * 3, ax = pp[o], ay = pp[o + 1], bx = pp[o + 3], by = pp[o + 4];
      const vx = bx - ax, vy = by - ay, wx = X - ax, wy = Y - ay;
      const L2 = vx * vx + vy * vy;
      let t = L2 > 0 ? (wx * vx + wy * vy) / L2 : 0;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const qx = wx - vx * t, qy = wy - vy * t;
      const v = Math.sqrt(qx * qx + qy * qy) - (pp[o + 2] + (pp[o + 5] - pp[o + 2]) * t);
      if (v < best) best = v;
    }
    return best;
  };

  /* Abstand einer **Weltstelle** zur nächsten Gangachse. `R` ist nur das
     Suchfenster, nicht die Antwort. Zwei Sektoren darüber hinaus, weil
     ein Gang bis zur halben Sektorlänge ausbaucht und deshalb weit
     außerhalb seiner eigenen Zelle vorbeikommen kann. */
  const gangAbstandWelt = (X, Y, R) => {
    const s0x = Math.floor((X - R) / S) - 2, s1x = Math.floor((X + R) / S) + 2;
    const s0y = Math.floor((Y - R) / S) - 2, s1y = Math.floor((Y + R) / S) + 2;
    let best = 1e9;
    for (let sy = s0y; sy <= s1y; sy++) for (let sx = s0x; sx <= s1x; sx++) {
      const l = gaengeWeltVon(sx, sy);
      for (let n = 0; n < l.length; n++) {
        const pp = l[n];
        for (let i = 0; i + 1 < STUETZEN; i++) {
          const o = i * 3, ax = pp[o], ay = pp[o + 1], bx = pp[o + 3], by = pp[o + 4];
          const vx = bx - ax, vy = by - ay, wx = X - ax, wy = Y - ay;
          const L2 = vx * vx + vy * vy;
          let t = L2 > 0 ? (wx * vx + wy * vy) / L2 : 0;
          t = t < 0 ? 0 : t > 1 ? 1 : t;
          const qx = wx - vx * t, qy = wy - vy * t;
          const d = Math.sqrt(qx * qx + qy * qy);
          if (d < best) best = d;
        }
      }
    }
    return best;
  };

  /* ── Das Feld an bereits verzerrter Stelle, ohne Inseln ──
     Getrennt, weil die Inselwahl es fragen muss und dabei **nicht noch
     einmal** verzerren darf. */
  const feldRoh = (wx, wy) => {
    const sx = Math.floor(wx / S), sy = Math.floor(wy / S);
    let sd = hoehleSD(wx, wy);
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      const gx = sx + i, gy = sy + j;
      sd = smin(sd, raumSD(raumBei(gx, gy), wx, wy), 13);
      const l = gaengeVon(gx, gy);
      for (let n = 0; n < l.length; n++) sd = smin(sd, pfadSD(l[n], wx, wy), 13);
    }
    return sd;
  };

  const inselSD = (o, X, Y) => {
    const dx = X - o.x, dy = Y - o.y;
    const px = dx * o.ca + dy * o.sa, py = (-dx * o.sa + dy * o.ca) / o.sq;
    const d = Math.sqrt(px * px + py * py);
    const a = Math.atan2(py, px);
    return d - o.r * (1 + o.amp * Math.sin(a * o.lob + o.ph));
  };

  const inselRandWelt = (o, w, raus) => {
    const ca = Math.cos(w), sa = Math.sin(w);
    const rad = o.r * (1 + o.amp * Math.sin(w * o.lob + o.ph));
    const lx = ca * rad, ly = sa * rad * o.sq;
    entzerre(o.x + lx * o.ca - ly * o.sa, o.y + lx * o.sa + ly * o.ca, raus);
  };

  /* Mitte und Radius einer Insel in der Welt. Damit gilt die
     Dreiecksungleichung: Liegt die Mitte weiter als Radius plus Kanal
     von jeder Gangachse, liegt **kein** Punkt der Insel im Gang. */
  const inselWeltMass = (o, n, raus) => {
    entzerre(o.x, o.y, raus);
    const rp = [0, 0];
    let r = 0;
    for (let a = 0; a < n; a++) {
      inselRandWelt(o, (a / n) * 6.283185307, rp);
      const dx = rp[0] - raus[0], dy = rp[1] - raus[1];
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > r) r = d;
    }
    return r;
  };

  /* ── Felsinseln ────────────────────────────────────────────────────
     Der Radius folgt dem **Platz**, nicht dem Würfel. Andersherum —
     fester Wunschradius, danach prüfen, ob er passt — werden fast alle
     Versuche abgelehnt, und es entstehen vier Inseln auf der ganzen
     Karte. So wird die Mindestgröße eine Zusicherung statt einer
     Hoffnung.

     Sie meiden außerdem die Gangachsen: Eine Insel mitten im Gang
     verstopft ihn, und die Erreichbarkeit hängt an ihm. */
  const inselnVon = (ix, iy) => {
    const k = schluessel(ix, iy);
    let l = inseln.get(k);
    if (l) return l;
    l = [];
    for (let n = 0; n < p.inselN; n++) {
      const h = (i) => hash(ix * 11 + n * 3, iy * 13 + n * 5, saat + 700 + i);
      if (h(0) > p.inselDichte) continue;
      const cx = (ix + h(1)) * p.inselRaster, cy = (iy + h(2)) * p.inselRaster;
      const luft = -feldRoh(cx, cy) - p.inselLuft;
      if (!(luft >= p.inselMin)) continue;
      const rad = Math.min(p.inselMax, luft) * (0.55 + 0.45 * h(3));
      if (rad < p.inselMin) continue;
      const rand = rad + p.inselLuft * 0.7;
      let frei = true;
      for (let a = 0; a < 8 && frei; a++) {
        const w = (a / 8) * 6.283;
        if (feldRoh(cx + Math.cos(w) * rand, cy + Math.sin(w) * rand) > -3) frei = false;
      }
      if (!frei) continue;
      const insel = {
        x: cx, y: cy, r: rad, sq: 0.6 + 0.8 * h(4),
        ca: Math.cos(h(5) * 3.14159), sa: Math.sin(h(5) * 3.14159),
        lob: 2 + ((h(6) * 2) | 0), ph: h(7) * 6.283, amp: 0.08 + 0.14 * h(8)
      };
      const mitte = [0, 0];
      const radW = inselWeltMass(insel, INSEL_RAND, mitte) * 1.05;
      const nah = radW + p.inselLuft * 0.5 + 2;
      if (gangAbstandWelt(mitte[0], mitte[1], nah) < nah) continue;
      l.push(insel);
    }
    inseln.set(k, l);
    return l;
  };

  /* Einmal verzerren, dann alles an derselben Stelle auswerten —
     Skelett, Rauschen *und* Inseln. Lägen die Inseln im unverzerrten
     Raum, stünden sie als kleine Rauten in einer sonst organischen
     Höhle. */
  const wv = [0, 0];
  const feldBei = (X, Y) => {
    versatz(X, Y, wv);
    const wx = X + wv[0], wy = Y + wv[1];
    let sd = feldRoh(wx, wy);
    const ix = Math.floor(wx / p.inselRaster), iy = Math.floor(wy / p.inselRaster);
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      const l = inselnVon(ix + i, iy + j);
      for (let n = 0; n < l.length; n++) sd = smax(sd, -inselSD(l[n], wx, wy), p.inselKante);
    }
    return sd > 150 ? 150 : sd;
  };

  /* ── Die Höhe ──────────────────────────────────────────────────────
     Das eine Stück, das Scotophobia so nicht hat. Dort trägt die Höhe
     nur das Relief; hier hängen Bewegung, Sicht und Kampf daran.

     Zwei Anteile: ein eigenes Rauschfeld — an **derselben verzerrten**
     Stelle abgetastet, damit Höhenkanten und Felskanten zueinander
     passen statt sich zu kreuzen — und eine Anhebung nahe der Wand.
     Die Anhebung ist der Grund, an der Wand entlangzugehen: Dort liegt
     Geröll, und Geröll ist eine Stufe. */
  const hoeheBei = (X, Y) => {
    versatz(X, Y, wv);
    const wx = X + wv[0], wy = Y + wv[1];
    const grund = fbm(wx * p.hoehenFrequenz, wy * p.hoehenFrequenz,
      saat + 511, p.hoehenOktaven);
    const sd = feldRoh(wx, wy);
    /* `sd` ist im Hohlraum negativ; `-sd` ist also der Abstand zur Wand. */
    const nahWand = 1 - sstep(1.5, p.wandAnhebungWeite, -sd);
    return Math.max(0, Math.min(1, grund + nahWand * p.wandAnhebung));
  };

  /* Die Ebene 0…3 an einer Stelle — die quantisierte Höhe. Eine
     Funktion, nicht drei Vergleiche an drei Stellen. */
  const ebeneBei = (X, Y) => {
    const h = hoeheBei(X, Y);
    const s = p.hoehenSchwellen;
    return h < s[0] ? 0 : h < s[1] ? 1 : h < s[2] ? 2 : 3;
  };

  return {
    feldBei, hoeheBei, ebeneBei,
    raumBei, gaengeVon, gaengeWeltVon, gangAbstandWelt, inselnVon,
    entzerre, versatz, sektor: S, stuetzen: STUETZEN, bauart: p, saat
  };
}
