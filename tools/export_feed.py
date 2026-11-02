#!/usr/bin/env python3
"""Erzeugt feed.json fürs Scriptable-Widget aus Tagesplan + woche.html.

Aufruf:
  python3 export_feed.py TAGESPLAN.html WOCHE.html [alerts.json] > feed.json
alerts.json (optional) = Liste/Objekt mit Docs aus ArtifactData "alerts"
  ({id/doc_id, on}); fehlt ein Eintrag, gilt der Standard aus dem Plan.
"""
import json, re, sys, unicodedata
from datetime import datetime, timedelta, date
from zoneinfo import ZoneInfo

TZ = ZoneInfo("Europe/Berlin")
DAUER = {"fb": 115, "nba": 150, "nfl": 200, "f1": 120, "ot": 120}  # Minuten (Schätzung)


def slug(v):
    v = v.lower().replace("ß", "ss")
    v = unicodedata.normalize("NFD", v)
    v = "".join(c for c in v if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]+", "-", v).strip("-")


def js_array(html, name):
    m = re.search(r"const %s\s*=\s*(\[.*?\n\]);" % name, html, re.S)
    if not m:
        raise SystemExit(f"{name} nicht gefunden")
    s = m.group(1)
    s = re.sub(r"([{,]\s*)([A-Za-z_]\w*)\s*:", r'\1"\2":', s)  # Keys quoten
    s = re.sub(r",(\s*[\]}])", r"\1", s)  # trailing commas
    return json.loads(s)


def plan_date(html):
    m = re.search(r'const PLAN_DATE\s*=\s*"(\d{4}-\d{2}-\d{2})"', html)
    return date.fromisoformat(m.group(1)) if m else None


def dauer(sport, lg, titel):
    if sport == "f1":
        t = (lg + " " + titel).lower()
        if "quali" in t or "sprint" in t or "training" in t:
            return 60
    return DAUER.get(sport, 120)


def ev(e, tag, key_date, alerts):
    t, n, s, lg, m, tv, fav, _d = e[:8]
    x = e[8] if len(e) > 8 else 0
    std = e[9] if len(e) > 9 else None
    hh, mm = map(int, t.split(":"))
    start = datetime(tag.year, tag.month, tag.day, hh, mm, tzinfo=TZ)
    ende = start + timedelta(minutes=dauer(s, lg, m))
    eid = f"{key_date.isoformat()}_{t.replace(':', '')}_{slug(m)}"
    on = alerts.get(eid)
    if on is None:
        on = bool(std) if std is not None else not x
    return {"id": eid, "start": start.isoformat(), "ende": ende.isoformat(),
            "sport": s, "titel": m, "wettbewerb": lg, "sender": tv,
            "top": not x, "fav": bool(fav), "glocke": bool(on)}


def main():
    tag_html = open(sys.argv[1], encoding="utf-8").read()
    woche_html = open(sys.argv[2], encoding="utf-8").read()
    alerts = {}
    if len(sys.argv) > 3:
        raw = json.load(open(sys.argv[3], encoding="utf-8"))
        docs = raw.get("documents", raw.get("docs", raw)) if isinstance(raw, dict) else raw
        if isinstance(docs, dict):
            docs = [dict(v, id=k) for k, v in docs.items()]
        for d in docs:
            data = d.get("data", d)
            k = d.get("id") or d.get("doc_id")
            if k and isinstance(data.get("on"), bool):
                alerts[k] = data["on"]

    pd = plan_date(tag_html)
    tag = []
    for sec in js_array(tag_html, "D"):
        for e in sec["ev"]:
            hh = int(e[0][:2])
            d = pd + timedelta(days=1) if (sec.get("id") == "nacht" or hh < 6) else pd
            tag.append(ev(e, d, pd, alerts))

    woche = []
    wd = js_array(woche_html, "D")
    # Jahr/Monat aus "2.11." + Plandatum ableiten
    for sec in wd:
        dd, mo = map(int, sec["dm"].strip(".").split(".")[:2])
        yr = pd.year + (1 if mo < pd.month - 6 else 0)
        base = date(yr, mo, dd)
        for e in sec["ev"]:
            nacht = "nacht" in (e[1] or "").lower() or int(e[0][:2]) < 6
            woche.append(ev(e, base + timedelta(days=1) if nacht else base, base, alerts))

    tag.sort(key=lambda e: e["start"]); woche.sort(key=lambda e: e["start"])
    out = {"generated_at": datetime.now(TZ).isoformat(timespec="seconds"),
           "plan_date": pd.isoformat(),
           "artifact": "https://claude.ai/artifact/3TGC2HCfZppYEc8S6NZPeP",
           "tag": tag, "woche": woche}
    json.dump(out, sys.stdout, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
