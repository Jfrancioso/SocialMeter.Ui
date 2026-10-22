# Seasonal themes

The site dresses for the time of year. The calendar is the same one the API uses to pick its seasonal row
(`Application/Tracking/SeasonalTheme.cs` in the API repo), so the look and the "Halloween picks" row always agree.
Months are decided in UTC, like the API.

## The calendar

| When | Key | Look | Motif | API row |
|---|---|---|---|---|
| October | `halloween` | Pumpkin orange and violet on near-black purple | Low moon, drifting fog, six bats crossing | Halloween picks (horror, mystery) |
| November | `thanksgiving` | Amber and rust, warm panels | none (colour only) | Family table |
| December | `holidays` | Ice blue with a red second accent | Slow snow | Holiday watch |
| January | `awards` | Gold on black, less glow | none | Awards season (drama) |
| February | `romance` | Rose and wine | Hearts rising | Love stories |
| June to August | `summer` | Cyan and sunset orange | none | Summer blockbusters |
| Any other month | `thrills` | The base look (tokens.css as written) | none | Edge of your seat (thrillers) |

Rules that hold for every season:

- **Meter and sentiment colours never change.** Cold to electric, positive and negative carry meaning; a theme that
  recoloured them would lie. Only surfaces, lines, the accent pair and the background glow move.
- **One quiet motif at most**, behind the content, never interactive, low opacity. If a motif competes with a poster
  or a number, it is too much.
- **Reduced motion is honoured.** With `prefers-reduced-motion`, animated motifs stop (bats and fog hold still, snow
  and hearts are hidden). The colours still apply.
- **Nothing seasonal changes behaviour.** Themes are CSS tokens plus a decoration layer; the data is the same.

## Previewing a season

Add `?season=<key>` to any page, for example `/?season=holidays`. The choice is remembered on that device until
`?season=off` clears it, so the whole site can be checked in one season before its month arrives. The override is a
device preference, never a server setting.

## Where it lives

- `src/composables/useSeason.js`: the calendar (`seasonFor`) and the override; sets `data-season` on `<html>`.
- `src/styles/seasons.css`: the tokens each season overrides, one block per season.
- `src/components/Season/SeasonDecor.vue` and its CSS module: the motifs.
- `src/App.vue` mounts the decoration layer and calls the composable once.

## Adding or changing a season

1. Add the month rule to `seasonFor` and the key to `SEASONS` in `useSeason.js`; mirror it in the API's
   `SeasonalTheme.For` so the row matches.
2. Add a `:root[data-season="<key>"]` block in `seasons.css`. Start by changing only `--accent`, `--accent-2`,
   `--accent-glow`, `--glow-1` and `--glow-2`; touch surfaces only if the accent needs a different base to read well.
3. Optionally add a motif branch in `SeasonDecor.vue`. Keep it to a handful of elements with CSS animations and add it
   to the reduced-motion rule.
4. Preview with `?season=<key>` on the home page, a title page and the method page, at desktop and phone width.
5. Add the row to the table above.

## Shorter windows

The calendar is by month because the API's row is by month. If a shorter window is ever wanted (the week of Halloween
only, Valentine's day itself), change `seasonFor` to compare dates rather than months and keep the API in step, or the
site will dress for a season whose row has already moved on.
