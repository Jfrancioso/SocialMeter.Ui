import { reactive } from "vue";
import { getSnapshots } from "../api";
import { meterKey } from "../utils/meter";

// One shared map of cached readings so every card on a page reads from the same place.
// `null` means "asked, nothing cached yet"; `undefined` means never requested.
const snapshots = reactive({});
const pending = new Set();

export function useSnapshots() {
  async function ensure(titles) {
    const keys = titles
      .map((t) => meterKey(t.mediaType, t.tmdbId))
      .filter((k) => snapshots[k] === undefined && !pending.has(k));

    if (!keys.length) return;
    keys.forEach((k) => pending.add(k));

    try {
      // The API caps a request at 60 keys.
      for (let i = 0; i < keys.length; i += 50) {
        const chunk = keys.slice(i, i + 50);
        const found = await getSnapshots(chunk);
        chunk.forEach((k) => (snapshots[k] = found[k] ?? null));
      }
    } catch {
      keys.forEach((k) => (snapshots[k] = null));
    } finally {
      keys.forEach((k) => pending.delete(k));
    }
  }

  function set(type, id, reading) {
    snapshots[meterKey(type, id)] = reading;
  }

  function get(type, id) {
    return snapshots[meterKey(type, id)];
  }

  return { snapshots, ensure, set, get };
}
