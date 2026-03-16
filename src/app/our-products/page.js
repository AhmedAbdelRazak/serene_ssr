import ShopRouteClient from "@/components/public/routes/ShopRouteClient";
import JsonLd from "@/components/seo/JsonLd";
import { absoluteUrl } from "@/lib/config";
import { getCategoriesAndSubcategories, getFilteredProducts } from "@/lib/api";
import {
	buildShopCollectionSeo,
	getSafeSearchParamValue,
} from "@/lib/collection-seo";
import {
	appendTrackingQueryParams,
	serializeComparableSearchParams,
} from "@/lib/product-route-url";
import {
	buildProductPath,
	getPrimaryProductImage,
	getProductDisplayName,
	getProductPrice,
	isPodProduct,
} from "@/lib/product-helpers";
import { breadcrumbSchema, createMetadata, itemListSchema } from "@/lib/seo";
import { permanentRedirect } from "next/navigation";

export const revalidate = 300;

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
	const categoriesPayload = await getCategoriesAndSubcategories({
		revalidate: 1800,
	}).catch(() => null);
	const seoState = buildShopCollectionSeo(
		resolvedSearchParams,
		Array.isArray(categoriesPayload?.categories) ? categoriesPayload.categories : []
	);
	return createMetadata({
		title: seoState.title,
		description: seoState.description,
		pathname: "/our-products",
		searchParams: seoState.canonicalSearchParams,
		keywords: seoState.keywords,
		noindex: seoState.noindex,
	});
}

export default async function OurProductsPage({ searchParams }) {
	const resolvedSearchParams = await searchParams;
	const categoriesPayload = await getCategoriesAndSubcategories({
		revalidate: 1800,
	}).catch(() => null);
	const seoState = buildShopCollectionSeo(
		resolvedSearchParams,
		Array.isArray(categoriesPayload?.categories) ? categoriesPayload.categories : []
	);
	if (!seoState.hasUnsupportedKeys) {
		const routeSearchParams = new URLSearchParams(seoState.canonicalSearchParams);
		appendTrackingQueryParams(routeSearchParams, resolvedSearchParams);
		if (
			serializeComparableSearchParams(resolvedSearchParams) !==
			serializeComparableSearchParams(routeSearchParams)
		) {
			const query = routeSearchParams.toString();
			permanentRedirect(query ? `/our-products?${query}` : "/our-products");
		}
	}
	const filterSource =
		seoState.categoryId && !getSafeSearchParamValue(resolvedSearchParams, "category")
			? { ...resolvedSearchParams, category: seoState.categoryId }
			: resolvedSearchParams;
	const filters = buildFiltersQuery(filterSource);
	const page = seoState.page;

	let seoCards = [];
	let initialRouteData = null;
	try {
		const productsPayload = await getFilteredProducts({
			filters: filters || "all",
			page,
			records: 30,
			revalidate: 180,
		});
		seoCards = Array.isArray(productsPayload?.products)
			? productsPayload.products.slice(0, 12).map(createSeoCard).filter((card) => card.href)
			: [];
		initialRouteData = {
			type: "shop",
			filters: filters || "all",
			page,
			records: 30,
			payload: productsPayload,
		};
	} catch {}

	const canonicalSuffix = seoState.canonicalSearchParams.toString();
	const schema = itemListSchema({
		name: seoState.schemaName,
		url: absoluteUrl(canonicalSuffix ? `/our-products?${canonicalSuffix}` : "/our-products"),
		items: seoCards.map((card) => ({
			name: card.title,
			url: absoluteUrl(card.href),
			image: card.imageUrl,
		})),
	});
	const breadcrumbs =
		seoState.categoryName && !seoState.noindex
			? breadcrumbSchema([
					{ name: "Home", url: absoluteUrl("/") },
					{ name: "Our Products", url: absoluteUrl("/our-products") },
					{
						name: seoState.categoryName,
						url: absoluteUrl(
							canonicalSuffix ? `/our-products?${canonicalSuffix}` : "/our-products"
						),
					},
			  ])
			: null;

	return (
		<>
			<JsonLd data={schema} />
			<JsonLd data={breadcrumbs} />
			<ShopRouteClient initialRouteData={initialRouteData} />
		</>
	);
}
