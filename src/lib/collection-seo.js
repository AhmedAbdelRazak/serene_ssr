import { POD_OCCASIONS } from "@/lib/pod-occasions";
import { toSlug } from "./utils";

const OBJECT_ID_REGEX = /^[a-f0-9]{24}$/i;
const INDEXABLE_SHOP_KEYS = new Set(["category", "categorySlug", "page"]);
const INDEXABLE_POD_COLLECTION_KEYS = new Set(["occasion", "page"]);
const POD_COLLECTION_PATH = "/custom-gifts";
const POD_COLLECTION_CATEGORY_SLUG = "custom-design";
const POD_COLLECTION_CATEGORY_IDS = new Set(["679bb2a7dba50a58933d01eb"]);

function normalizeValue(value = "") {
	if (typeof value === "symbol") return "";
	return `${value ?? ""}`.trim();
}

function hasActiveValue(value) {
	if (Array.isArray(value)) {
		return value.some((entry) => normalizeValue(entry));
	}
	return Boolean(normalizeValue(value));
}

function toTitleCase(value = "") {
	return `${value || ""}`
		.replace(/[-_]+/g, " ")
		.replace(/\s+/g, " ")
		.trim()
		.replace(/\b[a-z]/g, (match) => match.toUpperCase());
}

export function getSafeSearchParamValue(source, key) {
	const raw = source?.[key];
	if (Array.isArray(raw)) return normalizeValue(raw[0]);
	return normalizeValue(raw);
}

export function getSafeSearchParamValues(source, key) {
	const raw = source?.[key];
	if (Array.isArray(raw)) {
		return raw.map((entry) => normalizeValue(entry)).filter(Boolean);
	}
	const safe = normalizeValue(raw);
	return safe ? [safe] : [];
}

export function parsePositivePage(rawPage = "") {
	const parsed = Number.parseInt(normalizeValue(rawPage) || "1", 10);
	if (!Number.isFinite(parsed) || parsed < 1) return 1;
	return parsed;
}

const occasionLookup = new Map(
	POD_OCCASIONS.flatMap((occasion) => [
		[occasion.toLowerCase(), occasion],
		[toSlug(occasion), occasion],
	])
);

export function resolveKnownPodOccasion(value = "") {
	const safe = normalizeValue(value);
	if (!safe) return "";
	return occasionLookup.get(safe.toLowerCase()) || occasionLookup.get(toSlug(safe)) || "";
}

function resolveCategoryContext(searchParams = {}, categories = []) {
	const categoryValues = getSafeSearchParamValues(searchParams, "category");
	const categorySlugParam = getSafeSearchParamValue(searchParams, "categorySlug");
	const categoryValue = categoryValues.length === 1 ? categoryValues[0] : "";

	let matchedCategory = null;
	if (categorySlugParam) {
		matchedCategory =
			categories.find(
				(entry) =>
					normalizeValue(entry?.categorySlug).toLowerCase() ===
					categorySlugParam.toLowerCase()
			) || null;
	}

	if (!matchedCategory && categoryValue) {
		matchedCategory =
			categories.find((entry) => `${entry?._id || ""}`.trim() === categoryValue) ||
			categories.find(
				(entry) =>
					normalizeValue(entry?.categorySlug).toLowerCase() ===
					categoryValue.toLowerCase()
			) ||
			null;
	}

	const matchedId = normalizeValue(matchedCategory?._id);
	const matchedSlug = normalizeValue(matchedCategory?.categorySlug);
	const matchedName = normalizeValue(matchedCategory?.categoryName);
	const matched = Boolean(matchedCategory && matchedId);

	return {
		categoryValues,
		categoryId: matched ? matchedId : "",
		categorySlug: matched ? matchedSlug : "",
		categoryName: matched ? matchedName : "",
		matched,
	};
}

function isPodCollectionCategoryRequest(searchParams = {}, category = {}) {
	const categoryValues = getSafeSearchParamValues(searchParams, "category");
	const categorySlugParam = getSafeSearchParamValue(searchParams, "categorySlug");
	const rawCategoryValue = categoryValues.length === 1 ? categoryValues[0] : "";
	const matchedSlug = normalizeValue(category?.categorySlug).toLowerCase();
	const normalizedSlugParam = normalizeValue(categorySlugParam).toLowerCase();
	const normalizedCategoryValue = normalizeValue(rawCategoryValue).toLowerCase();

	return (
		matchedSlug === POD_COLLECTION_CATEGORY_SLUG ||
		normalizedSlugParam === POD_COLLECTION_CATEGORY_SLUG ||
		normalizedCategoryValue === POD_COLLECTION_CATEGORY_SLUG ||
		POD_COLLECTION_CATEGORY_IDS.has(rawCategoryValue)
	);
}

export function buildShopCollectionSeo(searchParams = {}, categories = []) {
	const page = parsePositivePage(getSafeSearchParamValue(searchParams, "page"));
	const rawCategorySlug = getSafeSearchParamValue(searchParams, "categorySlug");
	const activeKeys = Object.entries(searchParams || {})
		.filter(([, value]) => hasActiveValue(value))
		.map(([key]) => key);
	const unsupportedKeys = activeKeys.filter((key) => !INDEXABLE_SHOP_KEYS.has(key));
	const category = resolveCategoryContext(searchParams, categories);
	const isPodCategoryRequest = isPodCollectionCategoryRequest(
		searchParams,
		category,
	);

	if (isPodCategoryRequest) {
		const redirectSearchParams = new URLSearchParams();
		if (page > 1) {
			redirectSearchParams.set("page", String(page));
		}

		return {
			page,
			indexable: false,
			noindex: true,
			activeKeys,
			unsupportedKeys,
			hasUnsupportedKeys: unsupportedKeys.length > 0,
			categoryId: "",
			categorySlug: "",
			categoryName: "",
			categoryMatched: false,
			canonicalSearchParams: redirectSearchParams,
			title: `Custom Gifts${page > 1 ? ` | Page ${page}` : ""} | Personalized Print On Demand Gifts | Serene Jannat`,
			description:
				"Shop personalized custom gifts from Serene Jannat, including print-on-demand mugs, decor, and keepsakes for birthdays, anniversaries, holidays, and more.",
			keywords: [
				"custom gifts",
				"personalized gifts",
				"print on demand gifts",
				"gift ideas",
				"Serene Jannat",
			],
			schemaName: "Serene Jannat Custom Gifts",
			redirectPathname: POD_COLLECTION_PATH,
			redirectSearchParams,
		};
	}
	const hasCategorySlugInput = Boolean(rawCategorySlug);
	const hasSingleCategory = category.categoryValues.length <= 1;
	const hasIndexableCategory =
		(!category.categoryValues.length && !hasCategorySlugInput) || category.matched;
	const indexable = unsupportedKeys.length === 0 && hasSingleCategory && hasIndexableCategory;

	const canonicalSearchParams = new URLSearchParams();
	if (category.categoryId) {
		canonicalSearchParams.set("category", category.categoryId);
	}
	if (category.categorySlug) {
		canonicalSearchParams.set("categorySlug", category.categorySlug);
	}
	if (page > 1) {
		canonicalSearchParams.set("page", String(page));
	}

	const pageSuffix = page > 1 ? ` | Page ${page}` : "";
	const collectionLabel = category.categoryName || "Our Products";
	const title = category.categoryName
		? `${collectionLabel} Gifts & Decor${pageSuffix} | Serene Jannat`
		: `Our Products${pageSuffix} | Serene Jannat`;
	const description = category.categoryName
		? `Browse ${collectionLabel.toLowerCase()} from Serene Jannat with handcrafted decor and gift-ready pieces for your home and special occasions.`
		: "Browse all Serene Jannat products with handcrafted decor, gift ideas, and filterable shopping by category, color, size, and price.";
	const keywords = category.categoryName
		? [
				collectionLabel,
				`${collectionLabel} gifts`,
				`${collectionLabel} decor`,
				"handcrafted gifts",
				"Serene Jannat",
		  ]
		: ["our products", "handcrafted gifts", "home decor", "Serene Jannat"];

	return {
		page,
		indexable,
		noindex: !indexable,
		activeKeys,
		unsupportedKeys,
		hasUnsupportedKeys: unsupportedKeys.length > 0,
		categoryId: category.categoryId,
		categorySlug: category.categorySlug,
		categoryName: category.categoryName,
		categoryMatched: category.matched,
		canonicalSearchParams,
		title,
		description,
		keywords,
		schemaName: category.categoryName
			? `${category.categoryName} Products`
			: "Serene Jannat Our Products",
		redirectPathname: "",
		redirectSearchParams: null,
	};
}

export function buildPodCollectionSeo(searchParams = {}) {
	const rawOccasion = getSafeSearchParamValue(searchParams, "occasion");
	const occasion = resolveKnownPodOccasion(rawOccasion);
	const page = parsePositivePage(getSafeSearchParamValue(searchParams, "page"));
	const activeKeys = Object.entries(searchParams || {})
		.filter(([, value]) => hasActiveValue(value))
		.map(([key]) => key);
	const unsupportedKeys = activeKeys.filter(
		(key) => !INDEXABLE_POD_COLLECTION_KEYS.has(key)
	);
	const indexable = unsupportedKeys.length === 0 && (!rawOccasion || Boolean(occasion));

	const canonicalSearchParams = new URLSearchParams();
	if (occasion) {
		canonicalSearchParams.set("occasion", occasion);
	}
	if (page > 1) {
		canonicalSearchParams.set("page", String(page));
	}

	const pageSuffix = page > 1 ? ` | Page ${page}` : "";
	const occasionLabel = occasion ? `${occasion} Custom Gifts` : "Custom Gifts";
	const title = occasion
		? `${occasion} Custom Gifts${pageSuffix} | Personalized Gifts | Serene Jannat`
		: `Custom Gifts${pageSuffix} | Personalized Print On Demand Gifts | Serene Jannat`;
	const description = occasion
		? `Shop personalized ${occasion.toLowerCase()} gifts from Serene Jannat. Explore customizable mugs, decor, and print-on-demand keepsakes made for ${occasion.toLowerCase()} celebrations.`
		: "Shop personalized custom gifts from Serene Jannat, including print-on-demand mugs, decor, and keepsakes for birthdays, anniversaries, holidays, and more.";
	const keywords = occasion
		? [
				`${occasion} gifts`,
				`personalized ${occasion} gifts`,
				`custom ${occasion} gifts`,
				`${occasion} gift ideas`,
				"print on demand gifts",
				"Serene Jannat",
		  ]
		: [
				"custom gifts",
				"personalized gifts",
				"print on demand gifts",
				"gift ideas",
				"Serene Jannat",
		  ];

	return {
		page,
		indexable,
		noindex: !indexable,
		activeKeys,
		unsupportedKeys,
		hasUnsupportedKeys: unsupportedKeys.length > 0,
		occasion,
		canonicalSearchParams,
		title,
		description,
		keywords,
		schemaName: occasionLabel,
	};
}
