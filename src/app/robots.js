import { absoluteUrl } from "@/lib/config";

const AI_CRAWLER_USER_AGENTS = [
  "Amazonbot",
  "Applebot-Extended",
  "Bytespider",
  "CCBot",
  "ClaudeBot",
  "CloudflareBrowserRenderingCrawler",
  "Google-Extended",
  "GPTBot",
  "meta-externalagent",
];

export default function robots() {
  return {
    rules: [
      ...AI_CRAWLER_USER_AGENTS.map((userAgent) => ({
        userAgent,
        disallow: "/",
      })),
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
