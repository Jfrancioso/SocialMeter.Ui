const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });
const plain = new Intl.NumberFormat("en");

export const formatCompact = (n) => (n == null ? "" : compact.format(n));
export const formatNumber = (n) => (n == null ? "" : plain.format(n));

export function yearOf(date) {
  return date ? String(date).slice(0, 4) : "";
}

export function runtimeLabel(minutes) {
  if (!minutes) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}h ${m ? `${m}m` : ""}`.trim() : `${m}m`;
}

/** "3h ago", "2d ago", "Mar 2024" */
export function timeAgo(iso) {
  if (!iso) return "";
  const then = new Date(iso.endsWith("Z") ? iso : `${iso}Z`);
  const diff = (Date.now() - then.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)}d ago`;
  return then.toLocaleDateString("en", { month: "short", year: "numeric" });
}

export function mediaLabel(type) {
  return type === "tv" ? "TV show" : "Movie";
}
