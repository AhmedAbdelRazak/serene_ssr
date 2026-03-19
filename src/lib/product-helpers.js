import { POD_OCCASIONS } from "./pod-occasions";
import {
  normalizePodProduct,
  resolveInitialPodVariantSelection,
} from "./pod-product";
import { stripHtml, toSlug, uniqueStrings } from "./utils";

const CLOUDINARY_BASE_URL =
  "https://res.cloudinary.com/infiniteapps/image/upload/";

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

function toDisplayTitle(value = "") {
  const raw = `${value || ""}`.trim();
  if (!raw) return "";
  return raw.replace(/\b[a-z]/g, (match) => match.toUpperCase());
}

function getPodProductKind(product = {}) {
  const normalizedName = normalizeToken(
    product?.printifyProductDetails?.title || product?.productName || "",
  );
  const isApparel =
    normalizedName.includes("t-shirt") ||
    normalizedName.includes("tee") ||
    (normalizedName.includes("shirt") &&
      !normalizedName.includes("sweatshirt"));
  const isHoodieLike =
    normalizedName.includes("hoodie") ||
    normalizedName.includes("sweatshirt") ||
    normalizedName.includes("pullover");
  const isMug = normalizedName.includes("mug");
  const isTote = normalizedName.includes("tote");
  const isWeekender =
    normalizedName.includes("weekender") || normalizedName.includes("bag");
  const isPillow = normalizedName.includes("pillow");
  const isMagnet = normalizedName.includes("magnet");
  const isCandle = normalizedName.includes("candle");
  if (isApparel) return "apparel";
  if (isHoodieLike) return "hoodie";
  if (isMug) return "mug";
  if (isTote) return "tote";
  if (isWeekender) return "bag";
  if (isPillow) return "pillow";
  if (isMagnet) return "magnet";
  if (isCandle) return "candle";
  return "default";
}

function getMockupCameraLabel(image = {}) {
  const explicit = `${image?.camera_label || image?.cameraLabel || ""}`
    .trim()
    .toLowerCase();
  if (explicit) return explicit;
  const src = `${image?.src || image?.url || ""}`.trim();
  if (!src) return "";
  try {
    const url = new URL(src);
    const queryLabel = `${url.searchParams.get("camera_label") || ""}`
      .trim()
      .toLowerCase();
    if (queryLabel) return queryLabel;
  } catch {}
  const fallbackMatch = src.toLowerCase().match(/camera_label=([a-z0-9_-]+)/i);
  return fallbackMatch?.[1] || "";
}

function buildPodImageViewKey(image = {}) {
  const cameraLabel = getMockupCameraLabel(image);
  const position = normalizeToken(image?.position || image?.placeholder || "");
  const combined = `${cameraLabel} ${position}`.trim();
  if (
    /(lifestyle|model|wear|wearing|person|people|studio|on-model|on_model)/.test(
      combined,
    )
  ) {
    return "lifestyle";
  }
  if (/(front|center|main|default|hero|primary|straight|full)/.test(combined)) {
    return "front";
  }
  if (/back/.test(combined)) return "back";
  if (/left/.test(combined)) return "left";
  if (/right/.test(combined)) return "right";
  return combined || normalizeToken(image?.src || image?.url || "");
}

function scorePodGalleryImage(product = {}, image = {}) {
  let score = 0;
  const position = normalizeToken(image?.position || image?.placeholder || "");
  const src = normalizeToken(image?.src || image?.url || "");
  const cameraLabel = getMockupCameraLabel(image);
  const combined = `${cameraLabel} ${position} ${src}`;
  const kind = getPodProductKind(product);
  const isWearable = kind === "apparel" || kind === "hoodie";

  if (position.includes("front")) score += 10;
  if (position.includes("center")) score += 4;
  if (image?.is_default) score += 3;
  if (/front|main|default|hero|primary|straight|full/.test(combined))
    score += 8;
  if (/back/.test(combined)) score -= 4;

  if (isWearable) {
    if (
      /(lifestyle|model|wear|wearing|person|people|studio|on-model|on_model)/.test(
        combined,
      )
    ) {
      score += 14;
    }
    if (/(flat|blank|ghost|isolated|template)/.test(combined)) score -= 4;
  }

  if (!isWearable) {
    if (cameraLabel === "front") score += 6;
    if (/detail|closeup|close-up|zoom|crop|corner/.test(combined)) score -= 6;
  }

  if (kind === "mug" && /wrap/.test(combined)) score += 6;
  if (kind === "tote" || kind === "bag") {
    if (/front|straight/.test(combined)) score += 8;
    if (/angle|tilt|perspective/.test(combined)) score -= 8;
  }
  if (kind === "pillow") {
    if (/front|main|default|straight/.test(combined)) score += 10;
    if (/zipper|corner|side|profile/.test(combined)) score -= 14;
  }
  if (kind === "candle") {
    if (/label/.test(combined)) score += 10;
    if (/front|straight/.test(combined)) score += 6;
  }

  return score;
}

function rankPodGalleryImages(product = {}, images = [], limit = 6) {
  const ranked = [...(Array.isArray(images) ? images : [])]
    .map((image, index) => ({
      image,
      index,
      score: scorePodGalleryImage(product, image),
      viewKey: buildPodImageViewKey(image),
      url: resolveImageUrl(image),
    }))
    .filter((entry) => entry.url)
    .sort(
      (a, b) =>
        b.score - a.score || a.index - b.index || a.url.localeCompare(b.url),
    );

  const selected = [];
  const seenUrls = new Set();
  const seenViews = new Set();

  for (const entry of ranked) {
    if (selected.length >= limit) break;
    if (seenUrls.has(entry.url)) continue;
    if (entry.viewKey && seenViews.has(entry.viewKey)) continue;
    selected.push(entry.url);
    seenUrls.add(entry.url);
    if (entry.viewKey) seenViews.add(entry.viewKey);
  }

  for (const entry of ranked) {
    if (selected.length >= limit) break;
    if (seenUrls.has(entry.url)) continue;
    selected.push(entry.url);
    seenUrls.add(entry.url);
  }

  return selected;
}

function getProductAttributes(product = {}) {
  return Array.isArray(product?.productAttributes)
    ? product.productAttributes
    : [];
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
    normalizeToken(option?.name).includes(needle),
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
        ? value.colors
            .map((entry) => normalizeColorToken(entry))
            .filter(Boolean)
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
      (candidate && attrPk.includes(candidate)),
  );
}

export function findBestProductAttribute(
  product = {},
  { color = "", size = "", scent = "" } = {},
) {
  const attributes = getProductAttributes(product);
  if (!attributes.length) return null;

  let candidates = [...attributes];

  const sizeMatches = candidates.filter((attr) =>
    matchesRequestedSize(attr, size),
  );
  if (sizeMatches.length) candidates = sizeMatches;

  const scentMatches = candidates.filter((attr) =>
    matchesRequestedScent(attr, scent),
  );
  if (scentMatches.length) candidates = scentMatches;

  const colorCandidates = getColorCandidates(product, color);
  const colorMatches = candidates.filter((attr) =>
    matchesRequestedColor(attr, colorCandidates),
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

function buildCloudinaryDeliveryUrl(publicId = "") {
  const normalized = `${publicId || ""}`.trim().replace(/^\/+/, "");
  return normalized ? `${CLOUDINARY_BASE_URL}${normalized}` : "";
}

export function getPodDefaultDesignImages(
  product = {},
  {
    occasion = "",
    name = "",
    color = "",
    size = "",
    scent = "",
    viewIndex = 0,
    allowOccasionFallback = false,
    limit = 3,
  } = {},
) {
  if (normalizeToken(name)) return [];
  if (!normalizeToken(occasion) && !allowOccasionFallback) return [];
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
    const urls = images.map((image) => resolveImageUrl(image)).filter(Boolean);
    if (!urls.length) continue;

    const preferredImages =
      viewIndex > 0 && urls[viewIndex]
        ? [urls[viewIndex], ...urls.filter((_, index) => index !== viewIndex)]
        : urls;
    return uniqueStrings(preferredImages).slice(0, Math.max(1, limit));
  }

  return [];
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
  } = {},
) {
  return (
    getPodDefaultDesignImages(product, {
      occasion,
      name,
      color,
      size,
      scent,
      viewIndex,
      allowOccasionFallback,
      limit: 1,
    })[0] || ""
  );
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
  const cloudinaryDirect =
    imageLike.cloudinary_url ||
    imageLike.cloudinaryUrl ||
    imageLike.cloudinaryURL ||
    imageLike.cloudinary_secure_url ||
    imageLike.cloudinarySecureUrl ||
    "";
  const cloudinaryPublicId =
    imageLike.cloudinary_public_id ||
    imageLike.cloudinaryPublicId ||
    imageLike.public_id ||
    imageLike.publicId ||
    "";
  const direct =
    cloudinaryDirect ||
    buildCloudinaryDeliveryUrl(cloudinaryPublicId) ||
    imageLike.secure_url ||
    imageLike.url ||
    imageLike.src;
  return normalizeUrl(direct || "");
}

export function extractImageUrls(source) {
  if (!source) return [];
  if (Array.isArray(source)) {
    return source.flatMap((item) => extractImageUrls(item));
  }
  if (typeof source === "string") {
    const normalized = resolveImageUrl(source);
    return normalized ? [normalized] : [];
  }
  if (typeof source === "object") {
    const direct = resolveImageUrl(source);
    const nested = extractImageUrls(source?.images);
    return [direct, ...nested].filter(Boolean);
  }
  return [];
}

export function uniqueImageUrls(urls = []) {
  const seen = new Set();
  const deduped = [];
  for (const entry of urls) {
    const url = `${entry || ""}`.trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    deduped.push(url);
  }
  return deduped;
}

function isCloudinaryImageUrl(url = "") {
  return /^(https?:)?\/\/res\.cloudinary\.com\//i.test(`${url || ""}`.trim());
}

function toCloudinaryImageUrl(source) {
  const urls = extractImageUrls(source);
  return urls.find((url) => isCloudinaryImageUrl(url)) || "";
}

function cloudinaryOnlyImageUrls(urls = []) {
  return uniqueImageUrls(urls).filter((url) => isCloudinaryImageUrl(url));
}

export function getPrimaryProductImage(
  product = {},
  {
    occasion = "",
    name = "",
    color = "",
    size = "",
    scent = "",
    viewIndex = 0,
  } = {},
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
  const rankedVariantImage = getPodGalleryImages(
    product,
    { color, size, scent },
    1,
  )[0];
  const candidates = [
    matchedAttr?.exampleDesignImage,
    rankedVariantImage,
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

export function getRepresentativePodSelection(product = {}, selection = {}) {
  if (!isPodProduct(product)) {
    return {
      occasion: `${selection?.occasion || ""}`.trim(),
      name: `${selection?.name || ""}`.trim(),
      color: `${selection?.color || ""}`.trim(),
      size: `${selection?.size || ""}`.trim(),
      scent: `${selection?.scent || ""}`.trim(),
    };
  }

  const normalizedProduct = normalizePodProduct(product);
  const initialSelection = resolveInitialPodVariantSelection(
    normalizedProduct,
    selection,
  );

  return {
    occasion: `${selection?.occasion || ""}`.trim(),
    name: `${selection?.name || ""}`.trim(),
    color: `${initialSelection?.color || selection?.color || ""}`.trim(),
    size: `${initialSelection?.size || selection?.size || ""}`.trim(),
    scent: `${initialSelection?.scent || selection?.scent || ""}`.trim(),
  };
}

export function getProductSeoImages(product = {}, selection = {}, limit = 4) {
  const safeLimit = Math.max(1, Number(limit) || 1);

  if (isPodProduct(product)) {
    const representativeSelection = getRepresentativePodSelection(
      product,
      selection,
    );
    const matchedAttr = findBestProductAttribute(
      product,
      representativeSelection,
    );
    const cloudinaryImages = cloudinaryOnlyImageUrls([
      ...getPodDefaultDesignImages(product, {
        ...representativeSelection,
        limit: safeLimit,
      }),
      toCloudinaryImageUrl(
        getPrimaryProductImage(product, representativeSelection),
      ),
      ...extractImageUrls(matchedAttr?.exampleDesignImage),
      ...extractImageUrls(matchedAttr?.productImages),
      ...extractImageUrls(product?.thumbnailImage),
      ...extractImageUrls(product?.productImages),
      ...extractImageUrls(product?.images),
    ]).slice(0, safeLimit);

    if (cloudinaryImages.length) {
      return cloudinaryImages;
    }

    return uniqueImageUrls([
      getPrimaryProductImage(product, representativeSelection),
      ...getPodGalleryImages(product, representativeSelection, safeLimit),
      ...extractImageUrls(product?.images),
    ]).slice(0, safeLimit);
  }

  const normalizedSelection = {
    color: `${selection?.color || ""}`.trim(),
    size: `${selection?.size || ""}`.trim(),
    scent: `${selection?.scent || ""}`.trim(),
  };
  const matchedAttr = findBestProductAttribute(product, normalizedSelection);
  const cloudinaryImages = cloudinaryOnlyImageUrls([
    toCloudinaryImageUrl(getPrimaryProductImage(product, normalizedSelection)),
    ...extractImageUrls(matchedAttr?.exampleDesignImage),
    ...extractImageUrls(matchedAttr?.productImages),
    ...extractImageUrls(product?.thumbnailImage),
    ...extractImageUrls(product?.productImages),
    ...extractImageUrls(product?.images),
  ]).slice(0, safeLimit);

  if (cloudinaryImages.length) {
    return cloudinaryImages;
  }

  return uniqueImageUrls([
    getPrimaryProductImage(product, normalizedSelection),
    ...extractImageUrls(matchedAttr?.productImages),
    ...extractImageUrls(product?.productImages),
    ...extractImageUrls(product?.images),
  ]).slice(0, safeLimit);
}

export function getProductDisplayName(product = {}) {
  const isPod = Boolean(
    product?.isPrintifyProduct && product?.printifyProductDetails?.POD,
  );
  const preferredName = isPod
    ? product?.printifyProductDetails?.title || product?.productName
    : product?.productName || product?.printifyProductDetails?.title;
  return toDisplayTitle(preferredName || "Product");
}

export function getProductDescription(product = {}) {
  const text = stripHtml(
    product?.description || product?.printifyProductDetails?.description || "",
  );
  return text || "Shop premium handcrafted and print-on-demand gifts.";
}

export function isPodProduct(product = {}) {
  return Boolean(
    product?.isPrintifyProduct && product?.printifyProductDetails?.POD,
  );
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
    product?.isPrintifyProduct && product?.printifyProductDetails?.POD,
  );
  if (isPod) return getPodProductSlug(product);
  const candidate =
    product?.slug || getProductDisplayName(product) || "product";
  return toSlug(candidate) || "product";
}

export function getCategorySlug(product = {}) {
  const candidate =
    product?.category?.categorySlug || product?.categorySlug || "all";
  return toSlug(candidate) || "all";
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

export function getProductInventoryCount(product = {}) {
  const topLevelQuantity = Number(product?.quantity || 0);
  const attributeQuantity = Array.isArray(product?.productAttributes)
    ? product.productAttributes.reduce(
        (total, attribute) =>
          total + Math.max(0, Number(attribute?.quantity || 0)),
        0,
      )
    : 0;

  return Math.max(0, topLevelQuantity, attributeQuantity);
}

function getPodOccasionEntries(product = {}) {
  const occasions = [];
  for (const attr of getProductAttributes(product)) {
    const defaultDesigns = Array.isArray(attr?.defaultDesigns)
      ? attr.defaultDesigns
      : [];
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
  { color = "", size = "", scent = "" } = {},
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
  limit = 6,
) {
  const printifyImages = getPrintifyImages(product);
  const allImages = rankPodGalleryImages(product, printifyImages, limit);
  if (!printifyImages.length) return allImages.slice(0, limit);

  const matchingVariantIds = new Set(
    getMatchingPrintifyVariantIds(product, { color, size, scent }),
  );
  let filtered = [];

  if (matchingVariantIds.size > 0) {
    filtered = printifyImages
      .filter((image) => {
        const variantIds = Array.isArray(image?.variant_ids)
          ? image.variant_ids.map((value) => `${value ?? ""}`.trim())
          : [];
        return variantIds.some((variantId) =>
          matchingVariantIds.has(variantId),
        );
      })
      .filter(Boolean);
  }

  if (!filtered.length && color) {
    const colorOnlyVariantIds = new Set(
      getMatchingPrintifyVariantIds(product, { color }),
    );
    if (colorOnlyVariantIds.size > 0) {
      filtered = printifyImages
        .filter((image) => {
          const variantIds = Array.isArray(image?.variant_ids)
            ? image.variant_ids.map((value) => `${value ?? ""}`.trim())
            : [];
          return variantIds.some((variantId) =>
            colorOnlyVariantIds.has(variantId),
          );
        })
        .filter(Boolean);
    }
  }

  if (filtered.length) {
    return rankPodGalleryImages(product, filtered, limit).slice(0, limit);
  }

  return allImages.slice(0, limit);
}

function getVariantValueIdsByOptionName(product = {}, optionName = "") {
  const options = Array.isArray(product?.printifyProductDetails?.options)
    ? product.printifyProductDetails.options
    : [];
  return options
    .filter((option) =>
      normalizeToken(option?.name).includes(normalizeToken(optionName)),
    )
    .flatMap((option) =>
      Array.isArray(option?.values)
        ? option.values
            .map((value) => `${value?.title || ""}`.trim())
            .filter(Boolean)
        : [],
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
        }),
      );
    }
  }

  return uniqueStrings(combinations);
}

export function buildStandardQueryCombinations(product = {}) {
  if (isPodProduct(product)) return [];

  const combinations = getProductAttributes(product).map((attr) =>
    buildPodSelectionQuery({
      color: `${attr?.color || ""}`.trim(),
      size: `${attr?.size || ""}`.trim(),
      scent: `${attr?.scent || ""}`.trim(),
    }),
  );

  return uniqueStrings(combinations);
}
