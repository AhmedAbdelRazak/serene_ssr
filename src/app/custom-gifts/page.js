import PodListRouteClient from "@/components/public/routes/PodListRouteClient";
import JsonLd from "@/components/seo/JsonLd";
import { absoluteUrl } from "@/lib/config";
import { getPodProducts } from "@/lib/api";
import {
	buildProductPath,
	getPrimaryProductImage,
	getProductDisplayName,
	getProductPrice,
} from "@/lib/product-helpers";
import { createMetadata, itemListSchema } from "@/lib/seo";

export const revalidate = 300;

function getSafeSearchParamValue(source, key) {
	const raw = source?.[key];
	if (Array.isArray(raw)) return `${raw[0] ?? ""}`.trim();
	if (typeof raw === "symbol") return "";
	return `${raw ?? ""}`.trim();
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
		isPod: true,
	};
}

export async function generateMetadata({ searchParams }) {
	const resolvedSearchParams = await searchParams;
	const occasion = getSafeSearchParamValue(resolvedSearchParams, "occasion");
	const name = getSafeSearchParamValue(resolvedSearchParams, "name");
	const color = getSafeSearchParamValue(resolvedSearchParams, "color");
	const size = getSafeSearchParamValue(resolvedSearchParams, "size");
	const scent = getSafeSearchParamValue(resolvedSearchParams, "scent");
	const page = getSafeSearchParamValue(resolvedSearchParams, "page");
	const hasActiveFilters = [occasion, name, color, size, scent, page].some(Boolean);
	const personalization = [occasion, name].filter(Boolean).join(" - ");
	const filtersSummary = [
		color && `color: ${color}`,
		size && `size: ${size}`,
		scent && `scent: ${scent}`,
		page && `page: ${page}`,
	]
		.filter(Boolean)
		.join(" | ");
	const titleSuffix = [personalization, filtersSummary].filter(Boolean).join(" | ");
	return createMetadata({
		title: titleSuffix
			? `Custom Gifts | ${titleSuffix}`
			: "Custom Gifts | Print On Demand",
		description:
			"Choose a product, personalize with your occasion and name, and preview premium Print On Demand gifts.",
		pathname: "/custom-gifts",
		keywords: [
			"custom gifts",
			"print on demand",
			"personalized gifts",
			occasion || "",
			color || "",
			size || "",
			scent || "",
		].filter(Boolean),
		noindex: hasActiveFilters,
	});
}

export default async function CustomGiftsPage() {
	let seoCards = [];
	try {
		const products = await getPodProducts({ revalidate: 180, limit: 12, lite: true });
		seoCards = Array.isArray(products)
			? products.slice(0, 12).map(createSeoCard).filter((card) => card.href)
			: [];
	} catch {}

	const schema = itemListSchema({
		name: "Serene Jannat Custom Gifts",
		url: absoluteUrl("/custom-gifts"),
		items: seoCards.map((card) => ({
			name: card.title,
			url: absoluteUrl(card.href),
			image: card.imageUrl,
		})),
	});

	return (
		<>
			<JsonLd data={schema} />
			<PodListRouteClient />
		</>
	);
}
