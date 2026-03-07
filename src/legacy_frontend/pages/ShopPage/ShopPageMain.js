import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import styled, { keyframes } from "styled-components";
import {
	Select,
	Input,
	Slider,
	Row,
	Col,
	Card,
	Pagination,
	Drawer,
	Button,
	ConfigProvider,
	Modal,
} from "antd";
import { useHistory, useLocation } from "react-router-dom";
import {
	ShoppingCartOutlined,
	FilterOutlined,
	ReloadOutlined,
} from "@ant-design/icons";
import { gettingFilteredProducts, getColors, readProduct } from "../../apiCore";
import { useCartContext } from "../../cart_context";
import ReactGA from "react-ga4";
import ReactPixel from "react-facebook-pixel";

import ShopPageHelmet from "./ShopPageHelmet";
import axios from "axios";
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

const { Meta } = Card;
const { Option } = Select;
const { Search } = Input;

const MULTI_SELECT_FILTER_KEYS = ["color", "category", "size"];
const PRICE_EPSILON = 0.01;

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

function ShopPageMain() {
	const history = useHistory();
	const location = useLocation();

	// Keep these states as arrays/strings by default to avoid any .map errors.
	const [products, setProducts] = useState([]);
	const [totalRecords, setTotalRecords] = useState(0);

	const [colors, setColors] = useState([]);
	const [sizes, setSizes] = useState([]);
	const [categories, setCategories] = useState([]);
	const [genders, setGenders] = useState([]);
	const [stores, setStores] = useState([]);
	const [priceRange, setPriceRange] = useState([0, 1000]);
	const [allColors, setAllColors] = useState([]);

	const initialFilters = parseShopFiltersFromSearch(location.search);
	const [filters, setFilters] = useState(() => initialFilters);

	const [page, setPage] = useState(() => {
		const initialPage = Number(new URLSearchParams(location.search).get("page"));
		return Number.isFinite(initialPage) && initialPage > 0
			? Math.floor(initialPage)
			: 1;
	});
	const [drawerVisible, setDrawerVisible] = useState(false);

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
	const didAutoOpenPodModalRef = useRef(false);

	// How many products per page:
	const records = 30;

	const { openSidebar2, addToCart } = useCartContext();

	const { user } = isAuthenticated();


	// Initialize GA and track page views
	useEffect(() => {
		// Fix: Pass an object to avoid the "Send command doesn't exist" error
		ReactGA.send({
			hitType: "pageview",
			page: window.location.pathname + window.location.search,
		});
		// eslint-disable-next-line
	}, [window.location.pathname, window.location.search]);

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
		const resolved = resolvePodPersonalization(location.search);
		setPodOccasion(resolved.occasion);
		setPodName(resolved.name);
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
		if (!location.pathname.includes("/our-products")) return;
		if (didAutoOpenPodModalRef.current) return;
		didAutoOpenPodModalRef.current = true;
		setPendingPodProduct(null);
		setShowPodWelcomeModal(true);
	}, [location.pathname]);

	useEffect(() => {
		if (showPodWelcomeModal) {
			// Re-mount wrappers so the two-beat animation always replays on open.
			setPodFieldPulseKey((prev) => prev + 1);
		}
	}, [showPodWelcomeModal]);

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
				// We'll use a map to ensure uniqueness
				const uniqueProductMap = {};

				const processed = (data.products || [])
					.map((product) => {
						const isPOD = product?.printifyProductDetails?.POD;
						const productAttributes = product?.productAttributes || [];

						// ==========================
						// 1) POD PRODUCTS (isPOD)
						// ==========================
						if (isPOD && productAttributes.length > 0) {
							// Group attributes by color code
							const colorGroups = {};
							productAttributes.forEach((attr) => {
								const c = attr?.color || "unknown"; // fallback
								if (!colorGroups[c]) {
									colorGroups[c] = [];
								}
								colorGroups[c].push(attr);
							});

							// For each color group, create a sub-product
							return Object.keys(colorGroups).map((colorCode) => {
								const attrList = colorGroups[colorCode];
								const firstAttr = attrList?.[0] || {};
								const colorTotalQty = attrList.reduce(
									(acc, a) => acc + (a.quantity || 0),
									0
								);

								// Decide a price from first attribute
								const subPrice = firstAttr?.price || 0;
								const subPriceAfterDiscount =
									firstAttr?.priceAfterDiscount &&
									firstAttr.priceAfterDiscount > 0
										? firstAttr.priceAfterDiscount
										: subPrice;

								// Build a sub-product
								const subProduct = {
									...product,
									productAttributes: attrList,
									subColorCode: colorCode,
									price: subPrice,
									priceAfterDiscount: subPriceAfterDiscount,
									quantity: colorTotalQty,
								};

								// If the attribute has images, use them; otherwise fallback
								const imagesToShow = firstAttr?.productImages?.length
									? firstAttr.productImages
									: product?.thumbnailImage?.[0]?.images || [];

								subProduct.displayImages = imagesToShow;

								// Store in unique map
								const key = `${product._id}-${colorCode}`;
								uniqueProductMap[key] = subProduct;
								return subProduct;
							});
						}

						// ==========================
						// 2) NON-POD PRODUCTS
						// ==========================
							if (productAttributes.length > 0) {
								// Expand by color, 1 card per color
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

							const subArray = Object.values(uniqueAttributes);
							subArray.forEach((subProd) => {
								const colorCode =
									subProd?.productAttributes?.[0]?.color || "default";
								const key = `${product._id}-${colorCode}`;
								uniqueProductMap[key] = subProd;
							});
							return subArray;
						} else {
							// Simple product
							uniqueProductMap[product._id] = product;
							return [product];
						}
					})
					.flat();

				const shouldApplyLegacySlugFilter =
					legacyCategorySlug && (!filters?.category || filters.category.length === 0);
				const finalProducts = shouldApplyLegacySlugFilter
					? processed.filter(
							(p) => p?.category?.categorySlug === legacyCategorySlug
						)
					: processed;

				setProducts(finalProducts);
				setTotalRecords(data?.totalRecords || 0);
				setColors(data?.colors || []);
				setSizes(data?.sizes || []);
				setCategories(data?.categories || []);
				setGenders(data?.genders || []);
				setStores(data?.stores || []);
				const nextPriceRange = [
					Number(data?.priceRange?.minPrice ?? 0),
					Number(data?.priceRange?.maxPrice ?? 1000),
				];
				setPriceRange((prevRange) => {
					if (
						prevRange[0] === nextPriceRange[0] &&
						prevRange[1] === nextPriceRange[1]
					) {
						return prevRange;
					}
					return nextPriceRange;
				});
			}
		});
	}, [filters, isPriceFilterActive, legacyCategorySlug, page, records]);

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

	// 2) We only scroll to top once on initial mount
	useEffect(() => {
		const timer = window.setTimeout(() => {
			window.scrollTo({ top: 0, behavior: "smooth" });
		}, 200);

		// Cleanup the timer when unmounting
		return () => {
			window.clearTimeout(timer);
		};
	}, []);

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

			const serialized = params.toString();
			return serialized ? `?${serialized}` : "";
		},
		[isPriceFilterActive, legacyCategorySlug, priceRange]
	);

	useEffect(() => {
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
	}, [location.search]);

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
		const nextSearch = buildShopSearchFromFilters(filters, page);
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
		<ConfigProvider
			theme={{
				token: {
					colorPrimary: "var(--primary-color)",
					colorPrimaryHover: "var(--primary-color-dark)",
					colorText: "var(--text-color-primary)",
					colorBgContainer: "white",
					borderRadius: 8,
				},
			}}
		>
			{/* Helmet for SEO */}
			<ShopPageHelmet products={products} />

			<ShopPageMainOverallWrapper>
				<ShopPageMainWrapper>
					{/* ==================== DESKTOP FILTERS ==================== */}
						<FiltersSection>
								<Row gutter={[16, 16]}>
									<Col xs={24} sm={12} md={8} lg={6} xl={4}>
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
									</Col>

									<Col xs={24} sm={12} md={8} lg={6} xl={4}>
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
									</Col>

									<Col xs={24} sm={12} md={8} lg={6} xl={4}>
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
									</Col>

								<Col xs={24} sm={12} md={8} lg={6} xl={4}>
									<Select
										placeholder='Gender'
										style={{ width: "100%" }}
										value={filters.gender}
									onChange={(value) => handleFilterChange("gender", value)}
								>
									<Option value=''>All Genders</Option>
									{genders.map((g, i) => (
										<Option key={i} value={g.id}>
											{g.name}
										</Option>
									))}
									</Select>
								</Col>

									<Col xs={24} sm={12} md={8} lg={6} xl={4}>
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
									</Col>
								</Row>

							<Row gutter={[16, 16]} style={{ marginTop: "20px" }}>
									<Col xs={24} lg={12}>
									<div style={{ marginBottom: "8px" }}>Price Range</div>
									<div
										style={{
											marginBottom: "8px",
											fontSize: "0.9rem",
											fontWeight: 600,
										}}
									>
										Selected: ${draftPriceRange[0].toFixed(2)} - $
										{draftPriceRange[1].toFixed(2)}
									</div>
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
								<div
									style={{ display: "flex", justifyContent: "space-between" }}
								>
									<span
										style={{
											fontWeight:
												filters.priceMin === priceRange[0] ? "bold" : "normal",
										}}
									>
										${priceRange[0]}
									</span>
									<span
										style={{
											fontWeight:
												filters.priceMax === priceRange[1] ? "bold" : "normal",
										}}
									>
										${priceRange[1]}
									</span>
								</div>
							</Col>

								<Col xs={24} lg={12} className='mt-3 py-2'>
								<Search
									placeholder='Search'
									value={searchInput}
									onChange={(e) => setSearchInput(e.target.value)}
									onSearch={(value) => handleSearchSubmit(value)}
									enterButton
								/>
							</Col>
						</Row>

						<Row
							gutter={[16, 16]}
							style={{ marginTop: "20px", justifyContent: "flex-end" }}
						>
							<StyledButton onClick={resetFilters} icon={<ReloadOutlined />}>
								Reset Filters
							</StyledButton>
						</Row>
					</FiltersSection>

					{/* ==================== MOBILE FILTERS ==================== */}
					<SearchInputWrapper>
						<FiltersButton icon={<FilterOutlined />} onClick={showDrawer}>
							Filters
						</FiltersButton>
						<Search
							placeholder='Search'
							className='mx-2'
							value={searchInput}
							onChange={(e) => setSearchInput(e.target.value)}
							onSearch={(value) => handleSearchSubmit(value)}
						/>
					</SearchInputWrapper>

					{/* Replace "visible" with "open" to remove Drawer warning */}
					<FiltersDrawer
						title='Filters'
						placement='left'
						closable
						onClose={closeDrawer}
						open={drawerVisible}
					>
							<Row gutter={[16, 16]}>
								<Col span={24}>
									<Select
										placeholder='Color'
										style={{ width: "100%" }}
										mode='multiple'
										allowClear
										maxTagCount='responsive'
										value={filters.color}
										onChange={(val) => handleFilterChange("color", val)}
									>
										{displayColorOptions.map((option) => (
											<Option key={option.value} value={option.value}>
												{option.label}
										</Option>
									))}
								</Select>
							</Col>

								<Col span={24}>
									<Select
										placeholder='Category'
										style={{ width: "100%" }}
										mode='multiple'
										allowClear
										maxTagCount='responsive'
										value={filters.category}
										onChange={(val) => handleFilterChange("category", val)}
									>
										{categories.map((cat) => (
											<Option key={cat.id} value={`${cat.id}`}>
												{toTitleCase(cat.name)}
											</Option>
										))}
									</Select>
								</Col>

								<Col span={24}>
									<Select
										placeholder='Size'
										style={{ width: "100%" }}
										mode='multiple'
										allowClear
										maxTagCount='responsive'
										value={filters.size}
										onChange={(val) => handleFilterChange("size", val)}
									>
										{sizes.map((size, i) => (
											<Option key={i} value={size}>
												{size}
										</Option>
									))}
								</Select>
							</Col>

								<Col span={24}>
									<Select
										placeholder='Gender'
										style={{ width: "100%" }}
									value={filters.gender}
									onChange={(val) => handleFilterChange("gender", val)}
								>
									<Option value=''>All Genders</Option>
									{genders.map((g, i) => (
										<Option key={i} value={g.id}>
											{g.name}
										</Option>
									))}
									</Select>
								</Col>

								<Col span={24}>
									<Select
										placeholder='Store'
										style={{ width: "100%" }}
										value={filters.store}
										onChange={(val) => handleFilterChange("store", val)}
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
									</Col>
								</Row>

						<Row gutter={[16, 16]} style={{ marginTop: "20px" }}>
								<Col span={24}>
									<div style={{ marginBottom: "8px" }}>Price Range</div>
									<div
										style={{
											marginBottom: "8px",
											fontSize: "0.9rem",
											fontWeight: 600,
										}}
									>
										Selected: ${draftPriceRange[0].toFixed(2)} - $
										{draftPriceRange[1].toFixed(2)}
									</div>
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
								<div
									style={{ display: "flex", justifyContent: "space-between" }}
								>
									<span
										style={{
											fontWeight:
												filters.priceMin === priceRange[0] ? "bold" : "normal",
										}}
									>
										${priceRange[0]}
									</span>
									<span
										style={{
											fontWeight:
												filters.priceMax === priceRange[1] ? "bold" : "normal",
										}}
									>
										${priceRange[1]}
									</span>
								</div>
							</Col>
							<Row
								gutter={[16, 16]}
								style={{ marginTop: "20px", justifyContent: "flex-end" }}
							>
								<StyledButton onClick={resetFilters} icon={<ReloadOutlined />}>
									Reset Filters
								</StyledButton>
							</Row>
						</Row>
					</FiltersDrawer>

					{/* ==================== PRODUCT CARDS ==================== */}
					<ProductsSection>
						<Row gutter={[16, 16]}>
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
									<Col xs={12} sm={12} md={12} lg={8} xl={4} key={idx}>
										<ProductCard
											hoverable
											cover={
												<ImageContainer>
													<BadgeContainer>
														{isPOD && <PodBadge>Custom Design</PodBadge>}
														{discountPercentage > 0 && (
															<DiscountBadge>
																{discountPercentage}% OFF
															</DiscountBadge>
														)}
													</BadgeContainer>

													{totalQty > 0 ? (
														<CartIcon
															onClick={(e) => {
																e.stopPropagation();
																ReactGA.event({
																	category: "Add To Cart",
																	action:
																		"User added product from Products Page",
																	label: `User added ${prod?.productName || "unknown"}`,
																});

																ReactPixel.track("AddToCart", {
																	// Standard Meta parameters:
																	content_name: prod.productName,
																	content_ids: [prod._id],
																	content_type: "product",
																	currency: "USD",
																	value: prod.priceAfterDiscount || prod.price, // the price you'd like to track

																	// Optionally, you could pass `contents`:
																	contents: [
																		{
																			id: prod._id,
																			quantity: 1,
																		},
																	],
																});

																const eventId = `AddToCart-ShopMain-${prod?._id}-${Date.now()}`;

																axios.post(
																	`${process.env.REACT_APP_API_URL}/facebookpixel/conversionapi`,
																	{
																		eventName: "AddToCart",
																		eventId,
																		email: user?.email || "Unknown",
																		phone: user?.phone || "Unknown",
																		currency: "USD",
																		value:
																			prod?.priceAfterDiscount || prod?.price,
																		contentIds: [prod?._id],
																		userAgent: window.navigator.userAgent,
																	}
																).catch(() => {});

																readProduct(prod?._id).then((res) => {
																	if (res?.error) {
																		console.log(res.error);
																	} else {
																		openSidebar2();
																		// pick the first attribute if you want
																		const chosenAttr =
																			prod?.productAttributes?.[0] || null;
																		addToCart(
																			prod?._id,
																			null,
																			1,
																			res,
																			chosenAttr
																		);
																	}
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
															loading='lazy'
															decoding='async'
															sizes='(max-width: 480px) 80vw, (max-width: 768px) 45vw, (max-width: 1200px) 30vw, 280px'
															widths={[280, 360, 480, 600, 800, 1000]}
															onClick={() => {
																const eventId = `Lead-ShopMain-${prod?._id}-${Date.now()}`;

																ReactGA.event({
																	category: "Single Product Clicked",
																	action:
																		"User Navigated To Single Product From Products Page",
																	label: `User viewed ${prod?.productName || "unknown"}`,
																});

																ReactPixel.track("Lead", {
																	content_name: `User viewed ${prod?.productName || "unknown"} From Shop Page`,
																	click_type: "Shop Page Product Clicked",
																	// You can add more parameters if you want
																	// e.g. currency: "USD", value: 0
																});

																axios.post(
																	`${process.env.REACT_APP_API_URL}/facebookpixel/conversionapi`,
																	{
																		eventName: "Lead",
																		eventId,
																		email: user?.email || "Unknown", // if you have a user object
																		phone: user?.phone || "Unknown", // likewise
																		currency: "USD", // not essential for "Lead," but you can pass
																		value: 0,
																		contentIds: [prod?._id], // or any ID you want
																		userAgent: window.navigator.userAgent,
																	}
																).catch(() => {});

																window.scrollTo({ top: 0, behavior: "smooth" });
																if (
																	prod?.printifyProductDetails?.POD &&
																	shouldAskForPodPersonalization()
																) {
																	setPendingPodProduct(prod);
																	setShowPodWelcomeModal(true);
																	return;
																}
																const safePersonalization =
																	savePodPersonalization({
																		occasion: podOccasion,
																		name: podName,
																	});
																history.push(
																	getProductLink(prod, safePersonalization)
																);
															}}
														/>
													) : (
														<NoImagePlaceholder>
															Image unavailable
														</NoImagePlaceholder>
													)}
												</ImageContainer>
											}
										>
											<Meta
												title={prod?.productName || "Untitled Product"}
												description={
													originalPrice > discountedPrice ? (
														<span>
															<OriginalPrice>
																Price: ${originalPrice.toFixed(2)}
															</OriginalPrice>{" "}
															<DiscountedPrice>
																${discountedPrice.toFixed(2)}
															</DiscountedPrice>
														</span>
													) : (
														<DiscountedPrice>
															Price: ${discountedPrice.toFixed(2)}
														</DiscountedPrice>
													)
												}
											/>
											{isPOD && (
												<CursiveText>
													Your Loved Ones Deserve 3 Minutes From Your Time To
													Customize Their Present!
												</CursiveText>
											)}
										</ProductCard>
									</Col>
								);
							})}
						</Row>

						{/* Pagination */}
						<PaginationWrapper
							onClick={() => {
								window.scrollTo({ top: 0, behavior: "smooth" });
							}}
						>
								<Pagination
									current={page}
									pageSize={records}
									onChange={(pg) => setPage(pg)}
									total={totalRecords}
									responsive
									showSizeChanger={false}
									hideOnSinglePage={totalRecords <= records}
								/>
						</PaginationWrapper>
					</ProductsSection>
				</ShopPageMainWrapper>
			</ShopPageMainOverallWrapper>

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
						<Input
							size='large'
							value={podName}
							onChange={(e) => setPodName(e.target.value)}
							placeholder='Example: Emma'
							maxLength={40}
						/>
					</PodFieldPulseWrap>

					<PodModalHint>
						You can update these anytime on the custom gifts pages.
					</PodModalHint>

					<PodActions>
						<Button onClick={handlePodWelcomeClose}>Maybe later</Button>
						<Button type='primary' onClick={handlePodWelcomeStart}>
							Show Me Custom Gifts
						</Button>
					</PodActions>
				</PodWelcomeCard>
			</Modal>
		</ConfigProvider>
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

const SearchInputWrapper = styled.div`
	@media (max-width: 576px) {
		display: flex;
		justify-content: center;
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

const FiltersButton = styled(Button)`
	@media (min-width: 577px) {
		display: none; /* Hide button on larger screens */
	}
`;

const ProductsSection = styled.div`
	background: var(--background-light);
	padding: 20px;
	border-radius: 8px;

	@media (max-width: 576px) {
		padding: 10px;

		.ant-row {
			margin-left: -4px !important;
			margin-right: -4px !important;
		}

		.ant-col {
			flex: 0 0 50% !important;
			max-width: 50% !important;
			padding-left: 4px !important;
			padding-right: 4px !important;
		}
	}
`;

const ProductCard = styled(Card)`
	border-radius: 10px;
	overflow: hidden;
	display: flex;
	flex-direction: column;
	height: 100%;
	transition: var(--main-transition);
	text-transform: capitalize;
	background: #fff;

	.ant-card-cover {
		margin: 0 !important;
	}

	.ant-card-body {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 14px;
	}

	.ant-card-meta-title {
		white-space: normal;
		overflow: hidden;
		text-overflow: ellipsis;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		line-height: 1.35;
		min-height: calc(1.35em * 2);
	}

	.ant-card-meta-description {
		min-height: 24px;
	}

	&:hover {
		transform: translateY(-6px);
		box-shadow: var(--box-shadow-light);
	}
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

const StyledButton = styled(Button)`
	background: var(--secondary-color);
	border-color: var(--secondary-color);
	color: var(--button-font-color);
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

