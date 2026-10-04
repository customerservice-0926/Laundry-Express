import type { MetadataRoute } from "next";
import { APP_CONFIG } from "@/lib/constants";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes: Array<{
    path: string;
    changeFrequency: NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;
    priority: number;
  }> = [
    { path: "", changeFrequency: "weekly", priority: 1.0 },
    { path: "/pricing", changeFrequency: "weekly", priority: 0.9 },
    { path: "/order", changeFrequency: "weekly", priority: 0.85 },
    { path: "/contact", changeFrequency: "monthly", priority: 0.75 },
    { path: "/terms", changeFrequency: "monthly", priority: 0.6 },
  ];

  const now = new Date();
  return routes.map(({ path, changeFrequency, priority }) => ({
    url: new URL(path, APP_CONFIG.url).toString(),
    lastModified: now,
    changeFrequency,
    priority,
  }));
}
