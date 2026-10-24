import { joinNames, platformName } from "../utils/platforms";
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { getCrowd, getHighlights, getRatings, getScoreExplanation, getScoreHistory, getSocialMeter, getSocialPosts, getTitle } from "../api";
import { parseUtc } from "../utils/format";
import { setPageMeta, titleMeta } from "../utils/pageMeta";
import { useSnapshots } from "./useSnapshots";

/**
 * Everything the title page knows: the title, its ratings, the reading, the explanation, the history and the post feed,
 * plus the derived facts the sections display. The page and its section components only render what this returns.
 *
 * @param {() => { type: string, id: number }} route  reactive getter for the current title key
 */
export function useTitlePage(route) {
  const { set: cacheReading } = useSnapshots();

  // ---- state ----
  const title = ref(null);
  const ratings = ref(null);
  const social = ref(null);
  const explain = ref(null);
  const history = ref(null);
  const highlights = ref(null);
  const crowd = ref(null);
  const loading = ref(true);
  const notFound = ref(false);
  const error = ref(null);
  const refreshing = ref(false);
  const slowLoad = ref(false);

  const feed = ref([]);
  const feedPage = ref(1);
  const feedTotalPages = ref(0);
  const feedLoading = ref(false);
  const sentimentFilter = ref("");
  const platformFilter = ref("");

  let controller = null;
  let slowTimer = null;

  // ---- derived ----
  const meter = computed(() => social.value?.meter ?? null);
  const anyPosts = computed(() => (meter.value?.totalPosts ?? 0) > 0);
  const configuredSources = computed(() => (social.value?.sources ?? []).filter((s) => s.configured));

  // Locked titles are outside the tracked set: no pulls, no spend. A leftover reading may still exist from when the
  // title was tracked, and it is shown labelled as such rather than pretending it is current.
  const locked = computed(() => social.value != null && social.value.tracked === false);
  const trackedReason = computed(() => social.value?.trackedReason ?? title.value?.trackedReason ?? null);

  // The hero shows the trend verdict in three words; the "why this score" section has the test behind it.
  const trendFact = computed(() => {
    const t = history.value?.trend;
    if (!t) return null;
    if (t.direction === "rising") return { text: `Rising · +${t.slopePerDay}/day`, dir: "up" };
    if (t.direction === "falling") return { text: `Cooling · ${t.slopePerDay}/day`, dir: "down" };
    if (t.direction === "steady") return { text: `Steady over ${t.points} days`, dir: "flat" };
    return { text: `Trend after ${t.pointsNeeded} days`, dir: "flat" };
  });

  // The API refuses a second live pull inside its cool-down; say so on the button.
  const now = ref(Date.now());
  const clock = setInterval(() => (now.value = Date.now()), 30_000);

  const refreshWaitMinutes = computed(() => {
    const at = social.value?.nextRefreshAllowedAt;
    if (!at) return 0;
    const ms = parseUtc(at).getTime() - now.value;
    return ms > 0 ? Math.ceil(ms / 60_000) : 0;
  });

  // The sources have never been read for this title (no reading at all yet, as opposed to a reading with no posts).
  const neverRead = computed(() => social.value != null && !social.value.lastRefreshedAt);
  const readsPaused = computed(() => !!social.value?.readsPaused);

  // Why live reads are paused and for how long, from the API's own answer: the hourly budget hands reads back within
  // minutes, the daily limits reset at midnight UTC, and reads switched off by the operator come with no time at all.
  // One sentence, used by the score card, the posts panel and the Refresh hint.
  const pauseNote = computed(() => {
    if (!readsPaused.value) return "";
    const at = social.value?.nextRefreshAllowedAt;
    if (!at) return "Live reads are paused for now.";
    if (refreshWaitMinutes.value <= 15) return "Live reads are paused for a few minutes.";
    return `Live reads are paused until ${parseUtc(at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.`;
  });

  const refreshHint = computed(() => {
    if (!social.value || locked.value) return "";
    if (configuredSources.value.length === 0) return "Live updates aren’t available for this title right now.";
    if (readsPaused.value)
      return refreshWaitMinutes.value > 0 && refreshWaitMinutes.value <= 15 ? `${pauseNote.value} Try again in ${refreshWaitMinutes.value} min.` : pauseNote.value;
    if (refreshWaitMinutes.value > 0) return `Live pull available again in ${refreshWaitMinutes.value} min`;
    // Steam reviews only exist for games, so a movie or show page doesn't promise them.
    const names = configuredSources.value
      .filter((s) => s.platform !== "steam" || route().type === "game")
      .map((s) => platformName(s.platform));
    return `Pulls new posts from ${joinNames(names)}`;
  });

  // ---- loading ----
  async function load() {
    controller?.abort();
    controller = new AbortController();
    const { signal } = controller;
    const { type, id } = route();

    loading.value = true;
    notFound.value = false;
    error.value = null;
    title.value = null;
    ratings.value = null;
    social.value = null;
    explain.value = null;
    history.value = null;
    highlights.value = null;
    crowd.value = null;
    feed.value = [];
    feedPage.value = 1;
    sentimentFilter.value = "";
    platformFilter.value = "";

    try {
      title.value = await getTitle(type, id, { signal });
    } catch (e) {
      if (e?.name === "AbortError") return;
      if (e?.status === 404) notFound.value = true;
      else error.value = e?.message ?? String(e);
      loading.value = false;
      return;
    }
    loading.value = false;

    // The rest streams in behind the hero.
    getRatings(type, id, { signal })
      .then((r) => (ratings.value = r))
      .catch(() => (ratings.value = { ratings: [], criticsAverage: null }));

    loadSocial(false, signal);
  }

  // A first look at a tracked title pulls from the sources and reads every post, which takes a while; the card says so
  // after a couple of seconds rather than leaving a skeleton with no explanation.
  async function loadSocial(refresh, signal) {
    const { type, id } = route();
    if (refresh) refreshing.value = true;
    slowLoad.value = false;
    clearTimeout(slowTimer);
    slowTimer = setTimeout(() => (slowLoad.value = social.value == null || refresh), 2500);
    try {
      const data = await getSocialMeter(type, id, { refresh }, { signal });
      social.value = data;
      cacheReading(type, id, data.meter);
      loadExplanation(signal);
      loadHighlights(signal);
      loadCrowd(signal);
      await loadFeed(1, signal);
    } catch (e) {
      if (e?.name !== "AbortError") social.value = { meter: null, sources: [], error: e?.message ?? String(e) };
    } finally {
      refreshing.value = false;
      clearTimeout(slowTimer);
      slowLoad.value = false;
    }
  }

  // The breakdown and the daily line come from cached data only; they never trigger a pull.
  function loadExplanation(signal) {
    if (!(social.value?.meter?.totalPosts > 0)) return;
    const { type, id } = route();
    getScoreExplanation(type, id, { signal })
      .then((e) => (explain.value = e))
      .catch((e) => { if (e?.name !== "AbortError") explain.value = null; });
    getScoreHistory(type, id, { days: 30 }, { signal })
      .then((h) => (history.value = h))
      .catch((e) => { if (e?.name !== "AbortError") history.value = null; });
  }

  // "In their words" (cached data only). Not reloaded after an operator removes a post: the removed card keeps its Undo
  // button in place, and the next visit features the next post.
  function loadHighlights(signal) {
    if (!(social.value?.meter?.totalPosts > 0)) return;
    const { type, id } = route();
    getHighlights(type, id, { signal })
      .then((h) => (highlights.value = h))
      .catch((e) => { if (e?.name !== "AbortError") highlights.value = null; });
  }

  // "The crowd". The API says enabled=false for titles it doesn't pick (see CrowdShapeService), and any failure leaves it
  // null: either way the page renders exactly as it does without the section.
  function loadCrowd(signal) {
    if (!(social.value?.meter?.totalPosts > 0)) return;
    const { type, id } = route();
    getCrowd(type, id, { signal })
      .then((c) => (crowd.value = c?.enabled && c.dots?.length ? c : null))
      .catch((e) => { if (e?.name !== "AbortError") crowd.value = null; });
  }

  async function loadFeed(page, signal = controller?.signal) {
    const { type, id } = route();
    feedLoading.value = true;
    try {
      const data = await getSocialPosts(
        type,
        id,
        { sentiment: sentimentFilter.value || undefined, platform: platformFilter.value || undefined, page, pageSize: 12 },
        { signal }
      );
      feed.value = page === 1 ? data.items : [...feed.value, ...data.items];
      feedPage.value = data.page;
      feedTotalPages.value = data.totalPages;
    } catch (e) {
      if (e?.name !== "AbortError" && page === 1) feed.value = [];
    } finally {
      feedLoading.value = false;
    }
  }

  function setFilter(kind, value) {
    if (kind === "sentiment") sentimentFilter.value = sentimentFilter.value === value ? "" : value;
    else platformFilter.value = platformFilter.value === value ? "" : value;
    loadFeed(1);
  }

  const refresh = () => loadSocial(true, controller?.signal);

  // After an operator removes or restores a post: the API has already recomputed the reading from stored posts, so show
  // it and reload the breakdown and history (cached data only, never a pull).
  function applyModeration(result) {
    if (!social.value?.meter || !result?.meter) return;
    const { type, id } = route();
    social.value = { ...social.value, meter: result.meter };
    cacheReading(type, id, social.value.meter);
    loadExplanation(controller?.signal);
  }
  const loadMore = () => loadFeed(feedPage.value + 1);

  watch(route, load, { immediate: true });

  // The tab title and description say what the edge Worker put in the first HTML (search engines read both).
  watch([title, meter], ([t, m]) => {
    if (t) setPageMeta(titleMeta(route().type, t, m));
  });
  onBeforeUnmount(() => {
    controller?.abort();
    clearInterval(clock);
    clearTimeout(slowTimer);
  });

  return {
    title, ratings, social, explain, history, highlights, crowd, loading, notFound, error, refreshing, slowLoad,
    feed, feedPage, feedTotalPages, feedLoading, sentimentFilter, platformFilter,
    meter, anyPosts, configuredSources, locked, trackedReason, trendFact, refreshWaitMinutes, refreshHint, neverRead, pauseNote,
    refresh, loadMore, setFilter, applyModeration
  };
}
