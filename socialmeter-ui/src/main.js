import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import "./styles/tokens.css";
import "./styles/seasons.css";
import "./styles/base.css";

// After a deploy, a page loaded before it still asks for the previous build's chunks, which no longer exist. A single
// reload fetches the new page and its chunks; the flag stops a loop if the reload itself fails.
function recoverFromStaleBuild() {
  const key = "sm:reloadedForStaleBuild";
  try {
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
  } catch {
    // no sessionStorage: reload once anyway
  }
  window.location.reload();
}
window.addEventListener("vite:preloadError", (e) => { e.preventDefault(); recoverFromStaleBuild(); });
router.onError((err) => {
  if (/Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(err?.message ?? "")) recoverFromStaleBuild();
});
router.afterEach(() => { try { sessionStorage.removeItem("sm:reloadedForStaleBuild"); } catch { /* ignore */ } });

createApp(App).use(router).mount("#app");
