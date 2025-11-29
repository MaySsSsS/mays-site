import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { fileURLToPath, URL } from "node:url";

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  // GitHub Pages 部署配置
  // 如果部署到 https://<USERNAME>.github.io/，设置 base: "/"
  // 如果部署到 https://<USERNAME>.github.io/<REPO>/，设置 base: "/<REPO>/"
  // base: process.env.GITHUB_ACTIONS ? "/mays_blog/" : "/",
  base: "/",
});
