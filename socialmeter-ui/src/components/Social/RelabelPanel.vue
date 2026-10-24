<script setup>
import { computed, nextTick, onMounted, ref } from "vue";
import { relabelPost } from "../../api";
import { NOTE_MAX, NOTE_MIN, SENTIMENT_LABELS } from "../../utils/moderation";
import styles from "./RelabelPanel.module.css";

// Admin only (PostCard shows it): correct how a post was read, and say why. The reason is kept with what Claude said, as
// the record of its mistakes (worked examples and its accuracy test); it is never shown to visitors.
const props = defineProps({
  postId: { type: Number, required: true },
  current: { type: String, required: true },
  titleName: { type: String, default: "" }
});
const emit = defineEmits(["done", "cancel"]);

const choice = ref(null);
const note = ref("");
const working = ref(false);
const error = ref(null);
const panel = ref(null);

const options = computed(() => SENTIMENT_LABELS.map((s) => ({ ...s, current: s.value === props.current })));
const ready = computed(() => choice.value && note.value.trim().length >= NOTE_MIN && !working.value);

async function save() {
  if (!ready.value) return;
  working.value = true;
  error.value = null;
  try {
    emit("done", await relabelPost(props.postId, choice.value, note.value.trim(), props.titleName));
  } catch (e) {
    error.value = e?.message ?? String(e);
  } finally {
    working.value = false;
  }
}

onMounted(async () => {
  await nextTick();
  panel.value?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  panel.value?.focus({ preventScroll: true });
});
</script>

<template>
  <div ref="panel" :class="styles.panel" role="group" aria-label="Correct how this post was read" tabindex="-1" @keydown.esc="emit('cancel')">
    <p :class="styles.title">How should this post be read?</p>
    <div :class="styles.choices">
      <button
        v-for="o in options"
        :key="o.value"
        type="button"
        :class="[styles.choice, styles[`choice-${o.value}`], choice === o.value && styles.chosen]"
        :disabled="o.current || working"
        :aria-pressed="choice === o.value"
        @click="choice = o.value"
      >
        {{ o.label }}<span v-if="o.current" :class="styles.now"> · now</span>
      </button>
    </div>
    <label :class="styles.noteLabel">
      Why? <span :class="styles.hint">Kept with what Claude said, to check and improve how it reads posts. Admins only.</span>
      <textarea
        v-model="note"
        :class="styles.note"
        rows="2"
        :maxlength="NOTE_MAX"
        placeholder="e.g. sarcasm, it's praise · quotes a clip about another movie"
      />
    </label>
    <div :class="styles.foot">
      <button type="button" :class="styles.cancel" :disabled="working" @click="emit('cancel')">Cancel</button>
      <button type="button" :class="styles.save" :disabled="!ready" @click="save">{{ working ? "Saving…" : "Save" }}</button>
    </div>
    <p v-if="error" :class="styles.error">{{ error }}</p>
  </div>
</template>
