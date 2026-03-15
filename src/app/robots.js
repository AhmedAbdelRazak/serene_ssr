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
					"/signin",
					"/signup",
					"/sellingagent",
					"/cart",
					"/payment-link",
					"/api/track",
				],
			},
		],
		sitemap: [
			absoluteUrl("/sitemap.xml"),
			absoluteUrl("/google-merchant.xml"),
			absoluteUrl("/merchant-center-feed.xml"),
			absoluteUrl("/facebook-feed.xml"),
		],
		host: absoluteUrl("/"),
	};
}
