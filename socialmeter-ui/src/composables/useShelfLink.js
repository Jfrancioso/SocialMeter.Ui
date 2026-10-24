import { computed, ref } from "vue";
import { useAdmin } from "./useAdmin";

// Whether the nav shows a link to the private reading shelf: for a signed-in admin, or a browser that has opened the
// shelf before (a flag in localStorage, set by the shelf page). Only a link: the API decides who sees the shelf, so a
// faked flag just leads to its sign-in screen. Ordinary visitors never see it.
const FLAG = "chatterbub.shelf";

function read() {
  try {
    return localStorage.getItem(FLAG) === "1";
  } catch {
    return false;
  }
}

const opened = ref(read());

/** The shelf page calls this: true after the shelf loads, false when the API turns the browser away. */
function rememberShelf(on) {
  opened.value = on;
  try {
    if (on) localStorage.setItem(FLAG, "1");
    else localStorage.removeItem(FLAG);
  } catch {
    // storage blocked: the link shows for admins only
  }
}

export function useShelfLink() {
  const { admin } = useAdmin();
  const showShelf = computed(() => !!admin.actor || opened.value);
  return { showShelf, rememberShelf };
}
