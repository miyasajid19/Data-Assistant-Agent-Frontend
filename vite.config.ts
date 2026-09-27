import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vite dev server: 5173. Backend FastAPI: 8000. We proxy POST/PUT/PATCH/DELETE
// through the same paths so the browser hits the same origin and CORS is a
// non-issue. Browser GETs to /chat and /chat/:threadId are SPA route
// refreshes — we serve index.html so React Router can take over.
const chatProxy = {
  target: "http://localhost:8000",
  // Bypass browser navigations (refresh / direct URL) so Vite serves the
  // SPA shell. API calls (POST /chat, etc.) still get proxied because they
  // don't carry `Accept: text/html`.
  bypass: (req: { method?: string; headers?: Record<string, string | string[] | undefined> }) => {
    const accept = req.headers?.accept;
    const acceptsHtml = Array.isArray(accept)
      ? accept.some((a) => a.includes("text/html"))
      : typeof accept === "string" && accept.includes("text/html");
    if (req.method === "GET" && acceptsHtml) {
      return "/index.html";
    }
    return undefined;
  },
};

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/chat": chatProxy,
      "/upload": "http://localhost:8000",
      "/sessions": "http://localhost:8000",
      "/health": "http://localhost:8000",
      "/artifacts": "http://localhost:8000",
    },
  },
  preview: {
    port: 5173,
    proxy: {
      "/chat": chatProxy,
      "/upload": "http://localhost:8000",
      "/sessions": "http://localhost:8000",
      "/health": "http://localhost:8000",
      "/artifacts": "http://localhost:8000",
    },
  },
});
