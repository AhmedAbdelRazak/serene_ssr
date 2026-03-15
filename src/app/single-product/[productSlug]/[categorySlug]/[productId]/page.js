import ProductRouteClient from "@/components/public/routes/ProductRouteClient";
import JsonLd from "@/components/seo/JsonLd";
import { getProductById } from "@/lib/api";
import {
	buildProductPath,
	getPrimaryProductImage,
	getProductDescription,
	getProductDisplayName,
	getProductInventoryCount,
	getProductPrice,
} from "@/lib/product-helpers";
import { createPublicProductBootstrap } from "@/lib/public-product";
import { breadcrumbSchema, createMetadata, productSchema } from "@/lib/seo";
import { absoluteUrl } from "@/lib/config";
import { notFound } from "next/navigation";

export const revalidate = 300;

function getSafeSearchParamValue(source, key) {
	const raw = source?.[key];
	if (Array.isArray(raw)) return `${raw[0] ?? ""}`.trim();
	if (typeof raw === "symbol") return "";
	return `${raw ?? ""}`.trim();
}

function getVariantSelection(searchParams = {}) {
	return {
		color: getSafeSearchParamValue(searchParams, "color"),
		size: getSafeSearchParamValue(searchParams, "size"),
		scent: getSafeSearchParamValue(searchParams, "scent"),
	};
}

function buildVariantSearchParams(searchParams = {}) {
	const params = new URLSearchParams();
	const selection = getVariantSelection(searchParams);
	if (selection.color) params.set("color", selection.color);
	if (selection.size) params.set("size", selection.size);
	if (selection.scent) params.set("scent", selection.scent);
	return params;
}

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
		const name = getProductDisplayName(product);
		const description = getProductDescription(product);
		const selection = getVariantSelection(resolvedSearchParams);
		const variationLabel = buildVariantLabel(selection);
		const image = getPrimaryProductImage(product, selection);
		const canonicalPath = buildProductPath(product);
		const canonicalSearchParams = buildVariantSearchParams(resolvedSearchParams);
		return createMetadata({
			title: variationLabel
				? `${name} | ${variationLabel} | Serene Jannat`
				: `${name} | Serene Jannat`,
			description: variationLabel
				? `${description} This variation reflects ${variationLabel.toLowerCase()}. Additional options may be available on the product page.`
				: description,
			pathname: canonicalPath,
			searchParams: canonicalSearchParams,
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

	const selection = getVariantSelection(resolvedSearchParams);
	const title = getProductDisplayName(product);
	const description = getProductDescription(product);
	const variationLabel = buildVariantLabel(selection);
	const image = getPrimaryProductImage(product, selection);
	const price = getProductPrice(product);
	const inventoryCount = getProductInventoryCount(product);
	const bootstrapProduct = createPublicProductBootstrap(product);
	const canonicalPath = buildProductPath(product);
	const redirectParams = buildVariantSearchParams(resolvedSearchParams);
	const redirectQuery = redirectParams.toString();

	const canonicalUrl = absoluteUrl(
		redirectQuery ? `${canonicalPath}?${redirectQuery}` : canonicalPath
	);
	const schema = productSchema({
		name: variationLabel ? `${title} - ${variationLabel}` : title,
		description: variationLabel
			? `${description} This product variation reflects ${variationLabel.toLowerCase()}.`
			: description,
		image,
		price,
		url: canonicalUrl,
		availability:
			inventoryCount > 0
				? "https://schema.org/InStock"
				: "https://schema.org/OutOfStock",
	});
	schema.itemGroupId = product?._id;
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
		price,
		image,
		selection,
		canonicalPath,
		availabilityLabel: inventoryCount > 0 ? "In stock" : "Out of stock",
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
