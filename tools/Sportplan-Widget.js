// Variables used by Scriptable.
// icon-color: deep-gray; icon-glyph: futbol;
// Sportplan-Widget – Parameter: top | alle | woche  (leer = top)

const FEED_URL = "https://raw.githubusercontent.com/hw4wyrwbvv-source/sportplan-feed/main/a3754593a4ba2c68/feed.json";
const ARTIFACT = "https://claude.ai/artifact/3TGC2HCfZppYEc8S6NZPeP";
const EMOJI = { fb: "⚽", nba: "🏀", nfl: "🏈", f1: "🏎️", ot: "🏅" };
const FARBE = { fb: "#34c759", nba: "#ff9f0a", nfl: "#5e9eff", f1: "#ff453a", ot: "#bf5af2" };
const C = { bg: "#101114", text: "#f2f2f7", sub: "#8e8e93", fav: "#ffd60a", live: "#ff453a" };

const param = ((args.widgetParameter || "top") + "").trim().toLowerCase();
const modus = ["alle", "woche"].includes(param) ? param : "top";
const groesse = config.widgetFamily || "large";
const MAX = { small: 3, medium: 5, large: 10, extraLarge: 14 }[groesse] || 5;

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
    if (fm.fileExists(cachePfad)) {
      return { data: JSON.parse(fm.readString(cachePfad)), offline: true };
    }
    return { data: null, offline: true };
  }
}

const { data, offline } = await laden();
const jetzt = new Date();

function auswahl(d) {
  if (!d) return [];
  const laufend = (e) => new Date(e.ende) > jetzt;
  let quelle;
  if (modus === "woche") quelle = d.woche || [];
  else {
    // Tagesplan; wenn dort nichts mehr kommt, mit der Woche auffüllen
    const ids = new Set((d.tag || []).map((e) => e.id));
    quelle = (d.tag || []).concat((d.woche || []).filter((e) => !ids.has(e.id)));
  }
  return quelle
    .filter(laufend)
    .filter((e) => modus === "alle" || e.top)
    .sort((a, b) => new Date(a.start) - new Date(b.start))
    .slice(0, MAX);
}
const events = auswahl(data);

// ---------- Formatierung ----------
const fUhr = new DateFormatter(); fUhr.dateFormat = "HH:mm"; fUhr.locale = "de_DE";
const fTag = new DateFormatter(); fTag.dateFormat = "EE d.M."; fTag.locale = "de_DE";
const fStand = new DateFormatter(); fStand.dateFormat = "d.M. HH:mm"; fStand.locale = "de_DE";
const tagKey = (d) => d.toDateString();
const istHeute = (d) => tagKey(d) === tagKey(jetzt);

function eventUrl(e) {
  return ARTIFACT + "#" + encodeURIComponent(e.id);
}

// ---------- Widget bauen ----------
const w = new ListWidget();
w.backgroundColor = new Color(C.bg);
w.setPadding(12, 12, 10, 12);
w.url = events[0] ? eventUrl(events[0]) : ARTIFACT;

const kopf = w.addStack();
kopf.centerAlignContent();
const titel = kopf.addText(modus === "woche" ? "Sport · Woche" : modus === "alle" ? "Sport · Alle" : "Sport · Top");
titel.font = Font.boldSystemFont(groesse === "small" ? 13 : 14);
titel.textColor = new Color(C.text);
kopf.addSpacer();
if (groesse !== "small" && data) {
  const st = kopf.addText((offline ? "⚠︎ Stand " : "") + fStand.string(new Date(data.generated_at)));
  st.font = Font.systemFont(10);
  st.textColor = new Color(offline ? C.fav : C.sub);
}
w.addSpacer(groesse === "small" ? 4 : 6);

if (!data) {
  const t = w.addText("Keine Daten – Feed nicht erreichbar und kein Cache vorhanden.");
  t.font = Font.systemFont(12); t.textColor = new Color(C.sub);
} else if (!events.length) {
  const t = w.addText("Heute nichts mehr im Plan.");
  t.font = Font.systemFont(13); t.textColor = new Color(C.sub);
} else {
  let letzterTag = istHeute(new Date(events[0].start)) ? tagKey(jetzt) : null;
  for (const e of events) {
    const start = new Date(e.start);
    // Tagestrenner (nicht im small-Widget)
    if (groesse !== "small" && tagKey(start) !== letzterTag) {
      letzterTag = tagKey(start);
      const tz = w.addText(fTag.string(start).toUpperCase());
      tz.font = Font.semiboldSystemFont(9); tz.textColor = new Color(C.sub);
      w.addSpacer(1);
    }
    const zeile = w.addStack();
    zeile.centerAlignContent();
    zeile.url = eventUrl(e); // wirkt in medium/large
    const live = start <= jetzt;

    const uhr = zeile.addText(live ? "LIVE" : fUhr.string(start));
    uhr.font = live ? Font.boldSystemFont(11) : Font.mediumMonospacedSystemFont(12);
    uhr.textColor = new Color(live ? C.live : C.text);
    uhr.minimumScaleFactor = 0.8;
    zeile.addSpacer(groesse === "small" ? 4 : 6);
    const em = zeile.addText(EMOJI[e.sport] || "🏅");
    em.font = Font.systemFont(12);
    zeile.addSpacer(4);

    const mitte = zeile.addStack();
    mitte.layoutVertically();
    const tt = mitte.addText((e.fav ? "★ " : "") + e.titel);
    tt.font = Font.semiboldSystemFont(groesse === "small" ? 12 : 13);
    tt.textColor = new Color(e.fav ? C.fav : C.text);
    tt.lineLimit = 1; tt.minimumScaleFactor = 0.75;
    if (groesse === "small") {
      const sd = mitte.addText(e.sender);
      sd.font = Font.systemFont(10); sd.textColor = new Color(C.sub); sd.lineLimit = 1;
    }
    zeile.addSpacer();
    if (groesse !== "small") {
      const sd = zeile.addText(e.sender);
      sd.font = Font.systemFont(11); sd.textColor = new Color(C.sub);
      sd.lineLimit = 1; sd.minimumScaleFactor = 0.7;
    }
    if (e.glocke) {
      zeile.addSpacer(4);
      const b = zeile.addText("🔔"); b.font = Font.systemFont(10);
    }
    w.addSpacer(groesse === "large" ? 5 : 3);
  }
}
w.addSpacer();
if (groesse === "small" && offline && data) {
  const st = w.addText("⚠︎ Stand " + fStand.string(new Date(data.generated_at)));
  st.font = Font.systemFont(9); st.textColor = new Color(C.fav);
}

// ---------- Aktualisierung: nächstes Event-Ende, spätestens 30 Min ----------
const max = new Date(jetzt.getTime() + 30 * 60 * 1000);
const enden = events.map((e) => new Date(e.ende)).filter((d) => d > jetzt);
const starts = events.map((e) => new Date(e.start)).filter((d) => d > jetzt);
let naechste = [...enden, ...starts].sort((a, b) => a - b)[0] || max;
if (naechste > max) naechste = max;
w.refreshAfterDate = new Date(Math.max(naechste.getTime(), jetzt.getTime() + 60 * 1000));

if (config.runsInWidget) Script.setWidget(w);
else await w.presentLarge();
Script.complete();
