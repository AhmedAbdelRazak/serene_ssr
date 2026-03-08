import LegacyFrontendAppEntry from "@/components/legacy/LegacyFrontendAppEntry";
import JsonLd from "@/components/seo/JsonLd";
import { getProductById } from "@/lib/api";
import {
	getPrimaryProductImage,
	getProductDescription,
	getProductDisplayName,
	getProductPrice,
	getProductSlug,
} from "@/lib/product-helpers";
import { createMetadata, productSchema } from "@/lib/seo";
import { absoluteUrl } from "@/lib/config";

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

export async function generateMetadata({ params, searchParams }) {
	const parsed = parseSegments(params?.segments || []);
	if (!parsed?.productId) {
		return createMetadata({
			title: "Custom Gift Product",
			description: "Personalized print-on-demand product details.",
			pathname: "/custom-gifts",
		});
	}

	try {
		const product = await getProductById(parsed.productId, { revalidate: 120 });
		const name = getProductDisplayName(product);
		const description = getProductDescription(product);
		const occasion = getSafeSearchParamValue(searchParams, "occasion");
		const recipient = getSafeSearchParamValue(searchParams, "name");
		const color = getSafeSearchParamValue(searchParams, "color");
		const size = getSafeSearchParamValue(searchParams, "size");
		const scent = getSafeSearchParamValue(searchParams, "scent");
		const image = getPrimaryProductImage(
			product,
			getPodImageSelectionOptions(searchParams)
		);
		const canonicalSlug = getProductSlug(product);
		const path = parsed.productSlug
			? `/custom-gifts/${canonicalSlug}/${parsed.productId}`
			: `/custom-gifts/${parsed.productId}`;
		return createMetadata({
			title: `${name} | Custom Gift`,
			description,
			pathname: path,
			image,
			keywords: [
				"custom gift",
				"print on demand",
				name,
				occasion,
				recipient,
				color,
				size,
				scent,
			].filter(Boolean),
		});
	} catch {
		return createMetadata({
			title: "Custom Gift Product",
			description: "Personalized print-on-demand product details.",
			pathname: "/custom-gifts",
		});
	}
}

export default async function PodProductPage({ params, searchParams }) {
	const parsed = parseSegments(params?.segments || []);
	if (!parsed?.productId) return <LegacyFrontendAppEntry />;

	let product = null;
	try {
		product = await getProductById(parsed.productId, { revalidate: 90 });
	} catch {}

	if (!product) return <LegacyFrontendAppEntry />;

	const title = getProductDisplayName(product);
	const description = getProductDescription(product);
	const image = getPrimaryProductImage(
		product,
		getPodImageSelectionOptions(searchParams)
	);
	const price = getProductPrice(product);
	const slug = getProductSlug(product);
	const schema = productSchema({
		name: title,
		description,
		image,
		price,
		url: absoluteUrl(`/custom-gifts/${slug}/${parsed.productId}`),
		availability:
			Number(product?.quantity || 0) > 0
				? "https://schema.org/InStock"
				: "https://schema.org/OutOfStock",
	});

	return (
		<>
			<JsonLd data={schema} />
			<LegacyFrontendAppEntry />
		</>
	);
}
