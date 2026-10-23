// The browser tab's title and the page's description meta tag. Search engines read the page again after JavaScript has
// run, so these must say the same as the first HTML. For title pages that first HTML is written by the edge Worker
// (edge/seo-worker/src/seo.js, describeTitle): keep titleMeta below in step with it.

export const SITE_TITLE = "Chatterbub";
export const SITE_DESCRIPTION = "Chatterbub: what people are actually saying about movies, shows and games, scored from real posts.";

export function setPageMeta({ title, description } = {}) {
  document.title = title || SITE_TITLE;
  document.querySelector('meta[name="description"]')?.setAttribute("content", description || SITE_DESCRIPTION);
}

const BESIDES = { movie: "IMDb, Rotten Tomatoes and Metacritic", tv: "IMDb, Rotten Tomatoes and Metacritic", game: "Steam's all-time rating" };

/** Title and description for a title page, from the title and its reading (null when it has none). */
export function titleMeta(type, title, meter) {
  const year = title.releaseDate ? String(title.releaseDate).slice(0, 4) : null;
  const nameYear = year ? `${title.name} (${year})` : title.name;
  if (meter && meter.totalPosts > 0) {
    const counted = `${meter.totalPosts} counted ${type === "game" ? "reviews and posts" : "posts"}`;
    return {
      title: `${nameYear}: Chatterbub score ${meter.score} (${meter.label})`,
      description: `What people are actually saying about ${title.name}: a Chatterbub score of ${meter.score} (${meter.label}) from ${counted}, beside ${BESIDES[type]}.`
    };
  }
  return { title: `${nameYear} · Chatterbub`, description: title.overview || SITE_DESCRIPTION };
}
