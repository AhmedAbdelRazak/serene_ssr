import { getAllProductsForSeo, getColorsCatalog } from "@/lib/api";
import {
  buildPodSelectionQuery,
  buildProductPath,
  findBestProductAttribute,
  getPodGalleryImages,
  getPodOccasions,
  getPodVariantSelections,
  getPrimaryProductImage,
  getProductDescription,
  getProductDisplayName,
  getProductPrice,
  isPodProduct,
  resolveImageUrl,
} from "@/lib/product-helpers";
import { formatPrice } from "@/lib/utils";
import { absoluteXmlUrl, escapeXml, xmlResponse } from "@/lib/xml";

export const revalidate = 1800;
export const dynamic = "force-dynamic";

const FEED_CURRENCY = "USD";
const FEED_SHIPPING_COUNTRY = "US";
const FEED_SHIPPING_SERVICE = "Standard";
const DEFAULT_SHIPPING_PRICE_USD = 0;
const MAX_FEED_IDENTIFIER_LENGTH = 50;
const MAX_FEED_IMAGE_COUNT = 3;
const DEFAULT_CLOUDINARY_FEED_IMAGE =
  "https://res.cloudinary.com/infiniteapps/image/upload/v1723694291/janat/default-image.jpg";

function getCategoryInferenceText(product = {}) {
  const parts = [
    product?.productName,
    product?.printifyProductDetails?.title,
    product?.category?.categoryName,
    product?.gender?.genderName,
    ...(Array.isArray(product?.subcategory)
      ? product.subcategory.map((entry) => entry?.SubcategoryName)
      : []),
  ];

  return parts
    .map((value) => `${value || ""}`.trim().toLowerCase())
    .filter(Boolean)
    .join(" ");
}

function inferGoogleProductCategory(product = {}) {
  const text = getCategoryInferenceText(product);
  if (!text) return "Home & Garden > Decor";
  if (text.includes("mug")) {
    return "Home & Garden > Kitchen & Dining > Tableware > Drinkware > Mugs";
  }
  if (
    text.includes("t-shirt") ||
    text.includes("tee") ||
    text.includes("shirt") ||
    text.includes("hoodie") ||
    text.includes("sweatshirt") ||
    text.includes("pullover")
  ) {
    return "Apparel & Accessories > Clothing";
  }
  if (
    text.includes("tote") ||
    text.includes("weekender") ||
    text.includes("bag")
  ) {
    return "Luggage & Bags > Handbags, Wallets & Cases > Tote Bags";
  }
  if (text.includes("pillow")) {
    return "Home & Garden > Decor > Pillows";
  }
  if (text.includes("candle")) {
    return "Home & Garden > Decor > Candles";
  }
  if (text.includes("magnet")) {
    return "Home & Garden > Decor > Magnets";
  }
  return "Home & Garden > Decor";
}

function isApparelCategory(category = "") {
  return `${category || ""}`.startsWith("Apparel & Accessories > Clothing");
}

function resolveFeedGender(product = {}) {
  const genderToken = `${product?.gender?.genderName || ""}`
    .trim()
    .toLowerCase();
  const text = getCategoryInferenceText(product);

  if (
    genderToken.includes("women") ||
    genderToken.includes("female") ||
    text.includes("women") ||
    text.includes("female") ||
    text.includes("ladies")
  ) {
    return "female";
  }

  if (
    genderToken.includes("men") ||
    genderToken.includes("male") ||
    text.includes("men") ||
    text.includes("male")
  ) {
    return "male";
  }

  return "unisex";
}

function resolveFeedAgeGroup(product = {}) {
  const text = getCategoryInferenceText(product);
  if (
    text.includes("infant") ||
    text.includes("baby") ||
    text.includes("newborn")
  ) {
    return "infant";
  }
  if (
    text.includes("toddler") ||
    text.includes("kid") ||
    text.includes("kids") ||
    text.includes("child") ||
    text.includes("children") ||
    text.includes("youth")
  ) {
    return "kids";
  }
  return "adult";
}

function buildApparelAttributesXml(product = {}, googleCategory = "") {
  if (!isApparelCategory(googleCategory)) return "";
  return `
	<g:gender>${escapeXml(resolveFeedGender(product))}</g:gender>
	<g:age_group>${escapeXml(resolveFeedAgeGroup(product))}</g:age_group>`;
}

function toSafeQueryValue(value = "") {
  if (typeof value === "symbol") return "";
  return `${value ?? ""}`.trim();
}

function toFeedIdToken(value = "") {
  const raw = toSafeQueryValue(value);
  if (!raw) return "";
  return raw
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function hashFeedToken(value = "") {
  let hash = 2166136261;
  for (const char of `${value || ""}`) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function trimFeedToken(value = "", maxLength = MAX_FEED_IDENTIFIER_LENGTH) {
  if (maxLength <= 0) return "";
  const token = toFeedIdToken(value);
  if (!token) return "";
  return token.slice(0, maxLength).replace(/-+$/g, "");
}

function buildScopedFeedIdentifier(primary = "", secondary = "", scope = "") {
  const primaryToken =
    trimFeedToken(primary, 24) || trimFeedToken("item", 24) || "item";
  const secondaryToken = toFeedIdToken(secondary);
  const scopeToken = toFeedIdToken(scope);
  const raw = [primaryToken, secondaryToken, scopeToken]
    .filter(Boolean)
    .join("-");

  if (!raw) return primaryToken;
  if (raw.length <= MAX_FEED_IDENTIFIER_LENGTH) return raw;

  const hash = hashFeedToken(raw).slice(0, 6);
  const secondaryMaxLength =
    MAX_FEED_IDENTIFIER_LENGTH - primaryToken.length - hash.length - 2;
  const compactSecondary = trimFeedToken(
    secondaryToken || scopeToken || "variant",
    secondaryMaxLength,
  );

  return [primaryToken, compactSecondary, hash].filter(Boolean).join("-");
}

function normalizeHexColor(value = "") {
  const raw = toSafeQueryValue(value).toLowerCase();
  if (!raw) return "";
  if (/^#?[0-9a-f]{3,8}$/i.test(raw)) {
    return raw.startsWith("#") ? raw : `#${raw}`;
  }
  return "";
}

function isHexColorValue(value = "") {
  return Boolean(normalizeHexColor(value));
}

function toDisplayLabel(value = "") {
  const raw = toSafeQueryValue(value);
  if (!raw) return "";
  return raw.replace(/\b[a-z]/g, (match) => match.toUpperCase());
}

function buildColorLookup(colors = []) {
  const map = new Map();
  for (const entry of Array.isArray(colors) ? colors : []) {
    const label = toDisplayLabel(entry?.color);
    const hex = normalizeHexColor(entry?.hexa);
    if (!label || !hex) continue;
    map.set(hex, label);
    map.set(hex.replace(/^#/, ""), label);
  }
  return map;
}

function resolvePrintifyColorLabel(product = {}, rawColor = "") {
  const normalizedHex = normalizeHexColor(rawColor);
  const normalizedRaw = toSafeQueryValue(rawColor).toLowerCase();
  if (!normalizedHex && !normalizedRaw) return "";

  const options = Array.isArray(product?.printifyProductDetails?.options)
    ? product.printifyProductDetails.options
    : [];

  for (const option of options) {
    const optionType = toSafeQueryValue(option?.type).toLowerCase();
    const optionName = toSafeQueryValue(option?.name).toLowerCase();
    if (optionType !== "color" && !optionName.includes("color")) continue;

    for (const value of Array.isArray(option?.values) ? option.values : []) {
      const title = toDisplayLabel(value?.title);
      const valueTitle = toSafeQueryValue(value?.title).toLowerCase();
      const valueHexes = Array.isArray(value?.colors)
        ? value.colors.map((entry) => normalizeHexColor(entry)).filter(Boolean)
        : [];

      if (valueTitle && valueTitle === normalizedRaw) {
        return title;
      }
      if (normalizedHex && valueHexes.includes(normalizedHex)) {
        return title;
      }
    }
  }

  return "";
}

function resolveVariantColorLabel(
  product = {},
  rawColor = "",
  colorLookup = new Map(),
) {
  const directLabel = toDisplayLabel(rawColor);
  if (!rawColor) return "";

  const printifyLabel = resolvePrintifyColorLabel(product, rawColor);
  if (printifyLabel) return printifyLabel;

  const normalizedHex = normalizeHexColor(rawColor);
  if (normalizedHex && colorLookup.has(normalizedHex)) {
    return colorLookup.get(normalizedHex) || "";
  }
  if (normalizedHex && colorLookup.has(normalizedHex.replace(/^#/, ""))) {
    return colorLookup.get(normalizedHex.replace(/^#/, "")) || "";
  }

  if (isHexColorValue(rawColor)) {
    return "";
  }

  return directLabel;
}

function extractImageUrls(source) {
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

function uniqueImageUrls(urls = []) {
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

function buildFeedImageSet(
  product = {},
  { attr = null, occasion = "", color = "", size = "", scent = "" } = {},
) {
  const primary = getPrimaryProductImage(product, {
    occasion,
    color,
    size,
    scent,
  });

  const images = cloudinaryOnlyImageUrls([
    toCloudinaryImageUrl(primary),
    ...extractImageUrls(attr?.exampleDesignImage),
    ...extractImageUrls(attr?.productImages),
    ...extractImageUrls(product?.thumbnailImage),
    ...extractImageUrls(product?.productImages),
  ]);

  if (images.length) {
    return images.slice(0, MAX_FEED_IMAGE_COUNT);
  }

  const fallbackImageSet = cloudinaryOnlyImageUrls([
    toCloudinaryImageUrl(
      getPrimaryProductImage(product, {
        occasion,
        color,
        size,
        scent,
      }),
    ),
    ...extractImageUrls(
      findBestProductAttribute(product, { color, size, scent })?.productImages,
    ),
    ...extractImageUrls(product?.thumbnailImage),
  ]);

  if (fallbackImageSet.length) {
    return fallbackImageSet.slice(0, MAX_FEED_IMAGE_COUNT);
  }

  return [DEFAULT_CLOUDINARY_FEED_IMAGE];
}

function buildAdditionalImageXml(imageSet = []) {
  return imageSet
    .slice(1, MAX_FEED_IMAGE_COUNT)
    .map(
      (url) =>
        `<g:additional_image_link>${escapeXml(url)}</g:additional_image_link>`,
    )
    .join("");
}

function toNonNegativeNumber(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return Number(fallback) >= 0 ? Number(fallback) : 0;
  }
  return parsed;
}

function normalizeVariantPrice(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return Number(fallback) > 0 ? Number(fallback) : 0;
  }
  if (Number.isInteger(parsed) && parsed >= 100) {
    return Number((parsed / 100).toFixed(2));
  }
  return parsed;
}

function resolveShippingPriceUsd(product = {}, attr = null) {
  const candidates = [
    attr?.shippingPrice,
    attr?.shipping_price,
    product?.shippingPrice,
    product?.shipping_price,
    product?.shippingFees,
  ];
  for (const candidate of candidates) {
    const parsed = Number(candidate);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed;
    }
  }
  return DEFAULT_SHIPPING_PRICE_USD;
}

function buildShippingXml(product = {}, attr = null) {
  if (product?.shipping === false) return "";
  const shippingPrice = toNonNegativeNumber(
    resolveShippingPriceUsd(product, attr),
    DEFAULT_SHIPPING_PRICE_USD,
  );
  return `<g:shipping>
		<g:country>${escapeXml(FEED_SHIPPING_COUNTRY)}</g:country>
		<g:service>${escapeXml(FEED_SHIPPING_SERVICE)}</g:service>
		<g:price>${escapeXml(formatPrice(shippingPrice, FEED_CURRENCY))}</g:price>
	</g:shipping>`;
}

function buildVariantLink(baseLink = "", selection = {}) {
  const query = buildPodSelectionQuery(selection);
  return query ? `${baseLink}?${query}` : baseLink;
}

function buildFeedDescription(
  baseDescription = "",
  { isPod = false, occasion = "", color = "", size = "", scent = "" } = {},
) {
  const safeDescription = toSafeQueryValue(baseDescription);
  const options = [];
  if (occasion) options.push("occasion");
  if (color) options.push("color");
  if (size) options.push("size");
  if (scent) options.push("scent");

  if (!isPod) {
    if (!options.length) return safeDescription;
    return `${safeDescription} Shoppers can review available ${options.join(
      ", ",
    )} options on the product page before checkout.`;
  }

  const designLead = occasion
    ? `Shown with the ${occasion} design.`
    : "Shown with a customizable design.";
  const customizationLead = options.length
    ? `Shoppers can personalize the design and adjust ${options.join(
        ", ",
      )} on the product page before checkout.`
    : "Shoppers can personalize the design on the product page before checkout.";
  return `${safeDescription} ${designLead} ${customizationLead}`.trim();
}

function buildVariantTitle(name = "", parts = [], customizationNotice = "") {
  const suffix = parts.filter(Boolean).join(" / ");
  if (suffix && customizationNotice) {
    return `${name} - ${suffix} - ${customizationNotice}`;
  }
  if (suffix) return `${name} - ${suffix}`;
  if (customizationNotice) return `${name} - ${customizationNotice}`;
  return name;
}

function buildMerchantVariantTitle(
  name = "",
  { isPod = false, occasion = "", color = "", size = "", scent = "" } = {},
) {
  const safeName = toDisplayLabel(name);
  const variantParts = [color, size, scent].filter(Boolean);
  if (isPod) {
    const base = [occasion, "Personalized", safeName].filter(Boolean).join(" ");
    return variantParts.length ? `${base} - ${variantParts.join(" / ")}` : base;
  }
  return buildVariantTitle(safeName, variantParts, "");
}

function buildCustomLabelXml({
  categoryName = "",
  occasion = "",
  color = "",
  size = "",
  scent = "",
  isPod = false,
} = {}) {
  return [
    categoryName
      ? `<g:custom_label_0>${escapeXml(categoryName)}</g:custom_label_0>`
      : "",
    occasion
      ? `<g:custom_label_1>${escapeXml(occasion)}</g:custom_label_1>`
      : isPod
        ? "<g:custom_label_1>Everyday</g:custom_label_1>"
        : "",
    isPod ? "<g:custom_label_2>print-on-demand</g:custom_label_2>" : "",
    color || scent
      ? `<g:custom_label_3>${escapeXml(color || scent)}</g:custom_label_3>`
      : "",
    size ? `<g:custom_label_4>${escapeXml(size)}</g:custom_label_4>` : "",
  ]
    .filter(Boolean)
    .join("\n\t");
}

function resolveVariantPricing(product = {}, attr = null, variantLike = null) {
  const productBasePrice = Number(product?.price || 0);
  const productEffectivePrice = getProductPrice(product);
  const attrPrice = Number(attr?.price || 0);
  const attrEffectivePrice =
    Number(attr?.priceAfterDiscount || 0) > 0
      ? Number(attr.priceAfterDiscount)
      : attrPrice;
  const variantPrice = normalizeVariantPrice(variantLike?.price, 0);

  const originalPrice =
    attrPrice > 0
      ? attrPrice
      : variantPrice > 0
        ? variantPrice
        : productBasePrice;
  const effectivePrice =
    attrEffectivePrice > 0
      ? attrEffectivePrice
      : variantPrice > 0
        ? variantPrice
        : productEffectivePrice;

  return {
    originalPrice: originalPrice > 0 ? originalPrice : effectivePrice,
    effectivePrice,
  };
}

function resolveAvailability(product = {}, attr = null) {
  const quantity = Number(attr?.quantity ?? product?.quantity ?? 0);
  return quantity > 0 ? "in_stock" : "out_of_stock";
}

function buildPodFeedItems({
  product,
  name,
  baseDescription,
  baseLink,
  brand,
  categoryName,
  googleCategory,
  colorLookup,
}) {
  const occasions = getPodOccasions(product);
  const selections = getPodVariantSelections(product);
  const apparelAttributesXml = buildApparelAttributesXml(
    product,
    googleCategory,
  );
  const effectiveSelections = selections.length
    ? selections
    : [
        {
          variantId: "",
          variantSku: "",
          price: 0,
          token: "default",
          color: "",
          size: "",
          scent: "",
        },
      ];

  return occasions.flatMap((occasion) =>
    effectiveSelections.map((selection, index) => {
      const resolvedColor = resolveVariantColorLabel(
        product,
        selection.color,
        colorLookup,
      );
      const selectedColor =
        resolvedColor ||
        (isHexColorValue(selection.color) ? "" : selection.color);
      const attr = findBestProductAttribute(product, {
        color: selectedColor || selection.color,
        size: selection.size,
        scent: selection.scent,
      });
      const imageSet = buildFeedImageSet(product, {
        attr,
        occasion,
        color: selectedColor || selection.color,
        size: selection.size,
        scent: selection.scent,
      });
      const primaryImage = imageSet[0] || "";
      const additionalImageLinks = buildAdditionalImageXml(imageSet);
      const shippingXml = buildShippingXml(product, attr);
      const { originalPrice, effectivePrice } = resolveVariantPricing(
        product,
        attr,
        selection,
      );
      const availability = resolveAvailability(product, attr);
      const description = buildFeedDescription(baseDescription, {
        isPod: true,
        occasion,
        color: selectedColor,
        size: selection.size,
        scent: selection.scent,
      });
      const title = buildMerchantVariantTitle(name, {
        isPod: true,
        occasion,
        color: selectedColor,
        size: selection.size,
        scent: selection.scent,
      });
      const link = buildVariantLink(baseLink, {
        occasion,
        color: selectedColor || selection.color,
        size: selection.size,
        scent: selection.scent,
      });
      const occasionToken = toFeedIdToken(occasion || "custom") || "custom";
      const variantIdentity =
        selection.variantSku ||
        selection.variantId ||
        selection.token ||
        `${index + 1}`;
      const itemId = buildScopedFeedIdentifier(
        product._id,
        variantIdentity,
        occasionToken,
      );
      const itemGroupId = buildScopedFeedIdentifier(product._id, occasionToken);

      return `<item>
	<g:id>${escapeXml(itemId)}</g:id>
	<g:item_group_id>${escapeXml(itemGroupId)}</g:item_group_id>
	<title>${escapeXml(title)}</title>
	<description>${escapeXml(description)}</description>
	<link>${escapeXml(link)}</link>
	<g:canonical_link>${escapeXml(link)}</g:canonical_link>
	<g:image_link>${escapeXml(primaryImage)}</g:image_link>
	${additionalImageLinks}
	<g:availability>${escapeXml(availability)}</g:availability>
	<g:condition>new</g:condition>
	<g:price>${escapeXml(formatPrice(originalPrice || effectivePrice, FEED_CURRENCY))}</g:price>
	${
    originalPrice > effectivePrice
      ? `<g:sale_price>${escapeXml(
          formatPrice(effectivePrice, FEED_CURRENCY),
        )}</g:sale_price>`
      : ""
  }
	${shippingXml}
	<g:brand>${escapeXml(brand)}</g:brand>
	<g:product_type>${escapeXml(categoryName)}</g:product_type>
	<g:google_product_category>${escapeXml(googleCategory)}</g:google_product_category>
	${buildCustomLabelXml({
    categoryName,
    occasion,
    color: selectedColor,
    size: selection.size,
    scent: selection.scent,
    isPod: true,
  })}
	${apparelAttributesXml}
	${selection.size ? `<g:size>${escapeXml(selection.size)}</g:size>` : ""}
	${selectedColor ? `<g:color>${escapeXml(selectedColor)}</g:color>` : ""}
	${
    selection.variantSku
      ? `<g:mpn>${escapeXml(selection.variantSku)}</g:mpn>`
      : ""
  }
	<g:identifier_exists>false</g:identifier_exists>
</item>`;
    }),
  );
}

function buildStandardFeedItems({
  product,
  name,
  baseDescription,
  baseLink,
  brand,
  categoryName,
  googleCategory,
  colorLookup,
}) {
  const attributes = Array.isArray(product?.productAttributes)
    ? product.productAttributes
    : [];
  const fallbackImage =
    getPrimaryProductImage(product) || buildFeedImageSet(product, {})[0] || "";
  const apparelAttributesXml = buildApparelAttributesXml(
    product,
    googleCategory,
  );

  if (!attributes.length) {
    const effectivePrice = getProductPrice(product);
    const originalPrice =
      Number(product?.price || 0) > 0 ? Number(product.price) : effectivePrice;
    const availability = resolveAvailability(product, null);
    const imageSet = buildFeedImageSet(product, {});
    const primaryImage = imageSet[0] || fallbackImage;
    const description = buildFeedDescription(baseDescription, { isPod: false });
    const additionalImageLinks = buildAdditionalImageXml(imageSet);
    const shippingXml = buildShippingXml(product, null);

    return [
      `<item>
	<g:id>${escapeXml(String(product._id))}</g:id>
	<title>${escapeXml(name)}</title>
	<description>${escapeXml(description)}</description>
	<link>${escapeXml(baseLink)}</link>
	<g:canonical_link>${escapeXml(baseLink)}</g:canonical_link>
	<g:image_link>${escapeXml(primaryImage)}</g:image_link>
	${additionalImageLinks}
	<g:availability>${escapeXml(availability)}</g:availability>
	<g:condition>new</g:condition>
	<g:price>${escapeXml(formatPrice(originalPrice, FEED_CURRENCY))}</g:price>
	${
    originalPrice > effectivePrice
      ? `<g:sale_price>${escapeXml(
          formatPrice(effectivePrice, FEED_CURRENCY),
        )}</g:sale_price>`
      : ""
  }
	${shippingXml}
	<g:brand>${escapeXml(brand)}</g:brand>
	<g:product_type>${escapeXml(categoryName)}</g:product_type>
	<g:google_product_category>${escapeXml(googleCategory)}</g:google_product_category>
	${buildCustomLabelXml({ categoryName })}
	${apparelAttributesXml}
	<g:identifier_exists>false</g:identifier_exists>
</item>`,
    ];
  }

  return attributes.map((attr, index) => {
    const resolvedColor = resolveVariantColorLabel(
      product,
      attr?.color,
      colorLookup,
    );
    const link = buildVariantLink(baseLink, {
      color: resolvedColor || attr?.color,
      size: attr?.size,
      scent: attr?.scent,
    });
    const imageSet = buildFeedImageSet(product, {
      attr,
      color: resolvedColor || attr?.color,
      size: attr?.size,
      scent: attr?.scent,
    });
    const primaryImage = imageSet[0] || fallbackImage;
    const additionalImageLinks = buildAdditionalImageXml(imageSet);
    const shippingXml = buildShippingXml(product, attr);
    const { originalPrice, effectivePrice } = resolveVariantPricing(
      product,
      attr,
      null,
    );
    const availability = resolveAvailability(product, attr);
    const title = buildMerchantVariantTitle(name, {
      color: resolvedColor,
      size: attr?.size,
      scent: attr?.scent,
    });
    const description = buildFeedDescription(baseDescription, {
      isPod: false,
      color: resolvedColor,
      size: attr?.size,
      scent: attr?.scent,
    });
    const variantToken =
      toFeedIdToken(attr?.SubSKU) || toFeedIdToken(attr?.PK) || `${index + 1}`;
    const variantId = buildScopedFeedIdentifier(product._id, variantToken);

    return `<item>
	<g:id>${escapeXml(variantId)}</g:id>
	<g:item_group_id>${escapeXml(String(product._id))}</g:item_group_id>
	<title>${escapeXml(title)}</title>
	<description>${escapeXml(description)}</description>
	<link>${escapeXml(link)}</link>
	<g:canonical_link>${escapeXml(link)}</g:canonical_link>
	<g:image_link>${escapeXml(primaryImage)}</g:image_link>
	${additionalImageLinks}
	<g:availability>${escapeXml(availability)}</g:availability>
	<g:condition>new</g:condition>
	<g:price>${escapeXml(formatPrice(originalPrice || effectivePrice, FEED_CURRENCY))}</g:price>
	${
    originalPrice > effectivePrice
      ? `<g:sale_price>${escapeXml(
          formatPrice(effectivePrice, FEED_CURRENCY),
        )}</g:sale_price>`
      : ""
  }
	${shippingXml}
	<g:brand>${escapeXml(brand)}</g:brand>
	<g:product_type>${escapeXml(categoryName)}</g:product_type>
	<g:google_product_category>${escapeXml(googleCategory)}</g:google_product_category>
	${buildCustomLabelXml({
    categoryName,
    color: resolvedColor,
    size: attr?.size,
    scent: attr?.scent,
  })}
	${apparelAttributesXml}
	${attr?.size ? `<g:size>${escapeXml(attr.size)}</g:size>` : ""}
	${resolvedColor ? `<g:color>${escapeXml(resolvedColor)}</g:color>` : ""}
	${attr?.SubSKU ? `<g:mpn>${escapeXml(attr.SubSKU)}</g:mpn>` : ""}
	<g:identifier_exists>false</g:identifier_exists>
</item>`;
  });
}

export async function GET(request) {
  const toAbsoluteUrl = (path = "/") => absoluteXmlUrl(path, request);

  let products = [];
  let colorLookup = new Map();
  try {
    const [allProducts, colorCatalog] = await Promise.all([
      getAllProductsForSeo({ maxPages: 200, records: 200, revalidate: 1800 }),
      getColorsCatalog({ revalidate: 1800 }).catch(() => []),
    ]);
    products = Array.isArray(allProducts) ? allProducts : [];
    colorLookup = buildColorLookup(colorCatalog);
  } catch {
    products = [];
  }

  const itemsXml = products
    .filter((product) => product?._id)
    .flatMap((product) => {
      const name = getProductDisplayName(product);
      const baseDescription = getProductDescription(product);
      const baseLink = toAbsoluteUrl(buildProductPath(product));
      const brand = product?.brandName || "Serene Jannat";
      const categoryName = product?.category?.categoryName || "Gifts";
      const googleCategory = inferGoogleProductCategory(product);

      if (isPodProduct(product)) {
        return buildPodFeedItems({
          product,
          name,
          baseDescription,
          baseLink,
          brand,
          categoryName,
          googleCategory,
          colorLookup,
        });
      }

      return buildStandardFeedItems({
        product,
        name,
        baseDescription,
        baseLink,
        brand,
        categoryName,
        googleCategory,
        colorLookup,
      });
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
	<title>Serene Jannat Product Feed</title>
	<link>${escapeXml(toAbsoluteUrl("/"))}</link>
	<description>Dynamic Google Merchant feed for Serene Jannat</description>
	${itemsXml}
</channel>
</rss>`;

  return xmlResponse(xml);
}
