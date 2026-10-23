<script setup>
import { computed, onMounted, ref } from "vue";
import { adminSignInUrl, getModerationLog, restorePost, setDevAdminKey } from "../api";
import HealthPanel from "../components/Admin/HealthPanel.vue";
import { useAdmin } from "../composables/useAdmin";
import { mediaLabel, parseUtc, timeAgo } from "../utils/format";
import { reasonLabel } from "../utils/moderation";
import { platformName } from "../utils/platforms";
import styles from "./AdminPage.module.css";

// The operator's page. Signing in happens at Cloudflare (production) or with the admin key (local development); the
// API decides who gets in, and this page only shows what it is allowed to see.
const { admin, check, signOut } = useAdmin();
const dev = import.meta.env.DEV;
const devKey = ref("");

const log = ref([]);
const logLoading = ref(false);
const logError = ref(null);
const busy = ref(new Set());

const signedIn = computed(() => !!admin.actor);

async function loadLog() {
  logLoading.value = true;
  logError.value = null;
  try {
    log.value = await getModerationLog(100);
  } catch (e) {
    logError.value = e?.message ?? String(e);
  } finally {
    logLoading.value = false;
  }
}

async function start() {
  document.title = "Admin · Chatterbub";
  if (await check({ force: true })) await loadLog();
}

function signIn() {
  window.location.href = adminSignInUrl();
}

async function useDevKey() {
  setDevAdminKey(devKey.value.trim());
  devKey.value = "";
  await start();
}

async function restore(entry) {
  busy.value = new Set([...busy.value, entry.id]);
  try {
    await restorePost(entry.postId);
    await loadLog();
  } catch (e) {
    logError.value = e?.message ?? String(e);
  } finally {
    const next = new Set(busy.value);
    next.delete(entry.id);
    busy.value = next;
  }
}

onMounted(start);
</script>

<template>
  <div :class="styles.page">
    <div class="container">
      <header :class="styles.head">
        <span :class="styles.eyebrow">Admin</span>
        <h1 :class="styles.title">Command center</h1>
        <p v-if="signedIn" :class="styles.who">
          Signed in as <strong>{{ admin.actor }}</strong>
          <button type="button" :class="styles.linkButton" @click="signOut">Sign out</button>
        </p>
      </header>

      <p v-if="admin.checking && !admin.checked" :class="styles.muted">Checking your sign-in…</p>

      <section v-else-if="!signedIn" :class="styles.panel">
        <h2 :class="styles.h2">Sign in</h2>
        <p v-if="admin.error" :class="styles.error">{{ admin.error }}</p>
        <template v-if="dev">
          <p :class="styles.muted">Local development: paste the admin key from your user secrets. It stays in this tab only.</p>
          <form :class="styles.keyForm" @submit.prevent="useDevKey">
            <input v-model="devKey" type="password" autocomplete="off" placeholder="Admin key" :class="styles.input" />
            <button type="submit" class="btn btn-primary" :disabled="!devKey.trim()">Sign in</button>
          </form>
        </template>
        <template v-else>
          <p :class="styles.muted">Cloudflare will email you a one-time code, then bring you back here.</p>
          <button type="button" class="btn btn-primary" @click="signIn">Sign in</button>
        </template>
      </section>

      <template v-else>
        <HealthPanel />

        <section :class="styles.panel">
          <h2 :class="styles.h2">Removing a post</h2>
          <p :class="styles.muted">
            Turn on <strong>Remove buttons</strong> in the admin bar at the top, then open any title page: each post gets a
            Remove button. Pick a reason and the post leaves the feed and the score at once, with no Claude cost. The switch
            is off whenever you open the site again. Every removal is listed below and can be undone.
          </p>
        </section>

        <section :class="styles.panel">
          <div :class="styles.logHead">
            <h2 :class="styles.h2">Moderation log</h2>
            <button type="button" class="btn" :disabled="logLoading" @click="loadLog">{{ logLoading ? "Loading…" : "Refresh" }}</button>
          </div>
          <p v-if="logError" :class="styles.error">{{ logError }}</p>
          <p v-if="!logLoading && !log.length && !logError" :class="styles.muted">Nothing removed yet.</p>

          <ol :class="styles.log">
            <li v-for="e in log" :key="e.id" :class="styles.entry">
              <div :class="styles.entryHead">
                <span :class="[styles.badge, e.action === 'hide' ? styles.badgeHide : styles.badgeRestore]">
                  {{ e.action === "hide" ? "Removed" : "Restored" }}
                </span>
                <span v-if="e.reason" :class="styles.reason">{{ reasonLabel(e.reason) }}</span>
                <router-link :to="`/title/${e.mediaType}/${e.tmdbId}`" :class="styles.titleLink">
                  {{ e.titleName || `${mediaLabel(e.mediaType)} ${e.tmdbId}` }}
                </router-link>
                <span :class="styles.when" :title="parseUtc(e.at).toLocaleString()">{{ timeAgo(e.at) }}</span>
              </div>
              <p v-if="e.postGone" :class="styles.muted">The post has since been deleted where it was published.</p>
              <p v-else :class="styles.excerpt">
                <span :class="styles.author">{{ platformName(e.platform) }} · {{ e.author }}</span>
                {{ e.excerpt }}
              </p>
              <div :class="styles.entryFoot">
                <span :class="styles.muted">by {{ e.actor }}</span>
                <a v-if="e.sourceUrl" :href="e.sourceUrl" target="_blank" rel="noopener" :class="styles.titleLink">Open post ↗</a>
                <button v-if="e.action === 'hide' && e.currentlyHidden" type="button" class="btn" :disabled="busy.has(e.id)" @click="restore(e)">
                  {{ busy.has(e.id) ? "Restoring…" : "Restore" }}
                </button>
              </div>
            </li>
          </ol>
        </section>
      </template>
    </div>
  </div>
</template>
