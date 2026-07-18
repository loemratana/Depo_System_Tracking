import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { loadEnv } from "vite";

const env = loadEnv(process.env.NODE_ENV || "development", process.cwd(), "");
const apiTarget = env.VITE_API_PROXY_TARGET || "http://localhost:5000";

export default defineConfig({
  // Disable Cloudflare Workers plugin — deploying to Vercel as SPA
  cloudflare: false,

  tanstackStart: {
    server: { entry: "server" },
  },

  vite: {
    server: {
      host: true,

      allowedHosts: ["localhost", ".ngrok-free.dev"],

      proxy: {
        "/api": {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
        },
        "/uploads": {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  },
});
