<script setup>
import { computed, watchEffect } from "vue";
import { useAdmin } from "../../composables/useAdmin";
import styles from "./AdminBar.module.css";

// A strip above the nav on every page while this browser is signed in as an admin, so it is never easy to forget.
// Violet while browsing; red while the Remove buttons are switched on. Visitors never see it.
const { admin, setModerating, signOut } = useAdmin();
const visible = computed(() => !!admin.actor);

// Everything positioned against the nav moves down by the strip's height (--admin-h, see tokens.css).
watchEffect(() => document.documentElement.classList.toggle("has-admin-bar", visible.value));
</script>

<template>
  <div v-if="visible" :class="[styles.bar, admin.moderating && styles.armed]" role="region" aria-label="Admin">
    <div :class="styles.inner">
      <span :class="styles.badge">
        <span :class="styles.dot" aria-hidden="true" />
        Admin
      </span>
      <span :class="styles.who" :title="admin.actor">{{ admin.actor }}</span>

      <button
        type="button"
        role="switch"
        :aria-checked="admin.moderating"
        :class="styles.switch"
        :title="admin.moderating ? 'Remove buttons are showing on posts. Click to hide them.' : 'Show a Remove button on every post'"
        @click="setModerating(!admin.moderating)"
      >
        <span :class="styles.labelLong">Remove buttons</span>
        <span :class="styles.labelShort">Remove</span>
        <span :class="styles.track" aria-hidden="true"><span :class="styles.knob" /></span>
        <span :class="styles.state">{{ admin.moderating ? "On" : "Off" }}</span>
      </button>

      <router-link to="/admin" :class="styles.link">Log</router-link>
      <button type="button" :class="styles.link" @click="signOut">Sign out</button>
    </div>
  </div>
</template>
