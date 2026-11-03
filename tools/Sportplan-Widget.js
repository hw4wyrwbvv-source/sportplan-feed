// Variables used by Scriptable.
// icon-color: deep-gray; icon-glyph: futbol;
// Sportplan-Widget
// Parameter: (leer) | glocke = heutige Events mit 🔔 · top = Top-Events · alle = umfangreich · woche = Wochenübersicht

const FEED_URL = "https://raw.githubusercontent.com/hw4wyrwbvv-source/sportplan-feed/main/a3754593a4ba2c68/feed.json";
const ARTIFACT = "https://claude.ai/artifact/3TGC2HCfZppYEc8S6NZPeP";
const EMOJI = { fb: "⚽", nba: "🏀", nfl: "🏈", f1: "🏎️", ot: "🏅" };
const FARBE = { fb: "#30d158", nba: "#ff9f0a", nfl: "#64a0ff", f1: "#ff453a", ot: "#bf5af2" };
const C = {
  bg1: "#1b2a24", bg2: "#0b0f0e", text: "#f5f7f6", sub: "#8fa39a",
  fav: "#ffd60a", live: "#ff453a", karte: "#ffffff14", karteNext: "#ffffff26",
};

const param = ((args.widgetParameter || "glocke") + "").trim().toLowerCase();
const modus = ["top", "alle", "woche"].includes(param) ? param : "glocke";
const groesse = config.widgetFamily || "large";
const klein = groesse === "small";
const MAX = { small: 3, medium: 4, large: 8, extraLarge: 10 }[groesse] || 4;

// ---------- Daten laden (mit Cache-Fallback) ----------
const fm = FileManager.local();
const cachePfad = fm.joinPath(fm.documentsDirectory(), "sportplan-feed.json");

async function laden() {
  try {
    const r = new Request(FEED_URL + "?t=" + Date.now());
    r.timeoutInterval = 10;
    const data = await r.loadJSON();
    if (!data || !Array.isArray(data.tag)) throw new Error("ungültig");
    fm.writeString(cachePfad, JSON.stringify(data));
    return { data, offline: false };
  } catch (e) {
    if (fm.fileExists(cachePfad)) return { data: JSON.parse(fm.readString(cachePfad)), offline: true };
    return { data: null, offline: true };
  }
}

const { data, offline } = await laden();
const jetzt = new Date();

function auswahl(d) {
  if (!d) return [];
  const offen = (e) => new Date(e.ende) > jetzt;
  let liste;
  if (modus === "woche") liste = d.woche || [];
  else if (modus === "glocke") liste = (d.tag || []).filter((e) => e.glocke);
  else {
    const ids = new Set((d.tag || []).map((e) => e.id));
    liste = (d.tag || []).concat((d.woche || []).filter((e) => !ids.has(e.id)));
    if (modus === "top") liste = liste.filter((e) => e.top);
  }
  return liste.filter(offen).sort((a, b) => new Date(a.start) - new Date(b.start));
}
const alle = auswahl(data);
const events = alle.slice(0, MAX);
const rest = alle.length - events.length;

// ---------- Formatierung ----------
const fmt = (f) => { const x = new DateFormatter(); x.dateFormat = f; x.locale = "de_DE"; return x; };
const fUhr = fmt("HH:mm"), fTag = fmt("EEE d.M."), fStand = fmt("d.M. HH:mm"), fKopf = fmt("EEEE, d. MMMM");
const eventUrl = (e) => ARTIFACT + "#" + encodeURIComponent(e.id);
const TITEL = { glocke: "Heute mit 🔔", top: "Top-Events", alle: "Alle Events", woche: "Diese Woche" }[modus];

function text(parent, s, size, color, weight) {
  const t = parent.addText(s);
  t.font = weight === "b" ? Font.boldSystemFont(size) : weight === "s" ? Font.semiboldSystemFont(size) : Font.systemFont(size);
  t.textColor = new Color(color);
  t.lineLimit = 1;
  return t;
}

// ---------- Widget ----------
const w = new ListWidget();
const grad = new LinearGradient();
grad.colors = [new Color(C.bg1), new Color(C.bg2)];
grad.locations = [0, 1];
grad.startPoint = new Point(0, 0);
grad.endPoint = new Point(1, 1);
w.backgroundGradient = grad;
w.setPadding(klein ? 12 : 14, klein ? 12 : 14, 10, klein ? 12 : 14);
w.url = events[0] ? eventUrl(events[0]) : ARTIFACT;

// Kopf
const kopf = w.addStack();
kopf.centerAlignContent();
text(kopf, TITEL, klein ? 14 : 16, C.text, "b");
kopf.addSpacer();
if (!klein) {
  text(kopf, fKopf.string(jetzt), 11, C.sub, "s");
  kopf.addSpacer(8);
  // Aktualisieren-Button: öffnet Scriptable, führt das Script aus und lädt den Feed neu
  const knopf = kopf.addStack();
  knopf.setPadding(2, 7, 2, 7);
  knopf.backgroundColor = new Color("#ffffff26");
  knopf.cornerRadius = 9;
  knopf.url = "scriptable:///run/" + encodeURIComponent(Script.name());
  text(knopf, "↻", 13, C.text, "b");
}
w.addSpacer(klein ? 6 : 9);

if (!data) {
  text(w, "Keine Daten", 13, C.text, "s");
  const t = text(w, "Feed nicht erreichbar, kein Cache.", 11, C.sub);
  t.lineLimit = 2;
} else if (!events.length) {
  w.addSpacer();
  const e1 = text(w, "🌙", 26, C.text); e1.centerAlignText();
  w.addSpacer(4);
  const t = text(w, modus === "glocke" ? "Heute nichts mehr mit 🔔" : "Nichts mehr im Plan", 12, C.sub, "s");
  t.centerAlignText(); t.lineLimit = 2;
  w.addSpacer();
} else {
  let letzterTag = null;
  events.forEach((e, i) => {
    const start = new Date(e.start);
    const live = start <= jetzt;
    const naechstes = i === 0;
    const farbe = FARBE[e.sport] || FARBE.ot;

    if (modus === "woche" && !klein && start.toDateString() !== letzterTag) {
      letzterTag = start.toDateString();
      w.addSpacer(i ? 3 : 0);
      text(w, fTag.string(start).toUpperCase(), 9, C.sub, "b");
      w.addSpacer(2);
    }

    const karte = w.addStack();
    karte.centerAlignContent();
    karte.backgroundColor = new Color(naechstes ? C.karteNext : C.karte);
    karte.cornerRadius = 10;
    karte.setPadding(klein ? 5 : 6, 0, klein ? 5 : 6, 8);
    karte.url = eventUrl(e);

    // Farbbalken je Sportart
    const balken = karte.addStack();
    balken.size = new Size(3, klein ? 24 : 30);
    balken.backgroundColor = new Color(farbe);
    balken.cornerRadius = 2;
    karte.addSpacer(8);

    // Uhrzeit
    const zeit = karte.addStack();
    zeit.size = new Size(klein ? 36 : 42, 0);
    zeit.layoutVertically();
    if (live) text(zeit, "LIVE", klein ? 10 : 11, C.live, "b");
    else text(zeit, fUhr.string(start), klein ? 12 : 14, naechstes ? C.text : "#d6dedb", "b").font =
      Font.boldMonospacedSystemFont(klein ? 12 : 14);
    karte.addSpacer(6);

    // Titel + Unterzeile
    const mitte = karte.addStack();
    mitte.layoutVertically();
    const titel = text(mitte, (e.fav ? "★ " : "") + e.titel, klein ? 12 : 13, e.fav ? C.fav : C.text, "b");
    titel.minimumScaleFactor = 0.7;
    const unter = klein ? e.sender : e.wettbewerb + " · " + e.sender;
    const u = text(mitte, unter, klein ? 9 : 10, C.sub, "s");
    u.minimumScaleFactor = 0.7;

    karte.addSpacer();
    if (e.glocke && modus !== "glocke") text(karte, "🔔", 10, C.text);
    if (!klein) text(karte, EMOJI[e.sport] || "🏅", 14, C.text);
    w.addSpacer(klein ? 3 : 4);
  });
}
w.addSpacer();

// Fuß
const fuss = w.addStack();
fuss.centerAlignContent();
if (rest > 0) text(fuss, "+" + rest + " weitere", 10, C.sub, "s");
fuss.addSpacer();
if (data && offline) text(fuss, "⚠︎ Stand " + fStand.string(new Date(data.generated_at)), 9, C.fav, "s");
else if (data && !klein) text(fuss, "Stand " + fStand.string(new Date(data.generated_at)), 9, "#5f726a");

// ---------- Aktualisierung: nächstes Event-Ende/-Start, spätestens 30 Min ----------
const max = new Date(jetzt.getTime() + 30 * 60 * 1000);
const termine = events.flatMap((e) => [new Date(e.ende), new Date(e.start)]).filter((d) => d > jetzt).sort((a, b) => a - b);
let naechste = termine[0] || max;
if (naechste > max) naechste = max;
w.refreshAfterDate = new Date(Math.max(naechste.getTime(), jetzt.getTime() + 60 * 1000));

if (config.runsInWidget) Script.setWidget(w);
else await w.presentLarge();
Script.complete();
