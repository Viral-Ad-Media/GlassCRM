import { renderToStaticMarkup } from "react-dom/server";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  MarketingSite,
  marketingMetadata,
  type MarketingRoute,
} from "../marketing/MarketingSite";
const template = await readFile("dist/index.html", "utf8");
const origin = (
  process.env.PUBLIC_SITE_URL ??
  process.env.RENDER_EXTERNAL_URL ??
  "https://glasscrm.onrender.com"
).replace(/\/$/, "");
if (new URL(origin).origin !== origin)
  throw new Error("PUBLIC_SITE_URL must be an origin");
const escape = (text: string) =>
  text
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;");
for (const route of Object.keys(marketingMetadata) as MarketingRoute[]) {
  const metadata = marketingMetadata[route];
  const canonical = origin + route;
  let html = template
    .replace(/<title>.*?<\/title>/, `<title>${escape(metadata.title)}</title>`)
    .replace(
      /<meta name="description" content="[^"]*"\s*\/?\s*>/,
      `<meta name="description" content="${escape(metadata.description)}"/>`,
    );
  html = html
    .replace(
      "</head>",
      `<link rel="canonical" href="${escape(canonical)}"/><meta property="og:title" content="${escape(metadata.title)}"/><meta property="og:description" content="${escape(metadata.description)}"/><meta property="og:url" content="${escape(canonical)}"/><meta property="og:type" content="website"/></head>`,
    )
    .replace(
      "<!--marketing-content-->",
      renderToStaticMarkup(<MarketingSite route={route} />),
    );
  const directory = route === "/" ? "dist" : join("dist", route.slice(1));
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, "index.html"), html);
}
await writeFile(
  "dist/robots.txt",
  `User-agent: *\nAllow: /\nDisallow: /app\nDisallow: /api/\nSitemap: ${origin}/sitemap.xml\n`,
);
await writeFile(
  "dist/sitemap.xml",
  `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${Object.keys(
    marketingMetadata,
  )
    .map((route) => `<url><loc>${escape(origin + route)}</loc></url>`)
    .join("")}</urlset>`,
);
console.log("Prerendered four public marketing pages");
