function normalizeOptionToken(value = "") {
	return `${value || ""}`.trim().toLowerCase();
}

function normalizeColorToken(value = "") {
	const raw = normalizeOptionToken(value);
	if (!raw) return "";
	const stripped = raw.startsWith("#") ? raw.slice(1) : raw;
	if (!/^[0-9a-f]{3,8}$/i.test(stripped)) {
		return raw.startsWith("#") ? raw : `#${raw}`;
	}
	if (stripped.length === 3 || stripped.length === 4) {
		return `#${stripped
			.split("")
			.map((char) => `${char}${char}`)
			.join("")}`;
	}
	return `#${stripped}`;
}

function coerceOptionId(value) {
	return typeof value === "number" ? value : parseInt(value, 10);
}

function isColorOption(target = "") {
	const token = normalizeOptionToken(target);
	return token.includes("color");
}

function getOptionValues(source = null, target = "") {
	if (Array.isArray(source?.values)) return source.values;
	return findPodProductOption(source, target)?.values || [];
}

export function getPodOptionValueLabel(value = null) {
	if (!value) return "";
	const safeTitle = `${value?.label || value?.title || ""}`.trim();
	if (safeTitle) return safeTitle;
	const fallbackColor = Array.isArray(value?.colors)
		? value.colors.find((entry) => `${entry || ""}`.trim())
		: "";
	return `${fallbackColor || ""}`.trim();
}

function doesOptionValueMatch(value = null, requested = "", target = "") {
	if (!value) return false;
	const requestedToken = normalizeOptionToken(requested);
	const requestedColor = normalizeColorToken(requested);
	if (!requestedToken && !requestedColor) return false;

	const titleToken = normalizeOptionToken(value?.title);
	const labelToken = normalizeOptionToken(getPodOptionValueLabel(value));
	if (
		(requestedToken && titleToken === requestedToken) ||
		(requestedToken && labelToken === requestedToken)
	) {
		return true;
	}

	if (isColorOption(target) && requestedColor) {
		const colorTokens = Array.isArray(value?.colors)
			? value.colors.map((entry) => normalizeColorToken(entry)).filter(Boolean)
			: [];
		if (colorTokens.includes(requestedColor)) {
			return true;
		}
	}

	return false;
}

export function findPodProductOptionValue(source, target = "", requested = "") {
	const values = getOptionValues(source, target);
	if (!values.length) return null;
	return (
		values.find((value) => doesOptionValueMatch(value, requested, target)) || null
	);
}

export function buildPodSelectionFromVariant(
	product,
	variant,
	fallbackSelection = {}
) {
	if (!variant) {
		return {
			color: fallbackSelection.color || "",
			size: fallbackSelection.size || "",
			scent: fallbackSelection.scent || "",
		};
	}

	const variantOptionIds = Array.isArray(variant?.options)
		? variant.options.map(coerceOptionId)
		: [];
	const pickLabel = (option) => {
		if (!option?.values?.length) return "";
		const match = option.values.find((value) =>
			variantOptionIds.includes(coerceOptionId(value?.id))
		);
		return getPodOptionValueLabel(match);
	};

	const colorOption = findPodProductOption(product, "color");
	const sizeOption = findPodProductOption(product, "size");
	const scentOption = findPodProductOption(product, "scent");

	return {
		color: pickLabel(colorOption) || fallbackSelection.color || "",
		size: pickLabel(sizeOption) || fallbackSelection.size || "",
		scent: pickLabel(scentOption) || fallbackSelection.scent || "",
	};
}

export function findPodProductOption(product, target = "") {
	const targetToken = normalizeOptionToken(target);
	if (!targetToken) return null;
	const options = Array.isArray(product?.options) ? product.options : [];
	return (
		options.find((option) => {
			const optionType = normalizeOptionToken(option?.type);
			const optionName = normalizeOptionToken(option?.name);
			return (
				optionType.includes(targetToken) || optionName.includes(targetToken)
			);
		}) || null
	);
}

export function normalizePodProduct(rawProduct = null) {
	if (!rawProduct) return null;

	const rawPrintifyDetails = rawProduct?.printifyProductDetails || null;
	const sourceVariants = Array.isArray(rawPrintifyDetails?.variants)
		? rawPrintifyDetails.variants
		: Array.isArray(rawProduct?.variants)
			? rawProduct.variants
			: [];
	const sourceOptions = Array.isArray(rawPrintifyDetails?.options)
		? rawPrintifyDetails.options
		: Array.isArray(rawProduct?.options)
			? rawProduct.options
			: [];
	const sourceImages = Array.isArray(rawPrintifyDetails?.images)
		? rawPrintifyDetails.images
		: Array.isArray(rawProduct?.images)
			? rawProduct.images
			: [];

	const variants = sourceVariants.filter(
		(variant) =>
			typeof variant?.price === "number" &&
			variant.price > 0 &&
			variant?.is_enabled !== false &&
			variant?.is_available !== false
	);
	const options = sourceOptions;
	const images = sourceImages;

	const filteredOptions = options.map((option) => {
		const values = Array.isArray(option?.values) ? option.values : [];
		const supportedValues = values.filter((value) =>
			variants.some((variant) =>
				Array.isArray(variant?.options) && variant.options.includes(value.id)
			)
		);
		return {
			...option,
			values: supportedValues,
		};
	});

	return {
		...rawProduct,
		title: rawPrintifyDetails?.title || rawProduct?.productName || "",
		description:
			rawPrintifyDetails?.description || rawProduct?.description || "",
		variants,
		options: filteredOptions,
		images,
		printifyProductDetails: rawPrintifyDetails
			? {
					...rawPrintifyDetails,
					id: rawPrintifyDetails.id || null,
					blueprint_id: rawPrintifyDetails.blueprint_id || null,
					print_provider_id: rawPrintifyDetails.print_provider_id || null,
					print_areas: Array.isArray(rawPrintifyDetails.print_areas)
						? rawPrintifyDetails.print_areas
						: [],
					shop_id: rawPrintifyDetails.shop_id || null,
					title: rawPrintifyDetails.title || rawProduct?.productName || "",
					description:
						rawPrintifyDetails.description || rawProduct?.description || "",
					POD: rawPrintifyDetails.POD === true,
					variants,
					options: filteredOptions,
					images,
				}
			: null,
	};
}

export function resolveInitialPodVariantSelection(
	product,
	{ color = "", size = "", scent = "" } = {},
) {
	if (!product) {
		return {
			color: color || "",
			size: size || "",
			scent: scent || "",
		};
	}

	const colorOption = findPodProductOption(product, "color");
	const sizeOption = findPodProductOption(product, "size");
	const scentOption = findPodProductOption(product, "scent");
	const variants = Array.isArray(product?.variants) ? product.variants : [];
	const productAttributes = Array.isArray(product?.productAttributes)
		? product.productAttributes
		: [];
	const defaultVariant =
		variants.find((variant) => variant?.is_default) || variants[0] || null;
	const defaultSelection = buildPodSelectionFromVariant(product, defaultVariant, {});

	let selectedColor = "";
	if (colorOption?.values?.length) {
		const resolvedColor = findPodProductOptionValue(colorOption, "color", color);
		selectedColor =
			getPodOptionValueLabel(resolvedColor) ||
			defaultSelection.color ||
			getPodOptionValueLabel(colorOption.values[0]) ||
			"";
	}

	let selectedSize = "";
	if (sizeOption?.values?.length) {
		const resolvedSize = findPodProductOptionValue(sizeOption, "size", size);
		selectedSize =
			getPodOptionValueLabel(resolvedSize) ||
			defaultSelection.size ||
			getPodOptionValueLabel(sizeOption.values[0]) ||
			"";
	}
	if (!selectedSize && productAttributes.length) {
		const fallbackSize = productAttributes.find(
			(attribute) => attribute?.size && `${attribute.size}`.trim() !== ""
		);
		if (fallbackSize?.size) {
			selectedSize = fallbackSize.size;
		}
	}

	let selectedScent = "";
	if (scentOption?.values?.length) {
		const resolvedScent = findPodProductOptionValue(scentOption, "scent", scent);
		selectedScent =
			getPodOptionValueLabel(resolvedScent) ||
			defaultSelection.scent ||
			getPodOptionValueLabel(scentOption.values[0]) ||
			"";
	}
	if (!selectedScent && productAttributes.length) {
		const fallbackScent = productAttributes.find(
			(attribute) => attribute?.scent && `${attribute.scent}`.trim() !== ""
		);
		if (fallbackScent?.scent) {
			selectedScent = fallbackScent.scent;
		}
	}

	return {
		color: selectedColor,
		size: selectedSize,
		scent: selectedScent,
	};
}

export function findMatchingPodVariant(product, selection = {}) {
	const variants = Array.isArray(product?.variants) ? product.variants : [];
	if (!variants.length) return null;
	if (selection?.variantId) {
		const directMatch =
			variants.find(
				(variant) => `${variant?.id ?? ""}`.trim() === `${selection.variantId}`.trim()
			) || null;
		if (directMatch) return directMatch;
	}

	const colorOption = findPodProductOption(product, "color");
	const sizeOption = findPodProductOption(product, "size");
	const scentOption = findPodProductOption(product, "scent");
	const chosenIds = [];

	if (selection.color && colorOption?.values?.length) {
		const colorValue = findPodProductOptionValue(
			colorOption,
			"color",
			selection.color
		);
		if (colorValue) chosenIds.push(coerceOptionId(colorValue.id));
	}
	if (selection.size && sizeOption?.values?.length) {
		const sizeValue = findPodProductOptionValue(
			sizeOption,
			"size",
			selection.size
		);
		if (sizeValue) chosenIds.push(coerceOptionId(sizeValue.id));
	}
	if (selection.scent && scentOption?.values?.length) {
		const scentValue = findPodProductOptionValue(
			scentOption,
			"scent",
			selection.scent
		);
		if (scentValue) chosenIds.push(coerceOptionId(scentValue.id));
	}
	if (!chosenIds.length) {
		return (
			variants.find((variant) => variant?.is_default) ||
			variants.find((variant) => variant?.is_enabled !== false) ||
			variants[0] ||
			null
		);
	}

	return (
		variants.find((variant) => {
			if (variant?.is_enabled === false) return false;
			const variantIds = Array.isArray(variant?.options)
				? variant.options.map(coerceOptionId)
				: [];
			return chosenIds.every((chosenId) => variantIds.includes(chosenId));
		}) ||
		variants.find((variant) => variant?.is_default) ||
		variants[0] ||
		null
	);
}
