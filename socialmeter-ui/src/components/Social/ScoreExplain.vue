<script setup>
import { computed, ref } from "vue";
import { timeAgo } from "../../utils/format";
import TrendLine from "../Meter/TrendLine.vue";
import ShareBar from "../Meter/ShareBar.vue";
import PlatformIcon from "./PlatformIcon.vue";
import styles from "./ScoreExplain.module.css";

// The numbers behind a reading: the daily line with its margin band, the effective-post and interval figures,
// the weight shares, and the posts that pull hardest. Everything here is reproducible from the method page.
const props = defineProps({
  explain: { type: Object, default: null },
  history: { type: Object, default: null },
  shielded: { type: Boolean, default: true }
});

const stats = computed(() => props.explain?.stats ?? null);

const trend = computed(() => props.history?.trend ?? null);
const trendText = computed(() => {
  const t = trend.value;
  if (!t) return null;
  const p = t.pValue < 0.001 ? "p < 0.001" : `p = ${t.pValue.toFixed(2)}`;
  if (t.direction === "rising") return { text: `Rising · about +${t.slopePerDay} a day over ${t.points} days`, sub: `Mann-Kendall, ${p}`, dir: "up" };
  if (t.direction === "falling") return { text: `Cooling · about ${t.slopePerDay} a day over ${t.points} days`, sub: `Mann-Kendall, ${p}`, dir: "down" };
  if (t.direction === "steady") return { text: `Steady · no significant trend over ${t.points} days`, sub: `Mann-Kendall, ${p}`, dir: "flat" };
  return { text: `Trend after ${t.pointsNeeded} daily readings`, sub: `${t.points} so far`, dir: "none" };
});

const anyRebuilt = computed(() => (props.history?.points ?? []).some((p) => p.reconstructed));

const sentimentShares = computed(() => {
  const s = props.explain?.sentimentWeight;
  if (!s) return [];
  return [
    { key: "pos", label: "Positive", value: s.positive, color: "var(--pos)" },
    { key: "neu", label: "Neutral", value: s.neutral, color: "var(--neu)" },
    { key: "neg", label: "Negative", value: s.negative, color: "var(--neg)" }
  ];
});

const substanceLabel = { bare: "Bare reaction", some: "Some detail", detailed: "Specific" };
const substanceHint = {
  bare: "A verdict with nothing behind it: “10/10”, “trash”, “peak”",
  some: "An opinion with one general reason: “great visuals”, “too long”",
  detailed: "Names scenes, characters, mechanics, or makes an argument"
};
const substanceShares = computed(() =>
  (props.explain?.substanceMix ?? []).map((m) => ({
    key: m.level,
    label: `${substanceLabel[m.level] ?? m.level} (${m.posts})`,
    value: m.weightShare,
    color: m.level === "detailed" ? "var(--accent)" : m.level === "some" ? "rgba(255, 176, 0, 0.55)" : "rgba(255, 255, 255, 0.22)",
    hint: substanceHint[m.level]
  }))
);

const platformName = { x: "X", reddit: "Reddit", steam: "Steam" };
const handle = (d) => (d.platform === "x" ? `@${d.author}` : d.platform === "reddit" ? `u/${d.author}` : d.author);
const signed = (n) => (n > 0 ? `+${n}` : `${n}`);

const filteredText = computed(() => {
  const f = props.explain?.filtered ?? [];
  if (!f.length) return "";
  return f.map((r) => `${r.reason} (${r.count})`).join(" · ");
});

// Driver excerpts respect the spoiler shield; each row reveals on its own.
const revealed = ref(new Set());
function reveal(id) {
  revealed.value = new Set([...revealed.value, id]);
}
const covered = (id) => props.shielded && !revealed.value.has(id);
</script>

<template>
  <div :class="styles.grid">
    <!-- Trend -->
    <div :class="[styles.panel, styles.trendPanel]">
      <h3 :class="styles.h3">Last {{ history?.trend?.windowDays ?? 30 }} days</h3>
      <TrendLine v-if="history" :points="history.points" />
      <div v-else :class="[styles.lineSkeleton, 'skeleton']" />
      <p v-if="trendText" :class="[styles.verdict, styles[`dir-${trendText.dir}`]]">
        <span>{{ trendText.text }}</span>
        <small>{{ trendText.sub }}</small>
      </p>
      <p :class="styles.fine">
        Dots are daily readings, the shaded band is each day’s 95% range, the line is smoothed.
        <template v-if="anyRebuilt"> Hollow dots were rebuilt from post dates rather than observed on the day.</template>
      </p>
    </div>

    <!-- Numbers -->
    <div :class="styles.panel">
      <h3 :class="styles.h3">The numbers</h3>
      <dl v-if="stats" :class="styles.facts">
        <div :class="styles.factBig">
          <dt>Reading</dt>
          <dd>{{ explain.score }} <small>±{{ stats.margin }}</small></dd>
        </div>
        <div>
          <dt title="95% interval: the true crowd reading is very likely in here">95% range</dt>
          <dd>{{ stats.lower }}–{{ stats.upper }}</dd>
        </div>
        <div>
          <dt title="Weighted mean of the posts before the pull toward neutral">Raw mean</dt>
          <dd>{{ stats.rawScore }}</dd>
        </div>
        <div>
          <dt title="How far the Bayesian prior moved the raw mean toward 50">Pull to neutral</dt>
          <dd>{{ signed(stats.priorPull) }}</dd>
        </div>
        <div>
          <dt title="Kish effective sample size × average trust-and-substance credit">Effective posts</dt>
          <dd>{{ stats.effectivePosts }} <small>of {{ explain.totalPosts }}</small></dd>
        </div>
        <div>
          <dt title="Share of the reading that comes from posts rather than the prior">Confidence</dt>
          <dd>{{ Math.round(explain.confidence * 100) }}% <small>{{ explain.confidenceLabel }}</small></dd>
        </div>
      </dl>
      <div v-else :class="[styles.factsSkeleton, 'skeleton']" />

      <template v-if="explain">
        <h3 :class="[styles.h3, styles.h3Gap]">Weight by sentiment</h3>
        <ShareBar :segments="sentimentShares" />
        <h3 :class="[styles.h3, styles.h3Gap]">Weight by substance</h3>
        <ShareBar :segments="substanceShares" />
      </template>
    </div>

    <!-- Drivers and notes -->
    <div v-if="explain" :class="[styles.panel, styles.wide]">
      <div :class="styles.driversHead">
        <h3 :class="styles.h3">What pulls hardest</h3>
        <span :class="styles.driversSub">Each post’s share of the total weight. No single post should own the number.</span>
      </div>

      <ol :class="styles.drivers">
        <li v-for="d in explain.drivers" :key="d.id" :class="[styles.driver, styles[`s-${d.sentiment}`]]">
          <span :class="styles.share" :style="{ '--w': `${Math.min(100, d.weightShare * 2)}%` }">
            <strong>{{ d.weightShare < 0.1 ? "<0.1" : d.weightShare }}%</strong>
          </span>
          <div :class="styles.driverBody">
            <div :class="styles.driverWho">
              <PlatformIcon :platform="d.platform" :size="16" />
              <span :class="styles.driverAuthor">{{ handle(d) }}</span>
              <span :class="styles.driverWhen">{{ timeAgo(d.createdAt) }}</span>
            </div>
            <p :class="[styles.excerpt, covered(d.id) && styles.excerptCovered]" @click="covered(d.id) && reveal(d.id)">
              <span :aria-hidden="covered(d.id)">{{ d.excerpt }}</span>
              <span v-if="covered(d.id)" :class="styles.excerptCover">Potential spoiler · tap to reveal</span>
            </p>
            <div :class="styles.chips">
              <span :class="[styles.chip, styles[`chip-${d.sentiment}`]]">read as {{ d.sentiment }} {{ signed(d.sentimentScore) }}</span>
              <span :class="styles.chip" :title="substanceHint[d.substanceLevel]">{{ substanceLabel[d.substanceLevel] ?? d.substanceLevel }}</span>
              <span v-if="d.trustLevel === 'reduced'" :class="[styles.chip, styles.chipMuted]" title="The trust policy discounted this author">reduced weight</span>
              <a v-if="d.sourceUrl" :href="d.sourceUrl" target="_blank" rel="noopener" :class="styles.driverLink">{{ platformName[d.platform] ?? d.platform }} ↗</a>
            </div>
          </div>
        </li>
      </ol>

      <ul v-if="explain.notes?.length" :class="styles.notes">
        <li v-for="(n, i) in explain.notes" :key="i">{{ n }}</li>
      </ul>

      <p v-if="filteredText" :class="styles.fine">
        <strong>{{ explain.filteredPosts }} set aside:</strong> {{ filteredText }}.
      </p>
    </div>
  </div>
</template>
