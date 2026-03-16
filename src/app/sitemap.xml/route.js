import { POD_OCCASIONS } from "@/lib/pod-occasions";
import { getAllProductsForSeo, getCategoriesAndSubcategories } from "@/lib/api";
import { buildProductPath } from "@/lib/product-helpers";
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
		const categoriesPayload = await getCategoriesAndSubcategories({
			revalidate: 1800,
		}).catch(() => null);
		const categories = Array.isArray(categoriesPayload?.categories)
			? categoriesPayload.categories
			: [];
		for (const category of categories) {
			const categoryId = `${category?._id || ""}`.trim();
			const categorySlug = `${category?.categorySlug || ""}`.trim();
			if (!categoryId) continue;
			const params = new URLSearchParams();
			params.set("category", categoryId);
			if (categorySlug) params.set("categorySlug", categorySlug);
			addUrl(toAbsoluteUrl(`/our-products?${params.toString()}`), "0.78", "daily");
		}

		for (const occasion of POD_OCCASIONS) {
			const params = new URLSearchParams();
			params.set("occasion", occasion);
			addUrl(toAbsoluteUrl(`/custom-gifts?${params.toString()}`), "0.79", "daily");
		}

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

