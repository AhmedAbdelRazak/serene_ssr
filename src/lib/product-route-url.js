import { getPodOccasions, getPodVariantSelections } from "./product-helpers";
import { toSlug } from "./utils";

const TRACKING_QUERY_KEYS = new Set([
	"utm_source",
	"utm_medium",
	"utm_campaign",
	"utm_term",
	"utm_content",
	"utm_id",
	"gclid",
	"gbraid",
	"wbraid",
	"fbclid",
	"msclkid",
	"mc_cid",
	"mc_eid",
	"srsltid",
	"ttclid",
	"twclid",
	"ref",
]);

function normalizeQueryValue(value = "") {
	if (typeof value === "symbol") return "";
	return `${value ?? ""}`;
}

function normalizeToken(value = "") {
	return normalizeQueryValue(value).trim().toLowerCase();
}

function normalizeColorToken(value = "") {
	const raw = normalizeToken(value);
	if (!raw) return "";
	if (raw.startsWith("#")) return raw;
	if (/^[0-9a-f]{3,8}$/i.test(raw)) return `#${raw}`;
	return raw;
}

function hasSearchParamKey(source = {}, key = "") {
	if (!key) return false;
	if (typeof source?.has === "function") {
		return source.has(key);
	}
	return Object.prototype.hasOwnProperty.call(source || {}, key);
}

export function getSearchParamValue(source = {}, key = "") {
	if (!key) return "";
	if (typeof source?.get === "function") {
		return normalizeQueryValue(source.get(key)).trim();
	}
	const raw = source?.[key];
	if (Array.isArray(raw)) return normalizeQueryValue(raw[0]).trim();
	return normalizeQueryValue(raw).trim();
}

function iterateSearchParamEntries(source = {}) {
	if (!source) return [];

	if (typeof source?.entries === "function") {
		return Array.from(source.entries()).map(([key, value]) => [
			`${key || ""}`,
			normalizeQueryValue(value),
		]);
	}

	return Object.entries(source).flatMap(([key, value]) => {
		if (Array.isArray(value)) {
			return value.map((entry) => [`${key || ""}`, normalizeQueryValue(entry)]);
		}
		return [[`${key || ""}`, normalizeQueryValue(value)]];
	});
}

function buildComparableSearchParams(source = {}) {
	const params = new URLSearchParams();
	const entries = iterateSearchParamEntries(source).sort(([leftKey, leftValue], [rightKey, rightValue]) => {
		if (leftKey === rightKey) {
			return `${leftValue}`.localeCompare(`${rightValue}`);
		}
		return leftKey.localeCompare(rightKey);
	});

	for (const [key, value] of entries) {
		params.append(key, value);
	}

	return params;
}

export function serializeComparableSearchParams(source = {}) {
	return buildComparableSearchParams(source).toString();
}

export function appendTrackingQueryParams(target, source = {}) {
	for (const [key, value] of iterateSearchParamEntries(source)) {
		if (!TRACKING_QUERY_KEYS.has(key)) continue;
		const safeValue = normalizeQueryValue(value).trim();
		if (!safeValue) continue;
		target.append(key, safeValue);
	}
}

function addValueToMap(map, value = "", { color = false } = {}) {
	const safeValue = normalizeQueryValue(value).trim();
	if (!safeValue) return;
	const token = normalizeToken(safeValue);
	if (token && !map.has(token)) {
		map.set(token, safeValue);
	}
	if (color) {
		const colorToken = normalizeColorToken(safeValue);
		if (colorToken && !map.has(colorToken)) {
			map.set(colorToken, safeValue);
		}
	}
}

function resolveMappedValue(map, requestedValue = "", { color = false } = {}) {
	const safeValue = normalizeQueryValue(requestedValue).trim();
	if (!safeValue) return "";

	const directToken = normalizeToken(safeValue);
	if (directToken && map.has(directToken)) {
		return map.get(directToken) || "";
	}

	if (color) {
		const colorToken = normalizeColorToken(safeValue);
		if (colorToken && map.has(colorToken)) {
			return map.get(colorToken) || "";
		}
	}

	return "";
}

function selectionHasValues(selection = {}) {
	return Object.values(selection).some((value) => normalizeQueryValue(value).trim());
}

function selectionMatchesOption(option = {}, selection = {}) {
	const activeKeys = Object.entries(selection).filter(([, value]) =>
		normalizeQueryValue(value).trim()
	);
	if (!activeKeys.length) return true;

	return activeKeys.every(([key, value]) => {
		if (key === "color") {
			return normalizeColorToken(option?.[key]) === normalizeColorToken(value);
		}
		return normalizeToken(option?.[key]) === normalizeToken(value);
	});
}

function sanitizePodName(value = "") {
	const normalized = normalizeQueryValue(value).replace(/[\r\n\t]+/g, " ").trim();
	return normalized ? normalized.slice(0, 40) : "";
}

function buildOccasionMap(product = {}) {
	const map = new Map();
	for (const occasion of getPodOccasions(product)) {
		const safeOccasion = normalizeQueryValue(occasion).trim();
		if (!safeOccasion) continue;
		const token = normalizeToken(safeOccasion);
		if (token && !map.has(token)) {
			map.set(token, safeOccasion);
		}
		const slug = toSlug(safeOccasion);
		if (slug && !map.has(slug)) {
			map.set(slug, safeOccasion);
		}
	}
	return map;
}

function buildVariantMaps(options = []) {
	const maps = {
		color: new Map(),
		size: new Map(),
		scent: new Map(),
	};

	for (const option of options) {
		addValueToMap(maps.color, option?.color, { color: true });
		addValueToMap(maps.size, option?.size);
		addValueToMap(maps.scent, option?.scent);
	}

	return maps;
}

function buildPodRouteSearchParams({
	searchParams = {},
	occasion = "",
	selection = {},
	name = "",
} = {}) {
	const params = new URLSearchParams();
	if (occasion) params.set("occasion", occasion);
	if (selection.color) params.set("color", selection.color);
	if (selection.size) params.set("size", selection.size);
	if (selection.scent) params.set("scent", selection.scent);
	if (name) params.set("name", name);
	appendTrackingQueryParams(params, searchParams);
	return params;
}

function buildStandardRouteSearchParams({ searchParams = {}, selection = {} } = {}) {
	const params = new URLSearchParams();
	if (selection.color) params.set("color", selection.color);
	if (selection.size) params.set("size", selection.size);
	if (selection.scent) params.set("scent", selection.scent);
	appendTrackingQueryParams(params, searchParams);
	return params;
}

export function sanitizePodProductRoute(product = {}, searchParams = {}) {
	const podSelections = getPodVariantSelections(product);
	const variantMaps = buildVariantMaps(podSelections);
	const occasionMap = buildOccasionMap(product);

	let selection = {
		color: resolveMappedValue(variantMaps.color, getSearchParamValue(searchParams, "color"), {
			color: true,
		}),
		size: resolveMappedValue(variantMaps.size, getSearchParamValue(searchParams, "size")),
		scent: resolveMappedValue(variantMaps.scent, getSearchParamValue(searchParams, "scent")),
	};

	const hasRequestedVariantSelection = ["color", "size", "scent"].some((key) =>
		hasSearchParamKey(searchParams, key)
	);

	if (
		hasRequestedVariantSelection &&
		selectionHasValues(selection) &&
		!podSelections.some((option) => selectionMatchesOption(option, selection))
	) {
		selection = { color: "", size: "", scent: "" };
	}

	const occasion = resolveMappedValue(
		occasionMap,
		getSearchParamValue(searchParams, "occasion")
	);
	const name = sanitizePodName(getSearchParamValue(searchParams, "name"));
	const routeSearchParams = buildPodRouteSearchParams({
		searchParams,
		occasion,
		selection,
		name,
	});

	return {
		selection: {
			occasion,
			name,
			color: selection.color,
			size: selection.size,
			scent: selection.scent,
		},
		routeSearchParams,
	};
}

export function sanitizeStandardProductRoute(product = {}, searchParams = {}) {
	const attributes = Array.isArray(product?.productAttributes) ? product.productAttributes : [];
	const variantMaps = buildVariantMaps(attributes);

	let selection = {
		color: resolveMappedValue(variantMaps.color, getSearchParamValue(searchParams, "color"), {
			color: true,
		}),
		size: resolveMappedValue(variantMaps.size, getSearchParamValue(searchParams, "size")),
		scent: resolveMappedValue(variantMaps.scent, getSearchParamValue(searchParams, "scent")),
	};

	const hasRequestedVariantSelection = ["color", "size", "scent"].some((key) =>
		hasSearchParamKey(searchParams, key)
	);

	if (
		hasRequestedVariantSelection &&
		selectionHasValues(selection) &&
		!attributes.some((option) => selectionMatchesOption(option, selection))
	) {
		selection = { color: "", size: "", scent: "" };
	}

	return {
		selection,
		routeSearchParams: buildStandardRouteSearchParams({
			searchParams,
			selection,
		}),
	};
}
