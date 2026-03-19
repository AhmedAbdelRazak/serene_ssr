import PodProductRouteClient from "@/components/public/routes/PodProductRouteClient";
import JsonLd from "@/components/seo/JsonLd";
import { getProductById, getWebsiteSetupData } from "@/lib/api";
import {
  getPrimaryProductImage,
  getPodOccasions,
  getPodVariantSelections,
  getProductDescription,
  getProductDisplayName,
  getProductSlug,
} from "@/lib/product-helpers";
import { getSelectedPodOffer } from "@/lib/product-offer";
import {
  normalizePodProduct,
  resolveInitialPodVariantSelection,
} from "@/lib/pod-product";
import {
  sanitizePodProductRoute,
  serializeComparableSearchParams,
} from "@/lib/product-route-url";
import {
  breadcrumbSchema,
  createMetadata,
  productGroupSchema,
  productSchema,
  productVariantSchema,
} from "@/lib/seo";
import { absoluteUrl } from "@/lib/config";
import { notFound, permanentRedirect } from "next/navigation";

export const revalidate = 300;

function parseSegments(segments = []) {
  if (!Array.isArray(segments) || segments.length === 0) return null;
  if (segments.length === 1) {
    return {
      productId: segments[0],
      productSlug: "",
      extraSegments: [],
    };
  }
  return {
    productSlug: segments[0],
    productId: segments[1],
    extraSegments: segments.slice(2),
  };
}

function buildVariantLabel({
  occasion = "",
  color = "",
  size = "",
  scent = "",
} = {}) {
  return [occasion, color, size, scent].filter(Boolean).join(" / ");
}

function buildPodCanonicalSearchParams(selection = {}) {
  const params = new URLSearchParams();
  if (selection?.occasion) {
    params.set("occasion", selection.occasion);
  }
  return params;
}

function buildPodVariantProperties({
  occasion = "",
  color = "",
  size = "",
  scent = "",
  includeCustomization = true,
} = {}) {
  return [
    occasion && {
      "@type": "PropertyValue",
      name: "Occasion",
      value: occasion,
    },
    color && {
      "@type": "PropertyValue",
      name: "Color",
      value: color,
    },
    size && {
      "@type": "PropertyValue",
      name: "Size",
      value: size,
    },
    scent && {
      "@type": "PropertyValue",
      name: "Scent",
      value: scent,
    },
    includeCustomization && {
      "@type": "PropertyValue",
      name: "Customization",
      value:
        "Customers can further personalize the final product on the product page.",
    },
  ].filter(Boolean);
}

function buildPodVariesBy(selection = {}, variantSelections = []) {
  if (!selection?.occasion) return [];

  const colors = new Set();
  const sizes = new Set();

  for (const variant of variantSelections) {
    if (variant?.color) colors.add(variant.color);
    if (variant?.size) sizes.add(variant.size);
  }

  return [
    colors.size > 1 ? "https://schema.org/color" : "",
    sizes.size > 1 ? "https://schema.org/size" : "",
  ].filter(Boolean);
}

function buildPodVariantSchemas(
  product = {},
  canonicalPath = "",
  title = "",
  description = "",
  selection = {},
) {
  const variants = [];
  const seenPaths = new Set();

  if (selection?.occasion) {
    for (const variantSelection of getPodVariantSelections(product)) {
      const variant = {
        occasion: selection.occasion,
        color: `${variantSelection?.color || ""}`.trim(),
        size: `${variantSelection?.size || ""}`.trim(),
        scent: `${variantSelection?.scent || ""}`.trim(),
      };
      const params = new URLSearchParams();
      params.set("occasion", variant.occasion);
      if (variant.color) params.set("color", variant.color);
      if (variant.size) params.set("size", variant.size);
      if (variant.scent) params.set("scent", variant.scent);
      const variantPath = `${canonicalPath}?${params.toString()}`;
      if (seenPaths.has(variantPath)) continue;
      seenPaths.add(variantPath);

      const offer = getSelectedPodOffer(product, variant);
      const label = buildVariantLabel(variant);
      variants.push(
        productVariantSchema({
          name: label ? `${title} - ${label}` : `${variant.occasion} ${title}`,
          description: `${description} Personalized for ${variant.occasion}. Customize the final design on the product page.`,
          image: getPrimaryProductImage(product, variant),
          price: offer.price,
          url: absoluteUrl(variantPath),
          availability: offer.availabilityUrl,
          sku: offer.sku,
          mpn: offer.mpn,
          itemGroupId: offer.itemGroupId,
          additionalProperty: buildPodVariantProperties(variant),
        }),
      );
    }
    return variants;
  }

  for (const occasion of getPodOccasions(product)) {
    const safeOccasion = `${occasion || ""}`.trim();
    if (!safeOccasion) continue;
    const params = new URLSearchParams();
    params.set("occasion", safeOccasion);
    const variantPath = `${canonicalPath}?${params.toString()}`;
    if (seenPaths.has(variantPath)) continue;
    seenPaths.add(variantPath);

    const variant = { occasion: safeOccasion };
    const offer = getSelectedPodOffer(product, variant);
    variants.push(
      productVariantSchema({
        name: `${safeOccasion} ${title}`,
        description: `${description} Personalized for ${safeOccasion}. Customize the final design on the product page.`,
        image: getPrimaryProductImage(product, variant),
        price: offer.price,
        url: absoluteUrl(variantPath),
        availability: offer.availabilityUrl,
        sku: offer.sku,
        mpn: offer.mpn,
        itemGroupId: offer.itemGroupId,
        additionalProperty: buildPodVariantProperties(variant),
      }),
    );
  }

  return variants;
}

function buildPodSeoKeywords(name = "", selection = {}) {
  const safeName = `${name || ""}`.trim();
  const occasion = `${selection?.occasion || ""}`.trim();
  const color = `${selection?.color || ""}`.trim();
  const size = `${selection?.size || ""}`.trim();
  const scent = `${selection?.scent || ""}`.trim();
  const keywords = [
    "custom gift",
    "personalized gift",
    "print on demand",
    safeName,
    occasion && `${occasion} gift`,
    occasion && safeName && `${occasion} ${safeName}`,
    occasion && safeName && `personalized ${occasion} ${safeName}`,
    size && safeName && `${size} ${safeName}`,
    color && safeName && `${color} ${safeName}`,
    scent && safeName && `${scent} ${safeName}`,
  ];
  return keywords.filter(Boolean);
}

export async function generateMetadata({ params, searchParams }) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const parsed = parseSegments(resolvedParams?.segments || []);
  if (!parsed?.productId) {
    return createMetadata({
      title: "Custom Gift Product",
      description: "Personalized print-on-demand product details.",
      pathname: "/custom-gifts",
      noindex: true,
    });
  }

  try {
    const product = await getProductById(parsed.productId, { revalidate: 120 });
    const name = getProductDisplayName(product);
    const description = getProductDescription(product);
    const routeState = sanitizePodProductRoute(product, resolvedSearchParams);
    const selection = routeState.selection;
    const variationLabel = buildVariantLabel(selection);
    const image = getPrimaryProductImage(product, selection);
    const canonicalSlug = getProductSlug(product);
    const path = `/custom-gifts/${canonicalSlug}/${parsed.productId}`;
    const canonicalSearchParams = buildPodCanonicalSearchParams(selection);
    const variantSuffix = [selection.color, selection.size, selection.scent]
      .filter(Boolean)
      .join(" / ");
    const title = selection.occasion
      ? `${selection.occasion} ${name}${
          variantSuffix ? ` | ${variantSuffix}` : ""
        } | Personalized Gift`
      : variationLabel
        ? `${name} | ${variationLabel} | Personalized Gift`
        : `${name} | Personalized Gift`;
    const descriptionSuffix = selection.occasion
      ? ` Customize this ${name.toLowerCase()} for ${selection.occasion.toLowerCase()} with available color, size, and scent options on the product page.`
      : variationLabel
        ? ` Customize this gift further on the product page after choosing ${variationLabel.toLowerCase()}.`
        : " Customize this gift further on the product page with available occasion, color, size, and scent options.";
    return createMetadata({
      title,
      description: `${description}${descriptionSuffix}`,
      pathname: path,
      searchParams: canonicalSearchParams.toString()
        ? canonicalSearchParams
        : null,
      image,
      keywords: buildPodSeoKeywords(name, selection),
      noindex: Boolean(selection.name),
    });
  } catch {
    return createMetadata({
      title: "Custom Gift Product",
      description: "Personalized print-on-demand product details.",
      pathname: "/custom-gifts",
      noindex: true,
    });
  }
}

export default async function PodProductPage({ params, searchParams }) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const parsed = parseSegments(resolvedParams?.segments || []);
  if (!parsed?.productId) {
    notFound();
  }

  const [productResult, websiteSetupResult] = await Promise.allSettled([
    getProductById(parsed.productId, { revalidate: 90 }),
    getWebsiteSetupData({ revalidate: 1800 }),
  ]);
  const product =
    productResult.status === "fulfilled" ? productResult.value : null;
  const websiteSetup =
    websiteSetupResult.status === "fulfilled" ? websiteSetupResult.value : null;

  if (!product) {
    notFound();
  }

  const title = getProductDisplayName(product);
  const description = getProductDescription(product);
  const routeState = sanitizePodProductRoute(product, resolvedSearchParams);
  const selection = routeState.selection;
  const variationLabel = buildVariantLabel(selection);
  const image = getPrimaryProductImage(product, selection);
  const slug = getProductSlug(product);
  const normalizedProduct = normalizePodProduct(product);
  const initialVariantSelection = resolveInitialPodVariantSelection(
    normalizedProduct,
    selection,
  );
  const canonicalPath = `/custom-gifts/${slug}/${parsed.productId}`;
  const routeQuery = routeState.routeSearchParams.toString();
  const routeUrl = routeQuery
    ? `${canonicalPath}?${routeQuery}`
    : canonicalPath;
  const requestPath = `/custom-gifts/${(resolvedParams?.segments || []).join("/")}`;

  if (
    requestPath !== canonicalPath ||
    serializeComparableSearchParams(resolvedSearchParams) !==
      serializeComparableSearchParams(routeState.routeSearchParams)
  ) {
    permanentRedirect(routeUrl);
  }

  const selectedOffer = getSelectedPodOffer(product, initialVariantSelection);
  const canonicalSearchParams = buildPodCanonicalSearchParams(selection);
  const canonicalQuery = canonicalSearchParams.toString();
  const canonicalUrl = absoluteUrl(
    canonicalQuery ? `${canonicalPath}?${canonicalQuery}` : canonicalPath,
  );
  const schema = productSchema({
    name: variationLabel ? `${title} - ${variationLabel}` : title,
    description: selection.occasion
      ? `${description} Personalized for ${selection.occasion}. Customize the final design on the product page.`
      : `${description} Customize the final design on the product page.`,
    image,
    price: selectedOffer.price,
    url: canonicalUrl,
    availability: selectedOffer.availabilityUrl,
    sku: selectedOffer.sku,
    mpn: selectedOffer.mpn,
    itemGroupId: selectedOffer.itemGroupId,
  });
  schema.additionalProperty = buildPodVariantProperties(selection);

  const variantSchemas = buildPodVariantSchemas(
    product,
    canonicalPath,
    title,
    description,
    selection,
  );
  const productGroup =
    variantSchemas.length > 0
      ? productGroupSchema({
          name: title,
          description,
          url: canonicalUrl,
          image: getPrimaryProductImage(product, selection),
          groupId: selectedOffer.itemGroupId,
          variesBy: buildPodVariesBy(
            selection,
            getPodVariantSelections(product),
          ),
          hasVariant: variantSchemas,
        })
      : null;

  const breadcrumbs = breadcrumbSchema([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Custom Gifts", url: absoluteUrl("/custom-gifts") },
    { name: title, url: canonicalUrl },
  ]);

  const initialRouteData = {
    type: "pod-product",
    websiteSetup,
    productId: parsed.productId,
    productSlug: slug,
    title,
    price: selectedOffer.price,
    image,
    selection: {
      occasion: selection.occasion,
      name: selection.name,
      color: initialVariantSelection.color,
      size: initialVariantSelection.size,
      scent: initialVariantSelection.scent,
    },
    product: normalizedProduct,
  };

  return (
    <>
      <JsonLd data={schema} />
      <JsonLd data={productGroup} />
      <JsonLd data={breadcrumbs} />
      <PodProductRouteClient initialRouteData={initialRouteData} />
    </>
  );
}
