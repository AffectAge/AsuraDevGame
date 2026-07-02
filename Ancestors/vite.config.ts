import { defineConfig } from "vite";

export default defineConfig({
  root: "client",
  server: {
    port: 5273,
    proxy: {
      "/api": "http://127.0.0.1:3101"
    }
  },
  build: {
    outDir: "../dist-client",
    emptyOutDir: true,
    chunkSizeWarningLimit: 6500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/@babylonjs")) return "babylon";
          if (id.includes("node_modules")) return "vendor";
          return undefined;
        }
      }
    }
  }
});
