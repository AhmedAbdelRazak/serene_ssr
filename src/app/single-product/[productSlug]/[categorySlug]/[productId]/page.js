import { notFound } from "next/navigation";
import LegacyFrontendAppEntry from "@/components/legacy/LegacyFrontendAppEntry";
import JsonLd from "@/components/seo/JsonLd";
import { getSingleProductBySlug } from "@/lib/api";
import {
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
		const product = await getSingleProductBySlug({
			productSlug: params.productSlug,
			categorySlug: params.categorySlug,
			productId: params.productId,
			revalidate: 120,
		});
		const name = getProductDisplayName(product);
		const description = getProductDescription(product);
		const image = getPrimaryProductImage(product);
		const color = getSafeSearchParamValue(searchParams, "color");
		const size = getSafeSearchParamValue(searchParams, "size");
		const scent = getSafeSearchParamValue(searchParams, "scent");
		return createMetadata({
			title: `${name} | Serene Jannat`,
			description,
			pathname: `/single-product/${params.productSlug}/${params.categorySlug}/${params.productId}`,
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
	let product;
	try {
		product = await getSingleProductBySlug({
			productSlug: params.productSlug,
			categorySlug: params.categorySlug,
			productId: params.productId,
			revalidate: 90,
		});
	} catch {
		notFound();
	}

	const title = getProductDisplayName(product);
	const description = getProductDescription(product);
	const image = getPrimaryProductImage(product);
	const price = getProductPrice(product);
	const schema = productSchema({
		name: title,
		description,
		image,
		price,
		url: absoluteUrl(
			`/single-product/${params.productSlug}/${params.categorySlug}/${params.productId}`
		),
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
