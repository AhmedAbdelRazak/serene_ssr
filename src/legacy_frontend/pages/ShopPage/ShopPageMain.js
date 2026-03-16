import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import styled, { keyframes } from "styled-components";
import { Suspense, lazy } from "react";
import {
	Select,
	Slider,
	Drawer,
	ConfigProvider,
	Modal,
} from "antd";
import { Link, useHistory, useLocation } from "react-router-dom";
import {
	ShoppingCartOutlined,
	FilterOutlined,
	ReloadOutlined,
} from "@ant-design/icons";
import { gettingFilteredProducts, getColors, readProduct } from "../../apiCore";
import { useCartContext } from "../../cart_context";
import { useLegacyRouteBootstrap } from "../../bootstrap/LegacyRouteBootstrapContext";
import { isAuthenticated } from "../../auth";
import OptimizedImage from "../../components/OptimizedImage";
import { resolveImageSources } from "../../utils/image";
import {
	POD_OCCASION_OPTIONS,
	resolvePodPersonalization,
	savePodPersonalization,
	buildPersonalizationSearch,
	markPodModalShown,
	shouldShowPodModalNow,
	hasStoredPodPersonalization,
	parsePersonalizationFromSearch,
} from "../PrintOnDemand/podPersonalization";

const { Option } = Select;
const ShopPageHelmet = lazy(() => import("./ShopPageHelmet"));

const MULTI_SELECT_FILTER_KEYS = ["color", "category", "size"];
const PRICE_EPSILON = 0.01;

function emitGaEvent(payload = {}) {
	if (typeof window === "undefined" || typeof window.gtag !== "function") return;
	try {
		window.gtag("event", `${payload.action || "event"}`.trim(), {
			event_category: payload.category,
			event_label: payload.label,
			value: payload.value,
		});
	} catch {}
}

function emitFbTrack(eventName, payload = {}, options = {}) {
	if (typeof window === "undefined" || typeof window.fbq !== "function") return;
	try {
		window.fbq("track", eventName, payload, options);
	} catch {}
}

async function postFacebookConversion(payload = {}) {
	try {
		await fetch(`${process.env.REACT_APP_API_URL}/facebookpixel/conversionapi`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(payload),
			keepalive: true,
		});
	} catch {}
}

function createDefaultFilters() {
	return {
		color: [],
		priceMin: 0,
		priceMax: 1000,
		category: [],
		size: [],
		gender: "",
		store: "",
		searchTerm: "",
		offers: "",
	};
}

const FILTER_DEFAULTS = createDefaultFilters();

const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;

function toTitleCase(value = "") {
	return `${value}`
		.toLowerCase()
		.replace(/\b\w/g, (char) => char.toUpperCase());
}

function isHexColor(value = "") {
	return /^#[0-9a-f]{6}$/i.test((value || "").trim());
}

function hexToRgb(hex = "") {
	const safe = hex.replace("#", "").trim();
	if (safe.length !== 6) return null;
	const parsed = Number.parseInt(safe, 16);
	if (Number.isNaN(parsed)) return null;
	return {
		r: (parsed >> 16) & 255,
		g: (parsed >> 8) & 255,
		b: parsed & 255,
	};
}

const COLOR_NAME_PALETTE = [
	{ name: "Black", hex: "#000000" },
	{ name: "White", hex: "#ffffff" },
	{ name: "Gray", hex: "#808080" },
	{ name: "Navy", hex: "#1f2a44" },
	{ name: "Blue", hex: "#1e40af" },
	{ name: "Teal", hex: "#0f766e" },
	{ name: "Green", hex: "#166534" },
	{ name: "Olive", hex: "#556b2f" },
	{ name: "Yellow", hex: "#eab308" },
	{ name: "Orange", hex: "#ea580c" },
	{ name: "Brown", hex: "#78350f" },
	{ name: "Red", hex: "#b91c1c" },
	{ name: "Burgundy", hex: "#7f1d1d" },
	{ name: "Pink", hex: "#ec4899" },
	{ name: "Purple", hex: "#6d28d9" },
	{ name: "Maroon", hex: "#800000" },
];

function distanceBetweenRgb(a, b) {
	const dr = a.r - b.r;
	const dg = a.g - b.g;
	const db = a.b - b.b;
	return Math.sqrt(dr * dr + dg * dg + db * db);
}

function getApproxHexColorName(hex = "") {
	const rgb = hexToRgb(hex);
	if (!rgb) return "";
	let best = null;
	let bestDistance = Number.POSITIVE_INFINITY;
	for (const candidate of COLOR_NAME_PALETTE) {
		const candidateRgb = hexToRgb(candidate.hex);
		if (!candidateRgb) continue;
		const distance = distanceBetweenRgb(rgb, candidateRgb);
		if (distance < bestDistance) {
			bestDistance = distance;
			best = candidate.name;
		}
	}
	return best || "";
}

function normalizeFilterArray(values = []) {
	const normalized = values
		.map((value) => `${value || ""}`.trim())
		.filter(Boolean);
	const unique = Array.from(new Set(normalized));
	return unique.sort((a, b) => a.localeCompare(b));
}

function areStringArraysEqual(arrA = [], arrB = []) {
	if (arrA.length !== arrB.length) return false;
	for (let index = 0; index < arrA.length; index += 1) {
		if (arrA[index] !== arrB[index]) return false;
	}
	return true;
}

function getMultiParamValues(params, key) {
	const valuesFromSearch = params.getAll(key);
	const rawValues = valuesFromSearch.length
		? valuesFromSearch.flatMap((value) => `${value || ""}`.split(","))
		: params.get(key)
		? `${params.get(key)}`.split(",")
		: [];
	const decodedValues = rawValues.map((value) =>
		decodeURIComponent(`${value || ""}`).trim()
	);
	return normalizeFilterArray(decodedValues);
}

function parseShopFiltersFromSearch(search = "") {
	const params = new URLSearchParams(search);
	const rawPriceMin = Number(params.get("priceMin"));
	const rawPriceMax = Number(params.get("priceMax"));
	const rawCategories = getMultiParamValues(params, "category").filter((value) =>
		OBJECT_ID_REGEX.test(value)
	);
	const rawColors = getMultiParamValues(params, "color").filter(
		(value) => value.toLowerCase() !== "unknown"
	);
	const rawSizes = getMultiParamValues(params, "size");
	const rawStore = decodeURIComponent(params.get("store") || "").trim();
	const safeSearchTerm = decodeURIComponent(params.get("searchTerm") || "").trim();

	const safePriceMin =
		Number.isFinite(rawPriceMin) && rawPriceMin >= 0
			? rawPriceMin
			: FILTER_DEFAULTS.priceMin;
	const safePriceMax =
		Number.isFinite(rawPriceMax) && rawPriceMax >= 0
			? rawPriceMax
			: FILTER_DEFAULTS.priceMax;

	return {
		...createDefaultFilters(),
		color: rawColors,
		priceMin: safePriceMin,
		priceMax: safePriceMax,
		category: rawCategories,
		size: rawSizes,
		gender: params.get("gender") || "",
		store: rawStore,
		searchTerm: safeSearchTerm,
		offers: params.get("offers") || "",
	};
}

function appendMultiFilterParams(params, key, values = []) {
	values.forEach((value) => {
		const safe = `${value || ""}`.trim();
		if (safe) params.append(key, safe);
	});
}

function buildApiFilterQueryString(activeFilters) {
	const params = new URLSearchParams();
	appendMultiFilterParams(params, "color", activeFilters.color);
	appendMultiFilterParams(params, "category", activeFilters.category);
	appendMultiFilterParams(params, "size", activeFilters.size);
	if (activeFilters.gender) params.set("gender", activeFilters.gender);
	if (activeFilters.store) params.set("store", activeFilters.store);
	if ((activeFilters.searchTerm || "").trim()) {
		params.set("searchTerm", activeFilters.searchTerm.trim());
	}
	if (activeFilters.offers) params.set("offers", activeFilters.offers);
	return params.toString();
}

function isNearlyEqualPrice(a, b) {
	return Math.abs(Number(a) - Number(b)) <= PRICE_EPSILON;
}

function isFullPriceSelection(range = [0, 0], bounds = [0, 0]) {
	return isNearlyEqualPrice(range[0], bounds[0]) && isNearlyEqualPrice(range[1], bounds[1]);
}

function buildPaginationModel(currentPage = 1, totalPages = 1, maxVisible = 5) {
	if (totalPages <= 1) return [1];
	if (totalPages <= maxVisible + 2) {
		return Array.from({ length: totalPages }, (_, index) => index + 1);
	}

	const safeCurrent = Math.min(Math.max(1, currentPage), totalPages);
	const windowSize = Math.max(1, maxVisible);
	let start = Math.max(2, safeCurrent - Math.floor(windowSize / 2));
	let end = Math.min(totalPages - 1, start + windowSize - 1);
	start = Math.max(2, end - windowSize + 1);

	const items = [1];
	if (start > 2) items.push("start-ellipsis");
	for (let value = start; value <= end; value += 1) {
		items.push(value);
	}
	if (end < totalPages - 1) items.push("end-ellipsis");
	items.push(totalPages);
	return items;
}

function clampPriceRange(range = [0, 1000], bounds = [0, 1000]) {
	const minBound = Number(bounds?.[0] ?? 0);
	const maxBound = Number(bounds?.[1] ?? 1000);
	const safeMinBound = Number.isFinite(minBound) ? minBound : 0;
	const safeMaxBound = Number.isFinite(maxBound) ? maxBound : 1000;

	const rawMin = Number(range?.[0]);
	const rawMax = Number(range?.[1]);
	let minValue = Number.isFinite(rawMin) ? rawMin : safeMinBound;
	let maxValue = Number.isFinite(rawMax) ? rawMax : safeMaxBound;

	minValue = Math.max(safeMinBound, Math.min(minValue, safeMaxBound));
	maxValue = Math.max(minValue, Math.min(maxValue, safeMaxBound));

	return [
		Number(minValue.toFixed(2)),
		Number(maxValue.toFixed(2)),
	];
}

function resolvePreferredImageSources(image) {
	const { primary, fallback } = resolveImageSources(image);
	return { primary: primary || "", fallback: fallback || primary || "" };
}

function expandProductsForShop(rawProducts = [], legacyCategorySlug = "") {
	const uniqueProductMap = {};
	const processed = (Array.isArray(rawProducts) ? rawProducts : [])
		.map((product) => {
			const isPOD = product?.printifyProductDetails?.POD;
			const productAttributes = product?.productAttributes || [];

			if (isPOD && productAttributes.length > 0) {
				const colorGroups = {};
				productAttributes.forEach((attr) => {
					const colorCode = attr?.color || "unknown";
					if (!colorGroups[colorCode]) {
						colorGroups[colorCode] = [];
					}
					colorGroups[colorCode].push(attr);
				});

				return Object.keys(colorGroups).map((colorCode) => {
					const attrList = colorGroups[colorCode];
					const firstAttr = attrList?.[0] || {};
					const colorTotalQty = attrList.reduce(
						(acc, attr) => acc + Number(attr?.quantity || 0),
						0
					);

					const subPrice = firstAttr?.price || 0;
					const subPriceAfterDiscount =
						firstAttr?.priceAfterDiscount && firstAttr.priceAfterDiscount > 0
							? firstAttr.priceAfterDiscount
							: subPrice;

					const subProduct = {
						...product,
						productAttributes: attrList,
						subColorCode: colorCode,
						price: subPrice,
						priceAfterDiscount: subPriceAfterDiscount,
						quantity: colorTotalQty,
					};

					subProduct.displayImages = firstAttr?.productImages?.length
						? firstAttr.productImages
						: product?.thumbnailImage?.[0]?.images || [];

					uniqueProductMap[`${product._id}-${colorCode}`] = subProduct;
					return subProduct;
				});
			}

			if (productAttributes.length > 0) {
				const uniqueAttributes = productAttributes.reduce((acc, attr) => {
					if (!acc[attr.color]) {
						acc[attr.color] = {
							...product,
							productAttributes: [attr],
							thumbnailImage: product?.thumbnailImage,
						};
					}
					return acc;
				}, {});

				const subProducts = Object.values(uniqueAttributes);
				subProducts.forEach((subProd) => {
					const colorCode = subProd?.productAttributes?.[0]?.color || "default";
					uniqueProductMap[`${product._id}-${colorCode}`] = subProd;
				});
				return subProducts;
			}

			uniqueProductMap[product._id] = product;
			return [product];
		})
		.flat();

	return legacyCategorySlug
		? processed.filter((product) => product?.category?.categorySlug === legacyCategorySlug)
		: processed;
}

function buildShopStateFromPayload(payload = {}, legacyCategorySlug = "") {
	return {
		products: expandProductsForShop(payload?.products || [], legacyCategorySlug),
		totalRecords: Number(payload?.totalRecords || 0),
		colors: Array.isArray(payload?.colors) ? payload.colors : [],
		sizes: Array.isArray(payload?.sizes) ? payload.sizes : [],
		categories: Array.isArray(payload?.categories) ? payload.categories : [],
		genders: Array.isArray(payload?.genders) ? payload.genders : [],
		stores: Array.isArray(payload?.stores) ? payload.stores : [],
		priceRange: [
			Number(payload?.priceRange?.minPrice ?? 0),
			Number(payload?.priceRange?.maxPrice ?? 1000),
		],
	};
}

function ShopPageMain() {
	const history = useHistory();
	const location = useLocation();
	const isSyncingFromLocationRef = useRef(false);
	const routeBootstrap = useLegacyRouteBootstrap();
	const initialShopBootstrap = routeBootstrap?.type === "shop" ? routeBootstrap : null;
	const initialFilters = parseShopFiltersFromSearch(location.search);
	const initialPageFromLocation = Number(
		new URLSearchParams(location.search).get("page")
	);
	const initialPage =
		Number.isFinite(initialPageFromLocation) && initialPageFromLocation > 0
			? Math.floor(initialPageFromLocation)
			: 1;
	const legacyCategorySlug = useMemo(() => {
		const params = new URLSearchParams(location.search);
		const explicitSlug = `${params.get("categorySlug") || ""}`.trim();
		if (explicitSlug) return explicitSlug;

		const rawCategory = params.getAll("category");
		const firstCategory = rawCategory.length ? rawCategory[0] : params.get("category");
		const firstCategoryValue = `${firstCategory || ""}`
			.split(",")[0]
			.trim();
		if (firstCategoryValue && !OBJECT_ID_REGEX.test(firstCategoryValue)) {
			return firstCategoryValue;
		}
		return "";
	}, [location.search]);
	const initialShopState = useMemo(
		() =>
			initialShopBootstrap?.payload
				? buildShopStateFromPayload(initialShopBootstrap.payload, legacyCategorySlug)
				: null,
		[initialShopBootstrap, legacyCategorySlug]
	);

	// Keep these states as arrays/strings by default to avoid any .map errors.
	const [products, setProducts] = useState(() => initialShopState?.products || []);
	const [totalRecords, setTotalRecords] = useState(
		() => initialShopState?.totalRecords || 0
	);

	const [colors, setColors] = useState(() => initialShopState?.colors || []);
	const [sizes, setSizes] = useState(() => initialShopState?.sizes || []);
	const [categories, setCategories] = useState(
		() => initialShopState?.categories || []
	);
	const [genders, setGenders] = useState(() => initialShopState?.genders || []);
	const [stores, setStores] = useState(() => initialShopState?.stores || []);
	const [priceRange, setPriceRange] = useState(
		() => initialShopState?.priceRange || [0, 1000]
	);
	const [allColors, setAllColors] = useState([]);

	const [filters, setFilters] = useState(() => initialFilters);

	const [page, setPage] = useState(() => initialPage);
	const [drawerVisible, setDrawerVisible] = useState(false);
	const [isDesktopViewport, setIsDesktopViewport] = useState(false);

	const initialPersonalization = resolvePodPersonalization(location.search);
	const [podOccasion, setPodOccasion] = useState(
		initialPersonalization.occasion
	);
	const [podName, setPodName] = useState(initialPersonalization.name);
	const [showPodWelcomeModal, setShowPodWelcomeModal] = useState(false);
	const [pendingPodProduct, setPendingPodProduct] = useState(null);
	const [podFieldPulseKey, setPodFieldPulseKey] = useState(0);
	const [searchInput, setSearchInput] = useState(initialFilters.searchTerm);
	const [isPriceFilterActive, setIsPriceFilterActive] = useState(() => {
		const params = new URLSearchParams(location.search);
		return params.has("priceMin") || params.has("priceMax");
	});
	const [draftPriceRange, setDraftPriceRange] = useState(() => [
		initialFilters.priceMin,
		initialFilters.priceMax,
	]);
	const lastFetchKeyRef = useRef("");
	const inFlightFetchKeyRef = useRef("");
	const priceSliderInteractingRef = useRef(false);
	const hasAppliedBootstrapRequestKeyRef = useRef(false);

	// How many products per page:
	const records = Number(initialShopBootstrap?.records || 30) || 30;
	const totalPages = Math.max(1, Math.ceil(totalRecords / records));
	const paginationItems = useMemo(
		() => buildPaginationModel(page, totalPages),
		[page, totalPages]
	);
	const antTheme = useMemo(
		() => ({
			token: {
				colorPrimary: "var(--primary-color)",
				colorPrimaryHover: "var(--primary-color-dark)",
				colorText: "var(--text-color-primary)",
				colorBgContainer: "white",
				borderRadius: 8,
			},
		}),
		[]
	);

	const { openSidebar2, addToCart } = useCartContext();
	const auth = isAuthenticated() || {};
	const user = auth.user || null;

	// Fetch master color list
	useEffect(() => {
		getColors().then((data) => {
			if (data?.error) {
				console.log(data.error);
			} else {
				setAllColors(data || []);
			}
		});
	}, []);

	useEffect(() => {
		if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
			return undefined;
		}

		const mediaQuery = window.matchMedia("(min-width: 577px)");
		const syncViewport = () => {
			setIsDesktopViewport(mediaQuery.matches);
		};

		syncViewport();
		if (typeof mediaQuery.addEventListener === "function") {
			mediaQuery.addEventListener("change", syncViewport);
			return () => {
				mediaQuery.removeEventListener("change", syncViewport);
			};
		}

		mediaQuery.addListener(syncViewport);
		return () => {
			mediaQuery.removeListener(syncViewport);
		};
	}, []);

	useEffect(() => {
		if (!location.pathname.includes("/our-products")) return;
		const resolvedFromSearch = parsePersonalizationFromSearch(location.search);
		if (!resolvedFromSearch) return;
		setPodOccasion((prev) =>
			prev === resolvedFromSearch.occasion ? prev : resolvedFromSearch.occasion
		);
		setPodName((prev) =>
			prev === resolvedFromSearch.name ? prev : resolvedFromSearch.name
		);
	}, [location.search]);

	const commitPodPersonalization = useCallback((occasion, name) => {
		const safe = savePodPersonalization({ occasion, name });
		setPodOccasion(safe.occasion);
		setPodName(safe.name);
		return safe;
	}, []);

	const shouldAskForPodPersonalization = useCallback(() => {
		if (!location.pathname.includes("/our-products")) return false;
		if (!shouldShowPodModalNow()) return false;
		if (parsePersonalizationFromSearch(location.search)) return false;
		return !hasStoredPodPersonalization();
	}, [location.pathname, location.search]);

	useEffect(() => {
		if (showPodWelcomeModal) {
			// Re-mount wrappers so the two-beat animation always replays on open.
			setPodFieldPulseKey((prev) => prev + 1);
		}
	}, [showPodWelcomeModal]);

	const handlePodWelcomeClose = () => {
		commitPodPersonalization(podOccasion, podName);
		markPodModalShown();
		setPendingPodProduct(null);
		setShowPodWelcomeModal(false);
	};

	const handlePodWelcomeStart = () => {
		const safe = commitPodPersonalization(podOccasion, podName);
		markPodModalShown();
		setShowPodWelcomeModal(false);
		if (pendingPodProduct) {
			const safePersonalization = savePodPersonalization(safe);
			history.push(getProductLink(pendingPodProduct, safePersonalization));
			setPendingPodProduct(null);
			return;
		}
		history.push(`/custom-gifts${buildPersonalizationSearch(safe)}`);
	};

	// Fetch filtered products
	const fetchFilteredProducts = useCallback(() => {
		// Convert filters to a query string
		const queryParams = new URLSearchParams(buildApiFilterQueryString(filters));
		if (isPriceFilterActive) {
			const safeMin = Number(filters.priceMin);
			const safeMax = Number(filters.priceMax);
			if (Number.isFinite(safeMin)) {
				queryParams.set("priceMin", String(safeMin));
			}
			if (Number.isFinite(safeMax)) {
				queryParams.set("priceMax", String(safeMax));
			}
		}
		const query = queryParams.toString();
		const requestKey = `${query}|${page}|${records}`;
		if (
			lastFetchKeyRef.current === requestKey ||
			inFlightFetchKeyRef.current === requestKey
		) {
			return;
		}
		inFlightFetchKeyRef.current = requestKey;

		gettingFilteredProducts(query, page, records).then((data) => {
			inFlightFetchKeyRef.current = "";
			if (data?.error) {
				console.log(data.error);
				lastFetchKeyRef.current = "";
			} else if (!data || !Array.isArray(data.products)) {
				lastFetchKeyRef.current = "";
			} else {
				lastFetchKeyRef.current = requestKey;
				const nextShopState = buildShopStateFromPayload(data, legacyCategorySlug);
				setProducts(nextShopState.products);
				setTotalRecords(nextShopState.totalRecords);
				setColors(nextShopState.colors);
				setSizes(nextShopState.sizes);
				setCategories(nextShopState.categories);
				setGenders(nextShopState.genders);
				setStores(nextShopState.stores);
				setPriceRange((prevRange) => {
					if (
						prevRange[0] === nextShopState.priceRange[0] &&
						prevRange[1] === nextShopState.priceRange[1]
					) {
						return prevRange;
					}
					return nextShopState.priceRange;
				});
			}
		});
	}, [filters, isPriceFilterActive, legacyCategorySlug, page, records]);

	useEffect(() => {
		if (!initialShopBootstrap?.payload) return;
		if (hasAppliedBootstrapRequestKeyRef.current) return;
		const queryParams = new URLSearchParams(buildApiFilterQueryString(filters));
		if (isPriceFilterActive) {
			const safeMin = Number(filters.priceMin);
			const safeMax = Number(filters.priceMax);
			if (Number.isFinite(safeMin)) {
				queryParams.set("priceMin", String(safeMin));
			}
			if (Number.isFinite(safeMax)) {
				queryParams.set("priceMax", String(safeMax));
			}
		}
		lastFetchKeyRef.current = `${queryParams.toString()}|${page}|${records}`;
		hasAppliedBootstrapRequestKeyRef.current = true;
	}, [filters, initialShopBootstrap, isPriceFilterActive, page, records]);

	// 1) We only fetch products on filters/page changes
	useEffect(() => {
		fetchFilteredProducts();
	}, [filters, page, fetchFilteredProducts]);

	useEffect(() => {
		const totalPages = Math.max(1, Math.ceil(totalRecords / records));
		if (page > totalPages) {
			setPage(totalPages);
		}
	}, [page, records, totalRecords]);

	const formatReadableColor = useCallback(
		(rawColor = "") => {
			const safe = (rawColor || "").trim();
			if (!safe) return "";
			if (safe.toLowerCase() === "unknown") return "Unknown";

			const foundByHex = allColors.find(
				(item) => (item?.hexa || "").toLowerCase() === safe.toLowerCase()
			);
			if (foundByHex?.color) return toTitleCase(foundByHex.color);

			const foundByName = allColors.find(
				(item) => (item?.color || "").toLowerCase() === safe.toLowerCase()
			);
			if (foundByName?.color) return toTitleCase(foundByName.color);

			if (isHexColor(safe)) {
				const approx = getApproxHexColorName(safe);
				if (approx) return `${approx} (${safe.toUpperCase()})`;
				return `Color ${safe.toUpperCase()}`;
			}

			return safe;
		},
		[allColors]
	);

	const resolveColorFilterValue = useCallback(
		(colorValue = "") => {
			const safe = (colorValue || "").trim();
			if (!safe) return "";
			if (safe.toLowerCase() === "unknown") return "";

			const exactColor = colors.find((item) => item === safe);
			if (exactColor) return exactColor;

			const caseInsensitiveColor = colors.find(
				(item) => item?.toLowerCase() === safe.toLowerCase()
			);
			if (caseInsensitiveColor) return caseInsensitiveColor;

			const fromSchemaByName = allColors.find(
				(item) => (item?.color || "").toLowerCase() === safe.toLowerCase()
			);
			if (fromSchemaByName?.hexa) {
				const foundHex = colors.find(
					(item) =>
						item?.toLowerCase() === fromSchemaByName.hexa.toLowerCase()
				);
				if (foundHex) return foundHex;
			}

			const fromSchemaByHex = allColors.find(
				(item) => (item?.hexa || "").toLowerCase() === safe.toLowerCase()
			);
			if (fromSchemaByHex?.hexa) {
				const foundHex = colors.find(
					(item) =>
						item?.toLowerCase() === fromSchemaByHex.hexa.toLowerCase()
				);
				if (foundHex) return foundHex;
			}

			return safe;
		},
		[allColors, colors]
	);

	const displayColorOptions = useMemo(() => {
		const optionMap = new Map();
		(colors || []).forEach((raw) => {
			const value = `${raw || ""}`.trim();
			if (!value || value.toLowerCase() === "unknown") return;
			const label = formatReadableColor(value);
			if (!label) return;
			if (!optionMap.has(value)) {
				optionMap.set(value, { value, label });
			}
		});

		return Array.from(optionMap.values()).sort((a, b) =>
			a.label.localeCompare(b.label)
		);
	}, [colors, formatReadableColor]);

	const buildShopSearchFromFilters = useCallback(
		(nextFilters, nextPage) => {
			const params = new URLSearchParams();
			const currentSearchParams = new URLSearchParams(location.search);
			if (legacyCategorySlug && (!nextFilters.category || nextFilters.category.length === 0)) {
				params.set("categorySlug", legacyCategorySlug);
			}

			appendMultiFilterParams(params, "color", nextFilters.color);
			appendMultiFilterParams(params, "category", nextFilters.category);
			appendMultiFilterParams(params, "size", nextFilters.size);
			if (nextFilters.gender) params.set("gender", nextFilters.gender);
			if (nextFilters.store) params.set("store", nextFilters.store);
			if ((nextFilters.searchTerm || "").trim()) {
				params.set("searchTerm", nextFilters.searchTerm.trim());
			}
			if (nextFilters.offers) params.set("offers", nextFilters.offers);
			if (isPriceFilterActive) {
				const [minBound, maxBound] = clampPriceRange(priceRange, priceRange);
				const [selectedMin, selectedMax] = clampPriceRange(
					[nextFilters.priceMin, nextFilters.priceMax],
					[minBound, maxBound]
				);
				if (!isFullPriceSelection([selectedMin, selectedMax], [minBound, maxBound])) {
					params.set("priceMin", String(selectedMin));
					params.set("priceMax", String(selectedMax));
				}
			}
			if (nextPage > 1) params.set("page", String(nextPage));
			const currentOccasion = currentSearchParams.get("occasion");
			const currentName = currentSearchParams.get("name");
			if (currentOccasion) params.set("occasion", currentOccasion);
			if (currentName) params.set("name", currentName);

			const serialized = params.toString();
			return serialized ? `?${serialized}` : "";
		},
		[isPriceFilterActive, legacyCategorySlug, location.search, priceRange]
	);

	useEffect(() => {
		if (!location.pathname.includes("/our-products")) return;
		isSyncingFromLocationRef.current = true;
		const nextFilters = parseShopFiltersFromSearch(location.search);
		setFilters((prev) => {
			const same =
				areStringArraysEqual(prev.color, nextFilters.color) &&
				prev.priceMin === nextFilters.priceMin &&
				prev.priceMax === nextFilters.priceMax &&
				areStringArraysEqual(prev.category, nextFilters.category) &&
				areStringArraysEqual(prev.size, nextFilters.size) &&
				prev.gender === nextFilters.gender &&
				prev.store === nextFilters.store &&
				prev.searchTerm === nextFilters.searchTerm &&
				prev.offers === nextFilters.offers;
			return same ? prev : nextFilters;
		});

		const nextPage = Number(new URLSearchParams(location.search).get("page"));
		const resolvedPage =
			Number.isFinite(nextPage) && nextPage > 0 ? Math.floor(nextPage) : 1;
		setPage((prevPage) => (prevPage === resolvedPage ? prevPage : resolvedPage));

		const params = new URLSearchParams(location.search);
		const hasPriceParams = params.has("priceMin") || params.has("priceMax");
		setIsPriceFilterActive((prevActive) =>
			prevActive === hasPriceParams ? prevActive : hasPriceParams
		);
	}, [location.pathname, location.search]);

	useEffect(() => {
		setSearchInput((prevInput) =>
			prevInput === filters.searchTerm ? prevInput : filters.searchTerm
		);
	}, [filters.searchTerm]);

	useEffect(() => {
		if (!filters.color.length || !colors.length) return;
		const resolved = normalizeFilterArray(
			filters.color
				.map((colorValue) => resolveColorFilterValue(colorValue))
				.filter(Boolean)
		);
		if (areStringArraysEqual(resolved, filters.color)) return;
		setFilters((prev) => ({ ...prev, color: resolved }));
	}, [colors, filters.color, resolveColorFilterValue]);

	useEffect(() => {
		if (!location.pathname.includes("/our-products")) return;
		const nextSearch = buildShopSearchFromFilters(filters, page);
		if (isSyncingFromLocationRef.current) {
			if (nextSearch === location.search) {
				isSyncingFromLocationRef.current = false;
			}
			return;
		}
		if (nextSearch !== location.search) {
			history.replace({ pathname: location.pathname, search: nextSearch });
		}
	}, [
		buildShopSearchFromFilters,
		filters,
		history,
		location.pathname,
		location.search,
		page,
	]);

	useEffect(() => {
		if (!isPriceFilterActive) {
			const fullRange = clampPriceRange(priceRange, priceRange);
			setDraftPriceRange((prev) => {
				if (prev[0] === fullRange[0] && prev[1] === fullRange[1]) {
					return prev;
				}
				return fullRange;
			});
			return;
		}

		const clamped = clampPriceRange([filters.priceMin, filters.priceMax], priceRange);
		setDraftPriceRange((prev) => {
			if (prev[0] === clamped[0] && prev[1] === clamped[1]) {
				return prev;
			}
			return clamped;
		});
	}, [filters.priceMin, filters.priceMax, isPriceFilterActive, priceRange]);

	useEffect(() => {
		const normalizedSearch = `${searchInput || ""}`.trim();
		if (normalizedSearch === filters.searchTerm) return undefined;
		const timerId = window.setTimeout(() => {
			setFilters((prev) =>
				prev.searchTerm === normalizedSearch
					? prev
					: { ...prev, searchTerm: normalizedSearch }
			);
			setPage(1);
		}, 320);
		return () => {
			window.clearTimeout(timerId);
		};
	}, [filters.searchTerm, searchInput]);

	const handleSearchSubmit = useCallback((value = "") => {
		const normalizedSearch = `${value || ""}`.trim();
		setSearchInput(normalizedSearch);
		setFilters((prev) =>
			prev.searchTerm === normalizedSearch
				? prev
				: { ...prev, searchTerm: normalizedSearch }
		);
		setPage(1);
	}, []);

	const getPaginationSearch = useCallback(
		(nextPage) => buildShopSearchFromFilters(filters, nextPage),
		[buildShopSearchFromFilters, filters]
	);

	const handlePaginationLinkClick = useCallback(() => {
		if (typeof window !== "undefined") {
			window.scrollTo({ top: 0, behavior: "smooth" });
		}
	}, []);

	const handlePriceRangeCommit = useCallback(
		(rangeValue) => {
			const [nextMin, nextMax] = clampPriceRange(rangeValue, priceRange);
			const isFullSelectionNow = isFullPriceSelection(
				[nextMin, nextMax],
				priceRange
			);
			setIsPriceFilterActive(!isFullSelectionNow);
			setFilters((prev) => {
				const targetMin = isFullSelectionNow
					? FILTER_DEFAULTS.priceMin
					: nextMin;
				const targetMax = isFullSelectionNow
					? FILTER_DEFAULTS.priceMax
					: nextMax;
				if (prev.priceMin === targetMin && prev.priceMax === targetMax) {
					return prev;
				}
				return {
					...prev,
					priceMin: targetMin,
					priceMax: targetMax,
				};
			});
			setPage(1);
		},
		[priceRange]
	);

	const handlePriceRangeBeforeChange = useCallback(() => {
		priceSliderInteractingRef.current = true;
	}, []);

	const handlePriceRangeAfterChange = useCallback(
		(rangeValue) => {
			if (!priceSliderInteractingRef.current) return;
			priceSliderInteractingRef.current = false;
			handlePriceRangeCommit(rangeValue);
		},
		[handlePriceRangeCommit]
	);

	// Update filters and reset page
	function handleFilterChange(key, value) {
		let normalizedValue = value;
		if (MULTI_SELECT_FILTER_KEYS.includes(key)) {
			const asArray = Array.isArray(value) ? value : [];
			normalizedValue = normalizeFilterArray(asArray);
		} else {
			normalizedValue =
				value === undefined || value === null ? "" : `${value}`.trim();
		}
		setFilters((prev) => ({
			...prev,
			[key]: normalizedValue,
		}));
		setPage(1);
	}

	// Reset filters
	function resetFilters() {
		const defaults = createDefaultFilters();
		setFilters(defaults);
		setIsPriceFilterActive(false);
		setSearchInput(defaults.searchTerm);
		setDraftPriceRange([
			defaults.priceMin,
			defaults.priceMax,
		]);
		setPage(1);
	}

	// Drawer controls
	function showDrawer() {
		setDrawerVisible(true);
	}
	function closeDrawer() {
		setDrawerVisible(false);
	}

	function toPodSlug(name = "") {
		return (name || "custom-gift")
			.toLowerCase()
			.replace(/[^a-z0-9\s-]/g, "")
			.trim()
			.replace(/\s+/g, "-")
			.replace(/-+/g, "-");
	}

	// Decide product link
	function getProductLink(product = {}, personalization) {
		if (product?.printifyProductDetails?.POD) {
			const safe = savePodPersonalization(
				personalization || { occasion: podOccasion, name: podName }
			);
			const slug = toPodSlug(product?.productName);
			return `/custom-gifts/${slug}/${product._id}${buildPersonalizationSearch(
				safe
			)}`;
		}
		return `/single-product/${product?.slug || ""}/${
			product?.category?.categorySlug || ""
		}/${product?._id}`;
	}

	// (Optional) Transform images if using Cloudinary transformations
	// eslint-disable-next-line
	function getTransformedImageUrl(url = "", width, height) {
		if (!url) return "";
		const parts = url.split("upload/");
		const transformation = `upload/w_${width},h_${height},c_scale/`;
		return parts[0] + transformation + parts[1];
	}

	return (
		<>
			<Suspense fallback={null}>
				<ShopPageHelmet products={products} />
			</Suspense>

			<ShopPageMainOverallWrapper>
				<ShopPageMainWrapper>
					{isDesktopViewport ? (
						<ConfigProvider theme={antTheme}>
							<FiltersSection>
								<FilterGrid>
									<FilterField>
										<Select
											placeholder='Color'
											style={{ width: "100%" }}
											mode='multiple'
											allowClear
											maxTagCount='responsive'
											value={filters.color}
											onChange={(value) => handleFilterChange("color", value)}
										>
											{displayColorOptions.map((option) => (
												<Option key={option.value} value={option.value}>
													{option.label}
												</Option>
											))}
										</Select>
									</FilterField>
									<FilterField>
										<Select
											placeholder='Category'
											style={{ width: "100%" }}
											mode='multiple'
											allowClear
											maxTagCount='responsive'
											value={filters.category}
											onChange={(value) => handleFilterChange("category", value)}
										>
											{categories.map((cat) => (
												<Option key={cat.id} value={`${cat.id}`}>
													{toTitleCase(cat.name)}
												</Option>
											))}
										</Select>
									</FilterField>
									<FilterField>
										<Select
											placeholder='Size'
											style={{ width: "100%" }}
											mode='multiple'
											allowClear
											maxTagCount='responsive'
											value={filters.size}
											onChange={(value) => handleFilterChange("size", value)}
										>
											{sizes.map((size, index) => (
												<Option key={index} value={size}>
													{size}
												</Option>
											))}
										</Select>
									</FilterField>
									<FilterField>
										<Select
											placeholder='Gender'
											style={{ width: "100%" }}
											value={filters.gender}
											onChange={(value) => handleFilterChange("gender", value)}
										>
											<Option value=''>All Genders</Option>
											{genders.map((g, index) => (
												<Option key={index} value={g.id}>
													{g.name}
												</Option>
											))}
										</Select>
									</FilterField>
									<FilterField>
										<Select
											placeholder='Store'
											style={{ width: "100%" }}
											value={filters.store}
											onChange={(value) => handleFilterChange("store", value)}
											showSearch
											optionFilterProp='children'
										>
											<Option value=''>All Stores</Option>
											{stores.map((storeEntry) => (
												<Option
													key={storeEntry?.id || storeEntry?.name}
													value={storeEntry?.name || ""}
												>
													{storeEntry?.name || ""}
												</Option>
											))}
										</Select>
									</FilterField>
								</FilterGrid>

								<PriceSearchRow>
									<PriceRangeField>
										<FilterLabel>Price Range</FilterLabel>
										<FilterValueText>
											Selected: ${draftPriceRange[0].toFixed(2)} - $
											{draftPriceRange[1].toFixed(2)}
										</FilterValueText>
										<Slider
											range
											value={draftPriceRange}
											min={priceRange[0]}
											max={priceRange[1]}
											onBeforeChange={handlePriceRangeBeforeChange}
											onChange={(val) =>
												setDraftPriceRange(clampPriceRange(val, priceRange))
											}
											onAfterChange={handlePriceRangeAfterChange}
											tooltip={{ formatter: (val) => `$${val}` }}
										/>
										<PriceBounds>
											<PriceBoundLabel
												$isActive={filters.priceMin === priceRange[0]}
											>
												${priceRange[0]}
											</PriceBoundLabel>
											<PriceBoundLabel
												$isActive={filters.priceMax === priceRange[1]}
											>
												${priceRange[1]}
											</PriceBoundLabel>
										</PriceBounds>
									</PriceRangeField>

									<SearchField>
										<SearchForm
											onSubmit={(event) => {
												event.preventDefault();
												handleSearchSubmit(searchInput);
											}}
										>
											<SearchInput
												type='search'
												placeholder='Search'
												value={searchInput}
												onChange={(event) => setSearchInput(event.target.value)}
												aria-label='Search products'
											/>
											<SearchSubmitButton type='submit'>
												Search
											</SearchSubmitButton>
										</SearchForm>
									</SearchField>
								</PriceSearchRow>

								<FilterActionsRow>
									<ResetButton type='button' onClick={resetFilters}>
										<ReloadOutlined />
										<span>Reset Filters</span>
									</ResetButton>
								</FilterActionsRow>
							</FiltersSection>
						</ConfigProvider>
					) : (
						<DesktopFiltersPlaceholder aria-hidden='true' />
					)}

					<SearchInputWrapper>
						<FiltersTriggerButton type='button' onClick={showDrawer}>
							<FilterOutlined />
							<span>Filters</span>
						</FiltersTriggerButton>
						<MobileSearchField>
							<SearchForm
								onSubmit={(event) => {
									event.preventDefault();
									handleSearchSubmit(searchInput);
								}}
							>
								<SearchInput
									type='search'
									placeholder='Search'
									value={searchInput}
									onChange={(event) => setSearchInput(event.target.value)}
									aria-label='Search products'
								/>
								<MobileSearchSubmitButton type='submit'>
									Go
								</MobileSearchSubmitButton>
							</SearchForm>
						</MobileSearchField>
					</SearchInputWrapper>

					{drawerVisible ? (
						<ConfigProvider theme={antTheme}>
							<FiltersDrawer
								title='Filters'
								placement='left'
								closable
								onClose={closeDrawer}
								open={drawerVisible}
							>
								<DrawerFilterStack>
									<FilterField>
										<Select
											placeholder='Color'
											style={{ width: "100%" }}
											mode='multiple'
											allowClear
											maxTagCount='responsive'
											value={filters.color}
											onChange={(value) => handleFilterChange("color", value)}
										>
											{displayColorOptions.map((option) => (
												<Option key={option.value} value={option.value}>
													{option.label}
												</Option>
											))}
										</Select>
									</FilterField>
									<FilterField>
										<Select
											placeholder='Category'
											style={{ width: "100%" }}
											mode='multiple'
											allowClear
											maxTagCount='responsive'
											value={filters.category}
											onChange={(value) => handleFilterChange("category", value)}
										>
											{categories.map((cat) => (
												<Option key={cat.id} value={`${cat.id}`}>
													{toTitleCase(cat.name)}
												</Option>
											))}
										</Select>
									</FilterField>
									<FilterField>
										<Select
											placeholder='Size'
											style={{ width: "100%" }}
											mode='multiple'
											allowClear
											maxTagCount='responsive'
											value={filters.size}
											onChange={(value) => handleFilterChange("size", value)}
										>
											{sizes.map((size, index) => (
												<Option key={index} value={size}>
													{size}
												</Option>
											))}
										</Select>
									</FilterField>
									<FilterField>
										<Select
											placeholder='Gender'
											style={{ width: "100%" }}
											value={filters.gender}
											onChange={(value) => handleFilterChange("gender", value)}
										>
											<Option value=''>All Genders</Option>
											{genders.map((g, index) => (
												<Option key={index} value={g.id}>
													{g.name}
												</Option>
											))}
										</Select>
									</FilterField>
									<FilterField>
										<Select
											placeholder='Store'
											style={{ width: "100%" }}
											value={filters.store}
											onChange={(value) => handleFilterChange("store", value)}
											showSearch
											optionFilterProp='children'
										>
											<Option value=''>All Stores</Option>
											{stores.map((storeEntry) => (
												<Option
													key={storeEntry?.id || storeEntry?.name}
													value={storeEntry?.name || ""}
												>
													{storeEntry?.name || ""}
												</Option>
											))}
										</Select>
									</FilterField>

									<PriceRangeField>
										<FilterLabel>Price Range</FilterLabel>
										<FilterValueText>
											Selected: ${draftPriceRange[0].toFixed(2)} - $
											{draftPriceRange[1].toFixed(2)}
										</FilterValueText>
										<Slider
											range
											value={draftPriceRange}
											min={priceRange[0]}
											max={priceRange[1]}
											onBeforeChange={handlePriceRangeBeforeChange}
											onChange={(value) =>
												setDraftPriceRange(clampPriceRange(value, priceRange))
											}
											onAfterChange={handlePriceRangeAfterChange}
											tooltip={{ formatter: (value) => `$${value}` }}
										/>
										<PriceBounds>
											<PriceBoundLabel
												$isActive={filters.priceMin === priceRange[0]}
											>
												${priceRange[0]}
											</PriceBoundLabel>
											<PriceBoundLabel
												$isActive={filters.priceMax === priceRange[1]}
											>
												${priceRange[1]}
											</PriceBoundLabel>
										</PriceBounds>
									</PriceRangeField>

									<DrawerActionsRow>
										<ResetButton type='button' onClick={resetFilters}>
											<ReloadOutlined />
											<span>Reset Filters</span>
										</ResetButton>
									</DrawerActionsRow>
								</DrawerFilterStack>
							</FiltersDrawer>
						</ConfigProvider>
					) : null}

					{/* ==================== PRODUCT CARDS ==================== */}
					<ProductsSection>
						<ProductsGrid>
							{products.map((prod, idx) => {
								const isPOD = prod?.printifyProductDetails?.POD;

								// Use the sub-product's images if set (e.g., from color grouping)
								let productImages = [];
								if (prod?.displayImages) {
									productImages = prod.displayImages;
								} else if (
									prod?.thumbnailImage?.[0]?.images &&
									prod.thumbnailImage[0].images.length > 0
								) {
									productImages = prod.thumbnailImage[0].images;
								}

								const fallbackGridImageCandidate =
									productImages?.[0] || prod?.thumbnailImage?.[0]?.images?.[0] || null;
								const podExampleDesignImage = isPOD
									? (Array.isArray(prod?.productAttributes)
											? prod.productAttributes
											: []
									  ).find((attribute) => {
											const candidate = attribute?.exampleDesignImage;
											const { primary, fallback } =
												resolvePreferredImageSources(candidate);
											return Boolean(primary || fallback);
									  })?.exampleDesignImage || null
									: null;
								const imageCandidate =
									(isPOD && podExampleDesignImage) || fallbackGridImageCandidate;
								const { primary, fallback } =
									resolvePreferredImageSources(imageCandidate);
								const primarySrc = primary || fallback || "";
								const fallbackSrc = fallback || primary || "";

								// Price logic
								const originalPrice = prod?.price || 0;
								const discountedPrice =
									prod?.priceAfterDiscount && prod.priceAfterDiscount > 0
										? prod.priceAfterDiscount
										: originalPrice;
								const discountPercentage =
									originalPrice > discountedPrice
										? Math.round(
												((originalPrice - discountedPrice) / originalPrice) *
													100
											)
										: 0;

								// Quantity
								const totalQty = prod?.quantity || 0;

								return (
									<ProductCard key={`${prod?._id || "product"}-${idx}`}>
										<ImageContainer>
											<BadgeContainer>
												{isPOD && <PodBadge>Custom Design</PodBadge>}
												{discountPercentage > 0 ? (
													<DiscountBadge>{discountPercentage}% OFF</DiscountBadge>
												) : null}
											</BadgeContainer>

											{totalQty > 0 ? (
												<CartIcon
													onClick={(event) => {
														event.stopPropagation();
														emitGaEvent({
															category: "Add To Cart",
															action: "User added product from Products Page",
															label: `User added ${prod?.productName || "unknown"}`,
														});

														emitFbTrack("AddToCart", {
															content_name: prod.productName,
															content_ids: [prod._id],
															content_type: "product",
															currency: "USD",
															value: prod.priceAfterDiscount || prod.price,
															contents: [{ id: prod._id, quantity: 1 }],
														});

														const eventId = `AddToCart-ShopMain-${prod?._id}-${Date.now()}`;
														void postFacebookConversion({
															eventName: "AddToCart",
															eventId,
															email: user?.email || "Unknown",
															phone: user?.phone || "Unknown",
															currency: "USD",
															value: prod?.priceAfterDiscount || prod?.price,
															contentIds: [prod?._id],
															userAgent: window.navigator.userAgent,
														});

														readProduct(prod?._id).then((res) => {
															if (res?.error) {
																console.log(res.error);
																return;
															}
															openSidebar2();
															const chosenAttr =
																prod?.productAttributes?.[0] || null;
															addToCart(prod?._id, null, 1, res, chosenAttr);
														});
													}}
												/>
											) : (
												<OutOfStockBadge>Out of Stock</OutOfStockBadge>
											)}

											{primarySrc ? (
												<ProductImage
													src={primarySrc}
													fallbackSrc={fallbackSrc}
													alt={prod?.productName || "Product Image"}
													loading={idx < 2 ? "eager" : "lazy"}
													fetchPriority={idx < 2 ? "high" : undefined}
													decoding='async'
													sizes='(max-width: 576px) 48vw, (max-width: 992px) 48vw, (max-width: 1200px) 32vw, 16vw'
													widths={[220, 320, 420, 540, 720]}
													onClick={() => {
														const eventId = `Lead-ShopMain-${prod?._id}-${Date.now()}`;

														emitGaEvent({
															category: "Single Product Clicked",
															action:
																"User Navigated To Single Product From Products Page",
															label: `User viewed ${prod?.productName || "unknown"}`,
														});

														emitFbTrack("Lead", {
															content_name: `User viewed ${prod?.productName || "unknown"} From Shop Page`,
															click_type: "Shop Page Product Clicked",
														});

														void postFacebookConversion({
															eventName: "Lead",
															eventId,
															email: user?.email || "Unknown",
															phone: user?.phone || "Unknown",
															currency: "USD",
															value: 0,
															contentIds: [prod?._id],
															userAgent: window.navigator.userAgent,
														});

														window.scrollTo({ top: 0, behavior: "smooth" });
														if (
															prod?.printifyProductDetails?.POD &&
															shouldAskForPodPersonalization()
														) {
															setPendingPodProduct(prod);
															setShowPodWelcomeModal(true);
															return;
														}
														const safePersonalization = savePodPersonalization({
															occasion: podOccasion,
															name: podName,
														});
														history.push(getProductLink(prod, safePersonalization));
													}}
												/>
											) : (
												<NoImagePlaceholder>Image unavailable</NoImagePlaceholder>
											)}
										</ImageContainer>

										<ProductCardBody>
											<ProductTitle>{prod?.productName || "Untitled Product"}</ProductTitle>
											<ProductPriceText>
												{originalPrice > discountedPrice ? (
													<>
														<OriginalPrice>
															Price: ${originalPrice.toFixed(2)}
														</OriginalPrice>
														<DiscountedPrice>
															${discountedPrice.toFixed(2)}
														</DiscountedPrice>
													</>
												) : (
													<DiscountedPrice>
														Price: ${discountedPrice.toFixed(2)}
													</DiscountedPrice>
												)}
											</ProductPriceText>
											{isPOD ? (
												<CursiveText>
													Your Loved Ones Deserve 3 Minutes From Your Time To
													Customize Their Present!
												</CursiveText>
											) : null}
										</ProductCardBody>
									</ProductCard>
								);
							})}
						</ProductsGrid>

						{/* Pagination */}
						{totalPages > 1 ? (
							<PaginationWrapper>
								<PaginationNav aria-label='Products pagination'>
									{page <= 1 ? (
										<PaginationButton type='button' disabled>
											Prev
										</PaginationButton>
									) : (
										<PaginationLinkButton
											to={{
												pathname: location.pathname,
												search: getPaginationSearch(page - 1),
											}}
											onClick={handlePaginationLinkClick}
										>
											Prev
										</PaginationLinkButton>
									)}
									{paginationItems.map((item) =>
										typeof item === "number" ? (
											item === page ? (
												<PaginationButton
													key={item}
													type='button'
													$isActive
													aria-current='page'
												>
													{item}
												</PaginationButton>
											) : (
												<PaginationLinkButton
													key={item}
													to={{
														pathname: location.pathname,
														search: getPaginationSearch(item),
													}}
													onClick={handlePaginationLinkClick}
												>
													{item}
												</PaginationLinkButton>
											)
										) : (
											<PaginationEllipsis key={item}>...</PaginationEllipsis>
										)
									)}
									{page >= totalPages ? (
										<PaginationButton type='button' disabled>
											Next
										</PaginationButton>
									) : (
										<PaginationLinkButton
											to={{
												pathname: location.pathname,
												search: getPaginationSearch(page + 1),
											}}
											onClick={handlePaginationLinkClick}
										>
											Next
										</PaginationLinkButton>
									)}
								</PaginationNav>
							</PaginationWrapper>
						) : null}
					</ProductsSection>
				</ShopPageMainWrapper>
			</ShopPageMainOverallWrapper>

			{showPodWelcomeModal ? (
				<ConfigProvider theme={antTheme}>
					<Modal
						open={showPodWelcomeModal}
						onCancel={handlePodWelcomeClose}
						footer={null}
						destroyOnHidden
						centered
						width={680}
					>
						<PodWelcomeCard>
							<PodWelcomeEyebrow>Personalized Gifts Made Easy</PodWelcomeEyebrow>
							<PodWelcomeTitle>Looking for the perfect gift?</PodWelcomeTitle>
							<PodWelcomeSubtitle>
								Choose an occasion once, add a name if you want, and we will pre-fill
								custom gift designs for you.
							</PodWelcomeSubtitle>

							<PodFieldLabel>What is your occasion?</PodFieldLabel>
							<PodFieldPulseWrap
								key={`pod-occasion-${podFieldPulseKey}`}
								$delayMs={80}
							>
								<Select
									size='large'
									value={podOccasion}
									style={{ width: "100%" }}
									onChange={(value) => setPodOccasion(value)}
								>
									{POD_OCCASION_OPTIONS.map((item) => (
										<Option key={item.value} value={item.value}>
											<span>
												{item.icon} {item.value}
											</span>
										</Option>
									))}
								</Select>
							</PodFieldPulseWrap>

							<PodFieldLabel style={{ marginTop: "12px" }}>
								Optional: name to include in designs
							</PodFieldLabel>
							<PodFieldPulseWrap
								key={`pod-name-${podFieldPulseKey}`}
								$delayMs={200}
							>
								<PodNameInput
									type='text'
									value={podName}
									onChange={(event) => setPodName(event.target.value)}
									placeholder='Example: Emma'
									maxLength={40}
								/>
							</PodFieldPulseWrap>

							<PodModalHint>
								You can update these anytime on the custom gifts pages.
							</PodModalHint>

							<PodActions>
								<ModalSecondaryButton type='button' onClick={handlePodWelcomeClose}>
									Maybe later
								</ModalSecondaryButton>
								<ModalPrimaryButton type='button' onClick={handlePodWelcomeStart}>
									Show Me Custom Gifts
								</ModalPrimaryButton>
							</PodActions>
						</PodWelcomeCard>
					</Modal>
				</ConfigProvider>
			) : null}
		</>
	);
}

export default ShopPageMain;

/* ============================= STYLES ============================= */

const ShopPageMainOverallWrapper = styled.div`
	background: white;
	margin: auto;
	overflow: hidden !important;
`;

const ShopPageMainWrapper = styled.div`
	min-height: 800px;
	padding: 100px 10px;
	max-width: 1800px;
	background: white;
	margin: auto;

	@media (max-width: 750px) {
		padding: 10px 3px;
	}
`;

const FiltersSection = styled.div`
	background: var(--background-light);
	padding: 20px;
	margin-bottom: 20px;
	border-radius: 8px;

	@media (max-width: 576px) {
		display: none; /* Hide filters on small screens */
	}
`;

const DesktopFiltersPlaceholder = styled.div`
	display: none;
	height: 208px;
	margin-bottom: 20px;
	border-radius: 8px;
	background: linear-gradient(90deg, #f7f4ef, #f2ece5, #f7f4ef);
	animation: desktopFilterPulse 1.6s ease-in-out infinite;

	@media (min-width: 577px) {
		display: block;
	}

	@keyframes desktopFilterPulse {
		0% {
			opacity: 0.92;
		}
		50% {
			opacity: 1;
		}
		100% {
			opacity: 0.92;
		}
	}
`;

const FilterGrid = styled.div`
	display: grid;
	grid-template-columns: repeat(5, minmax(0, 1fr));
	gap: 16px;

	@media (max-width: 1400px) {
		grid-template-columns: repeat(4, minmax(0, 1fr));
	}

	@media (max-width: 1200px) {
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}

	@media (max-width: 900px) {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}
`;

const FilterField = styled.div`
	width: 100%;
`;

const PriceSearchRow = styled.div`
	display: grid;
	grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
	gap: 16px;
	margin-top: 20px;

	@media (max-width: 900px) {
		grid-template-columns: 1fr;
	}
`;

const PriceRangeField = styled.div`
	width: 100%;
`;

const SearchField = styled.div`
	width: 100%;
	align-self: end;
	padding-top: 14px;
`;

const SearchForm = styled.form`
	display: flex;
	align-items: stretch;
	width: 100%;
	border: 1px solid #d8d1c5;
	border-radius: 10px;
	overflow: hidden;
	background: #fff;
`;

const SearchInput = styled.input`
	flex: 1;
	min-width: 0;
	border: 0;
	padding: 0.78rem 0.9rem;
	font-size: 0.95rem;
	color: var(--text-color-dark);
	background: transparent;

	&:focus {
		outline: none;
	}
`;

const SearchSubmitButton = styled.button`
	border: 0;
	border-left: 1px solid #d8d1c5;
	background: var(--secondary-color);
	color: var(--button-font-color);
	padding: 0 1rem;
	font-weight: 700;
	cursor: pointer;
	transition: var(--main-transition);

	&:hover {
		background: var(--secondary-color-dark);
	}
`;

const FilterLabel = styled.div`
	margin-bottom: 8px;
`;

const FilterValueText = styled.div`
	margin-bottom: 8px;
	font-size: 0.9rem;
	font-weight: 600;
`;

const PriceBounds = styled.div`
	display: flex;
	justify-content: space-between;
`;

const PriceBoundLabel = styled.span`
	font-weight: ${(props) => (props.$isActive ? "700" : "400")};
`;

const FilterActionsRow = styled.div`
	display: flex;
	justify-content: flex-end;
	margin-top: 20px;
`;

const SearchInputWrapper = styled.div`
	@media (max-width: 576px) {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-top: 5px;
		margin-bottom: 13px;
	}

	@media (min-width: 577px) {
		display: none; /* Hide button on larger screens */
	}
`;

/* Replaced "visible" with "open" to avoid the Drawer warning */
const FiltersDrawer = styled(Drawer)`
	@media (min-width: 577px) {
		display: none; /* Hide drawer on larger screens */
	}
`;

const FiltersTriggerButton = styled.button`
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 6px;
	border: 1px solid var(--secondary-color);
	background: var(--secondary-color);
	color: var(--button-font-color);
	border-radius: 8px;
	padding: 0 14px;
	height: 40px;
	font-weight: 600;
	cursor: pointer;
	transition: var(--main-transition);

	&:hover {
		background: var(--secondary-color-dark);
		border-color: var(--secondary-color-dark);
	}

	@media (min-width: 577px) {
		display: none; /* Hide button on larger screens */
	}
`;

const MobileSearchField = styled.div`
	flex: 1;
`;

const MobileSearchSubmitButton = styled(SearchSubmitButton)`
	padding: 0 0.9rem;
	font-size: 0.9rem;
`;

const DrawerFilterStack = styled.div`
	display: grid;
	gap: 16px;
`;

const DrawerActionsRow = styled.div`
	display: flex;
	justify-content: flex-end;
	margin-top: 4px;
`;

const ProductsSection = styled.div`
	background: var(--background-light);
	padding: 20px;
	border-radius: 8px;

	@media (max-width: 576px) {
		padding: 10px;
	}
`;

const ProductsGrid = styled.div`
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 16px;

	@media (min-width: 992px) {
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}

	@media (min-width: 1200px) {
		grid-template-columns: repeat(6, minmax(0, 1fr));
	}

	@media (max-width: 576px) {
		gap: 8px;
	}
`;

const ProductCard = styled.article`
	border-radius: 10px;
	overflow: hidden;
	display: flex;
	flex-direction: column;
	height: 100%;
	transition: var(--main-transition);
	text-transform: capitalize;
	background: #fff;
	box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);

	&:hover {
		transform: translateY(-6px);
		box-shadow: var(--box-shadow-light);
	}
`;

const ProductCardBody = styled.div`
	display: flex;
	flex-direction: column;
	gap: 8px;
	padding: 14px;
`;

const ProductTitle = styled.h3`
	margin: 0;
	font-size: 0.98rem;
	font-weight: 600;
	line-height: 1.35;
	min-height: calc(1.35em * 2);
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: hidden;
	text-overflow: ellipsis;
`;

const ProductPriceText = styled.div`
	min-height: 24px;
	display: flex;
	flex-wrap: wrap;
	align-items: baseline;
	gap: 6px;
`;

const ImageContainer = styled.div`
	position: relative;
	aspect-ratio: 1 / 1;
	overflow: hidden;
	border-radius: 10px 10px 0 0;
`;

const BadgeContainer = styled.div`
	position: absolute;
	top: 10px;
	left: 10px;
	z-index: 15;
	display: flex;
	flex-direction: column;
	gap: 5px;
`;

const PodBadge = styled.div`
	background-color: #ffafc5;
	color: #ffffff;
	padding: 4px 8px;
	border-radius: 4px;
	font-weight: bold;
	font-size: 0.8rem;
	box-shadow: 0 0 3px rgba(0, 0, 0, 0.3);
`;

const DiscountBadge = styled.div`
	background-color: var(--secondary-color-darker);
	color: var(--button-font-color);
	padding: 4px 8px;
	border-radius: 4px;
	font-weight: bold;
	font-size: 0.8rem;
	box-shadow: 0 0 3px rgba(0, 0, 0, 0.3);
`;

const ProductImage = styled(OptimizedImage)`
	width: 100%;
	height: 100%;
	object-fit: cover;
	object-position: center;
	cursor: pointer;
`;

const NoImagePlaceholder = styled.div`
	width: 100%;
	height: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 12px;
	text-align: center;
	color: #7f7f7f;
	font-size: 0.88rem;
	background: #f3f3f3;
`;

const CartIcon = styled(ShoppingCartOutlined)`
	position: absolute;
	top: 20px;
	right: 20px;
	font-size: 24px;
	color: var(--button-font-color);
	background-color: rgba(0, 0, 0, 0.5);
	border-radius: 50%;
	padding: 3px;
	cursor: pointer;
	z-index: 10;

	&:hover {
		color: var(--secondary-color-light);
	}
`;

const OutOfStockBadge = styled.div`
	position: absolute;
	top: 10px;
	right: 10px;
	font-size: 13px;
	color: grey;
	background-color: #ffc6c6;
	border-radius: 5px;
	padding: 5px 10px;
	z-index: 10;
	font-style: italic;
	font-weight: bold;
`;

const PaginationWrapper = styled.div`
	display: flex;
	justify-content: center;
	margin-top: 20px;
`;

const PaginationNav = styled.nav`
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: center;
	gap: 8px;
`;

const PaginationButton = styled.button`
	border: 1px solid ${(props) =>
		props.$isActive ? "var(--secondary-color)" : "#ddd4c8"};
	background: ${(props) =>
		props.$isActive ? "var(--secondary-color)" : "#fff"};
	color: ${(props) =>
		props.$isActive ? "var(--button-font-color)" : "var(--text-color-dark)"};
	min-width: 40px;
	height: 40px;
	padding: 0 0.9rem;
	border-radius: 999px;
	font-weight: 600;
	cursor: pointer;
	transition: var(--main-transition);

	&:hover:not(:disabled) {
		border-color: var(--secondary-color);
		color: var(--secondary-color-darker);
	}

	&:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
`;

const PaginationLinkButton = styled(Link)`
	border: 1px solid #ddd4c8;
	background: #fff;
	color: var(--text-color-dark);
	min-width: 40px;
	height: 40px;
	padding: 0 0.9rem;
	border-radius: 999px;
	font-weight: 600;
	cursor: pointer;
	transition: var(--main-transition);
	display: inline-flex;
	align-items: center;
	justify-content: center;
	text-decoration: none;

	&:hover {
		border-color: var(--secondary-color);
		color: var(--secondary-color-darker);
	}
`;

const PaginationEllipsis = styled.span`
	min-width: 24px;
	text-align: center;
	color: var(--text-color-secondary);
`;

const ResetButton = styled.button`
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 8px;
	border: 1px solid var(--secondary-color);
	background: var(--secondary-color);
	color: var(--button-font-color);
	padding: 0.65rem 1rem;
	border-radius: 8px;
	font-weight: 600;
	cursor: pointer;
	transition: var(--main-transition);

	&:hover {
		background: var(--secondary-color-dark);
		border-color: var(--secondary-color-dark);
	}
`;

const OriginalPrice = styled.span`
	color: var(--secondary-color);
	text-decoration: line-through;
	margin-right: 8px;
	font-weight: bold;
	line-height: 0;
`;

const DiscountedPrice = styled.span`
	color: var(--text-color-primary);
	font-weight: bold;
`;

const CursiveText = styled.div`
	font-family: "Brush Script MT", cursive, sans-serif;
	color: #222;
	font-size: 1.3rem;
	margin-top: 5px;
	margin-bottom: 5px;
	font-style: italic;
	font-weight: bolder;
	line-height: 1;
`;

const PodWelcomeCard = styled.div`
	padding: 6px 4px;
`;

const PodWelcomeEyebrow = styled.div`
	display: inline-block;
	padding: 4px 10px;
	border-radius: 999px;
	background: linear-gradient(90deg, #ffe7d7, #fff4e2);
	color: #6a3f1b;
	font-size: 12px;
	font-weight: 700;
	letter-spacing: 0.03em;
	text-transform: uppercase;
`;

const PodWelcomeTitle = styled.h2`
	margin: 12px 0 4px;
	font-size: clamp(1.25rem, 2vw, 1.8rem);
	line-height: 1.25;
	color: #1c1a19;
`;

const PodWelcomeSubtitle = styled.p`
	margin: 0 0 14px;
	font-size: 0.98rem;
	color: #554d48;
	line-height: 1.5;
`;

const podFieldBeat = keyframes`
	0% {
		transform: scale(1);
		box-shadow: 0 0 0 rgba(255, 173, 99, 0);
	}
	35% {
		transform: scale(1.03);
		box-shadow: 0 0 0 8px rgba(255, 173, 99, 0.12);
	}
	65% {
		transform: scale(0.995);
		box-shadow: 0 0 0 2px rgba(255, 173, 99, 0.08);
	}
	100% {
		transform: scale(1);
		box-shadow: 0 0 0 rgba(255, 173, 99, 0);
	}
`;

const PodFieldLabel = styled.label`
	display: block;
	margin: 8px 0 6px;
	font-size: 0.92rem;
	font-weight: 600;
	color: #2a2522;
`;

const PodFieldPulseWrap = styled.div`
	border-radius: 10px;
	will-change: transform, box-shadow;
	transition: transform 220ms ease, box-shadow 220ms ease;
	animation: ${podFieldBeat} 620ms ease-in-out ${(props) => props.$delayMs || 0}ms 2;
`;

const PodNameInput = styled.input`
	width: 100%;
	border: 1px solid #d9d9d9;
	border-radius: 8px;
	padding: 0.9rem 1rem;
	font-size: 1rem;
	color: var(--text-color-dark);
	background: #fff;

	&:focus {
		outline: 2px solid rgba(201, 134, 134, 0.18);
		border-color: var(--secondary-color);
	}
`;

const PodModalHint = styled.p`
	margin: 10px 0 0;
	font-size: 0.85rem;
	color: #6a625d;
`;

const PodActions = styled.div`
	margin-top: 18px;
	display: flex;
	gap: 8px;
	justify-content: flex-end;
	flex-wrap: wrap;
`;

const ModalSecondaryButton = styled.button`
	border: 1px solid #d0cbc7;
	background: #fff;
	color: #3f3936;
	border-radius: 8px;
	padding: 0.7rem 1rem;
	font-weight: 600;
	cursor: pointer;
	transition: var(--main-transition);

	&:hover {
		border-color: #b8b2ac;
		background: #faf7f5;
	}
`;

const ModalPrimaryButton = styled.button`
	border: 1px solid var(--secondary-color);
	background: var(--secondary-color);
	color: var(--button-font-color);
	border-radius: 8px;
	padding: 0.7rem 1rem;
	font-weight: 700;
	cursor: pointer;
	transition: var(--main-transition);

	&:hover {
		border-color: var(--secondary-color-dark);
		background: var(--secondary-color-dark);
	}
`;

