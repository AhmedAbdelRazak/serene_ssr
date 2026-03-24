import { absoluteUrl } from "@/lib/config";

export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/seller",
          "/dashboard",
          "/payment-link",
          "/api/track",
        ],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
