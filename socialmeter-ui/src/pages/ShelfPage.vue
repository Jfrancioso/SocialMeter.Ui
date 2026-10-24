<script setup>
import { onBeforeUnmount, onMounted, ref } from "vue";
import { adminSignOutUrl, getShelf, getShelfCover, shelfSignInUrl } from "../api";
import { useShelfLink } from "../composables/useShelfLink";
import styles from "./ShelfPage.module.css";

// The private reading shelf: ten hand-picked spicy romance and romantasy series, each with its books in reading order.
// Signing in happens at Cloudflare, as for /admin; the API decides who gets in (admins and its list of readers) and a
// reader can open nothing else. The list and covers come from the API, so nothing private ships in the site's code.
const state = ref("loading");   // loading | signed-out | not-allowed | error | ready
const series = ref([]);
const covers = ref({});          // coverId -> object URL
const dev = import.meta.env.DEV;
// The nav's Shelf link follows what the API said here (see useShelfLink).
const { rememberShelf } = useShelfLink();

async function load() {
  state.value = "loading";
  try {
    series.value = await getShelf();
    state.value = "ready";
    rememberShelf(true);
    loadCovers();
  } catch (e) {
    // Signed out, Cloudflare answers with a redirect a cross-site fetch can't follow (status 0); the API says 401.
    state.value = e?.status === 403 ? "not-allowed" : e?.status === 401 || e?.status === 0 ? "signed-out" : "error";
    if (state.value === "not-allowed") rememberShelf(false);
  }
}

// Each cover is fetched with the sign-in and shown from memory; a cover that fails keeps its placeholder.
function loadCovers() {
  for (const s of series.value) {
    getShelfCover(s.coverId)
      .then((blob) => (covers.value = { ...covers.value, [s.coverId]: URL.createObjectURL(blob) }))
      .catch(() => {});
  }
}

const signIn = () => (window.location.href = shelfSignInUrl());
const signOut = () => (window.location.href = adminSignOutUrl());
const rank = (i) => String(i + 1).padStart(2, "0");
const initials = (name) => name.split(/\s+/).filter((w) => /^[A-Z]/.test(w)).slice(0, 2).map((w) => w[0]).join("");

onMounted(load);
onBeforeUnmount(() => Object.values(covers.value).forEach((url) => URL.revokeObjectURL(url)));
</script>

<template>
  <div :class="['container', styles.page]">
    <header :class="styles.head">
      <span :class="styles.eyebrow">Private shelf</span>
      <h1 :class="styles.title">Ten spicy series to read next</h1>
      <p :class="styles.sub">
        A hand-picked starting list, each series with its books in reading order. Chatterbub scores for books come later.
      </p>
    </header>

    <ol v-if="state === 'loading'" :class="styles.grid" aria-busy="true">
      <li v-for="i in 4" :key="i" :class="[styles.card, styles.skeletonCard, 'skeleton']" />
    </ol>

    <div v-else-if="state === 'signed-out'" :class="styles.panel">
      <strong>This shelf is private.</strong>
      <span>Sign in with the email it was shared with. Cloudflare sends a one-time code to that inbox.</span>
      <button type="button" class="btn btn-primary" @click="signIn">Sign in</button>
      <span v-if="dev" :class="styles.devNote">Local development: enter the admin key on /admin first.</span>
    </div>

    <div v-else-if="state === 'not-allowed'" :class="styles.panel">
      <strong>This email isn't on the shelf's list.</strong>
      <span>Sign out and sign in again with the email the shelf was shared with.</span>
      <button type="button" class="btn" @click="signOut">Sign out</button>
    </div>

    <div v-else-if="state === 'error'" :class="styles.panel">
      <strong>The shelf didn't load.</strong>
      <button type="button" class="btn" @click="load">Try again</button>
    </div>

    <ol v-else :class="styles.grid">
      <li v-for="(s, i) in series" :key="s.name" :class="styles.card">
        <div :class="styles.cover">
          <img v-if="covers[s.coverId]" :src="covers[s.coverId]" :alt="`${s.books[0]} cover`" />
          <span v-else :class="styles.coverEmpty" aria-hidden="true">{{ initials(s.name) }}</span>
        </div>
        <div :class="styles.body">
          <div :class="styles.top">
            <span :class="styles.rank" aria-hidden="true">{{ rank(i) }}</span>
            <span :class="styles.count">{{ s.books.length }} books</span>
          </div>
          <h2 :class="styles.name">{{ s.name }}</h2>
          <p :class="styles.author">{{ s.author }}</p>
          <p :class="styles.pitch">{{ s.pitch }}</p>
          <ol :class="styles.books">
            <li v-for="b in s.books" :key="b">{{ b }}</li>
          </ol>
        </div>
      </li>
    </ol>
  </div>
</template>
