import PodListRouteClient from "@/components/public/routes/PodListRouteClient";
import JsonLd from "@/components/seo/JsonLd";
import { absoluteUrl } from "@/lib/config";
import { buildPodCollectionSeo } from "@/lib/collection-seo";
import { getPodProducts } from "@/lib/api";
import {
	buildPodSelectionQuery,
	buildProductPath,
	getPrimaryProductImage,
	getProductDisplayName,
	getProductPrice,
} from "@/lib/product-helpers";
import { breadcrumbSchema, createMetadata, itemListSchema } from "@/lib/seo";

export const revalidate = 300;

function createSeoCard(product = {}, occasion = "") {
	const title = getProductDisplayName(product);
	const href = buildProductPath(product);
	const query = buildPodSelectionQuery(occasion ? { occasion } : {});
	return {
		productId: product?._id || "",
		title,
		priceText: `$${getProductPrice(product).toFixed(2)}`,
		href: query ? `${href}?${query}` : href,
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
