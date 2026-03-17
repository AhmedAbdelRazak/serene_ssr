import PodProductRouteClient from "@/components/public/routes/PodProductRouteClient";
import JsonLd from "@/components/seo/JsonLd";
import { getProductById, getWebsiteSetupData } from "@/lib/api";
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
import {
	sanitizePodProductRoute,
	serializeComparableSearchParams,
} from "@/lib/product-route-url";
import { breadcrumbSchema, createMetadata, productSchema } from "@/lib/seo";
import { absoluteUrl } from "@/lib/config";
import { notFound, permanentRedirect } from "next/navigation";

export const revalidate = 300;

function parseSegments(segments = []) {
	if (!Array.isArray(segments) || segments.length === 0) return null;
	if (segments.length === 1) {
		return {
			productId: segments[0],
			productSlug: "",
			extraSegments: [],
		};
	}
	return {
		productSlug: segments[0],
		productId: segments[1],
		extraSegments: segments.slice(2),
	};
}

function buildVariantLabel({ occasion = "", color = "", size = "", scent = "" } = {}) {
	return [occasion, color, size, scent].filter(Boolean).join(" / ");
}

function buildPodSeoKeywords(name = "", selection = {}) {
	const safeName = `${name || ""}`.trim();
	const occasion = `${selection?.occasion || ""}`.trim();
	const color = `${selection?.color || ""}`.trim();
	const size = `${selection?.size || ""}`.trim();
	const scent = `${selection?.scent || ""}`.trim();
	const keywords = [
		"custom gift",
		"personalized gift",
		"print on demand",
		safeName,
		occasion && `${occasion} gift`,
		occasion && safeName && `${occasion} ${safeName}`,
		occasion && safeName && `personalized ${occasion} ${safeName}`,
		size && safeName && `${size} ${safeName}`,
		color && safeName && `${color} ${safeName}`,
		scent && safeName && `${scent} ${safeName}`,
	];
	return keywords.filter(Boolean);
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
		const routeState = sanitizePodProductRoute(product, resolvedSearchParams);
		const selection = routeState.selection;
		const variationLabel = buildVariantLabel(selection);
		const image = getPrimaryProductImage(
			product,
			selection
		);
		const canonicalSlug = getProductSlug(product);
		const path = `/custom-gifts/${canonicalSlug}/${parsed.productId}`;
		const variantSuffix = [selection.color, selection.size, selection.scent]
			.filter(Boolean)
			.join(" / ");
		const title = selection.occasion
			? `${selection.occasion} ${name}${
					variantSuffix ? ` | ${variantSuffix}` : ""
			  } | Personalized Gift`
			: variationLabel
				? `${name} | ${variationLabel} | Personalized Gift`
				: `${name} | Personalized Gift`;
		const descriptionSuffix = selection.occasion
			? ` Customize this ${name.toLowerCase()} for ${selection.occasion.toLowerCase()} with available color, size, and scent options on the product page.`
			: variationLabel
				? ` Customize this gift further on the product page after choosing ${variationLabel.toLowerCase()}.`
				: " Customize this gift further on the product page with available occasion, color, size, and scent options.";
		return createMetadata({
			title,
			description: `${description}${descriptionSuffix}`,
			pathname: path,
			image,
			keywords: buildPodSeoKeywords(name, selection),
			noindex: Boolean(selection.name),
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

	const [productResult, websiteSetupResult] = await Promise.allSettled([
		getProductById(parsed.productId, { revalidate: 90 }),
		getWebsiteSetupData({ revalidate: 1800 }),
	]);
	const product =
		productResult.status === "fulfilled" ? productResult.value : null;
	const websiteSetup =
		websiteSetupResult.status === "fulfilled" ? websiteSetupResult.value : null;

	if (!product) {
		notFound();
	}

	const title = getProductDisplayName(product);
	const description = getProductDescription(product);
	const routeState = sanitizePodProductRoute(product, resolvedSearchParams);
	const selection = routeState.selection;
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
	const routeQuery = routeState.routeSearchParams.toString();
	const routeUrl = routeQuery ? `${canonicalPath}?${routeQuery}` : canonicalPath;
	const requestPath = `/custom-gifts/${(resolvedParams?.segments || []).join("/")}`;

	if (
		requestPath !== canonicalPath ||
		serializeComparableSearchParams(resolvedSearchParams) !==
			serializeComparableSearchParams(routeState.routeSearchParams)
	) {
		permanentRedirect(routeUrl);
	}

	const canonicalUrl = absoluteUrl(canonicalPath);
	const schema = productSchema({
		name: variationLabel ? `${title} - ${variationLabel}` : title,
		description: selection.occasion
			? `${description} Personalized for ${selection.occasion}. Customize the final design on the product page.`
			: `${description} Customize the final design on the product page.`,
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
		websiteSetup,
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
