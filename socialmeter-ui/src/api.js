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

/** The API's own explanation of a failed request (ProblemDetails title, or an error field), else the HTTP status. */
async function errorFrom(res) {
  let message = `${res.status} ${res.statusText}`;
  try {
    const body = await res.json();
    if (body?.title) message = body.title;
    if (body?.error) message = body.error;
  } catch {
    // body wasn't JSON; keep the status text
  }
  return new ApiError(res.status, message);
}

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
  if (!res.ok) throw await errorFrom(res);
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

/** "In their words": the strongest post on each side, with each side's size. Cached data only. */
export const getHighlights = (type, id, opts) => httpGet(`/api/socialmeter/${type}/${id}/highlights`, opts);

/** "The crowd" (Crowd Shape pilot): every counted post as a dot, no text. `enabled` is false outside the pilot. */
export const getCrowd = (type, id, opts) => httpGet(`/api/socialmeter/${type}/${id}/crowd`, opts);

/** One counted post of a title, for a dot clicked in "The crowd". */
export const getSocialPost = (type, id, postId, opts) => httpGet(`/api/socialmeter/${type}/${id}/posts/${postId}`, opts);

/** One reading per day plus the trend verdict. */
export const getScoreHistory = (type, id, { days = 30 } = {}, opts) =>
  httpGet(`/api/socialmeter/${type}/${id}/history${qs({ days })}`, opts);

/** What the search box shows before anything is typed: { talkedAbout: [{ title, posts }], trending: [title] }. */
export const getSearchSuggestions = (opts) => httpGet("/api/home/suggestions", opts);

/**
 * One anonymous outbound-click tally (see utils/outbound.js). Query string only, so the browser sends a plain request
 * with no preflight; keepalive lets it finish while the new tab opens. Failures are ignored.
 */
export function countOutbound(kind, host) {
  fetch(`${API_BASE}/api/events/outbound${qs({ kind, host })}`, { method: "POST", keepalive: true }).catch(() => {});
}

/** keys: ["movie:693134", "tv:1399"] → { "movie:693134": { score, label, ... } } (cached readings only) */
export const getSnapshots = (keys, opts) =>
  keys.length ? httpGet(`/api/socialmeter/snapshots${qs({ keys: keys.join(",") })}`, opts) : Promise.resolve({});

// ---- Admin (the /admin page and the Remove buttons on posts) ----
// In production Cloudflare Access signs the operator in on the API's own host, and its cookie rides along on these calls
// (credentials: "include"); the API checks that token again itself. Local development has no Access: the admin page
// takes the admin key from your user secrets and keeps it for this browser tab only.
const DEV_KEY = "chatterbub.adminKey";

export function setDevAdminKey(key) {
  try {
    if (key) sessionStorage.setItem(DEV_KEY, key);
    else sessionStorage.removeItem(DEV_KEY);
  } catch {
    // storage blocked: the key just isn't remembered
  }
}

function devAdminKey() {
  try {
    return import.meta.env.DEV ? sessionStorage.getItem(DEV_KEY) : null;
  } catch {
    return null;
  }
}

async function adminFetch(path, { method = "GET", body } = {}) {
  const headers = { Accept: "application/json" };
  if (body) headers["Content-Type"] = "application/json";
  const key = devAdminKey();
  if (key) headers["X-Admin-Key"] = key;

  let res;
  try {
    res = await fetch(API_BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined, credentials: "include" });
  } catch {
    // Signed out, Access answers with a redirect to its sign-in page, which a cross-site fetch can't follow.
    throw new ApiError(0, "Not signed in");
  }
  if (!res.ok) throw await errorFrom(res);
  return res.json();
}

export const getAdminMe = () => adminFetch("/api/admin/me");
export const hidePost = (id, reason, titleName) => adminFetch(`/api/admin/posts/${id}/hide`, { method: "POST", body: { reason, titleName } });
export const restorePost = (id) => adminFetch(`/api/admin/posts/${id}/restore`, { method: "POST" });
/** Correct a post's label by hand ("positive" | "neutral" | "negative") with a reason; the label then outlasts re-reads. */
export const relabelPost = (id, sentiment, note, titleName) =>
  adminFetch(`/api/admin/posts/${id}/relabel`, { method: "POST", body: { sentiment, note, titleName } });
export const undoRelabel = (id) => adminFetch(`/api/admin/posts/${id}/relabel/undo`, { method: "POST" });
export const getModerationLog = (take = 50) => adminFetch(`/api/admin/moderation${qs({ take })}`);

/** Today's spend and pulls against the limits, each outside service's health, and the watch windows. */
export const getGuardrails = () => adminFetch("/api/admin/guardrails");

/** Where the browser goes to sign in: Cloudflare asks for the one-time code, then the API sends it back to /admin. */
export const adminSignInUrl = () => `${API_BASE}/api/admin/sign-in${qs({ returnTo: `${window.location.origin}/admin` })}`;

/** Ends the Cloudflare Access session on the API's host. */
export const adminSignOutUrl = () => `${API_BASE}/cdn-cgi/access/logout`;
