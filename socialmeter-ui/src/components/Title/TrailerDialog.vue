<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import OutboundLink from "../OutboundLink.vue";
import styles from "./TrailerDialog.module.css";

// Nothing loads until the reader presses Play: YouTube's player (privacy-enhanced, youtube-nocookie.com) for movies and
// shows, Steam's own stream for games. Steam serves HLS only; Safari plays it natively, other browsers get hls.js,
// fetched on demand so no one else downloads it.
const props = defineProps({
  open: { type: Boolean, default: false },
  /** { provider: "youtube" | "steam", name, youTubeId, streamUrl, thumbnail } */
  trailer: { type: Object, default: null },
  titleName: { type: String, default: "" },
  /** Steam app id, for the "Watch on Steam" fallback. */
  steamAppId: { type: Number, default: null }
});
const emit = defineEmits(["close"]);

const video = ref(null);
const closeBtn = ref(null);
const failed = ref(false);
let hls = null;

const isYouTube = computed(() => props.trailer?.provider === "youtube");
const youTubeSrc = computed(() => `https://www.youtube-nocookie.com/embed/${props.trailer.youTubeId}?autoplay=1&rel=0&playsinline=1`);
const fallbackUrl = computed(() =>
  isYouTube.value ? `https://www.youtube.com/watch?v=${props.trailer.youTubeId}` : `https://store.steampowered.com/app/${props.steamAppId}/`
);

async function startSteam() {
  await nextTick();
  const el = video.value;
  if (!el) return;

  if (el.canPlayType("application/vnd.apple.mpegurl")) {
    el.src = props.trailer.streamUrl;
    el.play().catch(() => {});
    return;
  }

  try {
    const { default: Hls } = await import("hls.js/light");
    if (!Hls.isSupported()) {
      failed.value = true;
      return;
    }
    // No worker: it would need a looser security policy, and one video plays fine on the main thread.
    hls = new Hls({ enableWorker: false });
    hls.on(Hls.Events.ERROR, (_, data) => {
      if (data.fatal) failed.value = true;
    });
    hls.on(Hls.Events.MANIFEST_PARSED, () => el.play().catch(() => {}));
    hls.loadSource(props.trailer.streamUrl);
    hls.attachMedia(el);
  } catch {
    failed.value = true;
  }
}

function stop() {
  hls?.destroy();
  hls = null;
  if (video.value) {
    video.value.pause();
    video.value.removeAttribute("src");
    video.value.load();
  }
}

function onKey(e) {
  if (e.key === "Escape") emit("close");
}

watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen) {
      failed.value = false;
      document.addEventListener("keydown", onKey);
      document.documentElement.style.overflow = "hidden";
      if (!isYouTube.value) startSteam();
      await nextTick();
      closeBtn.value?.focus();
    } else {
      document.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
      stop();
    }
  }
);

onBeforeUnmount(() => {
  document.removeEventListener("keydown", onKey);
  document.documentElement.style.overflow = "";
  stop();
});
</script>

<template>
  <Teleport to="body">
    <div v-if="open && trailer" :class="styles.backdrop" role="dialog" aria-modal="true" :aria-label="`${titleName} trailer`" @click.self="emit('close')">
      <div :class="styles.dialog">
        <div :class="styles.head">
          <span :class="styles.name">{{ titleName }} · {{ trailer.name }}</span>
          <button ref="closeBtn" type="button" :class="styles.close" aria-label="Close trailer" @click="emit('close')">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </div>

        <div :class="styles.frame">
          <iframe
            v-if="isYouTube"
            :src="youTubeSrc"
            :title="`${titleName}: ${trailer.name}`"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowfullscreen
            referrerpolicy="strict-origin-when-cross-origin"
          />
          <video v-else ref="video" controls playsinline :poster="trailer.thumbnail || undefined" />
          <div v-if="failed" :class="styles.failed">
            This trailer can't play here.
            <OutboundLink :href="fallbackUrl" kind="trailer">Watch on Steam ↗</OutboundLink>
          </div>
        </div>

        <div :class="styles.foot">
          <span :class="styles.source">{{ isYouTube ? "Playing in YouTube's privacy-enhanced player" : "Streaming from Steam" }}</span>
          <OutboundLink :href="fallbackUrl" kind="trailer" :class="styles.out">{{ isYouTube ? "Watch on YouTube ↗" : "Watch on Steam ↗" }}</OutboundLink>
        </div>
      </div>
    </div>
  </Teleport>
</template>
