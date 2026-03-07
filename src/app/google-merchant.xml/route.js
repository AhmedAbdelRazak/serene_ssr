import { getAllProductsForSeo } from "@/lib/api";
import { absoluteUrl } from "@/lib/config";
import {
	buildProductPath,
	getPrimaryProductImage,
	getProductDescription,
	getProductDisplayName,
	getProductPrice,
	resolveImageUrl,
} from "@/lib/product-helpers";
import { formatPrice } from "@/lib/utils";
import { escapeXml, xmlResponse } from "@/lib/xml";

export const revalidate = 1800;
export const dynamic = "force-dynamic";

function inferGoogleProductCategory(product = {}) {
	const text = `${product?.category?.categoryName || product?.productName || ""}`
		.toLowerCase()
		.trim();
	if (!text) return "Home & Garden > Decor";
	if (text.includes("mug")) {
		return "Home & Garden > Kitchen & Dining > Tableware > Drinkware > Mugs";
	}
	if (text.includes("t-shirt") || text.includes("hoodie") || text.includes("sweatshirt")) {
		return "Apparel & Accessories > Clothing";
	}
	if (text.includes("tote") || text.includes("weekender") || text.includes("bag")) {
		return "Luggage & Bags > Handbags, Wallets & Cases > Tote Bags";
	}
	if (text.includes("pillow")) {
		return "Home & Garden > Decor > Pillows";
	}
	if (text.includes("candle")) {
		return "Home & Garden > Decor > Candles";
	}
	if (text.includes("magnet")) {
		return "Home & Garden > Decor > Magnets";
	}
	return "Home & Garden > Decor";
}

function inferCurrency(product = {}) {
	const unit = `${product?.price_unit || ""}`.toUpperCase();
	if (unit === "LE" || unit === "EGP") return "EGP";
	if (unit === "USD") return "USD";
	return "USD";
}

function toSafeQueryValue(value = "") {
	if (typeof value === "symbol") return "";
	return `${value ?? ""}`.trim();
}

function extractImageUrls(source) {
	if (!source) return [];
	if (Array.isArray(source)) {
		return source.flatMap((item) => extractImageUrls(item));
	}
	if (typeof source === "string") {
		const normalized = resolveImageUrl(source);
		return normalized ? [normalized] : [];
	}
	if (typeof source === "object") {
		const direct = resolveImageUrl(source);
		const nested = extractImageUrls(source?.images);
		return [direct, ...nested].filter(Boolean);
	}
	return [];
}

function uniqueImageUrls(urls = []) {
	const seen = new Set();
	const deduped = [];
	for (const entry of urls) {
		const url = `${entry || ""}`.trim();
		if (!url || seen.has(url)) continue;
		seen.add(url);
		deduped.push(url);
	}
	return deduped;
}

function buildFeedImageSet(product = {}, attr = null) {
	const images = uniqueImageUrls([
		...extractImageUrls(attr?.exampleDesignImage),
		...extractImageUrls(attr?.productImages),
		...extractImageUrls(product?.thumbnailImage),
		...extractImageUrls(product?.productImages),
		...extractImageUrls(product?.printifyProductDetails?.images),
	]);
	if (!images.length) {
		const fallback = getPrimaryProductImage(product);
		return fallback ? [fallback] : [];
	}
	return images;
}

function buildVariantLink(baseLink = "", product = {}, attr = {}) {
	const params = new URLSearchParams();
	const safeSize = toSafeQueryValue(attr?.size);
	const safeColor = toSafeQueryValue(attr?.color);
	const safeScent = toSafeQueryValue(attr?.scent);
	if (safeSize) params.set("size", safeSize);
	if (safeColor) params.set("color", safeColor);
	if (safeScent) params.set("scent", safeScent);

	const isPod = Boolean(
		product?.isPrintifyProduct && product?.printifyProductDetails?.POD
	);
	if (isPod && !params.has("occasion")) {
		const fallbackOccasion =
			toSafeQueryValue(
				product?.defaultDesigns?.[0]?.occassion ||
					product?.defaultDesigns?.[0]?.occasion
			) || "Birthday";
		params.set("occasion", fallbackOccasion);
	}

	const query = params.toString();
	return query ? `${baseLink}?${query}` : baseLink;
}

export async function GET() {
	let products = [];
	try {
		products = await getAllProductsForSeo({ maxPages: 200, records: 200, revalidate: 1800 });
	} catch {
		products = [];
	}

	const itemsXml = products
		.filter((product) => product?._id)
		.flatMap((product) => {
			const name = getProductDisplayName(product);
			const description = getProductDescription(product);
			const link = absoluteUrl(buildProductPath(product));
			const currency = inferCurrency(product);
			const brand = product?.brandName || "Serene Jannat";
			const categoryName = product?.category?.categoryName || "Gifts";
			const googleCategory = inferGoogleProductCategory(product);
			const fallbackImage = getPrimaryProductImage(product) || absoluteUrl("/logo512.png");

			const attributes = Array.isArray(product?.productAttributes)
				? product.productAttributes
				: [];

			if (!attributes.length) {
				const effectivePrice = getProductPrice(product);
				const originalPrice =
					Number(product?.price || 0) > 0
						? Number(product.price)
						: effectivePrice;
				const inStock =
					Number(product?.quantity || 0) > 0 ? "in stock" : "out of stock";
				const imageSet = buildFeedImageSet(product, null);
				const primaryImage = imageSet[0] || fallbackImage;
				const additionalImageLinks = imageSet
					.slice(1, 11)
					.map(
						(url) =>
							`<g:additional_image_link>${escapeXml(url)}</g:additional_image_link>`
					)
					.join("");
				return [
					`<item>
	<g:id>${escapeXml(String(product._id))}</g:id>
	<title>${escapeXml(name)}</title>
	<description>${escapeXml(description)}</description>
	<link>${escapeXml(link)}</link>
	<g:image_link>${escapeXml(primaryImage)}</g:image_link>
	${additionalImageLinks}
	<g:availability>${escapeXml(inStock)}</g:availability>
	<g:condition>new</g:condition>
	<g:price>${escapeXml(formatPrice(originalPrice, currency))}</g:price>
	${
		originalPrice > effectivePrice
			? `<g:sale_price>${escapeXml(
					formatPrice(effectivePrice, currency)
				)}</g:sale_price>`
			: ""
	}
	<g:brand>${escapeXml(brand)}</g:brand>
	<g:product_type>${escapeXml(categoryName)}</g:product_type>
	<g:google_product_category>${escapeXml(googleCategory)}</g:google_product_category>
	<g:custom_label_0>${escapeXml(categoryName)}</g:custom_label_0>
	${product?.productSKU ? `<g:mpn>${escapeXml(product.productSKU)}</g:mpn>` : ""}
	<g:identifier_exists>false</g:identifier_exists>
</item>`,
				];
			}

			return attributes.map((attr, index) => {
				const imageSet = buildFeedImageSet(product, attr);
				const variantImage = imageSet[0] || fallbackImage;
				const additionalImageLinks = imageSet
					.slice(1, 11)
					.map(
						(url) =>
							`<g:additional_image_link>${escapeXml(url)}</g:additional_image_link>`
					)
					.join("");
				const variantLink = buildVariantLink(link, product, attr);
				const originalVariantPrice =
					Number(attr?.price || 0) > 0
						? Number(attr.price)
						: Number(product?.price || 0);
				const effectiveVariantPrice =
					Number(attr?.priceAfterDiscount || 0) > 0
						? Number(attr.priceAfterDiscount)
						: Number(attr?.price || 0) > 0
							? Number(attr.price)
							: getProductPrice(product);
				const variantInStock =
						Number(attr?.quantity || product?.quantity || 0) > 0
							? "in stock"
							: "out of stock";
				const variantId = `${product._id}-${attr?.SubSKU || attr?.PK || index + 1}`;
				const variantTitleSuffix = [attr?.size, attr?.color, attr?.scent]
					.filter(Boolean)
					.join(" / ");
				const variantTitle = variantTitleSuffix
					? `${name} - ${variantTitleSuffix}`
					: name;

				return `<item>
	<g:id>${escapeXml(variantId)}</g:id>
	<g:item_group_id>${escapeXml(String(product._id))}</g:item_group_id>
	<title>${escapeXml(variantTitle)}</title>
	<description>${escapeXml(description)}</description>
	<link>${escapeXml(variantLink)}</link>
	<g:image_link>${escapeXml(variantImage)}</g:image_link>
	${additionalImageLinks}
	<g:availability>${escapeXml(variantInStock)}</g:availability>
	<g:condition>new</g:condition>
	<g:price>${escapeXml(
		formatPrice(originalVariantPrice || effectiveVariantPrice, currency)
	)}</g:price>
	${
		originalVariantPrice > effectiveVariantPrice
			? `<g:sale_price>${escapeXml(
					formatPrice(effectiveVariantPrice, currency)
				)}</g:sale_price>`
			: ""
	}
	<g:brand>${escapeXml(brand)}</g:brand>
	<g:product_type>${escapeXml(categoryName)}</g:product_type>
	<g:google_product_category>${escapeXml(googleCategory)}</g:google_product_category>
	<g:custom_label_0>${escapeXml(categoryName)}</g:custom_label_0>
	${attr?.size ? `<g:size>${escapeXml(attr.size)}</g:size>` : ""}
	${attr?.color ? `<g:color>${escapeXml(attr.color)}</g:color>` : ""}
	${attr?.SubSKU ? `<g:mpn>${escapeXml(attr.SubSKU)}</g:mpn>` : ""}
	<g:identifier_exists>false</g:identifier_exists>
</item>`;
			});
		})
		.join("\n");

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
	<title>Serene Jannat Product Feed</title>
	<link>${escapeXml(absoluteUrl("/"))}</link>
	<description>Dynamic Google Merchant feed for Serene Jannat</description>
	${itemsXml}
</channel>
</rss>`;

	return xmlResponse(xml);
}
