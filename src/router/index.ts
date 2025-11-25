import { createRouter, createWebHistory } from "vue-router";
import type { RouteRecordRaw } from "vue-router";

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    name: "Home",
    component: () => import("@/views/Home/index.vue"),
    meta: { title: "首页" },
  },
  {
    path: "/games",
    name: "Games",
    component: () => import("@/views/Games/index.vue"),
    meta: { title: "游戏库" },
  },
  {
    path: "/about",
    name: "About",
    component: () => import("@/views/About/index.vue"),
    meta: { title: "关于我" },
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior() {
    return { top: 0 };
  },
});

router.beforeEach((to, _from, next) => {
  document.title = `${to.meta.title || "Steam Blog"} | My Gaming Journey`;
  next();
});

export default router;
