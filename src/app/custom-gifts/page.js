import PodListRouteClient from "@/components/public/routes/PodListRouteClient";
import JsonLd from "@/components/seo/JsonLd";
import { absoluteUrl } from "@/lib/config";
import { buildPodCollectionSeo } from "@/lib/collection-seo";
import {
	appendTrackingQueryParams,
	getSearchParamValue,
	serializeComparableSearchParams,
} from "@/lib/product-route-url";
import { getPodProducts } from "@/lib/api";
import {
	buildProductPath,
	getPrimaryProductImage,
	getProductDisplayName,
	getProductPrice,
} from "@/lib/product-helpers";
import { breadcrumbSchema, createMetadata, itemListSchema } from "@/lib/seo";
import { permanentRedirect } from "next/navigation";

export const revalidate = 300;

function buildPodCollectionRouteSearchParams(searchParams = {}, seoState = {}) {
	const params = new URLSearchParams();
	if (seoState.occasion) {
		params.set("occasion", seoState.occasion);
	}
	const name = getSearchParamValue(searchParams, "name")
		.replace(/[\r\n\t]+/g, " ")
		.trim()
		.slice(0, 40);
	if (name) {
		params.set("name", name);
	}
	if (seoState.page > 1) {
		params.set("page", String(seoState.page));
	}
	appendTrackingQueryParams(params, searchParams);
	return params;
}

function createSeoCard(product = {}, occasion = "") {
	const title = getProductDisplayName(product);
	const href = buildProductPath(product);
	return {
		productId: product?._id || "",
		title,
		priceText: `$${getProductPrice(product).toFixed(2)}`,
		href,
		imageUrl: getPrimaryProductImage(product, occasion ? { occasion } : {}),
		isPod: true,
	};
}

export async function generateMetadata({ searchParams }) {
	const resolvedSearchParams = await searchParams;
	const seoState = buildPodCollectionSeo(resolvedSearchParams);
	return createMetadata({
		title: seoState.title,
		description: seoState.description,
		pathname: "/custom-gifts",
		searchParams: seoState.canonicalSearchParams,
		keywords: seoState.keywords,
		noindex: seoState.noindex,
	});
}

export default async function CustomGiftsPage({ searchParams }) {
	const resolvedSearchParams = await searchParams;
	const seoState = buildPodCollectionSeo(resolvedSearchParams);
	const routeSearchParams = buildPodCollectionRouteSearchParams(
		resolvedSearchParams,
		seoState
	);
	if (
		serializeComparableSearchParams(resolvedSearchParams) !==
		serializeComparableSearchParams(routeSearchParams)
	) {
		const query = routeSearchParams.toString();
		permanentRedirect(query ? `/custom-gifts?${query}` : "/custom-gifts");
	}
	let seoCards = [];
	try {
		const products = await getPodProducts({ revalidate: 180, limit: 12, lite: true });
		seoCards = Array.isArray(products)
			? products
					.slice(0, 12)
					.map((product) => createSeoCard(product, seoState.occasion))
					.filter((card) => card.href)
			: [];
	} catch {}

	const canonicalSuffix = seoState.canonicalSearchParams.toString();
	const schema = itemListSchema({
		name: seoState.schemaName,
		url: absoluteUrl(
			canonicalSuffix ? `/custom-gifts?${canonicalSuffix}` : "/custom-gifts"
		),
		items: seoCards.map((card) => ({
			name: card.title,
			url: absoluteUrl(card.href),
			image: card.imageUrl,
		})),
	});
	const breadcrumbs =
		seoState.occasion && !seoState.noindex
			? breadcrumbSchema([
					{ name: "Home", url: absoluteUrl("/") },
					{ name: "Custom Gifts", url: absoluteUrl("/custom-gifts") },
					{
						name: seoState.occasion,
						url: absoluteUrl(
							canonicalSuffix ? `/custom-gifts?${canonicalSuffix}` : "/custom-gifts"
						),
					},
			  ])
			: null;

	return (
		<>
			<JsonLd data={schema} />
			<JsonLd data={breadcrumbs} />
			<PodListRouteClient />
		</>
	);
}
