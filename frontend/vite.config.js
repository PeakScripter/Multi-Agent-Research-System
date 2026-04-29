import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/research": "http://localhost:8000",
      "/chat": "http://localhost:8000",
      "/voice": "http://localhost:8000",
      "/tts": "http://localhost:8000",
      "/compare": "http://localhost:8000",
      "/rag": "http://localhost:8000",
      "/status": "http://localhost:8000",
      "/download_report": "http://localhost:8000",
      "/documents": "http://localhost:8000",
      "/fix-diagram": "http://localhost:8000",
    },
  },
});
