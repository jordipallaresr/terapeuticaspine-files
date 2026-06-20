import type { MetadataRoute } from "next";

// Genera /robots.txt bloqueando toda indexación/crawling. La app es privada;
// además el layout marca `robots: { index: false, follow: false }` en las metas.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: "/",
    },
  };
}
