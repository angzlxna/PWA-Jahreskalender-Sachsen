// Jahr initial setzen
const aktuellesJahr = new Date().getFullYear();
let aktuellesKalenderjahr = aktuellesJahr;
let feiertagsDaten = null;

// Seite initialisieren
document.addEventListener("DOMContentLoaded", async () => {
  const response = await fetch("feiertage.json"); // Feiertage aus externer JSON-Datei laden
  feiertagsDaten = await response.json();

  initialisiereTopbar();
  generiereKalender(aktuellesKalenderjahr);
});

function setzeTitle(jahr) {
  document.getElementById('jahrUeberschrift').innerText = `Kalender ${jahr}`;
  document.title = `Kalender ${jahr}`;
}

const monate = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember"
];

// Prüft, ob ein Datum ein statischer Feiertag ist
function istStatischerFeiertag(tagDatum) {
  return feiertagsDaten.statisch.find(f =>
    f.tag === tagDatum.getDate() && f.monat === tagDatum.getMonth()
  );
}

// Dropdown, Buttons & Topbar-Logik
function initialisiereTopbar() {
  const select = document.getElementById("jahrSelect");
  for (let j = 2000; j <= 2099; j++) {
    const option = document.createElement("option");
    option.value = j;
    option.innerText = j;
    if (j === aktuellesJahr) option.selected = true;
    select.appendChild(option);
  }

  // Jahr wechseln
  select.addEventListener("change", () => {
    aktuellesKalenderjahr = parseInt(select.value);
    generiereKalender(aktuellesKalenderjahr);
  });

  // Zurück zum aktuellen Jahr
  document.getElementById("btnAktuellesJahr").addEventListener("click", () => {
    aktuellesKalenderjahr = aktuellesJahr;
    select.value = aktuellesJahr;
    generiereKalender(aktuellesJahr);
  });

  // Topbar ein-/ausblenden
  document.getElementById("btnToggleTopbar").addEventListener("click", () => {
    document.getElementById("topbar").classList.toggle("hidden");
  });
}

// Prüft, ob zwei Daten gleich sind (nur Jahr, Monat, Tag)
function istGleichesDatum(a, b) {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth() === b.getMonth() &&
         a.getDate() === b.getDate();
}

// Ostersonntag berechnen (für dynamische Feiertage)
function berechneOstern(jahr) {
  const a = jahr % 19;
  const b = Math.floor(jahr / 100);
  const c = jahr % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const monat = Math.floor((h + l - 7 * m + 114) / 31);
  const tag = ((h + l - 7 * m + 114) % 31) + 1;

  const ostern = new Date(jahr, monat - 1, tag);
  ostern.setHours(0, 0, 0, 0);
  return ostern;
}

// Dynamische Feiertage berechnen
function berechneDynamischeFeiertage(jahr) {
  const ostern = berechneOstern(jahr);

  const feiertage = feiertagsDaten.dynamisch.map(f => {
    // Sonderfall Buß- und Bettag (immer Mittwoch vor 23.11.)
    if (f.special === "buss_und_bettag") {
      const date = new Date(jahr, 10, 23);
      while (date.getDay() !== 3) {
        date.setDate(date.getDate() - 1);
      }
      date.setHours(0, 0, 0, 0);
      return { name: f.name, date };
    }

    // Normale dynamische Feiertage: Offset zu Ostersonntag
    const date = new Date(ostern);
    date.setDate(date.getDate() + f.offset);
    date.setHours(0, 0, 0, 0);
    return { name: f.name, date };
  });

  return feiertage;
}

// Kalenderwoche nach ISO 8601 berechnen
function berechneKalenderwoche(datum) {
  const temp = new Date(datum.getFullYear(), datum.getMonth(), datum.getDate());
  temp.setHours(0, 0, 0, 0);
  temp.setDate(temp.getDate() + 3 - ((temp.getDay() + 6) % 7));
  const ersteDonnerstag = new Date(temp.getFullYear(), 0, 4);
  return 1 + Math.round(((temp - ersteDonnerstag) / 86400000 - 3 + ((ersteDonnerstag.getDay() + 6) % 7)) / 7);
}

// Kalender für das angegebene Jahr erzeugen
function generiereKalender(jahr) {
  setzeTitle(jahr);
  const kalender = document.getElementById("kalender");
  kalender.innerHTML = "";

  const heute = new Date();
  const istHeute = heute.getFullYear() === jahr;

  const ostersonntag = berechneOstern(jahr);
  const dynamische = berechneDynamischeFeiertage(jahr);

  for (let m = 0; m < 12; m++) {
    const monatDiv = document.createElement("div");
    monatDiv.classList.add("monat");

    const headline = document.createElement("h3");
    headline.innerText = monate[m];
    monatDiv.appendChild(headline);

    const wochenTabelle = document.createElement("table");

    // Kopfzeile mit KW + Wochentagen
    const kopfzeile = document.createElement("tr");
    const thKW = document.createElement("th");
    thKW.innerText = "KW";
    thKW.classList.add("kw");
    kopfzeile.appendChild(thKW);
    ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].forEach(wochentag => {
      const th = document.createElement("th");
      th.innerText = wochentag;
      kopfzeile.appendChild(th);
    });
    wochenTabelle.appendChild(kopfzeile);

    // Wochenzeilen generieren
    let leeresDatum = new Date(jahr, m, 1);
    leeresDatum.setDate(leeresDatum.getDate() - ((leeresDatum.getDay() + 6) % 7)); // zurück zum Montag

    do {
      const aktuelleWoche = berechneKalenderwoche(leeresDatum);
      const zeile = document.createElement("tr");

      // KW-Zelle
      const kwZelle = document.createElement("td");
      kwZelle.classList.add("kw");
      kwZelle.innerText = `${aktuelleWoche}`;
      zeile.appendChild(kwZelle);

      // Wochentage
      for (let i = 0; i < 7; i++) {
        const tagZelle = document.createElement("td");
        const tagDatum = new Date(leeresDatum);

        if (tagDatum.getMonth() === m) {
          tagZelle.innerText = tagDatum.getDate();
          tagZelle.classList.add("tag");

          // Heute hervorheben
          if (istHeute && tagDatum.getDate() === heute.getDate() && tagDatum.getMonth() === heute.getMonth()) {
            tagZelle.classList.add("heute");
          }

          // Statische Feiertage markieren
          const statischerTreffer = istStatischerFeiertag(tagDatum);
          if (statischerTreffer) {
            tagZelle.classList.add("feiertag");
            tagZelle.title = statischerTreffer.name;
            tagZelle.addEventListener("click", (event) => {
              zeigeFeiertagPopup(statischerTreffer.name, event);
            });
          }

          // Dynamische Feiertage markieren
          dynamische.forEach(f => {
            if (istGleichesDatum(tagDatum, f.date)) {
              tagZelle.classList.add("feiertag");
              tagZelle.title = f.name;
              tagZelle.addEventListener("click", (event) => {
                zeigeFeiertagPopup(f.name, event);
              });
            }
          });                   
        }

        zeile.appendChild(tagZelle);
        leeresDatum.setDate(leeresDatum.getDate() + 1);
      }

      wochenTabelle.appendChild(zeile);
    } while (leeresDatum.getMonth() === m || leeresDatum.getDay() !== 1);

    monatDiv.appendChild(wochenTabelle);
    kalender.appendChild(monatDiv);
  }
}

// Feiertagspopup ausblenden, wenn man außerhalb klickt
document.addEventListener("DOMContentLoaded", () => {
  const popup = document.getElementById("feiertagPopup");

  document.body.addEventListener("click", (e) => {
    if (!e.target.classList.contains("feiertag")) {
      popup.classList.add("hidden");
    }
  });
});

// Feiertagsnamen im Popup anzeigen
function zeigeFeiertagPopup(name, event) {
  const popup = document.getElementById("feiertagPopup");
  popup.innerText = name;
  popup.style.left = `${event.pageX + 10}px`;
  popup.style.top = `${event.pageY + 10}px`;
  popup.classList.remove("hidden");
}

// Dark Mode Umschalten & Speichern
const toggle = document.getElementById('darkModeToggle');
toggle.addEventListener('click', () => {
  document.body.classList.toggle('dark');
  const isDark = document.body.classList.contains('dark');
  localStorage.setItem('darkMode', isDark ? 'true' : 'false');
});

// Dark Mode bei Seitenstart anwenden
window.addEventListener('DOMContentLoaded', () => {
  if (localStorage.getItem('darkMode') === 'true') {
    document.body.classList.add('dark');
  }
});

// Service Worker registrieren (für Offline-Nutzung etc.)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(reg => console.log('Service Worker registriert:', reg))
      .catch(err => console.error('Service Worker Fehler:', err));
  });
}