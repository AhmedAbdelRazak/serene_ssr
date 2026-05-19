import ShopRouteClient from "@/components/public/routes/ShopRouteClient";
import JsonLd from "@/components/seo/JsonLd";
import SeoCrawlSupport from "@/components/seo/SeoCrawlSupport";
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

function buildShopPaginationLinks(seoState = {}, totalPages = 1) {
	const currentPage = Number(seoState?.page || 1);
	const safeTotalPages = Math.max(1, Number(totalPages || 1));
	const pages = new Set();

	for (let page = 1; page <= Math.min(safeTotalPages, 8); page += 1) {
		if (page !== currentPage) pages.add(page);
	}
	if (currentPage > 1) pages.add(currentPage - 1);
	if (currentPage < safeTotalPages) pages.add(currentPage + 1);

	return [...pages]
		.sort((a, b) => a - b)
		.map((page) => {
			const params = new URLSearchParams(seoState?.canonicalSearchParams);
			if (page > 1) {
				params.set("page", String(page));
			} else {
				params.delete("page");
			}
			const query = params.toString();
			return {
				href: query ? `/our-products?${query}` : "/our-products",
				label: page > 1 ? `Products page ${page}` : "Products page 1",
			};
		});
}

function buildShopSeoLinks({
	categories = [],
	cards = [],
	pageLinks = [],
} = {}) {
	const links = [
		{ href: "/", label: "Home" },
		{ href: "/custom-gifts", label: "Custom gifts" },
		{ href: "/contact", label: "Contact" },
		...pageLinks,
	];

	for (const card of cards.slice(0, 30)) {
		if (card.href && card.title) {
			links.push({ href: card.href, label: card.title });
		}
	}

	for (const category of categories.slice(0, 6)) {
		const categoryId = `${category?._id || ""}`.trim();
		const categorySlug = `${category?.categorySlug || ""}`.trim();
		const categoryName = `${category?.categoryName || ""}`.trim();
		if (!categoryId || !categoryName) continue;
		const params = new URLSearchParams();
		params.set("category", categoryId);
		if (categorySlug) params.set("categorySlug", categorySlug);
		links.push({
			href: `/our-products?${params.toString()}`,
			label: categoryName,
		});
	}

	const seen = new Set();
	return links.filter((link) => {
		if (!link.href || seen.has(link.href)) return false;
		seen.add(link.href);
		return true;
	});
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
		pathname: seoState.redirectPathname || "/our-products",
		searchParams:
			seoState.redirectSearchParams || seoState.canonicalSearchParams,
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
	if (seoState.redirectPathname) {
		const redirectSearchParams = new URLSearchParams(
			seoState.redirectSearchParams || undefined
		);
		appendTrackingQueryParams(redirectSearchParams, resolvedSearchParams);
		const query = redirectSearchParams.toString();
		permanentRedirect(
			query
				? `${seoState.redirectPathname}?${query}`
				: seoState.redirectPathname
		);
	}
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
	let totalPages = 1;
	let initialRouteData = null;
	try {
		const productsPayload = await getFilteredProducts({
			filters: filters || "all",
			page,
			records: 30,
			revalidate: 180,
		});
		totalPages = Math.max(
			1,
			Math.ceil(Number(productsPayload?.totalRecords || 0) / 30)
		);
		seoCards = Array.isArray(productsPayload?.products)
			? productsPayload.products.map(createSeoCard).filter((card) => card.href)
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
			<SeoCrawlSupport
				title={seoState.schemaName}
				description={seoState.description}
				paragraphs={[
					"Browse Serene Jannat by category, occasion, and product style. These collection links help shoppers find decor, candles, vases, outdoor pieces, and gift-ready items without relying on filters alone.",
					"Each paginated collection keeps a clear path back to featured products, related pages, and the main storefront so shoppers can continue browsing even when a page has only a few remaining items.",
				]}
				links={buildShopSeoLinks({
					categories: Array.isArray(categoriesPayload?.categories)
						? categoriesPayload.categories
						: [],
					cards: seoCards,
					pageLinks: buildShopPaginationLinks(seoState, totalPages),
				})}
			/>
		</>
	);
}
