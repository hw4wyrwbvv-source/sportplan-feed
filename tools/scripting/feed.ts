// feed.ts – Feed laden + Cache (wird von widget.tsx und app_intents.tsx genutzt)
export const FEED_URL = "https://raw.githubusercontent.com/hw4wyrwbvv-source/sportplan-feed/main/a3754593a4ba2c68/feed.json"
export const ARTIFACT = "https://claude.ai/artifact/3TGC2HCfZppYEc8S6NZPeP"

export type Ev = {
  id: string; start: string; ende: string; sport: string; titel: string
  wettbewerb: string; sender: string; top: boolean; fav: boolean; glocke: boolean
}
export type Feed = { generated_at: string; plan_date: string; tag: Ev[]; woche: Ev[] }

const CACHE_KEY = "sportplan_feed"

export async function loadFeed(): Promise<{ data: Feed | null; offline: boolean }> {
  try {
    const res = await fetch(FEED_URL + "?t=" + Date.now())
    if (!res.ok) throw new Error("HTTP " + res.status)
    const data = (await res.json()) as Feed
    if (!data || !Array.isArray(data.tag)) throw new Error("ungültig")
    Storage.set(CACHE_KEY, data)
    return { data, offline: false }
  } catch (e) {
    const cached = Storage.get<Feed>(CACHE_KEY)
    return { data: cached ?? null, offline: true }
  }
}
