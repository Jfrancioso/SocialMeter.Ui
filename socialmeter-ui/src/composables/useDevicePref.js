import { ref } from "vue";

/**
 * A boolean preference remembered on this device only (spoiler shield, collapsed sections).
 * localStorage can be missing or throw (private windows, blocked storage); the toggle still works for the page.
 * Accepts the legacy "on"/"off" values the shield used to write.
 */
export function useDevicePref(key, fallback) {
  const value = ref(read());

  function read() {
    try {
      const v = localStorage.getItem(key);
      if (v == null) return fallback;
      return v === "1" || v === "on";
    } catch {
      return fallback;
    }
  }

  function set(next) {
    value.value = next;
    try {
      localStorage.setItem(key, next ? "1" : "0");
    } catch {
      // storage unavailable: the in-memory value still drives the page
    }
  }

  const toggle = () => set(!value.value);

  return { value, set, toggle };
}
