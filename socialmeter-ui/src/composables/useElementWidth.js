import { onBeforeUnmount, onMounted, ref } from "vue";

/**
 * The element's width in pixels, kept current as it resizes: for charts drawn to their container's size. It updates once
 * the width settles (not on every pixel of a window drag), so a layout that depends on it is redone once.
 *
 * @param {import("vue").Ref<HTMLElement | null>} target  the element to measure (must be rendered when the component mounts)
 * @param {{ settleMs?: number }} options  how long the width must hold still before it updates
 */
export function useElementWidth(target, { settleMs = 150 } = {}) {
  const width = ref(0);
  let observer = null;
  let timer = null;

  onMounted(() => {
    width.value = target.value?.clientWidth ?? 0;
    if (typeof ResizeObserver === "undefined" || !target.value) return;
    observer = new ResizeObserver(([entry]) => {
      clearTimeout(timer);
      timer = setTimeout(() => (width.value = Math.round(entry.contentRect.width)), settleMs);
    });
    observer.observe(target.value);
  });

  onBeforeUnmount(() => {
    observer?.disconnect();
    clearTimeout(timer);
  });

  return width;
}
