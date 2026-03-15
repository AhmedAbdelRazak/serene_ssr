import PodProductRouteClient from "@/components/public/routes/PodProductRouteClient";
import JsonLd from "@/components/seo/JsonLd";
import { getProductById } from "@/lib/api";
import {
	getPrimaryProductImage,
	getProductDescription,
	getProductDisplayName,
	getProductInventoryCount,
	getProductPrice,
	getProductSlug,
} from "@/lib/product-helpers";
import {
	normalizePodProduct,
	resolveInitialPodVariantSelection,
} from "@/lib/pod-product";
import { breadcrumbSchema, createMetadata, productSchema } from "@/lib/seo";
import { absoluteUrl } from "@/lib/config";
import { notFound } from "next/navigation";

function parseSegments(segments = []) {
	if (!Array.isArray(segments) || segments.length === 0) return null;
	if (segments.length === 1) {
		return {
			productId: segments[0],
			productSlug: "",
		};
	}
	return {
		productSlug: segments[0],
		productId: segments[1],
	};
}

function getSafeSearchParamValue(source, key) {
	const raw = source?.[key];
	if (Array.isArray(raw)) return `${raw[0] ?? ""}`.trim();
	if (typeof raw === "symbol") return "";
	return `${raw ?? ""}`.trim();
}

function getPodImageSelectionOptions(searchParams = {}) {
	return {
		occasion: getSafeSearchParamValue(searchParams, "occasion"),
		name: getSafeSearchParamValue(searchParams, "name"),
		color: getSafeSearchParamValue(searchParams, "color"),
		size: getSafeSearchParamValue(searchParams, "size"),
		scent: getSafeSearchParamValue(searchParams, "scent"),
	};
}

function buildPodSearchParams(searchParams = {}, { includeName = false } = {}) {
	const params = new URLSearchParams();
	const occasion = getSafeSearchParamValue(searchParams, "occasion");
	const name = getSafeSearchParamValue(searchParams, "name");
	const color = getSafeSearchParamValue(searchParams, "color");
	const size = getSafeSearchParamValue(searchParams, "size");
	const scent = getSafeSearchParamValue(searchParams, "scent");

	if (occasion) params.set("occasion", occasion);
	if (includeName && name) params.set("name", name);
	if (color) params.set("color", color);
	if (size) params.set("size", size);
	if (scent) params.set("scent", scent);

	return params;
}

function buildVariantLabel({ occasion = "", color = "", size = "", scent = "" } = {}) {
	return [occasion, color, size, scent].filter(Boolean).join(" / ");
}

export async function generateMetadata({ params, searchParams }) {
	const resolvedParams = await params;
	const resolvedSearchParams = await searchParams;
	const parsed = parseSegments(resolvedParams?.segments || []);
	if (!parsed?.productId) {
		return createMetadata({
			title: "Custom Gift Product",
			description: "Personalized print-on-demand product details.",
			pathname: "/custom-gifts",
			noindex: true,
		});
	}

	try {
		const product = await getProductById(parsed.productId, { revalidate: 120 });
		const name = getProductDisplayName(product);
		const description = getProductDescription(product);
		const selection = getPodImageSelectionOptions(resolvedSearchParams);
		const variationLabel = buildVariantLabel(selection);
		const image = getPrimaryProductImage(
			product,
			selection
		);
		const canonicalSlug = getProductSlug(product);
		const path = `/custom-gifts/${canonicalSlug}/${parsed.productId}`;
		const canonicalSearchParams = buildPodSearchParams(resolvedSearchParams);
		const title = variationLabel
			? `${name} | ${variationLabel} | Custom Gift`
			: `${name} | Custom Gift`;
		const descriptionSuffix = variationLabel
			? ` Customize this gift further on the product page after choosing ${variationLabel.toLowerCase()}.`
			: " Customize this gift further on the product page with available occasion, color, size, and scent options.";
		return createMetadata({
			title,
			description: `${description}${descriptionSuffix}`,
			pathname: path,
			searchParams: canonicalSearchParams,
			image,
			keywords: [
				"custom gift",
				"print on demand",
				name,
				selection.occasion,
				selection.color,
				selection.size,
				selection.scent,
			].filter(Boolean),
		});
	} catch {
		return createMetadata({
			title: "Custom Gift Product",
			description: "Personalized print-on-demand product details.",
			pathname: "/custom-gifts",
			noindex: true,
		});
	}
}

export default async function PodProductPage({ params, searchParams }) {
	const resolvedParams = await params;
	const resolvedSearchParams = await searchParams;
	const parsed = parseSegments(resolvedParams?.segments || []);
	if (!parsed?.productId) {
		notFound();
	}

	let product = null;
	try {
		product = await getProductById(parsed.productId, { revalidate: 90 });
	} catch {}

	if (!product) {
		notFound();
	}

	const title = getProductDisplayName(product);
	const description = getProductDescription(product);
	const selection = getPodImageSelectionOptions(resolvedSearchParams);
	const variationLabel = buildVariantLabel(selection);
	const image = getPrimaryProductImage(
		product,
		selection
	);
	const price = getProductPrice(product);
	const inventoryCount = getProductInventoryCount(product);
	const slug = getProductSlug(product);
	const normalizedProduct = normalizePodProduct(product);
	const initialVariantSelection = resolveInitialPodVariantSelection(
		normalizedProduct,
		selection
	);
	const canonicalPath = `/custom-gifts/${slug}/${parsed.productId}`;
	const canonicalMetadataParams = buildPodSearchParams(resolvedSearchParams);
	const canonicalQuery = canonicalMetadataParams.toString();
	const canonicalUrl = absoluteUrl(
		canonicalQuery ? `${canonicalPath}?${canonicalQuery}` : canonicalPath
	);
	const schema = productSchema({
		name: variationLabel ? `${title} - ${variationLabel}` : title,
		description: `${description} Customize the final design on the product page.`,
		image,
		price,
		url: canonicalUrl,
		availability:
			inventoryCount > 0
				? "https://schema.org/InStock"
				: "https://schema.org/OutOfStock",
	});
	schema.itemGroupId = product?.printifyProductDetails?.id || product?._id;
	schema.additionalProperty = [
		selection.occasion && {
			"@type": "PropertyValue",
			name: "Occasion",
			value: selection.occasion,
		},
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
			{
				"@type": "PropertyValue",
				name: "Customization",
				value:
					"Customers can further personalize the final product on the product page.",
			},
		].filter(Boolean);

	const breadcrumbs = breadcrumbSchema([
		{ name: "Home", url: absoluteUrl("/") },
		{ name: "Custom Gifts", url: absoluteUrl("/custom-gifts") },
		{ name: title, url: canonicalUrl },
	]);

	const initialRouteData = {
		type: "pod-product",
		productId: parsed.productId,
		productSlug: slug,
		title,
		price,
		image,
		selection: {
			occasion: selection.occasion,
			name: selection.name,
			color: initialVariantSelection.color,
			size: initialVariantSelection.size,
			scent: initialVariantSelection.scent,
		},
		product: normalizedProduct,
	};

	return (
		<>
			<JsonLd data={schema} />
			<JsonLd data={breadcrumbs} />
			<PodProductRouteClient initialRouteData={initialRouteData} />
		</>
	);
}
