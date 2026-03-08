import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styled, { keyframes } from "styled-components";
import axios from "axios";
import { useHistory, useLocation } from "react-router-dom";
import { Select, Input, Popover } from "antd";
import ReactGA from "react-ga4";
import ReactPixel from "react-facebook-pixel";

import PrintifyPageHelmet from "./PrintifyPageHelmet";
import { isAuthenticated } from "../../auth";
import { cleanupPodListPreviewSession, getPodListPreview } from "../../apiCore";
import OptimizedImage from "../../components/OptimizedImage";
import { getCloudinaryOptimizedUrl, resolveImageUrl } from "../../utils/image";
import {
	POD_OCCASION_OPTIONS,
	resolvePodPersonalization,
	savePodPersonalization,
	buildPersonalizationSearch,
	buildGiftMessage,
} from "./podPersonalization";
import { getOccasionDesignPreset } from "./podDesignPresets";

const { Option } = Select;
const POD_LIST_PREVIEW_LOCAL_CACHE_KEY = "podListPreviewCacheV10";
const POD_LIST_PREVIEW_LOCAL_CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
const POD_LIST_PREVIEW_LOCAL_CACHE_MAX_ENTRIES = 500;
const POD_LIST_PREVIEW_SESSION_CLEANUP_KEY = "podListPreviewSessionProductsV2";
const POD_LIST_PREVIEW_PENDING_CLEANUP_KEY = "podListPreviewPendingCleanupV1";
const POD_LIFESTYLE_HINT_REGEX =
	/(lifestyle|model|wear|wearing|person|people|man|woman|male|female|on-model|on_model|studio)/i;
const POD_FLAT_HINT_REGEX =
	/(flat|blank|template|ghost|isolated|back|side|cutout)/i;

function getPodCardKindByName(name = "") {
	const normalizedName = String(name || "").toLowerCase();
	if (
		normalizedName.includes("t-shirt") ||
		normalizedName.includes("tee") ||
		(normalizedName.includes("shirt") &&
			!normalizedName.includes("sweatshirt"))
	) {
		return "apparel";
	}
	if (
		normalizedName.includes("hoodie") ||
		normalizedName.includes("sweatshirt") ||
		normalizedName.includes("pullover")
	) {
		return "hoodie";
	}
	if (normalizedName.includes("mug")) return "mug";
	if (normalizedName.includes("tote")) return "tote";
	if (normalizedName.includes("weekender") || normalizedName.includes("bag")) {
		return "bag";
	}
	if (normalizedName.includes("pillow")) return "pillow";
	if (normalizedName.includes("magnet")) return "magnet";
	return "default";
}

function normalizePodPreviewOccasionKey(value = "") {
	return String(value || "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, " ")
		.trim();
}

function getStoredDefaultDesignImagesForOccasion(product, occasion) {
	const safeOccasionKey = normalizePodPreviewOccasionKey(occasion);
	if (!safeOccasionKey) return [];
	const attributes = Array.isArray(product?.productAttributes)
		? product.productAttributes
		: [];
	for (const attribute of attributes) {
		const defaultDesigns = Array.isArray(attribute?.defaultDesigns)
			? attribute.defaultDesigns
			: [];
		for (const entry of defaultDesigns) {
			const entryOccasion = normalizePodPreviewOccasionKey(
				entry?.occassion || entry?.occasion || "",
			);
			if (!entryOccasion || entryOccasion !== safeOccasionKey) continue;
			const images = Array.isArray(entry?.defaultDesignImages)
				? entry.defaultDesignImages
				: [];
			const resolvedImages = images
				.map((image) => {
					const src =
						resolveImageUrl(image?.url || image?.src || image) ||
						resolveImageUrl(image?.url || image?.src || image, {
							preferCloudinary: false,
						});
					return src ? `${src}`.trim() : "";
				})
				.filter(Boolean);
			if (resolvedImages.length) return resolvedImages;
		}
	}
	return [];
}

function buildPreviewLocalCacheKey(productId, occasion, name) {
	return `${productId}|${occasion || ""}|${name || ""}`;
}

function readPreviewLocalCache() {
	try {
		const raw = localStorage.getItem(POD_LIST_PREVIEW_LOCAL_CACHE_KEY);
		if (!raw) return {};
		const parsed = JSON.parse(raw);
		return parsed && typeof parsed === "object" ? parsed : {};
	} catch {
		return {};
	}
}

function prunePreviewLocalCache(cache = {}) {
	const now = Date.now();
	const validEntries = Object.entries(cache).filter(([, value]) => {
		return (
			value &&
			typeof value === "object" &&
			typeof value.previewImage === "string" &&
			value.previewImage &&
			Number(value.expiresAt || 0) > now
		);
	});
	validEntries.sort(
		(a, b) => Number(b[1]?.updatedAt || 0) - Number(a[1]?.updatedAt || 0),
	);
	return Object.fromEntries(
		validEntries.slice(0, POD_LIST_PREVIEW_LOCAL_CACHE_MAX_ENTRIES),
	);
}

function writePreviewLocalCache(cache = {}) {
	try {
		localStorage.setItem(
			POD_LIST_PREVIEW_LOCAL_CACHE_KEY,
			JSON.stringify(prunePreviewLocalCache(cache)),
		);
	} catch {
		// no-op for strict privacy mode
	}
}

function normalizePreviewSessionCleanupItems(items = []) {
	if (!Array.isArray(items)) return [];
	const dedupe = new Set();
	const normalized = [];
	for (const item of items) {
		const previewProductId = String(
			item?.preview_product_id || item?.previewProductId || "",
		).trim();
		if (!previewProductId) continue;
		const shopId = item?.shop_id ?? item?.shopId ?? null;
		const productId = String(item?.product_id || item?.productId || "").trim();
		const normalizedItem = {
			preview_product_id: previewProductId,
			shop_id: shopId,
			product_id: productId || null,
		};
		const dedupeKey = `${normalizedItem.preview_product_id}|${
			normalizedItem.product_id || ""
		}|${normalizedItem.shop_id || ""}`;
		if (dedupe.has(dedupeKey)) continue;
		dedupe.add(dedupeKey);
		normalized.push(normalizedItem);
		if (normalized.length >= 500) break;
	}
	return normalized;
}

function readPreviewSessionCleanupItems() {
	try {
		const raw = sessionStorage.getItem(POD_LIST_PREVIEW_SESSION_CLEANUP_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		return normalizePreviewSessionCleanupItems(parsed);
	} catch {
		return [];
	}
}

function writePreviewSessionCleanupItems(items = []) {
	try {
		const safeItems = normalizePreviewSessionCleanupItems(items);
		if (!safeItems.length) {
			sessionStorage.removeItem(POD_LIST_PREVIEW_SESSION_CLEANUP_KEY);
			return;
		}
		sessionStorage.setItem(
			POD_LIST_PREVIEW_SESSION_CLEANUP_KEY,
			JSON.stringify(safeItems),
		);
	} catch {
		// no-op for strict privacy mode
	}
}

function readPreviewPendingCleanupItems() {
	try {
		const raw = localStorage.getItem(POD_LIST_PREVIEW_PENDING_CLEANUP_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		return normalizePreviewSessionCleanupItems(parsed);
	} catch {
		return [];
	}
}

function writePreviewPendingCleanupItems(items = []) {
	try {
		const safeItems = normalizePreviewSessionCleanupItems(items);
		if (!safeItems.length) {
			localStorage.removeItem(POD_LIST_PREVIEW_PENDING_CLEANUP_KEY);
			return;
		}
		localStorage.setItem(
			POD_LIST_PREVIEW_PENDING_CLEANUP_KEY,
			JSON.stringify(safeItems),
		);
	} catch {
		// no-op for strict privacy mode
	}
}

function removePreviewLocalCacheEntriesByPreviewIds(previewProductIds = []) {
	const safeIds = Array.from(
		new Set(
			(Array.isArray(previewProductIds) ? previewProductIds : [])
				.map((item) => String(item || "").trim())
				.filter(Boolean),
		),
	);
	if (!safeIds.length) return;
	const removableIds = new Set(safeIds);
	const localCache = readPreviewLocalCache();
	let changed = false;
	for (const [cacheKey, cacheValue] of Object.entries(localCache)) {
		const previewProductId = String(cacheValue?.previewProductId || "").trim();
		if (!previewProductId || !removableIds.has(previewProductId)) continue;
		delete localCache[cacheKey];
		changed = true;
	}
	if (changed) {
		writePreviewLocalCache(localCache);
	}
}

const PrintifyAvailableProducts = () => {
	const [products, setProducts] = useState([]);
	const [loading, setLoading] = useState(true);
	const [previewByProductId, setPreviewByProductId] = useState({});
	const [previewStatusByProductId, setPreviewStatusByProductId] = useState({});
	const previewSessionCleanupRef = useRef([]);
	const previewPendingCleanupRef = useRef([]);
	const cleanupFlushInFlightRef = useRef(null);
	const history = useHistory();
	const location = useLocation();
	const { user } = isAuthenticated();

	const initialPersonalization = resolvePodPersonalization(location.search);
	const [podOccasion, setPodOccasion] = useState(initialPersonalization.occasion);
	const [podName, setPodName] = useState(initialPersonalization.name);
	const [podNameDraft, setPodNameDraft] = useState(initialPersonalization.name);

	const personalizedLine = useMemo(
		() => buildGiftMessage(podOccasion, podNameDraft),
		[podOccasion, podNameDraft]
	);
	const occasionPreset = useMemo(
		() => getOccasionDesignPreset(podOccasion),
		[podOccasion]
	);

	function toPodSlug(name = "") {
		return (name || "custom-gift")
			.toLowerCase()
			.replace(/[^a-z0-9\s-]/g, "")
			.trim()
			.replace(/\s+/g, "-")
			.replace(/-+/g, "-");
	}

	const commitPodPersonalization = useCallback(
		(nextOccasion, nextName) => {
			const safe = savePodPersonalization({
				occasion: nextOccasion,
				name: nextName,
			});
			setPodOccasion(safe.occasion);
			setPodName(safe.name);
			setPodNameDraft(safe.name);

			const nextSearch = buildPersonalizationSearch(safe);
			if (location.search !== nextSearch) {
				history.replace({ pathname: location.pathname, search: nextSearch });
			}
			return safe;
		},
		[history, location.pathname, location.search]
	);

	// Keep URL + localStorage personalization in sync with defaults.
	useEffect(() => {
		const resolved = resolvePodPersonalization(location.search);
		setPodOccasion(resolved.occasion);
		setPodName(resolved.name);
		setPodNameDraft(resolved.name);
	}, [location.search]);

	const getPriority = (product) => {
		const name = product.productName?.toLowerCase() || "";
		if (name.includes("unisex garment-dyed t-shirt")) return 1;
		if (
			name.includes("bag") ||
			name.includes("shirt") ||
			name.includes("hoodie") ||
			name.includes("clothing")
		) {
			return 2;
		}
		if (name.includes("mug")) return 3;
		return 4;
	};

	const getCardImageSources = useCallback((product) => {
		const firstVariantImages = product?.productAttributes?.[0]?.productImages || [];
		const fallbackImages = product?.thumbnailImage?.[0]?.images || [];
		const printifyImages = Array.isArray(product?.printifyProductDetails?.images)
			? product.printifyProductDetails.images
			: [];
		const exampleDesignImage =
			product?.productAttributes?.[0]?.exampleDesignImage || null;
		const productName = product?.productName?.toLowerCase() || "";
		const productKind = getPodCardKindByName(productName);
		const isWearable = productKind === "apparel" || productKind === "hoodie";
		const isMug = productKind === "mug";

		const candidates = [
			...firstVariantImages.map((raw, index) => ({
				raw,
				source: "variant",
				position: "",
				isDefault: index === 0,
				originalIndex: index,
			})),
			...fallbackImages.map((raw, index) => ({
				raw,
				source: "thumbnail",
				position: "",
				isDefault: index === 0,
				originalIndex: index,
			})),
			...printifyImages.map((raw, index) => ({
				raw: raw?.src || raw?.url || raw,
				source: "printify",
				position: String(raw?.position || raw?.placeholder || "").toLowerCase(),
				isDefault: Boolean(raw?.is_default),
				originalIndex: index,
			})),
		];

		const normalizedCandidates = [];
		const seen = new Set();
		for (let index = 0; index < candidates.length; index += 1) {
			const candidate = candidates[index];
			const primarySrc = resolveImageUrl(candidate.raw);
			const fallbackSrc = resolveImageUrl(candidate.raw, {
				preferCloudinary: false,
			});
			const resolved = primarySrc || fallbackSrc;
			if (!resolved || seen.has(resolved)) continue;
			seen.add(resolved);
			normalizedCandidates.push({
				...candidate,
				index,
				primarySrc,
				fallbackSrc,
				resolved,
			});
		}

		const scored = normalizedCandidates
			.map((candidate) => {
				const srcLower = String(candidate.resolved || "").toLowerCase();
				const posLower = String(candidate.position || "").toLowerCase();
				let score = 0;

				if (candidate.source === "variant") score += 3;
				if (candidate.source === "printify") score += 2;
				if (candidate.isDefault) score += 2;
				if (posLower.includes("front")) score += 4;
				if (srcLower.includes("front")) score += 1;
				score += Math.max(0, 2 - candidate.index * 0.08);

				if (isWearable) {
					if (POD_LIFESTYLE_HINT_REGEX.test(srcLower) || POD_LIFESTYLE_HINT_REGEX.test(posLower)) {
						score += 14;
					}
					if (candidate.source === "printify" && !candidate.isDefault) {
						score += 4;
					}
					if (candidate.source === "printify" && candidate.isDefault) {
						score -= 2;
					}
					if (POD_FLAT_HINT_REGEX.test(srcLower)) {
						score -= 6;
					}
					if (posLower.includes("back")) {
						score -= 4;
					}
				}

				return { ...candidate, score };
			})
			.sort((a, b) => b.score - a.score);

		const preferredCandidate = scored[0] || null;
		const examplePrimary = resolveImageUrl(exampleDesignImage);
		const exampleFallback = resolveImageUrl(exampleDesignImage, {
			preferCloudinary: false,
		});
		let primarySrc = preferredCandidate?.primarySrc || preferredCandidate?.fallbackSrc;
		let fallbackSrc =
			preferredCandidate?.fallbackSrc ||
			preferredCandidate?.primarySrc ||
			exampleFallback ||
			examplePrimary;

		if (isMug) {
			primarySrc =
				examplePrimary ||
				primarySrc ||
				preferredCandidate?.fallbackSrc ||
				exampleFallback;
			fallbackSrc =
				exampleFallback ||
				primarySrc ||
				preferredCandidate?.fallbackSrc ||
				preferredCandidate?.primarySrc;
		} else if (!primarySrc) {
			primarySrc = examplePrimary || exampleFallback || null;
		}

		return {
			primarySrc,
			fallbackSrc,
			exampleSrc: examplePrimary || exampleFallback || null,
		};
	}, []);

	const getOptimizedPreviewImageUrl = useCallback((src, width) => {
		const safeSrc = `${src || ""}`.trim();
		if (!safeSrc) return "";
		return getCloudinaryOptimizedUrl(safeSrc, {
			width,
			quality: "auto:eco",
		});
	}, []);

	const handleDirectPreviewImageError = useCallback((event, fallbackSrc) => {
		const imageElement = event.currentTarget;
		if (imageElement.dataset.fallbackApplied === "true") return;
		const safeFallback = fallbackSrc ? `${fallbackSrc}`.trim() : "";
		if (!safeFallback) return;
		imageElement.dataset.fallbackApplied = "true";
		imageElement.src = safeFallback;
	}, []);

	const registerPreviewForSessionCleanup = useCallback((item) => {
		const sessionItems = normalizePreviewSessionCleanupItems([
			...previewSessionCleanupRef.current,
			item,
		]);
		if (!sessionItems.length) return;
		previewSessionCleanupRef.current = sessionItems;
		writePreviewSessionCleanupItems(sessionItems);

		const pendingItems = normalizePreviewSessionCleanupItems([
			...previewPendingCleanupRef.current,
			item,
		]);
		previewPendingCleanupRef.current = pendingItems;
		writePreviewPendingCleanupItems(pendingItems);
	}, []);

	const flushPreviewSessionCleanup = useCallback(
		({ keepalive = false } = {}) => {
			const sessionItems = normalizePreviewSessionCleanupItems(
				previewSessionCleanupRef.current,
			);
			const pendingItems = normalizePreviewSessionCleanupItems(
				previewPendingCleanupRef.current,
			);
			const cleanupItems = normalizePreviewSessionCleanupItems([
				...pendingItems,
				...sessionItems,
			]);
			if (!cleanupItems.length) {
				previewSessionCleanupRef.current = [];
				writePreviewSessionCleanupItems([]);
				return Promise.resolve({ success: true, requested: 0 });
			}
			if (cleanupFlushInFlightRef.current) {
				return cleanupFlushInFlightRef.current;
			}
			const flushPromise = cleanupPodListPreviewSession(cleanupItems, {
				keepalive,
			})
				.then((result) => {
					const cleanupQueued = Boolean(result?.queued);
					let remainingItems = [];
					if (cleanupQueued) {
						remainingItems = cleanupItems;
					} else if (result?.success) {
						remainingItems = [];
					} else {
						const failedItems = normalizePreviewSessionCleanupItems(
							result?.failures || [],
						);
						remainingItems = failedItems.length ? failedItems : cleanupItems;
					}

					const attemptedIds = cleanupItems
						.map((item) => String(item?.preview_product_id || "").trim())
						.filter(Boolean);
					const remainingIdSet = new Set(
						remainingItems
							.map((item) => String(item?.preview_product_id || "").trim())
							.filter(Boolean),
					);
					const removedIds = attemptedIds.filter((id) => !remainingIdSet.has(id));
					if (removedIds.length) {
						removePreviewLocalCacheEntriesByPreviewIds(removedIds);
					}

					previewSessionCleanupRef.current = [];
					writePreviewSessionCleanupItems([]);
					previewPendingCleanupRef.current = remainingItems;
					writePreviewPendingCleanupItems(remainingItems);
					return result;
				})
				.catch((error) => {
					const mergedPending = normalizePreviewSessionCleanupItems([
						...previewPendingCleanupRef.current,
						...cleanupItems,
					]);
					previewSessionCleanupRef.current = [];
					writePreviewSessionCleanupItems([]);
					previewPendingCleanupRef.current = mergedPending;
					writePreviewPendingCleanupItems(mergedPending);
					if (!keepalive) {
						console.warn("Failed cleaning POD list preview session:", {
							message: error?.message,
						});
					}
					throw error;
				})
				.finally(() => {
					cleanupFlushInFlightRef.current = null;
				});
			cleanupFlushInFlightRef.current = flushPromise;
			return flushPromise;
		},
		[],
	);

	useEffect(() => {
		const sessionItems = readPreviewSessionCleanupItems();
		const pendingItems = readPreviewPendingCleanupItems();
		previewSessionCleanupRef.current = sessionItems;
		previewPendingCleanupRef.current = normalizePreviewSessionCleanupItems([
			...pendingItems,
			...sessionItems,
		]);
		writePreviewPendingCleanupItems(previewPendingCleanupRef.current);
		writePreviewSessionCleanupItems(sessionItems);

		if (previewPendingCleanupRef.current.length) {
			flushPreviewSessionCleanup({ keepalive: false }).catch(() => {});
		}
	}, [flushPreviewSessionCleanup]);

	useEffect(() => {
		const handleSessionEnd = () => {
			flushPreviewSessionCleanup({ keepalive: true }).catch(() => {});
		};
		window.addEventListener("beforeunload", handleSessionEnd);
		window.addEventListener("pagehide", handleSessionEnd);
		return () => {
			window.removeEventListener("beforeunload", handleSessionEnd);
			window.removeEventListener("pagehide", handleSessionEnd);
		};
	}, [flushPreviewSessionCleanup]);

	useEffect(() => {
		return () => {
			flushPreviewSessionCleanup({ keepalive: false }).catch(() => {});
		};
	}, [flushPreviewSessionCleanup]);

	useEffect(() => {
		const fetchProducts = async () => {
			try {
				const response = await axios.get(
					`${process.env.REACT_APP_API_URL}/products/pod/print-on-demand-products`
				);
				if (Array.isArray(response.data)) {
					const sortedData = response.data.slice().sort((a, b) => {
						return getPriority(a) - getPriority(b);
					});
					setProducts(sortedData);
				}
			} catch (error) {
				console.error("Error fetching POD products:", error);
			}
			setLoading(false);
		};

		fetchProducts();
	}, []);

	useEffect(() => {
		if (!products.length) {
			setPreviewByProductId({});
			setPreviewStatusByProductId({});
			return undefined;
		}

		let cancelled = false;
		const localCache = readPreviewLocalCache();
		const initialPreviewMap = {};
		const initialStatusMap = {};

		for (const product of products) {
			if (product?._id) {
				initialStatusMap[product._id] = "idle";
			}
		}

		setPreviewByProductId(initialPreviewMap);
		setPreviewStatusByProductId(initialStatusMap);

		const queue = products.slice();
		let cursor = 0;
		const workerCount = Math.min(4, queue.length);

		const processNext = async () => {
			while (!cancelled) {
				const currentIndex = cursor;
				cursor += 1;
				if (currentIndex >= queue.length) break;
				const product = queue[currentIndex];
				const productId = product._id;
				if (!productId) continue;
				const cacheKey = buildPreviewLocalCacheKey(
					productId,
					podOccasion,
					podName,
				);
				if (!`${podName || ""}`.trim()) {
					const storedDefaultImages = getStoredDefaultDesignImagesForOccasion(
						product,
						podOccasion,
					);
					if (storedDefaultImages.length) {
						const previewImage = storedDefaultImages[0];
						setPreviewByProductId((prev) => ({
							...prev,
							[productId]: previewImage,
						}));
						setPreviewStatusByProductId((prev) => ({
							...prev,
							[productId]: "ready",
						}));
						localCache[cacheKey] = {
							previewImage,
							expiresAt: Date.now() + POD_LIST_PREVIEW_LOCAL_CACHE_TTL_MS,
							updatedAt: Date.now(),
							previewProductId: null,
							previewShopId: null,
							source: "stored-default-design",
						};
						continue;
					}
				}
				const cachedPreview = localCache[cacheKey];
				const cachedPreviewImage =
					typeof cachedPreview?.previewImage === "string"
						? cachedPreview.previewImage.trim()
						: "";
				const hasCachedPreview =
					Boolean(cachedPreviewImage) &&
					Number(cachedPreview?.expiresAt || 0) > Date.now();
				if (hasCachedPreview) {
					setPreviewByProductId((prev) => ({
						...prev,
						[productId]: cachedPreviewImage,
					}));
					setPreviewStatusByProductId((prev) => ({
						...prev,
						[productId]: "ready",
					}));
					continue;
				}

				setPreviewStatusByProductId((prev) => {
					if (prev[productId] === "ready") return prev;
					return { ...prev, [productId]: "loading" };
				});

				try {
					const response = await getPodListPreview(productId, {
						occasion: podOccasion,
						name: podName,
					});
					if (cancelled) return;
					const responseIsFallback =
						response?.source === "fallback-error" || response?.success === false;
					const previewProductIdRaw = response?.preview_product_id;
					const previewProductId =
						previewProductIdRaw !== null &&
						previewProductIdRaw !== undefined &&
						String(previewProductIdRaw).trim()
							? String(previewProductIdRaw).trim()
							: null;
					if (previewProductId) {
						registerPreviewForSessionCleanup({
							preview_product_id: previewProductId,
							shop_id: response?.shop_id || null,
							product_id: productId,
						});
					}
					if (responseIsFallback) {
						setPreviewStatusByProductId((prev) => ({
							...prev,
							[productId]: "error",
						}));
						continue;
					}
					const previewImageRaw =
						typeof response?.preview_image === "string"
							? response.preview_image.trim()
							: "";
					const previewImage =
						previewImageRaw && /^https?:\/\//i.test(previewImageRaw)
							? previewImageRaw
							: null;
					if (previewImage) {
						setPreviewByProductId((prev) => ({
							...prev,
							[productId]: previewImage,
						}));
						setPreviewStatusByProductId((prev) => ({
							...prev,
							[productId]: "ready",
						}));
						localCache[cacheKey] = {
							previewImage,
							expiresAt: Date.now() + POD_LIST_PREVIEW_LOCAL_CACHE_TTL_MS,
							updatedAt: Date.now(),
							previewProductId,
							previewShopId: response?.shop_id || null,
						};
						writePreviewLocalCache(localCache);
					} else {
						setPreviewStatusByProductId((prev) => ({
							...prev,
							[productId]: "error",
						}));
					}
				} catch (error) {
					if (cancelled) return;
					console.warn("POD list preview request failed", {
						productId,
						message: error?.response?.data?.error || error?.message,
					});
					setPreviewStatusByProductId((prev) => ({
						...prev,
						[productId]: "error",
					}));
				}
			}
		};

		const workers = Array.from({ length: workerCount }, () => processNext());
		Promise.allSettled(workers).then(() => {
			if (!cancelled) {
				writePreviewLocalCache(localCache);
			}
		});

		return () => {
			cancelled = true;
		};
	}, [products, podOccasion, podName, registerPreviewForSessionCleanup]);

	const handleProductClick = useCallback(
		(product) => {
			ReactGA.event({
				category: "User Clicked On Product From Custom Design Products",
				action: "User Clicked On Product From Custom Design Products",
				label: "User Clicked On Product From Custom Design Products",
			});

			const eventId = `print-on-demand-${Date.now()}`;
			ReactPixel.track("Lead", {
				content_name: "User Clicked On Product From Custom Design Products",
				click_type: "Custom Design (Print On Demand)",
				eventID: eventId,
			});

			axios
				.post(`${process.env.REACT_APP_API_URL}/facebookpixel/conversionapi`, {
					eventName: "Lead",
					eventId,
					email: user?.email || "Unknown",
					phone: user?.phone || "Unknown",
					currency: "USD",
					value: 0,
					contentIds: ["cat-print-on-demand"],
					userAgent: window.navigator.userAgent,
				})
				.catch(() => {});

			const safe = savePodPersonalization({
				occasion: podOccasion,
				name: podNameDraft,
			});
			const slug = toPodSlug(product.productName);
			history.push(
				`/custom-gifts/${slug}/${product._id}${buildPersonalizationSearch(safe)}`
			);
		},
		[history, podOccasion, podNameDraft, user]
	);

	if (loading) {
		return (
			<LoadingContainer>
				<CustomSpinner />
				<LoadingText>Loading Personalized Gifts...</LoadingText>
			</LoadingContainer>
		);
	}

	return (
		<div className='container'>
			<PrintifyPageHelmet products={products} />

			<Wrapper>
				<HeroPanel>
					<HeroTextWrap>
						<HeroEyebrow>Personalized Print On Demand</HeroEyebrow>
						<SectionTitle>Custom Gifts That Feel Made Just For Them</SectionTitle>
						<SectionSubtitle>
							{occasionPreset.accentIcon} {personalizedLine}. Pick a product
							below and we will carry this into your design flow.
						</SectionSubtitle>
					</HeroTextWrap>

					<PersonalizationCard>
						<FieldLabel>Occasion</FieldLabel>
						<Select
							size='large'
							value={podOccasion}
							style={{ width: "100%" }}
							onChange={(value) =>
								commitPodPersonalization(value, podNameDraft)
							}
						>
							{POD_OCCASION_OPTIONS.map((item) => (
								<Option key={item.value} value={item.value}>
									<span>
										{item.icon} {item.value}
									</span>
								</Option>
							))}
						</Select>

						<FieldLabel style={{ marginTop: "10px" }}>Name (Optional)</FieldLabel>
						<Input
							size='large'
							value={podNameDraft}
							onChange={(e) => setPodNameDraft(e.target.value)}
							onBlur={() =>
								commitPodPersonalization(podOccasion, podNameDraft)
							}
							onPressEnter={(event) => {
								commitPodPersonalization(podOccasion, podNameDraft);
								if (event?.target?.blur) event.target.blur();
							}}
							maxLength={40}
							placeholder='Example: Emma'
						/>
						<HelperText>
							You can update this anytime while customizing.
						</HelperText>
					</PersonalizationCard>
				</HeroPanel>

				<GridContainer>
					{products.map((product) => {
						const { primarySrc, fallbackSrc, exampleSrc } = getCardImageSources(product);
						const previewStatus = previewStatusByProductId[product._id] || "idle";
						const readyPreview =
							previewStatus === "ready" && Boolean(previewByProductId[product._id]);
						const placeholderSrc = exampleSrc || fallbackSrc || primarySrc;
						const previewSrc = readyPreview
							? previewByProductId[product._id]
							: placeholderSrc;
						const hoverPreviewSrc = readyPreview
							? getOptimizedPreviewImageUrl(previewSrc, 900)
							: placeholderSrc;
						const cardPreviewSrc = readyPreview
							? getOptimizedPreviewImageUrl(previewSrc, 640)
							: placeholderSrc;
						const hoverFallbackSrc = getOptimizedPreviewImageUrl(
							placeholderSrc || primarySrc,
							900,
						);
						const cardFallbackSrc = getOptimizedPreviewImageUrl(
							placeholderSrc || primarySrc,
							640,
						);
						const loadingPreview = previewStatus === "loading";

						return (
							<Popover
								key={product._id}
								trigger={["hover"]}
								placement='rightTop'
								mouseEnterDelay={0.12}
								zIndex={4200}
								destroyOnHidden
								content={
									<HoverPreviewContent>
										<HoverPreviewImageWrap>
											{readyPreview ? (
												<DirectPreviewImage
													src={hoverPreviewSrc}
													alt={`${product.productName} preview`}
													loading='lazy'
													decoding='async'
													referrerPolicy='no-referrer'
													onError={(event) =>
														handleDirectPreviewImageError(
															event,
															hoverFallbackSrc || placeholderSrc || primarySrc
														)
													}
												/>
											) : (
												<ProductImage
													src={placeholderSrc}
													fallbackSrc={primarySrc || fallbackSrc}
													alt={`${product.productName} preview`}
													loading='lazy'
													decoding='async'
													sizes='(max-width: 1200px) 360px, 420px'
													widths={[420, 640, 800]}
												/>
											)}
											{loadingPreview && (
												<CardPreviewBadge>
													<CardPreviewBadgeSpinner />
													<span>Generating live preview...</span>
												</CardPreviewBadge>
											)}
										</HoverPreviewImageWrap>
										<HoverPreviewLabel>
											{readyPreview
												? "Personalized preview"
												: "Generating personalized preview..."}
										</HoverPreviewLabel>
									</HoverPreviewContent>
								}
							>
								<CardAnchor>
									<Card onClick={() => handleProductClick(product)}>
										<ImageWrap>
											{readyPreview ? (
												<DirectPreviewImage
													src={cardPreviewSrc}
													alt={product.productName}
													loading='lazy'
													decoding='async'
													referrerPolicy='no-referrer'
													onError={(event) =>
														handleDirectPreviewImageError(
															event,
															cardFallbackSrc || placeholderSrc || primarySrc
														)
													}
												/>
											) : (
												<ProductImage
													src={placeholderSrc}
													fallbackSrc={primarySrc || fallbackSrc}
													alt={product.productName}
													loading='lazy'
													decoding='async'
													sizes='(max-width: 600px) 94vw, (max-width: 1024px) 46vw, 320px'
													widths={[320, 480, 640, 800]}
												/>
											)}
											{loadingPreview && (
												<CardPreviewBadge>
													<CardPreviewBadgeSpinner />
													<span>Generating live preview...</span>
												</CardPreviewBadge>
											)}
										</ImageWrap>

										<CardBody>
											<ProductTitle>{product.productName}</ProductTitle>
											<ProductPrice>
												Starting at: $
												{product.priceAfterDiscount?.toFixed(2) ?? "0.00"}
											</ProductPrice>
											<CustomizeButton>Customize This Gift</CustomizeButton>
										</CardBody>
									</Card>
								</CardAnchor>
							</Popover>
						);
					})}
				</GridContainer>
			</Wrapper>
		</div>
	);
};

export default PrintifyAvailableProducts;

const spinAnimation = keyframes`
	0% { transform: rotate(0deg); }
	100% { transform: rotate(360deg); }
`;

const CustomSpinner = styled.div`
	border: 6px solid var(--neutral-light2);
	border-top: 6px solid var(--secondary-color);
	border-radius: 50%;
	width: 48px;
	height: 48px;
	animation: ${spinAnimation} 1s linear infinite;
`;

const LoadingContainer = styled.div`
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	height: 60vh;
`;

const LoadingText = styled.p`
	margin-top: 12px;
	color: var(--text-color-primary);
`;

const Wrapper = styled.section`
	padding: 26px 14px 40px;
	background: radial-gradient(circle at top right, #fff4ea 0%, #fff 35%);
	min-height: 100vh;
`;

const HeroPanel = styled.div`
	display: grid;
	grid-template-columns: 1.2fr 0.8fr;
	gap: 16px;
	margin-bottom: 20px;

	@media (max-width: 900px) {
		grid-template-columns: 1fr;
	}
`;

const HeroTextWrap = styled.div`
	padding: 18px 18px 14px;
	border-radius: 14px;
	border: 1px solid #f3dfd0;
	background: linear-gradient(180deg, #fff9f4 0%, #fff 100%);
`;

const HeroEyebrow = styled.div`
	display: inline-flex;
	padding: 5px 10px;
	border-radius: 999px;
	font-size: 12px;
	font-weight: 700;
	letter-spacing: 0.04em;
	text-transform: uppercase;
	color: #6d3e18;
	background: #ffe9d7;
`;

const SectionTitle = styled.h1`
	color: #2e1f15;
	font-size: clamp(1.4rem, 2.4vw, 2rem);
	margin: 10px 0 6px;
	font-weight: 800;
	line-height: 1.22;
`;

const SectionSubtitle = styled.p`
	margin: 0;
	font-size: 1rem;
	line-height: 1.5;
	color: #5a4e46;
`;

const PersonalizationCard = styled.div`
	padding: 16px;
	border-radius: 14px;
	border: 1px solid #f0e2d6;
	background: #fff;
`;

const FieldLabel = styled.label`
	display: block;
	font-size: 0.9rem;
	font-weight: 700;
	color: #2c2520;
	margin: 0 0 6px;
`;

const HelperText = styled.p`
	font-size: 0.82rem;
	margin: 10px 0 0;
	color: #6b625d;
`;

const GridContainer = styled.div`
	display: grid;
	gap: 16px;
	grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
`;

const CardAnchor = styled.div`
	display: block;
	width: 100%;
	height: 100%;
	position: relative;
	z-index: 1;

	&:hover {
		z-index: 5;
	}
`;

const Card = styled.button`
	background: #fff;
	border: 1px solid #f1e5db;
	border-radius: 14px;
	box-shadow: 0 6px 18px rgba(28, 21, 16, 0.05);
	overflow: hidden;
	cursor: pointer;
	display: flex;
	flex-direction: column;
	text-align: left;
	padding: 0;
	min-height: 100%;
`;

const ImageWrap = styled.div`
	position: relative;
	width: 100%;
	aspect-ratio: 1 / 1;
	min-height: 260px;
	overflow: hidden;
	background: linear-gradient(180deg, #f8f5f1 0%, #f2ede7 100%);
`;

const ProductImage = styled(OptimizedImage)`
	width: 100%;
	height: 100%;
	object-fit: contain;
	padding: 8px;
	display: block;
`;

const DirectPreviewImage = styled.img`
	width: 100%;
	height: 100%;
	object-fit: contain;
	padding: 8px;
	display: block;
`;

const CardPreviewBadge = styled.div`
	position: absolute;
	left: 10px;
	right: 10px;
	bottom: 10px;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 8px;
	padding: 7px 10px;
	border-radius: 999px;
	background: rgba(25, 25, 25, 0.82);
	color: #fff;
	font-size: 0.78rem;
	font-weight: 700;
	text-align: center;
	letter-spacing: 0.01em;
	z-index: 3;
	pointer-events: none;
`;

const CardPreviewBadgeSpinner = styled.span`
	width: 12px;
	height: 12px;
	border-radius: 50%;
	border: 2px solid rgba(255, 255, 255, 0.45);
	border-top-color: #ffffff;
	animation: ${spinAnimation} 0.75s linear infinite;
`;

const HoverPreviewContent = styled.div`
	width: min(420px, 74vw);
`;

const HoverPreviewImageWrap = styled.div`
	position: relative;
	width: 100%;
	aspect-ratio: 1 / 1;
	border-radius: 12px;
	overflow: hidden;
	border: 1px solid #efded0;
	background: linear-gradient(180deg, #faf7f3 0%, #f3ece3 100%);
`;

const HoverPreviewLabel = styled.p`
	margin: 8px 0 0;
	font-size: 0.8rem;
	color: #64564d;
	text-align: center;
`;

const CardBody = styled.div`
	padding: 12px 12px 14px;
	display: flex;
	flex-direction: column;
	gap: 6px;
	flex: 1;
`;

const ProductTitle = styled.h3`
	font-size: 0.93rem;
	font-weight: 700;
	color: #1f1915;
	margin: 0;
	text-transform: capitalize;
`;

const ProductPrice = styled.p`
	font-size: 0.93rem;
	color: #473f39;
	margin: 0;
`;

const CustomizeButton = styled.div`
	margin-top: 2px;
	background: #2a221d;
	color: #fff;
	border-radius: 8px;
	padding: 10px 12px;
	font-size: 0.95rem;
	font-weight: 700;
	text-align: center;
`;


