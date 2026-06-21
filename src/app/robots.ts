import type { MetadataRoute } from "next";

// Generates /robots.txt blocking all indexing/crawling. The app is private;
// the layout also sets `robots: { index: false, follow: false }` in the metas.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: "/",
    },
  };
}
