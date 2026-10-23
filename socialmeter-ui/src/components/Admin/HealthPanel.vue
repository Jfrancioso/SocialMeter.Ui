<script setup>
import { computed, onMounted, ref } from "vue";
import { getGuardrails } from "../../api";
import { mediaLabel, parseUtc } from "../../utils/format";
import { platformName } from "../../utils/platforms";
import styles from "./HealthPanel.module.css";

// The admin page's "Health and spend" panel: the guardrails' state from GET /api/admin/guardrails. Read-only; every limit
// is an App Service setting (docs/OPERATIONS.md), and the alert emails cover the same signals when nobody is looking.
const status = ref(null);
const loading = ref(false);
const error = ref(null);

async function load() {
  loading.value = true;
  error.value = null;
  try {
    status.value = await getGuardrails();
  } catch (e) {
    error.value = e?.message ?? String(e);
  } finally {
    loading.value = false;
  }
}

onMounted(load);

const money = (n) => `$${Number(n).toFixed(2)}`;
const tokens = (n) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${Math.round(n / 1000)}k` : String(n));
const clock = (iso) => parseUtc(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
const dayTime = (iso) => parseUtc(iso).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" });
const shortDay = (day) => new Date(`${day}T00:00:00Z`).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
const serviceName = (s) => (s === "claude" ? "Claude" : s === "lexicon" ? "Word list (no Claude)" : platformName(s));

/** 0–100 for a bar; past 80% the bar turns amber, at the limit red. */
const share = (used, limit) => (limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0);
const tone = (pct) => (pct >= 100 ? styles.full : pct >= 80 ? styles.high : "");

const spendPct = computed(() => (status.value ? share(status.value.today.estimatedUsd, status.value.dailySpendLimitUsd) : 0));
const pullsPct = computed(() => (status.value ? share(status.value.today.livePulls, status.value.maxLivePullsPerDay) : 0));

function windowState(w) {
  if (w.open) return "Reading now";
  return parseUtc(w.startsAt).getTime() > Date.now() ? "Upcoming" : "Ended";
}
</script>

<template>
  <section :class="styles.panel">
    <div :class="styles.head">
      <h2 :class="styles.h2">Health and spend</h2>
      <button type="button" class="btn" :disabled="loading" @click="load">{{ loading ? "Loading…" : "Refresh" }}</button>
    </div>
    <p v-if="error" :class="styles.error">{{ error }}</p>

    <template v-if="status">
      <p :class="[styles.state, status.livePullsEnabled ? styles.on : styles.off]">
        <span :class="styles.dot" aria-hidden="true" />
        {{ status.livePullsEnabled ? "Live reads on" : "Live reads switched off (kill switch). Readers see cached scores." }}
      </p>

      <div :class="styles.meters">
        <div :class="styles.meter">
          <div :class="styles.meterHead">
            <span>Spend today <em>(estimated)</em></span>
            <strong>{{ money(status.today.estimatedUsd) }} <span :class="styles.of">of {{ money(status.dailySpendLimitUsd) }}</span></strong>
          </div>
          <div :class="styles.bar"><span :class="tone(spendPct)" :style="{ width: `${spendPct}%` }" /></div>
          <span :class="styles.detail">
            Claude {{ tokens(status.today.claudeInputTokens) }} in / {{ tokens(status.today.claudeOutputTokens) }} out ·
            X {{ status.today.xPostsRead }} posts, {{ status.today.xUsersRead }} profiles
          </span>
        </div>
        <div :class="styles.meter">
          <div :class="styles.meterHead">
            <span>Live pulls today</span>
            <strong>{{ status.today.livePulls }} <span :class="styles.of">of {{ status.maxLivePullsPerDay }}</span></strong>
          </div>
          <div :class="styles.bar"><span :class="tone(pullsPct)" :style="{ width: `${pullsPct}%` }" /></div>
          <span :class="styles.detail">At most {{ status.maxLivePullsPerHour }} an hour. Both limits reset at midnight UTC.</span>
        </div>
      </div>

      <div>
        <h3 :class="styles.h3">Services</h3>
        <ul :class="styles.list">
          <li v-for="s in status.services" :key="s.service" :class="styles.row">
            <span :class="[styles.dot, s.paused ? styles.dotBad : s.failuresInARow ? styles.dotWarn : styles.dotOk]" aria-hidden="true" />
            <strong>{{ serviceName(s.service) }}</strong>
            <span v-if="s.paused" :class="styles.bad">Paused until {{ clock(s.pausedUntil) }}</span>
            <span v-else-if="s.failuresInARow" :class="styles.warn">{{ s.failuresInARow }} failed in a row</span>
            <span v-else :class="styles.ok">OK</span>
            <span v-if="s.lastError" :class="styles.detail">Last error {{ s.lastError }}, {{ dayTime(s.lastErrorAt) }}</span>
          </li>
        </ul>
      </div>

      <div v-if="status.watchWindows.length">
        <h3 :class="styles.h3">Watch windows</h3>
        <ul :class="styles.list">
          <li v-for="w in status.watchWindows" :key="`${w.mediaType}-${w.tmdbId}-${w.startsAt}`" :class="styles.row">
            <span :class="[styles.dot, w.open ? styles.dotOk : styles.dotIdle]" aria-hidden="true" />
            <router-link :to="`/title/${w.mediaType}/${w.tmdbId}`" :class="styles.link">{{ w.label }}</router-link>
            <span :class="styles.detail">
              {{ mediaLabel(w.mediaType) }} · {{ dayTime(w.startsAt) }}–{{ clock(w.endsAt) }} · every {{ w.everyMinutes }} min · {{ windowState(w) }}
            </span>
          </li>
        </ul>
      </div>

      <div v-if="status.pastDays.length">
        <h3 :class="styles.h3">Last few days</h3>
        <table :class="styles.table">
          <thead><tr><th>Day (UTC)</th><th>Pulls</th><th>X posts</th><th>Est. spend</th></tr></thead>
          <tbody>
            <tr v-for="d in status.pastDays" :key="d.day">
              <td>{{ shortDay(d.day) }}</td><td>{{ d.livePulls }}</td><td>{{ d.xPostsRead }}</td><td>{{ money(d.estimatedUsd) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p :class="styles.note">
        Estimates count Claude tokens and X reads at list prices; the real bills are in the Anthropic and X consoles. Past
        the spend or pull limit, live reads stop until midnight UTC and you get an email.
      </p>
    </template>
  </section>
</template>
