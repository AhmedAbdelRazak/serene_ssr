import { POD_OCCASIONS } from "./config";
import { stripHtml, toSlug, uniqueStrings } from "./utils";

function normalizeToken(value = "") {
	if (typeof value === "symbol") return "";
	return `${value ?? ""}`.trim().toLowerCase();
}

function normalizeColorToken(value = "") {
	const raw = normalizeToken(value);
	if (!raw) return "";
	if (raw.startsWith("#")) return raw;
	if (/^[0-9a-f]{3,8}$/i.test(raw)) return `#${raw}`;
	return raw;
}

function normalizeUrl(value = "") {
	const raw = `${value || ""}`.trim();
	if (!raw) return "";
	if (raw.startsWith("//")) return `https:${raw}`;
	return raw.replace(/^http:\/\//i, "https://");
}

function getProductAttributes(product = {}) {
	return Array.isArray(product?.productAttributes) ? product.productAttributes : [];
}

function getPrintifyOptions(product = {}) {
	return Array.isArray(product?.printifyProductDetails?.options)
		? product.printifyProductDetails.options
		: [];
}

function getOptionValuesByNameFragment(product = {}, fragment = "") {
	const needle = normalizeToken(fragment);
	if (!needle) return [];
	const options = getPrintifyOptions(product);
	const hits = options.filter((option) =>
		normalizeToken(option?.name).includes(needle)
	);
	const values = [];
	for (const option of hits) {
		if (!Array.isArray(option?.values)) continue;
		values.push(...option.values);
	}
	return values;
}

function getColorCandidates(product = {}, requestedColor = "") {
	const requested = normalizeColorToken(requestedColor);
	if (!requested) return [];
	const candidates = new Set([requested]);
	const rawRequested = normalizeToken(requestedColor);
	if (rawRequested) candidates.add(rawRequested);

	for (const value of getOptionValuesByNameFragment(product, "color")) {
		const title = normalizeToken(value?.title);
		const hexes = Array.isArray(value?.colors)
			? value.colors.map((hex) => normalizeColorToken(hex)).filter(Boolean)
			: [];
		if (!title) continue;
		if (title === rawRequested || hexes.includes(requested)) {
			hexes.forEach((hex) => candidates.add(hex));
			candidates.add(title);
		}
	}
	return Array.from(candidates).filter(Boolean);
}

function matchesRequestedSize(attr = {}, requestedSize = "") {
	const normalized = normalizeToken(requestedSize);
	if (!normalized) return true;
	const sizeValue = normalizeToken(attr?.size);
	const pkValue = normalizeToken(attr?.PK);
	return sizeValue === normalized || pkValue.includes(normalized);
}

function matchesRequestedScent(attr = {}, requestedScent = "") {
	const normalized = normalizeToken(requestedScent);
	if (!normalized) return true;
	const scentValue = normalizeToken(attr?.scent);
	const pkValue = normalizeToken(attr?.PK);
	return scentValue === normalized || pkValue.includes(normalized);
}

function matchesRequestedColor(attr = {}, colorCandidates = []) {
	if (!Array.isArray(colorCandidates) || !colorCandidates.length) return true;
	const attrColor = normalizeColorToken(attr?.color);
	const attrPk = normalizeToken(attr?.PK);
	return colorCandidates.some(
		(candidate) =>
			candidate === attrColor ||
			candidate === normalizeToken(attr?.color) ||
			(candidate && attrPk.includes(candidate))
	);
}

export function findBestProductAttribute(
	product = {},
	{ color = "", size = "", scent = "" } = {}
) {
	const attributes = getProductAttributes(product);
	if (!attributes.length) return null;

	let candidates = [...attributes];

	const sizeMatches = candidates.filter((attr) =>
		matchesRequestedSize(attr, size)
	);
	if (sizeMatches.length) candidates = sizeMatches;

	const scentMatches = candidates.filter((attr) =>
		matchesRequestedScent(attr, scent)
	);
	if (scentMatches.length) candidates = scentMatches;

	const colorCandidates = getColorCandidates(product, color);
	const colorMatches = candidates.filter((attr) =>
		matchesRequestedColor(attr, colorCandidates)
	);
	if (colorMatches.length) candidates = colorMatches;

	return candidates[0] || attributes[0];
}

function pickDefaultDesignByOccasion(defaultDesigns = [], occasion = "") {
	if (!Array.isArray(defaultDesigns) || !defaultDesigns.length) return null;
	const requestedOccasion = normalizeToken(occasion);
	if (!requestedOccasion) return defaultDesigns[0] || null;

	return (
		defaultDesigns.find((item) => {
			const value = item?.occassion || item?.occasion || "";
			return normalizeToken(value) === requestedOccasion;
		}) || null
	);
}

export function getPodDefaultDesignImage(
	product = {},
	{
		occasion = "",
		name = "",
		color = "",
		size = "",
		scent = "",
		viewIndex = 0,
		allowOccasionFallback = false,
	} = {}
) {
	if (normalizeToken(name)) return "";
	if (!normalizeToken(occasion) && !allowOccasionFallback) return "";
	const matchedAttr = findBestProductAttribute(product, { color, size, scent });
	const collections = [];
	if (Array.isArray(matchedAttr?.defaultDesigns)) {
		collections.push(matchedAttr.defaultDesigns);
	}
	if (Array.isArray(product?.defaultDesigns)) {
		collections.push(product.defaultDesigns);
	}

	for (const collection of collections) {
		const occasionEntry = pickDefaultDesignByOccasion(collection, occasion);
		if (!occasionEntry) continue;
		const images = Array.isArray(occasionEntry?.defaultDesignImages)
			? occasionEntry.defaultDesignImages
			: [];
		const indexedCandidate = images[viewIndex] || images[0];
		const indexedUrl = resolveImageUrl(indexedCandidate);
		if (indexedUrl) return indexedUrl;
		for (const image of images) {
			const url = resolveImageUrl(image);
			if (url) return url;
		}
	}

	return "";
}

export function resolveImageUrl(imageLike) {
	if (!imageLike) return "";
	if (typeof imageLike === "string") return normalizeUrl(imageLike);
	if (Array.isArray(imageLike)) {
		for (const image of imageLike) {
			const url = resolveImageUrl(image);
			if (url) return url;
		}
		return "";
	}
	if (Array.isArray(imageLike?.images) && imageLike.images.length) {
		return resolveImageUrl(imageLike.images[0]);
	}
	const direct =
		imageLike.cloudinary_url ||
		imageLike.cloudinaryUrl ||
		imageLike.cloudinaryURL ||
		imageLike.secure_url ||
		imageLike.url ||
		imageLike.src;
	return normalizeUrl(direct || "");
}

export function getPrimaryProductImage(
	product = {},
	{ occasion = "", name = "", color = "", size = "", scent = "", viewIndex = 0 } = {}
) {
	const defaultPodImage = getPodDefaultDesignImage(product, {
		occasion,
		name,
		color,
		size,
		scent,
		viewIndex,
	});
	if (defaultPodImage) return defaultPodImage;

	const matchedAttr = findBestProductAttribute(product, { color, size, scent });
	const candidates = [
		matchedAttr?.exampleDesignImage,
		matchedAttr?.productImages?.[0],
		product?.thumbnailImage?.[0]?.images?.[0],
		product?.productImages?.[0],
		product?.printifyProductDetails?.images?.[0],
		product?.images?.[0],
	];
	for (const candidate of candidates) {
		const url = resolveImageUrl(candidate);
		if (url) return url;
	}
	return "";
}

export function getProductDisplayName(product = {}) {
	return product?.productName || product?.printifyProductDetails?.title || "Product";
}

export function getProductDescription(product = {}) {
	const text = stripHtml(
		product?.description ||
			product?.printifyProductDetails?.description ||
			""
	);
	return text || "Shop premium handcrafted and print-on-demand gifts.";
}

export function isPodProduct(product = {}) {
	return Boolean(product?.isPrintifyProduct && product?.printifyProductDetails?.POD);
}

export function getProductSlug(product = {}) {
	return product?.slug || toSlug(getProductDisplayName(product));
}

export function getCategorySlug(product = {}) {
	return product?.category?.categorySlug || product?.categorySlug || "all";
}

export function buildProductPath(product = {}) {
	const slug = getProductSlug(product);
	const productId = product?._id;
	if (!productId) return "/";
	if (isPodProduct(product)) return `/custom-gifts/${slug}/${productId}`;
	return `/single-product/${slug}/${getCategorySlug(product)}/${productId}`;
}

export function getProductPrice(product = {}) {
	const priceCandidate =
		product?.priceAfterDiscount && Number(product.priceAfterDiscount) > 0
			? Number(product.priceAfterDiscount)
			: Number(product?.price || 0);
	return Number.isFinite(priceCandidate) ? priceCandidate : 0;
}

function getVariantValueIdsByOptionName(product = {}, optionName = "") {
	const options = Array.isArray(product?.printifyProductDetails?.options)
		? product.printifyProductDetails.options
		: [];
	return options
		.filter((option) =>
			normalizeToken(option?.name).includes(normalizeToken(optionName))
		)
		.flatMap((option) =>
			Array.isArray(option?.values)
				? option.values.map((value) => `${value?.title || ""}`.trim()).filter(Boolean)
				: []
		);
}

export function buildPodQueryCombinations(product = {}) {
	if (!isPodProduct(product)) return [];
	const occasionValues = POD_OCCASIONS;
	const sizeValues = getVariantValueIdsByOptionName(product, "size");
	const colorValues = getVariantValueIdsByOptionName(product, "color");
	const scentValues = getVariantValueIdsByOptionName(product, "scent");
	const combinations = [];

	for (const occasion of occasionValues) {
		combinations.push(`occasion=${encodeURIComponent(occasion)}`);
		for (const size of sizeValues.slice(0, 8)) {
			combinations.push(
				`occasion=${encodeURIComponent(occasion)}&size=${encodeURIComponent(size)}`
			);
		}
		for (const color of colorValues.slice(0, 10)) {
			combinations.push(
				`occasion=${encodeURIComponent(occasion)}&color=${encodeURIComponent(color)}`
			);
		}
		for (const scent of scentValues.slice(0, 10)) {
			combinations.push(
				`occasion=${encodeURIComponent(occasion)}&scent=${encodeURIComponent(scent)}`
			);
		}
		for (const size of sizeValues.slice(0, 5)) {
			for (const color of colorValues.slice(0, 5)) {
				combinations.push(
					`occasion=${encodeURIComponent(occasion)}&size=${encodeURIComponent(
						size
					)}&color=${encodeURIComponent(color)}`
				);
			}
		}
	}

	return uniqueStrings(combinations);
}
