// One place for how each social platform is named and how its authors are written, so adding a source means one edit.

export const PLATFORM_NAMES = { x: "X", bluesky: "Bluesky", reddit: "Reddit", steam: "Steam" };

export const platformName = (platform) => PLATFORM_NAMES[platform] ?? platform;

/** "@name" on X and Bluesky, "u/name" on Reddit, the plain name elsewhere (Steam). */
export const authorHandle = (platform, author) =>
  platform === "x" || platform === "bluesky" ? `@${author}` : platform === "reddit" ? `u/${author}` : author;

/** ["X", "Bluesky", "Steam"] → "X, Bluesky and Steam". */
export const joinNames = (names) =>
  names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
