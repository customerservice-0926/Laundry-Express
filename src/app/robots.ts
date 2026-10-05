import type { MetadataRoute } from "next";
import { APP_CONFIG } from "@/lib/constants";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = APP_CONFIG.url;
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/pricing", "/order", "/contact", "/terms", "/llms.txt", "/llms-full.txt"],
        disallow: ["/api/", "/dashboard/"],
      },
      {
        userAgent: ["GPTBot", "ChatGPT-User", "ClaudeBot", "PerplexityBot", "Google-Extended", "Applebot-Extended"],
        allow: ["/", "/pricing", "/order", "/contact", "/terms", "/llms.txt", "/llms-full.txt"],
        disallow: ["/api/", "/dashboard/"],
      },
    ],
    sitemap: new URL("/sitemap.xml", siteUrl).toString(),
    host: siteUrl,
  };
}
