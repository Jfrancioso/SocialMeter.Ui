import { reactive, readonly } from "vue";
import { adminSignOutUrl, getAdminMe, setDevAdminKey } from "../api";

// Whether this browser is signed in to the admin area. Only a browser that has signed in before ever asks (a flag in
// localStorage), so ordinary visitors never send a single request to the admin endpoints.
const FLAG = "chatterbub.admin";
// "Remove buttons" switch in the admin bar: off whenever the site is opened afresh, so browsing never shows them by
// accident. Kept for the browser tab (sessionStorage), so it survives moving between pages.
const MODERATING = "chatterbub.moderating";

const state = reactive({ actor: null, checked: false, checking: false, error: null, moderating: readModerating() });
let pending = null;

function remembered() {
  try {
    return localStorage.getItem(FLAG) === "1";
  } catch {
    return false;
  }
}

function remember(on) {
  try {
    if (on) localStorage.setItem(FLAG, "1");
    else localStorage.removeItem(FLAG);
  } catch {
    // storage blocked: the admin bar just won't appear until /admin is visited
  }
}

function readModerating() {
  try {
    return sessionStorage.getItem(MODERATING) === "1";
  } catch {
    return false;
  }
}

/**
 * Asks the API who we are. The app calls it on every load without `force` (a no-op unless this browser has signed in
 * before); the admin page forces it.
 */
function check({ force = false } = {}) {
  if (!force && (state.checked || !remembered())) return Promise.resolve(state.actor);
  if (pending) return pending;
  state.checking = true;
  pending = getAdminMe()
    .then((me) => {
      state.actor = me.actor;
      state.error = null;
      remember(true);
      return me.actor;
    })
    .catch((e) => {
      state.actor = null;
      state.error = e?.status === 403 ? "This account is not an admin." : null;
      return null;
    })
    .finally(() => {
      state.checked = true;
      state.checking = false;
      pending = null;
    });
  return pending;
}

function setModerating(on) {
  state.moderating = !!on;
  try {
    if (on) sessionStorage.setItem(MODERATING, "1");
    else sessionStorage.removeItem(MODERATING);
  } catch {
    // storage blocked: the switch still works for this page
  }
}

/** Forgets this browser's admin state and ends the Cloudflare session (or drops the local dev key). */
function signOut() {
  remember(false);
  setModerating(false);
  state.actor = null;
  if (import.meta.env.DEV) {
    setDevAdminKey(null);
    return;
  }
  window.location.href = adminSignOutUrl();
}

export function useAdmin() {
  return { admin: readonly(state), check, setModerating, signOut };
}
