import {
	getAllProductsForSeo,
	getCategoriesAndSubcategories,
	getFilteredProducts,
} from "@/lib/api";
import { POD_OCCASIONS } from "@/lib/config";
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
	"/signin",
	"/signup",
	"/sellingagent/signup",
	"/cart",
];

function normalizeToken(value = "") {
	if (typeof value === "symbol") return "";
	return `${value ?? ""}`.trim().toLowerCase();
}

function collectOptionTitles(products = [], nameFragment = "") {
	const needle = normalizeToken(nameFragment);
	const values = new Set();
	for (const product of products) {
		const options = Array.isArray(product?.printifyProductDetails?.options)
			? product.printifyProductDetails.options
			: [];
		for (const option of options) {
			if (!normalizeToken(option?.name).includes(needle)) continue;
			const optionValues = Array.isArray(option?.values) ? option.values : [];
			for (const value of optionValues) {
				const title = `${value?.title || ""}`.trim();
				if (title) values.add(title);
			}
		}
	}
	return Array.from(values);
}

function buildPriceBuckets(minPrice = 0, maxPrice = 0, bucketCount = 4) {
	const safeMin = Number(minPrice);
	const safeMax = Number(maxPrice);
	if (!Number.isFinite(safeMin) || !Number.isFinite(safeMax) || safeMax <= safeMin) {
		return [];
	}
	const spread = safeMax - safeMin;
	const step = spread / Math.max(bucketCount, 1);
	const buckets = [];
	for (let idx = 0; idx < bucketCount; idx += 1) {
		const from = Number((safeMin + step * idx).toFixed(2));
		const to =
			idx === bucketCount - 1
				? Number(safeMax.toFixed(2))
				: Number((safeMin + step * (idx + 1)).toFixed(2));
		if (to <= from) continue;
		buckets.push({ min: from, max: to });
	}
	return buckets;
}

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
	addUrl(toAbsoluteUrl("/our-products?offers=1"), "0.74", "daily");
	addUrl(toAbsoluteUrl("/google-merchant.xml"), "0.6", "daily");
	addUrl(toAbsoluteUrl("/merchant-center-feed.xml"), "0.6", "daily");
	addUrl(toAbsoluteUrl("/facebook-feed.xml"), "0.6", "daily");

	for (const occasion of POD_OCCASIONS) {
		addUrl(
			toAbsoluteUrl(`/custom-gifts?occasion=${encodeURIComponent(occasion)}`),
			"0.75",
			"daily"
		);
	}

	try {
		const settledData = await Promise.allSettled([
			getAllProductsForSeo({ maxPages: 200, records: 200, revalidate: 1800 }),
			getCategoriesAndSubcategories({ revalidate: 1800 }),
			getFilteredProducts({
				filters: "all",
				page: 1,
				records: 1,
				revalidate: 1800,
				cacheMode: "force-cache",
			}),
		]);
		const allProducts =
			settledData[0]?.status === "fulfilled" &&
			Array.isArray(settledData[0].value)
				? settledData[0].value
				: [];
		const categoryData =
			settledData[1]?.status === "fulfilled" ? settledData[1].value : {};
		const filterData =
			settledData[2]?.status === "fulfilled" ? settledData[2].value : {};

		const categories = Array.isArray(categoryData?.categories)
			? categoryData.categories
			: [];
		for (const category of categories) {
			if (!category?._id) continue;
			addUrl(
				toAbsoluteUrl(`/our-products?category=${encodeURIComponent(category._id)}`),
				"0.74",
				"daily"
			);
		}

		const filterCategories = Array.isArray(filterData?.categories)
			? filterData.categories
			: [];
		const filterColors = Array.isArray(filterData?.colors) ? filterData.colors : [];
		const filterSizes = Array.isArray(filterData?.sizes) ? filterData.sizes : [];
		const filterGenders = Array.isArray(filterData?.genders)
			? filterData.genders
			: [];
		const filterStores = Array.isArray(filterData?.stores) ? filterData.stores : [];
		const priceBuckets = buildPriceBuckets(
			filterData?.priceRange?.minPrice,
			filterData?.priceRange?.maxPrice,
			4
		);
		const podProducts = allProducts.filter((product) => isPodProduct(product));
		const podColors = collectOptionTitles(podProducts, "color");
		const podSizes = collectOptionTitles(podProducts, "size");
		const podScents = collectOptionTitles(podProducts, "scent");

		for (const color of filterColors.slice(0, 30)) {
			addUrl(
				toAbsoluteUrl(`/our-products?color=${encodeURIComponent(color)}`),
				"0.72",
				"daily"
			);
		}

		for (const size of filterSizes.slice(0, 30)) {
			addUrl(
				toAbsoluteUrl(`/our-products?size=${encodeURIComponent(size)}`),
				"0.72",
				"daily"
			);
		}

		for (const gender of filterGenders.slice(0, 16)) {
			if (!gender?.id) continue;
			addUrl(
				toAbsoluteUrl(`/our-products?gender=${encodeURIComponent(gender.id)}`),
				"0.71",
				"daily"
			);
		}

		for (const store of filterStores.slice(0, 24)) {
			if (!store?.id) continue;
			addUrl(
				toAbsoluteUrl(`/our-products?store=${encodeURIComponent(store.id)}`),
				"0.7",
				"weekly"
			);
		}

		for (const bucket of priceBuckets) {
			addUrl(
				toAbsoluteUrl(
					`/our-products?priceMin=${encodeURIComponent(
						bucket.min
					)}&priceMax=${encodeURIComponent(bucket.max)}`
				),
				"0.71",
				"daily"
			);
		}

		for (const category of filterCategories.slice(0, 16)) {
			const categoryId = category?.id || category?._id;
			if (!categoryId) continue;
			for (const color of filterColors.slice(0, 8)) {
				addUrl(
					toAbsoluteUrl(
						`/our-products?category=${encodeURIComponent(
							categoryId
						)}&color=${encodeURIComponent(color)}`
					),
					"0.7",
					"daily"
				);
			}
			for (const size of filterSizes.slice(0, 8)) {
				addUrl(
					toAbsoluteUrl(
						`/our-products?category=${encodeURIComponent(
							categoryId
						)}&size=${encodeURIComponent(size)}`
					),
					"0.7",
					"daily"
				);
			}
			for (const bucket of priceBuckets) {
				addUrl(
					toAbsoluteUrl(
						`/our-products?category=${encodeURIComponent(
							categoryId
						)}&priceMin=${encodeURIComponent(
							bucket.min
						)}&priceMax=${encodeURIComponent(bucket.max)}`
					),
					"0.69",
					"daily"
				);
			}
		}

		for (const gender of filterGenders.slice(0, 10)) {
			if (!gender?.id) continue;
			for (const category of filterCategories.slice(0, 10)) {
				const categoryId = category?.id || category?._id;
				if (!categoryId) continue;
				addUrl(
					toAbsoluteUrl(
						`/our-products?category=${encodeURIComponent(
							categoryId
						)}&gender=${encodeURIComponent(gender.id)}`
					),
					"0.68",
					"weekly"
				);
			}
		}

		for (const occasion of POD_OCCASIONS) {
			const encodedOccasion = encodeURIComponent(occasion);
			addUrl(
				toAbsoluteUrl(`/custom-gifts?occasion=${encodedOccasion}&name=Your+Name`),
				"0.74",
				"daily"
			);

			for (const color of podColors.slice(0, 20)) {
				addUrl(
					toAbsoluteUrl(
						`/custom-gifts?occasion=${encodedOccasion}&color=${encodeURIComponent(
							color
						)}`
					),
					"0.73",
					"daily"
				);
			}

			for (const size of podSizes.slice(0, 20)) {
				addUrl(
					toAbsoluteUrl(
						`/custom-gifts?occasion=${encodedOccasion}&size=${encodeURIComponent(
							size
						)}`
					),
					"0.73",
					"daily"
				);
			}

			for (const scent of podScents.slice(0, 12)) {
				addUrl(
					toAbsoluteUrl(
						`/custom-gifts?occasion=${encodedOccasion}&scent=${encodeURIComponent(
							scent
						)}`
					),
					"0.72",
					"weekly"
				);
			}

			for (const size of podSizes.slice(0, 10)) {
				for (const color of podColors.slice(0, 10)) {
					addUrl(
						toAbsoluteUrl(
							`/custom-gifts?occasion=${encodedOccasion}&size=${encodeURIComponent(
								size
							)}&color=${encodeURIComponent(color)}`
						),
						"0.72",
						"daily"
					);
				}
			}
		}

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
				addUrl(
					toAbsoluteUrl(`/custom-gifts/${product._id}`),
					"0.84",
					"daily",
					productLastmod
				);
				const podCombos = buildPodQueryCombinations(product);
				for (const combo of podCombos) {
					addUrl(
						toAbsoluteUrl(`${productPath}?${combo}`),
						"0.82",
						"daily",
						productLastmod
					);
				}
				for (const variantQuery of variantQueries) {
					for (const occasion of POD_OCCASIONS) {
						const scopedParams = new URLSearchParams(variantQuery);
						scopedParams.set("occasion", occasion);
						addUrl(
							toAbsoluteUrl(`${productPath}?${scopedParams.toString()}`),
							"0.81",
							"daily",
							productLastmod
						);
					}
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

