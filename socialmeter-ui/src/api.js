// All calls go through the Vite dev proxy ("/api" -> the .NET API), so no host is hard-coded here.

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function httpGet(path, { signal } = {}) {
  const res = await fetch(path, { signal, headers: { Accept: "application/json" } });
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
