/* Krankenfahrtfinder — Live-Suche auf der Startseite.
   Reines Vanilla-JS, keine Abhängigkeiten, kein Tracking, keine Cookies.
   Lädt data.json (statischer Suchindex) und filtert clientseitig nach
   Ort/PLZ-Text plus aktiven Leistungs-Chips. Ohne JavaScript bleibt die
   servergerenderte "Alle Orte"-Liste sichtbar und nutzbar.
   Pfade sind bewusst RELATIV (kein führender "/"): app.js wird nur auf der
   Startseite eingebunden, "data.json"/"anbieter/…" lösen daher unabhängig
   davon auf, ob die Seite an der Domain-Wurzel oder unter einem
   GitHub-Pages-Projektpfad liegt (siehe templates.py _relativiere_interne_links). */
(function () {
  "use strict";

  var eingabe = document.getElementById("suche-eingabe");
  var button = document.getElementById("suche-button");
  var ergebnisContainer = document.getElementById("suchergebnisse");
  var alleOrteContainer = document.getElementById("alle-orte");
  var chipCheckboxen = Array.prototype.slice.call(
    document.querySelectorAll(".chip-checkbox")
  );

  if (!eingabe || !ergebnisContainer) {
    return; // Seite ohne Suche (z. B. leere DB) — nichts zu tun
  }

  var betriebe = null;

  fetch("data.json")
    .then(function (res) {
      if (!res.ok) throw new Error("data.json nicht erreichbar");
      return res.json();
    })
    .then(function (json) {
      betriebe = json.betriebe || [];
    })
    .catch(function () {
      betriebe = [];
      ergebnisContainer.hidden = false;
      ergebnisContainer.innerHTML =
        '<p class="suchergebnisse__hinweis">Die Suche ist gerade nicht verfügbar. ' +
        'Bitte laden Sie die Seite neu.</p>';
    });

  function aktiveChips() {
    return chipCheckboxen
      .filter(function (cb) {
        return cb.checked;
      })
      .map(function (cb) {
        return cb.value;
      });
  }

  function treffer(query, flags) {
    var q = query.trim().toLowerCase();
    return (betriebe || []).filter(function (b) {
      if (q) {
        var ortTreffer = (b.ort || "").toLowerCase().indexOf(q) !== -1;
        var plzTreffer = (b.plz || "").toLowerCase().indexOf(q) === 0;
        var nameTreffer = (b.name || "").toLowerCase().indexOf(q) !== -1;
        if (!ortTreffer && !plzTreffer && !nameTreffer) return false;
      }
      for (var i = 0; i < flags.length; i++) {
        if (!b.flags || b.flags[flags[i]] !== 1) return false;
      }
      return true;
    });
  }

  function escapeHtml(text) {
    return String(text || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  var FLAG_LABELS = {
    krankenfahrten: "Krankenfahrten",
    direktabrechnung_kk: "Direktabrechnung mit der Kasse",
    rollstuhl: "Rollstuhl",
    tragestuhl: "Tragestuhl",
    liegend: "Liegend",
    rund_um_die_uhr: "24 Stunden",
  };

  function badgesHtml(flags) {
    if (!flags) return "";
    var out = "";
    Object.keys(FLAG_LABELS).forEach(function (key) {
      if (flags[key] === 1) {
        out += '<span class="badge">' + FLAG_LABELS[key] + "</span>";
      }
    });
    return out ? '<div class="badges">' + out + "</div>" : "";
  }

  function renderErgebnisse(liste, query) {
    if (!liste.length) {
      ergebnisContainer.innerHTML =
        '<p class="suchergebnisse__hinweis">Keine Treffer' +
        (query ? ' für „' + escapeHtml(query) + '"' : "") +
        ". Fehlt ein Fahrdienst? " +
        '<a href="eintrag-melden/">Jetzt vorschlagen.</a></p>';
      return;
    }
    var anzeige = liste.slice(0, 30);
    var html = '<div class="betriebe-liste">';
    anzeige.forEach(function (b) {
      html +=
        '<article class="betrieb-card"><h3><a href="anbieter/' +
        encodeURIComponent(b.slug) +
        '/">' +
        escapeHtml(b.name) +
        "</a></h3>" +
        badgesHtml(b.flags) +
        '<p class="kontakt-zeile">📍 ' +
        escapeHtml([b.plz, b.ort].filter(Boolean).join(" ")) +
        "</p></article>";
    });
    html += "</div>";
    if (liste.length > anzeige.length) {
      html +=
        '<p class="suchergebnisse__hinweis">' +
        (liste.length - anzeige.length) +
        " weitere Treffer — Suche eingrenzen (Ort/PLZ genauer eingeben).</p>";
    }
    ergebnisContainer.innerHTML = html;
  }

  function aktualisieren() {
    if (betriebe === null) return; // noch am Laden
    var query = eingabe.value || "";
    var flags = aktiveChips();
    var aktiv = query.trim().length > 0 || flags.length > 0;

    if (!aktiv) {
      ergebnisContainer.hidden = true;
      ergebnisContainer.innerHTML = "";
      if (alleOrteContainer) alleOrteContainer.hidden = false;
      return;
    }

    if (alleOrteContainer) alleOrteContainer.hidden = true;
    ergebnisContainer.hidden = false;
    renderErgebnisse(treffer(query, flags), query.trim());
  }

  eingabe.addEventListener("input", aktualisieren);
  if (button) button.addEventListener("click", aktualisieren);
  chipCheckboxen.forEach(function (cb) {
    cb.addEventListener("change", aktualisieren);
  });
})();
