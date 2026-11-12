import { defineConfig, type ViteDevServer } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
let devServer: ViteDevServer;
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: "marketing-static-preview",
      configureServer(server) {
        devServer = server;
        server.middlewares.use((req, _res, next) => {
          if (
            req.url?.split("?")[0] === "/app" ||
            req.url?.split("?")[0] === "/app/"
          )
            req.url = "/app.html";
          next();
        });
      },
      async transformIndexHtml(html, context) {
        if (!context.server || !html.includes("<!--marketing-content-->"))
          return html;
        const path =
          new URL(
            context.originalUrl ?? "/",
            "http://localhost",
          ).pathname.replace(/\/$/, "") || "/";
        const { MarketingSite, marketingMetadata } =
          await devServer.ssrLoadModule("/marketing/MarketingSite.tsx");
        if (!(path in marketingMetadata)) return html;
        return html
          .replace(
            "<!--marketing-content-->",
            renderToStaticMarkup(createElement(MarketingSite, { route: path })),
          )
          .replace(
            /<title>.*?<\/title>/,
            `<title>${marketingMetadata[path].title}</title>`,
          );
      },
    },
  ],
  server: {
    port: 3000,
    strictPort: true,
    host: "127.0.0.1",
    proxy: { "/api": "http://127.0.0.1:3001" },
  },
  build: {
    rollupOptions: {
      input: { marketing: "index.html", app: "app.html" },
      output: { manualChunks: { charts: ["recharts"] } },
    },
  },
});
