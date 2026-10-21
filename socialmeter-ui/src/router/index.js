import { createRouter, createWebHistory } from "vue-router";

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", name: "home", component: () => import("../pages/HomePage.vue") },
    { path: "/movie/:id", name: "movie-details", component: () => import("../pages/MovieDetailsPage.vue") },
  ],
  scrollBehavior(to, from, savedPosition) {
    // Back/forward buttons restore scroll
    if (savedPosition) return savedPosition;

    // Always start at top on new page
    return { left: 0, top: 0 };
  },
});
