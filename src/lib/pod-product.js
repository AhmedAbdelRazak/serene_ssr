function normalizeOptionToken(value = "") {
	return `${value || ""}`.trim().toLowerCase();
}

function coerceOptionId(value) {
	return typeof value === "number" ? value : parseInt(value, 10);
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
				(variant) => typeof variant?.price === "number" && variant.price > 0
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

	let selectedColor = "";
	if (colorOption?.values?.length) {
		if (color && colorOption.values.some((value) => value.title === color)) {
			selectedColor = color;
		} else {
			selectedColor = colorOption.values[0]?.title || "";
		}
	}

	let selectedSize = "";
	if (sizeOption?.values?.length) {
		if (size && sizeOption.values.some((value) => value.title === size)) {
			selectedSize = size;
		} else {
			const defaultVariant = variants.find((variant) => variant?.is_default);
			const defaultSizeValue = sizeOption.values.find((value) =>
				Array.isArray(defaultVariant?.options)
					? defaultVariant.options.includes(value.id)
					: false
			);
			selectedSize =
				defaultSizeValue?.title || sizeOption.values[0]?.title || "";
		}
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
		if (scent && scentOption.values.some((value) => value.title === scent)) {
			selectedScent = scent;
		} else {
			selectedScent = scentOption.values[0]?.title || "";
		}
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

	const colorOption = findPodProductOption(product, "color");
	const sizeOption = findPodProductOption(product, "size");
	const scentOption = findPodProductOption(product, "scent");
	const chosenIds = [];

	if (selection.color && colorOption?.values?.length) {
		const colorValue = colorOption.values.find(
			(value) => value.title === selection.color
		);
		if (colorValue) chosenIds.push(coerceOptionId(colorValue.id));
	}
	if (selection.size && sizeOption?.values?.length) {
		const sizeValue = sizeOption.values.find(
			(value) => value.title === selection.size
		);
		if (sizeValue) chosenIds.push(coerceOptionId(sizeValue.id));
	}
	if (selection.scent && scentOption?.values?.length) {
		const scentValue = scentOption.values.find(
			(value) => value.title === selection.scent
		);
		if (scentValue) chosenIds.push(coerceOptionId(scentValue.id));
	}

	return (
		variants.find((variant) => {
			const variantIds = Array.isArray(variant?.options)
				? variant.options.map(coerceOptionId)
				: [];
			return chosenIds.every((chosenId) => variantIds.includes(chosenId));
		}) || null
	);
}
