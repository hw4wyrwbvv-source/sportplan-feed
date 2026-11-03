// widget.tsx – Sportplan-Widget (Scripting-App)
// Widget-Parameter: leer/glocke = heute mit 🔔 · top · alle · woche
import { VStack, HStack, Text, Spacer, Button, Link, RoundedRectangle, Widget } from "scripting"
import { loadFeed, ARTIFACT, Ev } from "./feed"
import { RefreshIntent } from "./app_intents"

const EMOJI: Record<string, string> = { fb: "⚽", nba: "🏀", nfl: "🏈", f1: "🏎️", ot: "🏅" }
const FARBE: Record<string, string> = { fb: "#30d158", nba: "#ff9f0a", nfl: "#64a0ff", f1: "#ff453a", ot: "#bf5af2" }
const C = { text: "#f5f7f6", sub: "#8fa39a", fav: "#ffd60a", live: "#ff453a" }

const p = (Widget.parameter ?? "").trim().toLowerCase()
const modus = p === "top" || p === "alle" || p === "woche" ? p : "glocke"
const fam = Widget.family
const klein = fam === "systemSmall"
const MAX = fam === "systemSmall" ? 3 : fam === "systemMedium" ? 3 : 7
const TITEL: Record<string, string> = { glocke: "Heute mit 🔔", top: "Top-Events", alle: "Alle Events", woche: "Diese Woche" }

const hhmm = (d: Date) => String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0")

function auswahl(feed: any, now: Date): Ev[] {
  const offen = (e: Ev) => new Date(e.ende) > now
  let l: Ev[]
  if (modus === "woche") l = feed.woche
  else if (modus === "glocke") l = feed.tag.filter((e: Ev) => e.glocke)
  else {
    const ids = new Set(feed.tag.map((e: Ev) => e.id))
    l = feed.tag.concat(feed.woche.filter((e: Ev) => !ids.has(e.id)))
    if (modus === "top") l = l.filter((e) => e.top)
  }
  return l.filter(offen).sort((a, b) => +new Date(a.start) - +new Date(b.start))
}

function Zeile({ e, erste, now }: { e: Ev; erste: boolean; now: Date }) {
  const live = new Date(e.start) <= now
  return (
    <Link url={ARTIFACT + "#" + encodeURIComponent(e.id)}>
      <HStack
        spacing={8}
        padding={{ horizontal: 8, vertical: 5 }}
        background={<RoundedRectangle fill={erste ? "#ffffff26" : "#ffffff14"} />}
      >
        <RoundedRectangle fill={FARBE[e.sport] ?? FARBE.ot} frame={{ width: 3, height: 26 }} />
        <Text font={13} fontWeight="bold" monospacedDigit foregroundStyle={live ? C.live : C.text}>
          {live ? "LIVE" : hhmm(new Date(e.start))}
        </Text>
        <VStack alignment="leading" spacing={0}>
          <Text font={13} fontWeight="bold" lineLimit={1} minScaleFactor={0.7} foregroundStyle={e.fav ? C.fav : C.text}>
            {(e.fav ? "★ " : "") + e.titel}
          </Text>
          <Text font={10} lineLimit={1} minScaleFactor={0.7} foregroundStyle={C.sub}>
            {klein ? e.sender : e.wettbewerb + " · " + e.sender}
          </Text>
        </VStack>
        <Spacer />
        {klein ? null : <Text font={13}>{EMOJI[e.sport] ?? "🏅"}</Text>}
      </HStack>
    </Link>
  )
}

async function run() {
  const now = new Date()
  const { data, offline } = await loadFeed()
  const events = data ? auswahl(data, now) : []
  const shown = events.slice(0, MAX)
  const rest = events.length - shown.length
  const stand = data ? new Date(data.generated_at) : null

  // Neu laden: nächstes Event-Ende/-Start, spätestens 30 Min
  const max = now.getTime() + 30 * 60 * 1000
  const termine = shown.flatMap((e) => [+new Date(e.ende), +new Date(e.start)]).filter((t) => t > now.getTime()).sort((a, b) => a - b)
  const next = Math.max(Math.min(termine[0] ?? max, max), now.getTime() + 60 * 1000)

  Widget.present(
    <VStack
      alignment="leading"
      spacing={4}
      padding={12}
      frame={{ maxWidth: "infinity", maxHeight: "infinity", alignment: "topLeading" }}
      widgetBackground={{
        style: { gradient: [{ color: "#1b2a24", location: 0 }, { color: "#0b0f0e", location: 1 }], startPoint: { x: 0, y: 0 }, endPoint: { x: 1, y: 1 } },
        shape: { type: "rect", cornerRadius: 0 },
      }}
    >
      <HStack>
        <Text font={klein ? 14 : 16} fontWeight="bold" foregroundStyle={C.text}>{TITEL[modus]}</Text>
        <Spacer />
        {klein ? null : (
          <Text font={11} foregroundStyle={C.sub}>
            {now.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" })}
          </Text>
        )}
        <Button title="↻" intent={RefreshIntent({})} />
      </HStack>

      {!data ? (
        <Text font={12} foregroundStyle={C.sub}>Keine Daten – Feed nicht erreichbar, kein Cache.</Text>
      ) : shown.length === 0 ? (
        <Text font={12} foregroundStyle={C.sub}>{modus === "glocke" ? "Heute nichts mehr mit 🔔" : "Nichts mehr im Plan"}</Text>
      ) : (
        shown.map((e, i) => <Zeile e={e} erste={i === 0} now={now} />)
      )}

      <Spacer />
      <HStack>
        {rest > 0 ? <Text font={10} foregroundStyle={C.sub}>{"+" + rest + " weitere"}</Text> : null}
        <Spacer />
        {stand ? (
          <Text font={9} foregroundStyle={offline ? C.fav : "#5f726a"}>
            {(offline ? "⚠︎ " : "") + "Stand " + stand.getDate() + "." + (stand.getMonth() + 1) + ". " + hhmm(stand)}
          </Text>
        ) : null}
      </HStack>
    </VStack>,
    { policy: "after", date: new Date(next) } as any
  )
}

run()
