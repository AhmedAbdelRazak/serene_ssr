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

function getPrintifyVariants(product = {}) {
	return Array.isArray(product?.printifyProductDetails?.variants)
		? product.printifyProductDetails.variants
		: [];
}

function getPrintifyImages(product = {}) {
	if (Array.isArray(product?.printifyProductDetails?.images)) {
		return product.printifyProductDetails.images;
	}
	return Array.isArray(product?.images) ? product.images : [];
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

function getPrintifyOptionValueMap(product = {}) {
	const map = new Map();
	for (const option of getPrintifyOptions(product)) {
		const optionName = normalizeToken(option?.name);
		const optionType = normalizeToken(option?.type) || optionName;
		const values = Array.isArray(option?.values) ? option.values : [];
		for (const value of values) {
			const id = `${value?.id ?? ""}`.trim();
			if (!id) continue;
			map.set(id, {
				id,
				optionName,
				optionType,
				title: `${value?.title || ""}`.trim(),
				colors: Array.isArray(value?.colors) ? value.colors : [],
			});
		}
	}
	return map;
}

function findPrintifyOptionValue(product = {}, fragment = "", requested = "") {
	const requestedToken = normalizeToken(requested);
	const requestedHex = normalizeColorToken(requested);
	if (!requestedToken && !requestedHex) return null;
	const values = getOptionValuesByNameFragment(product, fragment);
	for (const value of values) {
		const title = normalizeToken(value?.title);
		if (title && title === requestedToken) {
			return value;
		}
		if (fragment === "color" && requestedHex) {
			const hexes = Array.isArray(value?.colors)
				? value.colors.map((entry) => normalizeColorToken(entry)).filter(Boolean)
				: [];
			if (hexes.includes(requestedHex)) {
				return value;
			}
		}
	}
	return null;
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

export function getPodProductSlug(product = {}) {
	const candidate =
		product?.title ||
		product?.productName ||
		product?.printifyProductDetails?.title ||
		product?.slug ||
		"custom-gift";
	return toSlug(candidate) || "custom-gift";
}

export function getProductSlug(product = {}) {
	const isPod = Boolean(
		product?.isPrintifyProduct && product?.printifyProductDetails?.POD
	);
	if (isPod) return getPodProductSlug(product);
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

function getPodOccasionEntries(product = {}) {
	const occasions = [];
	for (const attr of getProductAttributes(product)) {
		const defaultDesigns = Array.isArray(attr?.defaultDesigns) ? attr.defaultDesigns : [];
		for (const design of defaultDesigns) {
			const value = `${design?.occassion || design?.occasion || ""}`.trim();
			if (value) occasions.push(value);
		}
	}
	return uniqueStrings(occasions);
}

export function getPodOccasions(product = {}) {
	const actualOccasions = getPodOccasionEntries(product);
	return actualOccasions.length ? actualOccasions : POD_OCCASIONS;
}

export function getPodVariantSelections(product = {}) {
	if (!isPodProduct(product)) return [];

	const selectionMap = new Map();
	const optionValueMap = getPrintifyOptionValueMap(product);
	const variants = getPrintifyVariants(product);

	for (const [index, variant] of variants.entries()) {
		if (variant?.is_enabled === false) continue;
		const optionIds = Array.isArray(variant?.options)
			? variant.options.map((value) => `${value ?? ""}`.trim()).filter(Boolean)
			: [];
		const selection = {
			variantId: `${variant?.id ?? ""}`.trim(),
			variantSku: `${variant?.sku ?? ""}`.trim(),
			price: variant?.price,
			isDefault: Boolean(variant?.is_default),
			optionIds,
			color: "",
			size: "",
			scent: "",
		};

		for (const optionId of optionIds) {
			const info = optionValueMap.get(optionId);
			if (!info) continue;
			if (!selection.color && info.optionType.includes("color")) {
				selection.color = info.title;
				continue;
			}
			if (!selection.size && info.optionType.includes("size")) {
				selection.size = info.title;
				continue;
			}
			if (!selection.scent && info.optionType.includes("scent")) {
				selection.scent = info.title;
			}
		}

		const key = [
			normalizeToken(selection.color),
			normalizeToken(selection.size),
			normalizeToken(selection.scent),
		].join("|");
		const token =
			[
				selection.color,
				selection.size,
				selection.scent,
				selection.variantSku,
				selection.variantId,
				`${index + 1}`,
			]
				.map((value) => toSlug(value))
				.filter(Boolean)
				.join("-") || `${index + 1}`;
		const enrichedSelection = { ...selection, token };
		const current = selectionMap.get(key);
		if (!current || enrichedSelection.isDefault) {
			selectionMap.set(key, enrichedSelection);
		}
	}

	if (selectionMap.size > 0) {
		return Array.from(selectionMap.values());
	}

	const fallbackSelections = new Map();
	for (const [index, attr] of getProductAttributes(product).entries()) {
		const selection = {
			variantId: "",
			variantSku: `${attr?.SubSKU ?? ""}`.trim(),
			price: attr?.priceAfterDiscount || attr?.price,
			isDefault: index === 0,
			optionIds: [],
			color: `${attr?.color || ""}`.trim(),
			size: `${attr?.size || ""}`.trim(),
			scent: `${attr?.scent || ""}`.trim(),
		};
		const key = [
			normalizeToken(selection.color),
			normalizeToken(selection.size),
			normalizeToken(selection.scent),
		].join("|");
		if (!fallbackSelections.has(key)) {
			const token =
				[
					selection.color,
					selection.size,
					selection.scent,
					selection.variantSku,
					`${index + 1}`,
				]
					.map((value) => toSlug(value))
					.filter(Boolean)
					.join("-") || `${index + 1}`;
			fallbackSelections.set(key, { ...selection, token });
		}
	}

	return Array.from(fallbackSelections.values());
}

export function buildPodSelectionQuery({
	occasion = "",
	name = "",
	color = "",
	size = "",
	scent = "",
} = {}) {
	const params = new URLSearchParams();
	if (occasion) params.set("occasion", occasion);
	if (name) params.set("name", name);
	if (color) params.set("color", color);
	if (size) params.set("size", size);
	if (scent) params.set("scent", scent);
	return params.toString();
}

export function getMatchingPrintifyVariantIds(
	product = {},
	{ color = "", size = "", scent = "" } = {}
) {
	const chosenIds = [];
	const colorValue = findPrintifyOptionValue(product, "color", color);
	const sizeValue = findPrintifyOptionValue(product, "size", size);
	const scentValue = findPrintifyOptionValue(product, "scent", scent);
	if (colorValue?.id !== undefined && colorValue?.id !== null) {
		chosenIds.push(`${colorValue.id}`.trim());
	}
	if (sizeValue?.id !== undefined && sizeValue?.id !== null) {
		chosenIds.push(`${sizeValue.id}`.trim());
	}
	if (scentValue?.id !== undefined && scentValue?.id !== null) {
		chosenIds.push(`${scentValue.id}`.trim());
	}
	if (!chosenIds.length) return [];

	return getPrintifyVariants(product)
		.filter((variant) => {
			if (variant?.is_enabled === false) return false;
			const optionIds = Array.isArray(variant?.options)
				? variant.options.map((value) => `${value ?? ""}`.trim())
				: [];
			return chosenIds.every((entry) => optionIds.includes(entry));
		})
		.map((variant) => `${variant?.id ?? ""}`.trim())
		.filter(Boolean);
}

export function getPodGalleryImages(
	product = {},
	{ color = "", size = "", scent = "" } = {},
	limit = 6
) {
	const printifyImages = getPrintifyImages(product);
	const allImages = uniqueStrings(
		printifyImages.map((image) => resolveImageUrl(image)).filter(Boolean)
	);
	if (!printifyImages.length) return allImages.slice(0, limit);

	const matchingVariantIds = new Set(
		getMatchingPrintifyVariantIds(product, { color, size, scent })
	);
	let filtered = [];

	if (matchingVariantIds.size > 0) {
		filtered = printifyImages
			.filter((image) => {
				const variantIds = Array.isArray(image?.variant_ids)
					? image.variant_ids.map((value) => `${value ?? ""}`.trim())
					: [];
				return variantIds.some((variantId) => matchingVariantIds.has(variantId));
			})
			.map((image) => resolveImageUrl(image))
			.filter(Boolean);
	}

	if (!filtered.length && color) {
		const colorOnlyVariantIds = new Set(
			getMatchingPrintifyVariantIds(product, { color })
		);
		if (colorOnlyVariantIds.size > 0) {
			filtered = printifyImages
				.filter((image) => {
					const variantIds = Array.isArray(image?.variant_ids)
						? image.variant_ids.map((value) => `${value ?? ""}`.trim())
						: [];
					return variantIds.some((variantId) => colorOnlyVariantIds.has(variantId));
				})
				.map((image) => resolveImageUrl(image))
				.filter(Boolean);
		}
	}

	return uniqueStrings(filtered.length ? filtered : allImages).slice(0, limit);
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
	const occasionValues = getPodOccasions(product);
	const selections = getPodVariantSelections(product);
	const combinations = [];

	for (const occasion of occasionValues) {
		combinations.push(buildPodSelectionQuery({ occasion }));
		for (const selection of selections) {
			combinations.push(
				buildPodSelectionQuery({
					occasion,
					color: selection.color,
					size: selection.size,
					scent: selection.scent,
				})
			);
		}
	}

	return uniqueStrings(combinations);
}
