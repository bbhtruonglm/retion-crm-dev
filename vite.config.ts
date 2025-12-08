import path from "path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  return {
    server: {
      port: 3000,
      host: "0.0.0.0",
      proxy: {
        "/app": {
          target:
            env.VITE_API_APP_TARGET ||
            "https://chatbox-service-v3.botbanhang.vn",
          changeOrigin: true,
          secure: false,
        },
        "/manager": {
          target:
            env.VITE_API_MANAGER_TARGET ||
            "https://chatbox-billing.botbanhang.vn",
          changeOrigin: true,
          secure: false,
        },
        "/billing": {
          target:
            env.VITE_API_MANAGER_TARGET ||
            "https://chatbox-billing.botbanhang.vn",
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/billing/, ""),
        },
      },
    },
    plugins: [react()],
    define: {
      "process.env.API_KEY": JSON.stringify(env.GEMINI_API_KEY),
      "process.env.GEMINI_API_KEY": JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
