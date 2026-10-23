<script setup>
import { computed } from "vue";
import { outboundHref, trackOutbound } from "../utils/outbound";

// A link that leaves the site, through the one door in utils/outbound.js: opens in a new tab, can carry partner codes
// later, and counts the click anonymously. Class, title and other attributes pass straight through to the <a>.
const props = defineProps({
  href: { type: String, default: null },
  /** "post" | "rating" | "trailer" | "store" | "watch" */
  kind: { type: String, required: true }
});

const target = computed(() => outboundHref(props.href));
const count = () => trackOutbound(props.href, props.kind);
</script>

<template>
  <a v-if="href" :href="target" target="_blank" rel="noopener" @click="count" @auxclick="count"><slot /></a>
  <a v-else><slot /></a>
</template>
