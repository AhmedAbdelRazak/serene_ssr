import ShopRouteClient from "@/components/public/routes/ShopRouteClient";
import JsonLd from "@/components/seo/JsonLd";
import { absoluteUrl } from "@/lib/config";
import { getFilteredProducts } from "@/lib/api";
import {
	buildProductPath,
	getPrimaryProductImage,
	getProductDisplayName,
	getProductPrice,
	isPodProduct,
} from "@/lib/product-helpers";
import { createMetadata, itemListSchema } from "@/lib/seo";

function getSafeSearchParamValue(source, key) {
	const raw = source?.[key];
	if (Array.isArray(raw)) return `${raw[0] ?? ""}`.trim();
	if (typeof raw === "symbol") return "";
	return `${raw ?? ""}`.trim();
}

function appendMultiValueParams(params, key, value) {
	if (Array.isArray(value)) {
		value.forEach((entry) => {
			const safe = `${entry ?? ""}`.trim();
			if (safe) params.append(key, safe);
		});
		return;
	}

	const safe = `${value ?? ""}`.trim();
	if (safe) params.append(key, safe);
}

function buildFiltersQuery(searchParams = {}) {
	const params = new URLSearchParams();
	[
		"category",
		"color",
		"size",
		"gender",
		"store",
		"searchTerm",
		"offers",
		"priceMin",
		"priceMax",
	].forEach((key) => appendMultiValueParams(params, key, searchParams?.[key]));
	return params.toString();
}

function createSeoCard(product = {}) {
	const title = getProductDisplayName(product);
	const href = buildProductPath(product);
	return {
		productId: product?._id || "",
		title,
		priceText: `$${getProductPrice(product).toFixed(2)}`,
		href,
		imageUrl: getPrimaryProductImage(product),
		isPod: isPodProduct(product),
	};
}

export async function generateMetadata({ searchParams }) {
	const resolvedSearchParams = await searchParams;
	const readableFilters = [];
	const filterKeys = [
		"category",
		"color",
		"size",
		"gender",
		"store",
		"searchTerm",
		"offers",
		"priceMin",
		"priceMax",
		"page",
	];
	filterKeys.forEach((key) => {
		const value = getSafeSearchParamValue(resolvedSearchParams, key);
		if (!value) return;
		readableFilters.push(`${key}: ${value}`);
	});
	const hasActiveFilters = readableFilters.length > 0;
	const suffix = readableFilters.length ? ` | ${readableFilters.join(" | ")}` : "";
	const dynamicKeywords = [
		"our products",
		"shop by category",
		"shop by color",
		"shop by size",
		...readableFilters,
	].filter(Boolean);
	return createMetadata({
		title: `Our Products${suffix}`,
		description:
			"Browse all products with advanced filtering by category, size, color, price, and store.",
		pathname: "/our-products",
		keywords: dynamicKeywords,
		noindex: hasActiveFilters,
	});
}

export default async function OurProductsPage({ searchParams }) {
	const resolvedSearchParams = await searchParams;
	const filters = buildFiltersQuery(resolvedSearchParams);
	const page = Math.max(
		1,
		Number.parseInt(getSafeSearchParamValue(resolvedSearchParams, "page") || "1", 10) || 1
	);

	let seoCards = [];
	try {
		const productsPayload = await getFilteredProducts({
			filters: filters || "all",
			page,
			records: 12,
			revalidate: 180,
		});
		seoCards = Array.isArray(productsPayload?.products)
			? productsPayload.products.slice(0, 12).map(createSeoCard).filter((card) => card.href)
			: [];
	} catch {}

	const canonicalSearch = new URLSearchParams(filters);
	if (page > 1) canonicalSearch.set("page", String(page));
	const canonicalSuffix = canonicalSearch.toString();
	const schema = itemListSchema({
		name: "Serene Jannat Our Products",
		url: absoluteUrl(canonicalSuffix ? `/our-products?${canonicalSuffix}` : "/our-products"),
		items: seoCards.map((card) => ({
			name: card.title,
			url: absoluteUrl(card.href),
			image: card.imageUrl,
		})),
	});

	return (
		<>
			<JsonLd data={schema} />
			<ShopRouteClient />
		</>
	);
}
