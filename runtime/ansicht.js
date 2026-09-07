/* [Aufgabe: Oberfläche] Zoomknöpfe, Mausrad und sichere Zwei-Finger-Gesten.

   ── Warum die Ansicht vor der Spieleingabe hört ─────────────────────

   Der erste Finger einer Zoomgeste darf noch keine Aktion auslösen.
   Deshalb wartet ein einzelner Tipp bis zum Loslassen. Sobald mehrere
   Finger beteiligt waren, gehört die gesamte Geste allein der Kamera.
   Die Maus behält ihren bisherigen Weg. Der Vorlauf bleibt unverändert.

   Die kleine DOM-Leiste hat feste Trefferflächen und bleibt im Vollbild
   sichtbar. Sie wächst nicht mit der Welt; Zoom verändert nur die Kamera.
   Rückmeldungen und Knopftexte ändern sich bei Bedienung und Fensterwechsel,
   nicht in jedem Bild. Es entstehen keine zusätzlichen Zeichenläufe.

   ── Arbeitet zusammen mit ───────────────────────────────────────────

   `index.html` trägt die Knöpfe, `runtime/start.js` reicht Spiel und
   Vollbildwechsel. `runtime/kamera.js` begrenzt die ganzzahligen Stufen,
   `runtime/eingabe.js` erhält nur eindeutig bestätigte Einzeltipps. */

export function macheAnsicht({ blatt, spielLesen, vollbild, beiEinzeltipp }) {
  const doc = blatt.ownerDocument || globalThis.document;
  const element = (id) => doc.getElementById?.(id);
  const leiste = element("ansicht");
  const minus = element("zoom-kleiner");
  const plus = element("zoom-groesser");
  const standard = element("zoom-standard");
  const voll = element("vollbild");
  const meldung = element("ansicht-meldung");
  const finger = new Map();
  const abmelder = [];
  let geste = null;
  let radRest = 0;

  function hoere(ziel, art, tue, optionen = false) {
    if (!ziel?.addEventListener) return;
    ziel.addEventListener(art, tue, optionen);
    abmelder.push(() => ziel.removeEventListener(art, tue, optionen));
  }

  function schlucke(fund) {
    fund.preventDefault();
    fund.stopImmediatePropagation();
  }

  function aktualisiere() {
    const spiel = spielLesen();
    const zoom = spiel?.kamera.zoomStand?.();
    if (leiste) {
      leiste.hidden = !spiel;
      if (spiel) {
        const rand = Math.max(48, (spiel.kamera.standardVergroesserung || 1) * 14);
        leiste.style.top = `calc(env(safe-area-inset-top, 0px) + ${rand}px)`;
      }
    }
    if (minus) minus.disabled = !zoom || zoom.stufe <= zoom.min;
    if (plus) plus.disabled = !zoom || zoom.stufe >= zoom.max;
    if (standard && zoom) {
      standard.textContent = `${zoom.stufe}×`;
      standard.setAttribute("aria-label", `Zoom ${zoom.stufe}-fach. Standardzoom wiederherstellen`);
    }
    if (voll) {
      const an = !!doc.fullscreenElement;
      voll.textContent = an ? "Fenster" : "Vollbild";
      voll.setAttribute("aria-pressed", String(an));
    }
  }

  function melde(text) { if (meldung) meldung.textContent = text; }

  function aendere(tue) {
    const spiel = spielLesen();
    if (!spiel) return;
    tue(spiel.kamera);
    spiel.eingabe.beiTaste("Escape");
    aktualisiere();
  }

  function entfernung() {
    const [a, b] = [...finger.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  }

  function anfang(fund) {
    const spiel = spielLesen();
    if (fund.pointerType !== "touch") return;
    const fangen = !!spiel && fund.target === blatt;
    if (fangen) schlucke(fund);
    const p = { x: fund.clientX, y: fund.clientY, fangen };
    if (finger.size === 0) {
      geste = { spiel: fangen ? spiel : null, start: p, bewegt: false, mehrfach: false };
    }
    finger.set(fund.pointerId, p);
    if (finger.size >= 2) {
      geste.mehrfach = true;
      if (geste.spiel && [...finger.values()].every((f) => f.fangen)) {
        geste.abstand = entfernung();
        geste.zoom = geste.spiel.kamera.vergroesserung;
        geste.spiel.eingabe.beiTaste("Escape");
      }
    }
  }

  function bewege(fund) {
    if (!finger.has(fund.pointerId)) return;
    const { fangen } = finger.get(fund.pointerId);
    if (fangen) schlucke(fund);
    finger.set(fund.pointerId, { x: fund.clientX, y: fund.clientY, fangen });
    if (Math.hypot(fund.clientX - geste.start.x, fund.clientY - geste.start.y) > 12) {
      geste.bewegt = true;
    }
    if (finger.size === 2 && geste.abstand > 0 && geste.spiel === spielLesen()
      && [...finger.values()].every((f) => f.fangen)) {
      aendere((kamera) => kamera.setzeZoom(Math.round(geste.zoom * entfernung() / geste.abstand)));
    }
  }

  function ende(fund) {
    if (!finger.has(fund.pointerId)) return;
    if (finger.get(fund.pointerId).fangen) schlucke(fund);
    finger.delete(fund.pointerId);
    if (fund.type === "pointercancel") geste.bewegt = true;
    if (finger.size !== 0) return;
    const fertig = geste;
    geste = null;
    if (!fertig.spiel || fertig.mehrfach || fertig.bewegt || fertig.spiel !== spielLesen()) return;
    if (Math.hypot(fund.clientX - fertig.start.x, fund.clientY - fertig.start.y) > 12) return;
    const r = blatt.getBoundingClientRect();
    if (fund.clientX < r.left || fund.clientY < r.top
      || fund.clientX >= r.left + r.width || fund.clientY >= r.top + r.height) return;
    if (beiEinzeltipp?.() === true) return;
    fertig.spiel.eingabe.beiTipp(
      Math.floor((fund.clientX - r.left) * blatt.width / r.width),
      Math.floor((fund.clientY - r.top) * blatt.height / r.height));
  }

  function raeumeAuf() { finger.clear(); geste = null; radRest = 0; }

  /* Auch Kontakte auf „Los“ und den DOM-Knöpfen werden mitgezählt.
     Eine dort begonnene Berührung darf nach Spielstart keine zweite
     Berührung zu einem vermeintlichen Einzeltipp machen. */
  hoere(doc, "pointerdown", anfang, true);
  hoere(doc, "pointermove", bewege, true);
  hoere(doc, "pointerup", ende, true);
  hoere(doc, "pointercancel", ende, true);
  hoere(globalThis, "blur", raeumeAuf);
  hoere(doc, "visibilitychange", () => {
    if (doc.visibilityState === "hidden") raeumeAuf();
  });
  hoere(blatt, "wheel", (fund) => {
    if (!spielLesen()) return;
    schlucke(fund);
    const faktor = fund.deltaMode === 1 ? 16 : fund.deltaMode === 2 ? blatt.height : 1;
    radRest += fund.deltaY * faktor;
    if (Math.abs(radRest) < 80) return;
    aendere((kamera) => kamera.zoome(radRest < 0 ? 1 : -1));
    radRest = 0;
  }, { passive: false });

  hoere(minus, "click", () => aendere((kamera) => kamera.zoome(-1)));
  hoere(plus, "click", () => aendere((kamera) => kamera.zoome(1)));
  hoere(standard, "click", () => aendere((kamera) => kamera.zoomZurueck()));
  hoere(voll, "click", () => { melde(""); vollbild(); });
  /* Enter und Leertaste bedienen den fokussierten Knopf. Sie dürfen
     nicht zusätzlich als Angriff oder Zugende am Dokument ankommen. */
  hoere(leiste, "keydown", (fund) => {
    fund.stopPropagation();
    if (!fund.ctrlKey && !fund.metaKey && !fund.altKey && /^[fF]$/.test(fund.key)) {
      fund.preventDefault();
      vollbild();
    }
  });
  hoere(leiste, "keyup", (fund) => fund.stopPropagation());
  hoere(doc, "keydown", (fund) => {
    if (!spielLesen() || fund.ctrlKey || fund.metaKey || fund.altKey) return;
    if (fund.target?.closest?.("input, textarea, select, [contenteditable]")) return;
    if (!["+", "=", "-", "0"].includes(fund.key)) return;
    schlucke(fund);
    aendere((kamera) => fund.key === "0" ? kamera.zoomZurueck()
      : kamera.zoome(fund.key === "-" ? -1 : 1));
  }, true);
  hoere(doc, "fullscreenchange", aktualisiere);
  aktualisiere();

  return {
    aktualisiere, melde,
    loese() { raeumeAuf(); while (abmelder.length) abmelder.pop()(); }
  };
}
