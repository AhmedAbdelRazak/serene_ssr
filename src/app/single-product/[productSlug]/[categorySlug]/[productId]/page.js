import ProductRouteClient from "@/components/public/routes/ProductRouteClient";
import JsonLd from "@/components/seo/JsonLd";
import { getProductById } from "@/lib/api";
import {
  buildProductPath,
  getPrimaryProductImage,
  getProductDescription,
  getProductDisplayName,
} from "@/lib/product-helpers";
import { getSelectedStandardOffer } from "@/lib/product-offer";
import {
  sanitizeStandardProductRoute,
  serializeComparableSearchParams,
} from "@/lib/product-route-url";
import { createPublicProductBootstrap } from "@/lib/public-product";
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

function buildVariantLabel({ color = "", size = "", scent = "" } = {}) {
  return [color, size, scent].filter(Boolean).join(" / ");
}

function buildVariantProperties({ color = "", size = "", scent = "" } = {}) {
  return [
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
  ].filter(Boolean);
}

function buildVariesBy(selections = []) {
  const colors = new Set();
  const sizes = new Set();

  for (const selection of selections) {
    if (selection?.color) colors.add(selection.color);
    if (selection?.size) sizes.add(selection.size);
  }

  return [
    colors.size > 1 ? "https://schema.org/color" : "",
    sizes.size > 1 ? "https://schema.org/size" : "",
  ].filter(Boolean);
}

function buildStandardVariantSchemas(
  product = {},
  canonicalPath = "",
  title = "",
  description = "",
) {
  const attributes = Array.isArray(product?.productAttributes)
    ? product.productAttributes
    : [];
  const variants = [];
  const seenUrls = new Set();

  for (const attribute of attributes) {
    const selection = {
      color: `${attribute?.color || ""}`.trim(),
      size: `${attribute?.size || ""}`.trim(),
      scent: `${attribute?.scent || ""}`.trim(),
    };
    const params = new URLSearchParams();
    if (selection.color) params.set("color", selection.color);
    if (selection.size) params.set("size", selection.size);
    if (selection.scent) params.set("scent", selection.scent);
    const variantPath = params.toString()
      ? `${canonicalPath}?${params.toString()}`
      : canonicalPath;
    if (!variantPath || seenUrls.has(variantPath)) continue;
    seenUrls.add(variantPath);

    const offer = getSelectedStandardOffer(product, selection);
    const variationLabel = buildVariantLabel(selection);
    variants.push(
      productVariantSchema({
        name: variationLabel ? `${title} - ${variationLabel}` : title,
        description: variationLabel
          ? `${description} This variation reflects ${variationLabel.toLowerCase()}.`
          : description,
        image: getPrimaryProductImage(product, selection),
        price: offer.price,
        url: absoluteUrl(variantPath),
        availability: offer.availabilityUrl,
        sku: offer.sku,
        mpn: offer.mpn,
        itemGroupId: offer.itemGroupId,
        additionalProperty: buildVariantProperties(selection),
      }),
    );
  }

  return variants;
}

export async function generateMetadata({ params, searchParams }) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  try {
    const product = await getProductById(resolvedParams?.productId, {
      revalidate: 120,
    });
    const routeState = sanitizeStandardProductRoute(
      product,
      resolvedSearchParams,
    );
    const name = getProductDisplayName(product);
    const description = getProductDescription(product);
    const selection = routeState.selection;
    const variationLabel = buildVariantLabel(selection);
    const image = getPrimaryProductImage(product, selection);
    const canonicalPath = buildProductPath(product);
    return createMetadata({
      title: variationLabel
        ? `${name} | ${variationLabel} | Serene Jannat`
        : `${name} | Serene Jannat`,
      description: variationLabel
        ? `${description} This variation reflects ${variationLabel.toLowerCase()}. Additional options may be available on the product page.`
        : description,
      pathname: canonicalPath,
      image,
      keywords: [
        name,
        resolvedParams?.categorySlug,
        "shop",
        selection.color,
        selection.size,
        selection.scent,
      ].filter(Boolean),
    });
  } catch {
    return createMetadata({
      title: "Product",
      description: "Product details page.",
      pathname: `/single-product/${resolvedParams?.productSlug || ""}/${
        resolvedParams?.categorySlug || ""
      }/${resolvedParams?.productId || ""}`,
      noindex: true,
    });
  }
}

export default async function SingleProductPage({ params, searchParams }) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  let product = null;
  try {
    product = await getProductById(resolvedParams?.productId, {
      revalidate: 90,
    });
  } catch {}

  if (!product) {
    notFound();
  }

  const routeState = sanitizeStandardProductRoute(
    product,
    resolvedSearchParams,
  );
  const selection = routeState.selection;
  const title = getProductDisplayName(product);
  const description = getProductDescription(product);
  const variationLabel = buildVariantLabel(selection);
  const image = getPrimaryProductImage(product, selection);
  const bootstrapProduct = createPublicProductBootstrap(product);
  const canonicalPath = buildProductPath(product);
  const routeQuery = routeState.routeSearchParams.toString();
  const routeUrl = routeQuery
    ? `${canonicalPath}?${routeQuery}`
    : canonicalPath;
  const requestPath = `/single-product/${resolvedParams?.productSlug || ""}/${
    resolvedParams?.categorySlug || ""
  }/${resolvedParams?.productId || ""}`;

  if (
    requestPath !== canonicalPath ||
    serializeComparableSearchParams(resolvedSearchParams) !==
      serializeComparableSearchParams(routeState.routeSearchParams)
  ) {
    permanentRedirect(routeUrl);
  }

  const selectedOffer = getSelectedStandardOffer(product, selection);
  const canonicalUrl = absoluteUrl(canonicalPath);
  const schema = productSchema({
    name: variationLabel ? `${title} - ${variationLabel}` : title,
    description: variationLabel
      ? `${description} This product variation reflects ${variationLabel.toLowerCase()}.`
      : description,
    image,
    price: selectedOffer.price,
    url: canonicalUrl,
    availability: selectedOffer.availabilityUrl,
    sku: selectedOffer.sku,
    mpn: selectedOffer.mpn,
    itemGroupId: selectedOffer.itemGroupId,
  });
  const variantSchemas = buildStandardVariantSchemas(
    product,
    canonicalPath,
    title,
    description,
  );
  const ratings = Array.isArray(product?.ratings) ? product.ratings : [];
  if (ratings.length > 0) {
    const ratingValue =
      ratings.reduce((sum, rating) => sum + Number(rating?.star || 0), 0) /
      ratings.length;
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: Number(ratingValue.toFixed(1)),
      reviewCount: ratings.length,
    };
  }
  schema.additionalProperty = buildVariantProperties(selection);

  const productGroup =
    variantSchemas.length > 1
      ? productGroupSchema({
          name: title,
          description,
          url: canonicalUrl,
          image: getPrimaryProductImage(product),
          groupId: selectedOffer.itemGroupId,
          variesBy: buildVariesBy(
            (Array.isArray(product?.productAttributes)
              ? product.productAttributes
              : []
            ).map((attribute) => ({
              color: `${attribute?.color || ""}`.trim(),
              size: `${attribute?.size || ""}`.trim(),
            })),
          ),
          hasVariant: variantSchemas,
        })
      : null;

  const breadcrumbs = breadcrumbSchema([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Our Products", url: absoluteUrl("/our-products") },
    { name: title, url: canonicalUrl },
  ]);

  const initialRouteData = {
    type: "standard-product",
    productSlug: resolvedParams?.productSlug || "",
    categorySlug: resolvedParams?.categorySlug || "",
    product: bootstrapProduct,
    title,
    description,
    price: selectedOffer.price,
    image,
    selection,
    canonicalPath,
    availabilityLabel: selectedOffer.availabilityLabel,
    hydrateProductOnMount: true,
  };

  return (
    <>
      <JsonLd data={schema} />
      <JsonLd data={productGroup} />
      <JsonLd data={breadcrumbs} />
      <ProductRouteClient initialRouteData={initialRouteData} />
    </>
  );
}
