# Serene SSR Production Checklist

## 1. Secrets and env safety
- Keep real secrets in server-only env vars (no `NEXT_PUBLIC_` prefix).
- Use `.env.local` only on server and never commit it.
- Use [`/.env.example`](./.env.example) as the template for public-safe vars.

## 2. Build and run
- Install deps: `npm ci`
- Build: `npm run build`
- Start: `npm run start`
- Run behind HTTPS reverse proxy (Nginx/Caddy) with gzip/brotli enabled.

## 3. Crawl and SEO endpoints
- Verify:
  - `/robots.txt`
  - `/sitemap.xml`
  - `/google-merchant.xml`
  - `/facebook-feed.xml`
- Re-submit sitemap/feed URLs in:
  - Google Search Console
  - Google Merchant Center
  - Meta Commerce Manager

## 4. SEO quality checks
- Confirm canonical URLs match expected route + query params.
- Confirm product pages include JSON-LD Product schema.
- Confirm metadata updates for query params on:
  - `/our-products`
  - `/custom-gifts`
  - `/custom-gifts/[...segments]`
  - `/single-product/...`

## 5. Performance checks
- Run Lighthouse in production mode (mobile + desktop).
- Prioritize LCP image quality and caching from Cloudinary/CDN.
- Keep server response times low for dynamic XML routes.

