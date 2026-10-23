import { createRouter, createWebHistory } from "vue-router";
import { setPageMeta } from "../utils/pageMeta";

// Tab titles for the fixed pages. Title pages set their own once the title loads (useTitlePage); the admin page sets its own.
const PAGE_TITLES = {
  "how-it-works": "How it works · Chatterbub",
  privacy: "Privacy · Chatterbub",
  search: "Search · Chatterbub"
};
const BROWSE_TITLES = { movie: "Movies", tv: "TV shows", game: "Games" };

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", name: "home", component: () => import("../pages/HomePage.vue") },
    {
      path: "/title/:type(movie|tv|game)/:id(\\d+)",
      name: "title",
      component: () => import("../pages/TitlePage.vue"),
      props: (route) => ({ type: route.params.type, id: Number(route.params.id) })
    },
    {
      path: "/browse/:type(movie|tv|game)",
      name: "browse",
      component: () => import("../pages/BrowsePage.vue"),
      props: true
    },
    { path: "/search", name: "search", component: () => import("../pages/SearchPage.vue") },
    { path: "/how-it-works", name: "how-it-works", component: () => import("../pages/HowItWorksPage.vue") },
    { path: "/privacy", name: "privacy", component: () => import("../pages/PrivacyPage.vue") },
    // Not linked anywhere; its own chunk, so visitors never download it. The API decides who gets in.
    { path: "/admin", name: "admin", component: () => import("../pages/AdminPage.vue") },

    // Old links
    { path: "/movie/:id(\\d+)", redirect: (to) => ({ name: "title", params: { type: "movie", id: to.params.id } }) },
    { path: "/:pathMatch(.*)*", redirect: "/" }
  ],
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition;
    // "#method" and friends: land on the section, below the sticky nav. The target renders async, so give it a tick.
    if (to.hash) return new Promise((resolve) => setTimeout(() => resolve({ el: to.hash, top: 80, behavior: "smooth" }), 50));
    return { left: 0, top: 0 };
  }
});

router.afterEach((to) => {
  if (to.name === "title" || to.name === "admin") return;
  const title = to.name === "browse" ? `${BROWSE_TITLES[to.params.type]} · Chatterbub` : PAGE_TITLES[to.name];
  setPageMeta({ title });
});

export default router;
