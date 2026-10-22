import { onMounted, ref } from "vue";

/**
 * The season the site dresses for. Mirrors the API's SeasonalTheme calendar (Application/Tracking/SeasonalTheme.cs)
 * so the look and the "Halloween picks" row agree. Pure date rules by month, UTC like the API:
 *
 *   Oct        halloween     Nov  thanksgiving     Dec  holidays     Jan  awards
 *   Feb        romance       Jun–Aug summer        otherwise "thrills", the base look
 *
 * Preview any season with ?season=<key> (remembered on this device) and ?season=off to go back to the calendar.
 */
export const SEASONS = ["thrills", "halloween", "thanksgiving", "holidays", "awards", "romance", "summer"];

export function seasonFor(date = new Date()) {
  const month = date.getUTCMonth() + 1;
  switch (month) {
    case 10: return "halloween";
    case 11: return "thanksgiving";
    case 12: return "holidays";
    case 1: return "awards";
    case 2: return "romance";
    case 6: case 7: case 8: return "summer";
    default: return "thrills";
  }
}

const KEY = "sm:season";

function readOverride() {
  try {
    const q = new URLSearchParams(window.location.search).get("season");
    if (q === "off") { localStorage.removeItem(KEY); return null; }
    if (q && SEASONS.includes(q)) { localStorage.setItem(KEY, q); return q; }
    const stored = localStorage.getItem(KEY);
    return stored && SEASONS.includes(stored) ? stored : null;
  } catch {
    return null;
  }
}

export function useSeason() {
  const season = ref("thrills");

  function apply() {
    season.value = readOverride() ?? seasonFor();
    document.documentElement.dataset.season = season.value;
  }

  onMounted(apply);
  return { season, apply };
}
