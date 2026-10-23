import { reactive, readonly } from "vue";
import { getAdminMe } from "../api";

// Whether this browser is signed in to the admin area. Only a browser that has signed in before ever asks (a flag in
// localStorage), so ordinary visitors never send a single request to the admin endpoints.
const FLAG = "chatterbub.admin";
const state = reactive({ actor: null, checked: false, checking: false, error: null });
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
    // storage blocked: the title pages just won't offer Remove
  }
}

/**
 * Asks the API who we are. Title pages call it without `force` (a no-op unless this browser has signed in before); the
 * admin page forces it.
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

function forget() {
  remember(false);
  state.actor = null;
}

export function useAdmin() {
  return { admin: readonly(state), check, forget };
}
