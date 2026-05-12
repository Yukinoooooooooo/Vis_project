import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/views": "http://localhost:4317",
      "/commands": "http://localhost:4317",
      "/admin": "http://localhost:4317",
      "/health": "http://localhost:4317"
    }
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"]
  }
});

