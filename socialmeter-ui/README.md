# SocialMeter UI

Vue 3 + Vite front end for SocialMeter. Talks to the .NET API through the Vite dev proxy
(`/api` → `https://localhost:7101`, see `vite.config.js`), so start the API first.

```bash
npm install
npm run dev
```

## Layout

- `src/pages` — Home, Title (movie or show), Browse, Search
- `src/components/Meter` — the SocialMeter gauge, card badge and sentiment bar
- `src/components/Social` — post feed cards and source status
- `src/components/Ratings` — side-by-side ratings strip (SocialMeter vs TMDB / IMDb / RT / Metacritic)
- `src/composables/useSnapshots.js` — shared cache of readings so cards can show a score without a fetch each
- `src/api.js` — every API call in one place
