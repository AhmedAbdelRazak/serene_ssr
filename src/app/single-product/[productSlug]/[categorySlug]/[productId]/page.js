import LegacyFrontendAppEntry from "@/components/legacy/LegacyFrontendAppEntry";
import JsonLd from "@/components/seo/JsonLd";
import { getProductById } from "@/lib/api";
import {
	buildProductPath,
	getPrimaryProductImage,
	getProductDescription,
	getProductDisplayName,
	getProductPrice,
} from "@/lib/product-helpers";
import { createMetadata, productSchema } from "@/lib/seo";
import { absoluteUrl } from "@/lib/config";

function getSafeSearchParamValue(source, key) {
	const raw = source?.[key];
	if (Array.isArray(raw)) return `${raw[0] ?? ""}`.trim();
	if (typeof raw === "symbol") return "";
	return `${raw ?? ""}`.trim();
}

export async function generateMetadata({ params, searchParams }) {
	try {
		const product = await getProductById(params.productId, { revalidate: 120 });
		const name = getProductDisplayName(product);
		const description = getProductDescription(product);
		const image = getPrimaryProductImage(product);
		const color = getSafeSearchParamValue(searchParams, "color");
		const size = getSafeSearchParamValue(searchParams, "size");
		const scent = getSafeSearchParamValue(searchParams, "scent");
		const canonicalPath = buildProductPath(product);
		return createMetadata({
			title: `${name} | Serene Jannat`,
			description,
			pathname: canonicalPath,
			searchParams,
			image,
			keywords: [name, params.categorySlug, "shop", color, size, scent].filter(
				Boolean
			),
		});
	} catch {
		return createMetadata({
			title: "Product",
			description: "Product details page.",
			pathname: `/single-product/${params.productSlug}/${params.categorySlug}/${params.productId}`,
			searchParams,
		});
	}
}

export default async function SingleProductPage({ params }) {
	let product = null;
	try {
		product = await getProductById(params.productId, { revalidate: 90 });
	} catch {}

	if (!product) return <LegacyFrontendAppEntry />;

	const title = getProductDisplayName(product);
	const description = getProductDescription(product);
	const image = getPrimaryProductImage(product);
	const price = getProductPrice(product);
	const canonicalPath = buildProductPath(product);
	const schema = productSchema({
		name: title,
		description,
		image,
		price,
		url: absoluteUrl(canonicalPath),
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
