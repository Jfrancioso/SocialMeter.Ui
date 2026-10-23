import { reactive } from "vue";
import { getSnapshots } from "../api";
import { meterKey } from "../utils/meter";

// One shared map of cached readings so every card on a page reads from the same place.
// `null` means "asked, nothing cached yet"; `undefined` means never requested. An entry that came from the snapshots
// endpoint carries `fromSnapshot`; one set from a live reading (the hero, a title page) doesn't, and is still fetched
// once so the card gets the fields only snapshots have (the critics score).
const snapshots = reactive({});
const pending = new Set();

export function useSnapshots() {
  async function ensure(titles) {
    // The same title often sits in several rows; ask once.
    const keys = [...new Set(titles.map((t) => meterKey(t.mediaType, t.tmdbId)))]
      .filter((k) => snapshots[k] !== null && !snapshots[k]?.fromSnapshot && !pending.has(k));

    if (!keys.length) return;
    keys.forEach((k) => pending.add(k));

    try {
      // The API takes up to 200 keys per request, so a whole home page is one call.
      for (let i = 0; i < keys.length; i += 200) {
        const chunk = keys.slice(i, i + 200);
        const found = await getSnapshots(chunk);
        chunk.forEach((k) => {
          if (found[k]) snapshots[k] = { ...(snapshots[k] ?? {}), ...found[k], fromSnapshot: true };
          else if (snapshots[k] === undefined) snapshots[k] = null;
        });
      }
    } catch {
      keys.forEach((k) => { if (snapshots[k] === undefined) snapshots[k] = null; });
    } finally {
      keys.forEach((k) => pending.delete(k));
    }
  }

  /** A live reading merges into what's cached, so it never wipes fields it doesn't carry (like the critics score). */
  function set(type, id, reading) {
    const k = meterKey(type, id);
    snapshots[k] = reading ? { ...(snapshots[k] ?? {}), ...reading } : reading;
  }

  function get(type, id) {
    return snapshots[meterKey(type, id)];
  }

  return { snapshots, ensure, set, get };
}
