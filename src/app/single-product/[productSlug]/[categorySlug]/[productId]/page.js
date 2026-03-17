import ProductRouteClient from "@/components/public/routes/ProductRouteClient";
import JsonLd from "@/components/seo/JsonLd";
import { getProductById } from "@/lib/api";
import {
	buildProductPath,
	getPrimaryProductImage,
	getProductDescription,
	getProductDisplayName,
} from "@/lib/product-helpers";
import { getSelectedStandardOffer } from "@/lib/product-offer";
import {
	sanitizeStandardProductRoute,
	serializeComparableSearchParams,
} from "@/lib/product-route-url";
import { createPublicProductBootstrap } from "@/lib/public-product";
import { breadcrumbSchema, createMetadata, productSchema } from "@/lib/seo";
import { absoluteUrl } from "@/lib/config";
import { notFound, permanentRedirect } from "next/navigation";

export const revalidate = 300;

function buildVariantLabel({ color = "", size = "", scent = "" } = {}) {
	return [color, size, scent].filter(Boolean).join(" / ");
}

export async function generateMetadata({ params, searchParams }) {
	const resolvedParams = await params;
	const resolvedSearchParams = await searchParams;
	try {
		const product = await getProductById(resolvedParams?.productId, {
			revalidate: 120,
		});
		const routeState = sanitizeStandardProductRoute(product, resolvedSearchParams);
		const name = getProductDisplayName(product);
		const description = getProductDescription(product);
		const selection = routeState.selection;
		const variationLabel = buildVariantLabel(selection);
		const image = getPrimaryProductImage(product, selection);
		const canonicalPath = buildProductPath(product);
		return createMetadata({
			title: variationLabel
				? `${name} | ${variationLabel} | Serene Jannat`
				: `${name} | Serene Jannat`,
			description: variationLabel
				? `${description} This variation reflects ${variationLabel.toLowerCase()}. Additional options may be available on the product page.`
				: description,
			pathname: canonicalPath,
			image,
			keywords: [
				name,
				resolvedParams?.categorySlug,
				"shop",
				selection.color,
				selection.size,
				selection.scent,
			].filter(Boolean),
		});
	} catch {
		return createMetadata({
			title: "Product",
			description: "Product details page.",
			pathname: `/single-product/${resolvedParams?.productSlug || ""}/${
				resolvedParams?.categorySlug || ""
			}/${resolvedParams?.productId || ""}`,
			noindex: true,
		});
	}
}

export default async function SingleProductPage({ params, searchParams }) {
	const resolvedParams = await params;
	const resolvedSearchParams = await searchParams;
	let product = null;
	try {
		product = await getProductById(resolvedParams?.productId, { revalidate: 90 });
	} catch {}

	if (!product) {
		notFound();
	}

	const routeState = sanitizeStandardProductRoute(product, resolvedSearchParams);
	const selection = routeState.selection;
	const title = getProductDisplayName(product);
	const description = getProductDescription(product);
	const variationLabel = buildVariantLabel(selection);
	const image = getPrimaryProductImage(product, selection);
	const bootstrapProduct = createPublicProductBootstrap(product);
	const canonicalPath = buildProductPath(product);
	const routeQuery = routeState.routeSearchParams.toString();
	const routeUrl = routeQuery ? `${canonicalPath}?${routeQuery}` : canonicalPath;
	const requestPath = `/single-product/${resolvedParams?.productSlug || ""}/${
		resolvedParams?.categorySlug || ""
	}/${resolvedParams?.productId || ""}`;

	if (
		requestPath !== canonicalPath ||
		serializeComparableSearchParams(resolvedSearchParams) !==
			serializeComparableSearchParams(routeState.routeSearchParams)
	) {
		permanentRedirect(routeUrl);
	}

	const selectedOffer = getSelectedStandardOffer(product, selection);
	const canonicalUrl = absoluteUrl(routeUrl);
	const schema = productSchema({
		name: variationLabel ? `${title} - ${variationLabel}` : title,
		description: variationLabel
			? `${description} This product variation reflects ${variationLabel.toLowerCase()}.`
			: description,
		image,
		price: selectedOffer.price,
		url: canonicalUrl,
		availability: selectedOffer.availabilityUrl,
		sku: selectedOffer.sku,
		mpn: selectedOffer.mpn,
		itemGroupId: selectedOffer.itemGroupId,
	});
	const ratings = Array.isArray(product?.ratings) ? product.ratings : [];
	if (ratings.length > 0) {
		const ratingValue =
			ratings.reduce((sum, rating) => sum + Number(rating?.star || 0), 0) /
			ratings.length;
		schema.aggregateRating = {
			"@type": "AggregateRating",
			ratingValue: Number(ratingValue.toFixed(1)),
			reviewCount: ratings.length,
		};
	}
	schema.additionalProperty = [
		selection.color && {
			"@type": "PropertyValue",
			name: "Color",
			value: selection.color,
		},
		selection.size && {
			"@type": "PropertyValue",
			name: "Size",
			value: selection.size,
		},
		selection.scent && {
			"@type": "PropertyValue",
			name: "Scent",
			value: selection.scent,
		},
		].filter(Boolean);

	const breadcrumbs = breadcrumbSchema([
		{ name: "Home", url: absoluteUrl("/") },
		{ name: "Our Products", url: absoluteUrl("/our-products") },
		{ name: title, url: canonicalUrl },
	]);

	const initialRouteData = {
		type: "standard-product",
		productSlug: resolvedParams?.productSlug || "",
		categorySlug: resolvedParams?.categorySlug || "",
		product: bootstrapProduct,
		title,
		description,
		price: selectedOffer.price,
		image,
		selection,
		canonicalPath,
		availabilityLabel: selectedOffer.availabilityLabel,
		hydrateProductOnMount: true,
	};

	return (
		<>
			<JsonLd data={schema} />
			<JsonLd data={breadcrumbs} />
			<ProductRouteClient initialRouteData={initialRouteData} />
		</>
	);
}
