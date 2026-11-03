// app_intents.tsx – läuft im Hintergrund, ohne die App zu öffnen
import { loadFeed } from "./feed"

export const RefreshIntent = AppIntentManager.register<{}>({
  name: "SportplanRefreshIntent",
  protocol: AppIntentProtocol.AppIntent,
  perform: async () => {
    await loadFeed()   // Feed frisch holen + Cache schreiben
    Widget.reloadAll() // Widget neu zeichnen
  },
})
