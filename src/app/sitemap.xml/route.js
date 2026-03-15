import { getAllProductsForSeo } from "@/lib/api";
import {
	buildPodQueryCombinations,
	buildProductPath,
	isPodProduct,
} from "@/lib/product-helpers";
import { absoluteXmlUrl, escapeXml, xmlResponse } from "@/lib/xml";

export const revalidate = 1800;
export const dynamic = "force-dynamic";
const MAX_SITEMAP_URLS = 45000;

const STATIC_PATHS = [
	"/",
	"/about",
	"/contact",
	"/our-products",
	"/custom-gifts",
	"/privacy-policy-terms-conditions",
	"/cookie-policy",
	"/return-refund-policy",
	"/llms.txt",
];

export async function GET(request) {
	const toAbsoluteUrl = (path = "/") => absoluteXmlUrl(path, request);

	const urlMap = new Map();
	const addUrl = (value, priority = "0.7", changefreq = "weekly", lastmod = "") => {
		if (urlMap.size >= MAX_SITEMAP_URLS) return;
		if (!value || urlMap.has(value)) return;
		urlMap.set(value, {
			loc: value,
			priority,
			changefreq,
			lastmod: lastmod || new Date().toISOString(),
		});
	};

	STATIC_PATHS.forEach((path) => addUrl(toAbsoluteUrl(path), "0.8", "daily"));

	try {
		const allProducts = await getAllProductsForSeo({
			maxPages: 200,
			records: 200,
			revalidate: 1800,
		});

		for (const product of allProducts) {
			if (!product?._id) continue;
			const productPath = buildProductPath(product);
			const productLastmod = product?.updatedAt || product?.createdAt;
			addUrl(toAbsoluteUrl(productPath), "0.9", "daily", productLastmod);

			const productAttributes = Array.isArray(product?.productAttributes)
				? product.productAttributes
				: [];
			const variantQueries = new Set();
			for (const attr of productAttributes) {
				const params = new URLSearchParams();
				const safeSize = `${attr?.size || ""}`.trim();
				const safeColor = `${attr?.color || ""}`.trim();
				const safeScent = `${attr?.scent || ""}`.trim();
				if (safeSize) params.set("size", safeSize);
				if (safeColor) params.set("color", safeColor);
				if (safeScent) params.set("scent", safeScent);
				const query = params.toString();
				if (query) variantQueries.add(query);
			}

			if (isPodProduct(product)) {
				const podCombos = buildPodQueryCombinations(product);
				for (const combo of podCombos) {
					addUrl(
						toAbsoluteUrl(`${productPath}?${combo}`),
						"0.82",
						"daily",
						productLastmod
					);
				}
			} else {
				for (const variantQuery of variantQueries) {
					addUrl(
						toAbsoluteUrl(`${productPath}?${variantQuery}`),
						"0.83",
						"weekly",
						productLastmod
					);
				}
			}
		}
	} catch {
		// keep static routes even if API fails temporarily
	}

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${Array.from(urlMap.values())
	.map(
		(entry) => `<url>
	<loc>${escapeXml(entry.loc)}</loc>
	<lastmod>${escapeXml(entry.lastmod)}</lastmod>
	<changefreq>${escapeXml(entry.changefreq)}</changefreq>
	<priority>${escapeXml(entry.priority)}</priority>
</url>`
	)
	.join("\n")}
</urlset>`;

	return xmlResponse(xml);
}

