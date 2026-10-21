import { createRouter, createWebHistory } from "vue-router";

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", name: "home", component: () => import("../pages/HomePage.vue") },
    {
      path: "/title/:type(movie|tv)/:id(\\d+)",
      name: "title",
      component: () => import("../pages/TitlePage.vue"),
      props: (route) => ({ type: route.params.type, id: Number(route.params.id) })
    },
    {
      path: "/browse/:type(movie|tv)",
      name: "browse",
      component: () => import("../pages/BrowsePage.vue"),
      props: true
    },
    { path: "/search", name: "search", component: () => import("../pages/SearchPage.vue") },
    { path: "/how-it-works", name: "how-it-works", component: () => import("../pages/HowItWorksPage.vue") },

    // Old links
    { path: "/movie/:id(\\d+)", redirect: (to) => ({ name: "title", params: { type: "movie", id: to.params.id } }) },
    { path: "/:pathMatch(.*)*", redirect: "/" }
  ],
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition;
    return { left: 0, top: 0 };
  }
});
