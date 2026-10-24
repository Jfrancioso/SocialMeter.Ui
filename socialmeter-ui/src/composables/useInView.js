import { onBeforeUnmount, onMounted, ref } from "vue";

/**
 * True once the element has scrolled into view, then stops watching: the trigger for one-time entrance effects
 * ("reveal on scroll"). Browsers without IntersectionObserver count as in view straight away, so nothing stays hidden.
 *
 * @param {import("vue").Ref<HTMLElement | null>} target  the element to watch (must be rendered when the component mounts)
 * @param {{ threshold?: number }} options  how much of it must be visible, 0-1
 */
export function useInView(target, { threshold = 0.25 } = {}) {
  const inView = ref(false);
  let observer = null;

  onMounted(() => {
    if (typeof IntersectionObserver === "undefined" || !target.value) {
      inView.value = true;
      return;
    }
    observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          inView.value = true;
          observer.disconnect();
        }
      },
      { threshold }
    );
    observer.observe(target.value);
  });

  onBeforeUnmount(() => observer?.disconnect());

  return inView;
}
