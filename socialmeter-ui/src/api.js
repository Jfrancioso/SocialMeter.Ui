// In development every call goes through the Vite proxy ("/api" -> the .NET API). In production the build sets
// VITE_API_BASE to the API's origin (see .github/workflows/deploy.yml); no host is hard-coded here.
const API_BASE = (import.meta.env.VITE_API_BASE ?? "").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// A deploy restarts the API for about half a minute; a 5xx or a dropped connection in that window is retried once
// after a short pause so a restart reads as a slow load, not an outage. 4xx answers are final and never retried.
const RETRY_AFTER_MS = 3000;

async function httpGet(path, { signal } = {}, attempt = 0) {
  let res;
  try {
    res = await fetch(API_BASE + path, { signal, headers: { Accept: "application/json" } });
  } catch (e) {
    if (e?.name === "AbortError" || attempt > 0) throw e;
    await new Promise((r) => setTimeout(r, RETRY_AFTER_MS));
    return httpGet(path, { signal }, attempt + 1);
  }
  if (res.status >= 500 && attempt === 0) {
    await new Promise((r) => setTimeout(r, RETRY_AFTER_MS));
    return httpGet(path, { signal }, attempt + 1);
  }
  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      if (body?.title) message = body.title;
      if (body?.error) message = body.error;
    } catch {
      // body wasn't JSON; keep the status text
    }
    throw new ApiError(res.status, message);
  }
  return res.json();
}

function qs(params) {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "");
  return entries.length ? `?${new URLSearchParams(entries)}` : "";
}

// ---- Titles ----
export const getHome = (region = "US", opts) => httpGet(`/api/home${qs({ region })}`, opts);

export const searchTitles = (query, { type, page = 1 } = {}, opts) =>
  httpGet(`/api/titles/search${qs({ query, type, page })}`, opts);

export const getTitle = (type, id, opts) => httpGet(`/api/titles/${type}/${id}`, opts);

export const getRatings = (type, id, opts) => httpGet(`/api/titles/${type}/${id}/ratings`, opts);

export const getTrending = (type, page = 1, opts) => httpGet(`/api/titles/trending${qs({ type, page })}`, opts);
export const getPopular = (type, page = 1, opts) => httpGet(`/api/titles/${type}/popular${qs({ page })}`, opts);
export const getTopRated = (type, page = 1, opts) => httpGet(`/api/titles/${type}/top-rated${qs({ page })}`, opts);
export const getNewGames = (page = 1, opts) => httpGet(`/api/titles/game/new-releases${qs({ page })}`, opts);
export const getComingSoonGames = (page = 1, opts) => httpGet(`/api/titles/game/coming-soon${qs({ page })}`, opts);

// ---- SocialMeter ----
export const getSocialMeter = (type, id, { refresh = false } = {}, opts) =>
  httpGet(`/api/socialmeter/${type}/${id}${qs({ refresh: refresh ? "true" : undefined })}`, opts);

export const getSocialPosts = (type, id, { sentiment, platform, page = 1, pageSize = 20 } = {}, opts) =>
  httpGet(`/api/socialmeter/${type}/${id}/posts${qs({ sentiment, platform, page, pageSize })}`, opts);

/** The numbers behind the cached reading: effective posts, margin, weight by sentiment and substance, top drivers. */
export const getScoreExplanation = (type, id, opts) => httpGet(`/api/socialmeter/${type}/${id}/explain`, opts);

/** One reading per day plus the trend verdict. */
export const getScoreHistory = (type, id, { days = 30 } = {}, opts) =>
  httpGet(`/api/socialmeter/${type}/${id}/history${qs({ days })}`, opts);

/** keys: ["movie:693134", "tv:1399"] → { "movie:693134": { score, label, ... } } (cached readings only) */
export const getSnapshots = (keys, opts) =>
  keys.length ? httpGet(`/api/socialmeter/snapshots${qs({ keys: keys.join(",") })}`, opts) : Promise.resolve({});
