# Chatterbub UI

Vue 3 + Vite front end for Chatterbub (code name SocialMeter). Talks to the .NET API through the Vite dev proxy
(`/api` → `https://localhost:7101`, see `vite.config.js`), so start the API first. In production the build sets
`VITE_API_BASE` to the API's origin and Azure Static Web Apps serves `dist/` behind Cloudflare
(`staticwebapp.config.json` holds the security headers and CSP).

```bash
npm ci        # match the lock file exactly (CI and deploy do the same)
npm run dev
npm run build
```

How the whole product works, and the patterns to follow, are in the API repo's `docs/` (LEARNING-GUIDE.md section 13
for this front end, ARCHITECTURE.md for the patterns, OPERATIONS.md for alerts and the admin page).

## Layout

- `src/pages` — Home, Title (movie, show or game), Browse, Search, How it works, Privacy, Admin
- `src/composables` — state and loading per page or concern: `useTitlePage` (everything the title page shows),
  `useSnapshots` (one shared cache of readings so cards show a score without a fetch each), `useAdmin` (sign-in and the
  Remove switch), `useDevicePref` (settings kept on this device)
- `src/components/Title` — the title page's sections: score card, ratings, posts, trend, share
- `src/components/Meter` — the score gauge, card badge and sentiment bar
- `src/components/Social` — post cards (with the admin's Remove step) and source status
- `src/components/Ratings` — side-by-side ratings strip (Chatterbub vs TMDB / IMDb / RT / Metacritic / Steam)
- `src/components/Admin` — the admin bar and the "Health and spend" panel
- `src/components/OutboundLink.vue` + `src/utils/outbound.js` — the one door for links that leave the site
- `src/utils` — pure helpers: `format` (dates, numbers, `parseUtc`), `platforms`, `moderation`, `shareCard`
- `src/api.js` — every API call in one place
- `design/` — sources for the share-card and app-icon images in `public/`
