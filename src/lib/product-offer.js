import { findMatchingPodVariant, normalizePodProduct } from "./pod-product";
import {
	findBestProductAttribute,
	getProductPrice,
} from "./product-helpers";

const IN_STOCK_SCHEMA_URL = "https://schema.org/InStock";
const OUT_OF_STOCK_SCHEMA_URL = "https://schema.org/OutOfStock";

function normalizeMoneyValue(value, fallback = 0) {
	const parsed = Number(value);
	if (Number.isFinite(parsed) && parsed > 0) {
		return parsed;
	}

	const fallbackValue = Number(fallback);
	return Number.isFinite(fallbackValue) && fallbackValue > 0 ? fallbackValue : 0;
}

function normalizeVariantMoneyValue(value, fallback = 0) {
	const parsed = Number(value);
	if (Number.isFinite(parsed) && parsed > 0) {
		if (Number.isInteger(parsed) && parsed >= 100) {
			return Number((parsed / 100).toFixed(2));
		}
		return parsed;
	}

	return normalizeMoneyValue(fallback, 0);
}

function normalizeQuantity(...values) {
	for (const value of values) {
		const parsed = Number(value);
		if (Number.isFinite(parsed) && parsed >= 0) {
			return parsed;
		}
	}
	return 0;
}

function resolveAttributePrice(attribute = null, fallback = 0) {
	if (!attribute) return normalizeMoneyValue(fallback, 0);

	const discountedPrice = normalizeMoneyValue(attribute?.priceAfterDiscount, 0);
	if (discountedPrice > 0) return discountedPrice;

	return normalizeMoneyValue(attribute?.price, fallback);
}

export function getOfferAvailabilityUrl(quantity = 0) {
	return quantity > 0 ? IN_STOCK_SCHEMA_URL : OUT_OF_STOCK_SCHEMA_URL;
}

export function getOfferAvailabilityLabel(quantity = 0) {
	return quantity > 0 ? "In stock" : "Out of stock";
}

export function getSelectedStandardOffer(product = {}, selection = {}) {
	const matchedAttribute = findBestProductAttribute(product, selection);
	const fallbackPrice = getProductPrice(product);
	const price = resolveAttributePrice(matchedAttribute, fallbackPrice);
	const quantity = normalizeQuantity(matchedAttribute?.quantity, product?.quantity);
	const sku = `${matchedAttribute?.SubSKU || matchedAttribute?.sku || product?.sku || product?._id || ""}`.trim();

	return {
		price,
		quantity,
		availabilityLabel: getOfferAvailabilityLabel(quantity),
		availabilityUrl: getOfferAvailabilityUrl(quantity),
		sku,
		mpn: sku,
		itemGroupId: `${product?._id || ""}`.trim(),
		attribute: matchedAttribute,
	};
}

export function getSelectedPodOffer(product = {}, selection = {}) {
	const normalizedProduct = normalizePodProduct(product);
	const matchedVariant = findMatchingPodVariant(normalizedProduct, selection);
	const matchedAttribute = findBestProductAttribute(product, selection);
	const fallbackPrice = resolveAttributePrice(matchedAttribute, getProductPrice(product));
	const price = normalizeVariantMoneyValue(matchedVariant?.price, fallbackPrice);
	const quantity = normalizeQuantity(
		matchedAttribute?.quantity,
		matchedVariant?.quantity,
		product?.quantity
	);
	const sku = `${matchedVariant?.sku || matchedAttribute?.SubSKU || product?.sku || product?._id || ""}`.trim();

	return {
		price,
		quantity,
		availabilityLabel: getOfferAvailabilityLabel(quantity),
		availabilityUrl: getOfferAvailabilityUrl(quantity),
		sku,
		mpn: sku,
		itemGroupId: `${product?.printifyProductDetails?.id || product?._id || ""}`.trim(),
		attribute: matchedAttribute,
		variant: matchedVariant,
	};
}
