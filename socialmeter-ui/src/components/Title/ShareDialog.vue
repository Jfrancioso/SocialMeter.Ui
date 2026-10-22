<script setup>
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { meterBand } from "../../utils/meter";
import { tmdbImage } from "../../utils/tmdbImage";
import { renderShareCard, shareCaption } from "../../utils/shareCard";
import styles from "./ShareDialog.module.css";

// Draws the link card for this reading, shows it, and hands it over three ways: image to clipboard, caption to
// clipboard, PNG download. Everything happens in the browser from data the page already has.
const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: Object, required: true },
  meter: { type: Object, required: true },
  ratings: { type: Object, default: null }
});
const emit = defineEmits(["close"]);

const previewUrl = ref("");
const captionBox = ref(null);
const blob = ref(null);
const rendering = ref(false);
const error = ref("");
const status = ref("");
let objectUrl = null;

const pageUrl = computed(() => `${window.location.origin}/title/${props.title.mediaType}/${props.title.tmdbId}`);
const caption = computed(() => shareCaption({ title: props.title, meter: props.meter, ratings: props.ratings, url: pageUrl.value }));
const canCopyImage = typeof ClipboardItem !== "undefined" && !!navigator.clipboard?.write;

async function render() {
  rendering.value = true;
  error.value = "";
  status.value = "";
  try {
    // A larger size than the page's own poster <img> uses: the browser caches that one without CORS, and a canvas
    // read of the same URL would then fail. A different URL gets its own, CORS-enabled fetch.
    const poster = tmdbImage(props.title.posterPath, "w780") || props.title.headerImage || null;
    blob.value = await renderShareCard({
      title: props.title,
      meter: props.meter,
      ratings: props.ratings,
      posterUrl: poster,
      url: pageUrl.value,
      bandKey: meterBand(props.meter.score, props.meter.totalPosts).key
    });
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = URL.createObjectURL(blob.value);
    previewUrl.value = objectUrl;
  } catch (e) {
    error.value = e?.message ?? "Could not render the card.";
  } finally {
    rendering.value = false;
  }
}

async function copyImage() {
  if (!blob.value) return;
  try {
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob.value })]);
    status.value = "Image copied. Paste it into your post.";
  } catch {
    status.value = "This browser won't copy images. Use Download instead.";
  }
}

async function copyCaption() {
  try {
    await navigator.clipboard.writeText(caption.value);
    status.value = "Caption copied.";
  } catch {
    // Some browsers refuse clipboard writes; the caption is already in the box, so select it and let Ctrl+C finish the job.
    captionBox.value?.focus();
    captionBox.value?.select();
    status.value = "Couldn't copy automatically. The caption is selected: press Ctrl+C (Cmd+C on a Mac).";
  }
}

function download() {
  if (!blob.value) return;
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = `socialmeter-${props.title.mediaType}-${props.title.tmdbId}.png`;
  a.click();
  status.value = "Downloaded.";
}

function onKey(e) {
  if (e.key === "Escape") emit("close");
}

watch(() => props.open, (o) => {
  if (o) { render(); window.addEventListener("keydown", onKey); }
  else window.removeEventListener("keydown", onKey);
}, { immediate: true });

onBeforeUnmount(() => {
  window.removeEventListener("keydown", onKey);
  if (objectUrl) URL.revokeObjectURL(objectUrl);
});
</script>

<template>
  <!-- Teleported: inside the reading card, its backdrop-filter would become the containing block and pin the dialog to the card. -->
  <Teleport to="body">
  <div v-if="open" :class="styles.backdrop" @click.self="emit('close')">
    <div :class="styles.dialog" role="dialog" aria-modal="true" aria-labelledby="share-title">
      <div :class="styles.head">
        <h2 id="share-title" :class="styles.h2">Share this reading</h2>
        <button type="button" :class="styles.close" aria-label="Close" @click="emit('close')">✕</button>
      </div>

      <div :class="styles.preview">
        <img v-if="previewUrl && !rendering" :src="previewUrl" alt="Share card preview" :class="styles.img" />
        <div v-else-if="error" :class="styles.error">{{ error }}</div>
        <div v-else :class="[styles.skeleton, 'skeleton']" />
      </div>

      <div :class="styles.actions">
        <button v-if="canCopyImage" type="button" class="btn btn-primary" :disabled="!blob" @click="copyImage">Copy image</button>
        <button type="button" class="btn" :disabled="!blob" @click="download">Download PNG</button>
        <button type="button" class="btn" @click="copyCaption">Copy caption</button>
      </div>
      <p v-if="status" :class="styles.status" role="status">{{ status }}</p>

      <textarea ref="captionBox" :class="styles.caption" readonly rows="3" :value="caption" aria-label="Caption" @focus="$event.target.select()" />
      <p :class="styles.hint">Paste the image into X, Reddit, Discord or Steam, then the caption. 1200 × 630, the shape of a link preview.</p>
    </div>
  </div>
  </Teleport>
</template>
