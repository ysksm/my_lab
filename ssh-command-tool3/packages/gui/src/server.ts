import { initSettings } from "./state";
import { apiHandlers } from "./api-handlers";
import { generatePrometheusMetrics } from "./prometheus";
import { htmlContent } from "./html-template";

// Load settings on startup
initSettings();

// Server
const server = Bun.serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);

    // API routes
    if (url.pathname.startsWith("/api/")) {
      const endpoint = url.pathname.slice(5);
      const handler = apiHandlers[endpoint];

      if (!handler) {
        return Response.json({ error: "Not found" }, { status: 404 });
      }

      try {
        let body = {};
        if (req.method === "POST") {
          const text = await req.text();
          if (text) body = JSON.parse(text);
        }
        const result = await handler(body);
        return Response.json(result);
      } catch (e) {
        return Response.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
      }
    }

    // Prometheus metrics endpoint
    if (url.pathname === "/metrics") {
      const metrics = generatePrometheusMetrics();
      return new Response(metrics, {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    // Static files
    if (url.pathname === "/" || url.pathname === "/index.html") {
      return new Response(htmlContent, {
        headers: { "Content-Type": "text/html" },
      });
    }

    return new Response("Not found", { status: 404 });
  },
});

console.log(`SSH Command Tool GUI running at http://localhost:${server.port}`);
