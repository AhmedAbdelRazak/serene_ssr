import { absoluteUrl } from "@/lib/config";

export async function GET() {
	const lines = [
		"# Serene Jannat",
		"",
		"> E-commerce store for handcrafted decor and personalized print-on-demand gifts.",
		"",
		"## Public Pages",
		`- Home: ${absoluteUrl("/")}`,
		`- Products: ${absoluteUrl("/our-products")}`,
		`- Print On Demand: ${absoluteUrl("/custom-gifts")}`,
		`- About: ${absoluteUrl("/about")}`,
		`- Contact: ${absoluteUrl("/contact")}`,
		"",
		"## SEO Feeds",
		`- Sitemap: ${absoluteUrl("/sitemap.xml")}`,
		`- Google Merchant Feed: ${absoluteUrl("/google-merchant.xml")}`,
		`- Merchant Center Feed: ${absoluteUrl("/merchant-center-feed.xml")}`,
		`- Facebook Feed: ${absoluteUrl("/facebook-feed.xml")}`,
		"",
		"## Policies",
		`- Privacy & Terms: ${absoluteUrl("/privacy-policy-terms-conditions")}`,
		`- Cookie Policy: ${absoluteUrl("/cookie-policy")}`,
		`- Return & Refund: ${absoluteUrl("/return-refund-policy")}`,
		"",
	].join("\n");

	return new Response(lines, {
		status: 200,
		headers: {
			"Content-Type": "text/plain; charset=utf-8",
			"Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600",
		},
	});
}
