<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { draftOutboxNow, getOutbox, postOutboxItem, skipOutboxItem } from "../../api";
import { timeAgo } from "../../utils/format";
import { safeHref } from "../../utils/outbound";
import styles from "./OutboxPanel.module.css";

// The brand account's Outbox: the site drafts (one a day, plus live events), the admin posts or skips each one. The
// post shows exactly as it would go out now (the API fills in current numbers), with the Bluesky posts it would quote.
// Posting takes two taps, so a stray tap on a phone can't publish anything. X is by hand: Copy for X.
const outbox = ref(null);
const loading = ref(false);
const error = ref(null);
const busy = ref(new Set());
const notes = ref({});        // id -> a short result line under the card
const arming = ref(null);     // id waiting for its second "Post" tap
let armTimer = null;

const KINDS = { split: "Split crowd", "talked-about": "Most talked about", event: "Live event" };

const atLimit = computed(() => outbox.value && outbox.value.postedToday >= outbox.value.maxPerDay);
const postBlocked = computed(() => {
  const o = outbox.value;
  if (!o) return "";
  if (!o.enabled) return "Posting is turned off (Posting__Enabled).";
  if (!o.canPost) return "Add the brand's Bluesky app password in Azure to post (Posting__Bluesky__…).";
  if (atLimit.value) return `Today's limit of ${o.maxPerDay} posts is reached.`;
  return "";
});

async function load() {
  loading.value = true;
  error.value = null;
  try {
    outbox.value = await getOutbox();
  } catch (e) {
    error.value = e?.message ?? "The outbox didn't load.";
  } finally {
    loading.value = false;
  }
}

async function draftNow() {
  loading.value = true;
  error.value = null;
  try {
    const before = outbox.value?.items?.length ?? 0;
    outbox.value = await draftOutboxNow();
    if ((outbox.value?.items?.length ?? 0) === before) error.value = "Nothing new to draft: every top title was drafted in the last week.";
  } catch (e) {
    error.value = e?.message ?? "Couldn't draft.";
  } finally {
    loading.value = false;
  }
}

function replace(entry) {
  if (!outbox.value || !entry) return;
  outbox.value = { ...outbox.value, items: outbox.value.items.map((i) => (i.id === entry.id ? entry : i)) };
}

async function act(item, action) {
  busy.value = new Set(busy.value).add(item.id);
  try {
    const result = action === "post" ? await postOutboxItem(item.id) : await skipOutboxItem(item.id);
    replace(result.entry);
    notes.value = { ...notes.value, [item.id]: result.ok ? (action === "post" ? "Posted to Bluesky." : "Skipped.") : result.error };
    if (result.ok && action === "post") outbox.value = { ...outbox.value, postedToday: outbox.value.postedToday + 1 };
  } catch (e) {
    notes.value = { ...notes.value, [item.id]: e?.message ?? "That didn't work." };
  } finally {
    const next = new Set(busy.value);
    next.delete(item.id);
    busy.value = next;
  }
}

// First tap arms the button for a few seconds; the second posts.
function tapPost(item) {
  if (arming.value === item.id) {
    arming.value = null;
    clearTimeout(armTimer);
    act(item, "post");
    return;
  }
  arming.value = item.id;
  clearTimeout(armTimer);
  armTimer = setTimeout(() => (arming.value = null), 4000);
}

async function copyForX(item) {
  let ok = false;
  try {
    await navigator.clipboard.writeText(item.text);
    ok = true;
  } catch {
    // Clipboard refused (older browsers, some app views): the text is selectable on the card instead.
  }
  notes.value = { ...notes.value, [item.id]: ok ? "Copied. Paste it into X." : "Couldn't copy: select the text above instead." };
}

onMounted(load);
onBeforeUnmount(() => clearTimeout(armTimer));
</script>

<template>
  <section :class="styles.panel">
    <div :class="styles.head">
      <h2 :class="styles.h2">Outbox</h2>
      <div :class="styles.headActions">
        <button type="button" class="btn" :disabled="loading" @click="draftNow">Draft one now</button>
        <button type="button" class="btn" :disabled="loading" @click="load">{{ loading ? "Loading…" : "Refresh" }}</button>
      </div>
    </div>

    <p :class="styles.muted">
      The site drafts one post a day (plus one per live event) for the brand's Bluesky. Nothing goes out until you tap Post.
      <template v-if="outbox?.account"> Posts as <strong>@{{ outbox.account }}</strong> · {{ outbox.postedToday }} of {{ outbox.maxPerDay }} today.</template>
    </p>
    <p v-if="postBlocked" :class="styles.warn">{{ postBlocked }}</p>
    <p v-if="error" :class="styles.error">{{ error }}</p>
    <p v-if="outbox && !outbox.items.length" :class="styles.muted">No drafts yet. Tap "Draft one now", or the next one comes at 10 am Eastern.</p>

    <article v-for="item in outbox?.items ?? []" :key="item.id" :class="[styles.item, item.status !== 'draft' && styles.itemDone]">
      <div :class="styles.meta">
        <span :class="[styles.kind, styles[`kind-${item.kind}`]]">{{ KINDS[item.kind] ?? item.kind }}</span>
        <span :class="styles.status">{{ item.status }}</span>
        <span :class="styles.when">{{ timeAgo(item.decidedAt ?? item.createdAt) }}<template v-if="item.decidedBy"> · {{ item.decidedBy }}</template></span>
      </div>

      <!-- The post as it would read on Bluesky. -->
      <div :class="styles.post">
        <p :class="styles.text">{{ item.text || "This title has no reading to post right now." }}</p>
        <div v-if="item.imageUrl" :class="styles.card">
          <img :src="item.imageUrl" alt="" loading="lazy" />
          <span>{{ item.url.replace("https://", "") }}</span>
        </div>
      </div>

      <div :class="styles.replies">
        <div v-for="side in [{ key: 'for', lead: 'The case for:', q: item.for }, { key: 'against', lead: 'The case against:', q: item.against }]" :key="side.key" :class="[styles.reply, styles[`reply-${side.key}`]]">
          <span :class="styles.lead">↳ {{ side.lead }}</span>
          <template v-if="side.q">
            <blockquote :class="styles.quote">
              <span :class="styles.author">@{{ side.q.author }}</span>
              {{ side.q.content }}
            </blockquote>
            <a v-if="safeHref(side.q.sourceUrl)" :href="safeHref(side.q.sourceUrl)" target="_blank" rel="noopener" :class="styles.link">Open on Bluesky ↗</a>
          </template>
          <span v-else :class="styles.muted">No Bluesky post qualifies on this side, so this reply is left out.</span>
        </div>
      </div>

      <p v-if="item.error && item.status === 'draft'" :class="styles.error">Last try: {{ item.error }}</p>
      <p v-if="notes[item.id]" :class="styles.note">{{ notes[item.id] }}</p>

      <div v-if="item.status === 'draft'" :class="styles.actions">
        <button
          type="button"
          :class="['btn', arming === item.id ? styles.armed : 'btn-primary']"
          :disabled="!!postBlocked || busy.has(item.id) || !item.text"
          @click="tapPost(item)"
        >
          {{ busy.has(item.id) ? "Posting…" : arming === item.id ? "Tap again to post" : "Post to Bluesky" }}
        </button>
        <button type="button" class="btn" :disabled="busy.has(item.id)" @click="act(item, 'skip')">Skip</button>
        <button type="button" class="btn" :disabled="!item.text" @click="copyForX(item)">Copy for X</button>
      </div>
      <div v-else-if="item.status === 'posted'" :class="styles.actions">
        <a v-if="safeHref(item.postedWebUrl)" :href="safeHref(item.postedWebUrl)" target="_blank" rel="noopener" class="btn">View on Bluesky ↗</a>
        <button type="button" class="btn" @click="copyForX(item)">Copy for X</button>
      </div>
    </article>
  </section>
</template>
