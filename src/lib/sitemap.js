import { POD_OCCASIONS } from "@/lib/pod-occasions";
import {
  getAllProductsForSeo,
  getCategoriesAndSubcategories,
  getFilteredProducts,
} from "@/lib/api";
import {
  buildPodQueryCombinations,
  buildProductPath,
  buildStandardQueryCombinations,
  getPodGalleryImages,
  getPodOccasions,
  getPrimaryProductImage,
  getProductSlug,
  isPodProduct,
  resolveImageUrl,
} from "@/lib/product-helpers";
import { absoluteXmlUrl, escapeXml } from "@/lib/xml";

export const revalidate = 1800;
export const dynamic = "force-dynamic";
const SHOP_RECORDS_PER_PAGE = 30;
const MAX_PRODUCT_IMAGES = 4;

export const PAGE_SITEMAP_PATHS = [
  "/",
  "/about",
  "/contact",
  "/privacy-policy-terms-conditions",
  "/cookie-policy",
  "/return-refund-policy",
];

function isValidDate(value) {
  if (!value) return false;
  const date = new Date(value);
  return Number.isFinite(date.getTime());
}

function toLastmod(value) {
  return isValidDate(value) ? new Date(value).toISOString() : "";
}

function uniqueUrls(values = []) {
  const seen = new Set();
  const list = [];
  for (const entry of values) {
    const url = `${entry || ""}`.trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    list.push(url);
  }
  return list;
}

function uniqueEntriesByLoc(entries = []) {
  const seen = new Set();
  const list = [];

  for (const entry of Array.isArray(entries) ? entries : []) {
    const loc = `${entry?.loc || ""}`.trim();
    if (!loc || seen.has(loc)) continue;
    seen.add(loc);
    list.push(entry);
  }

  return list;
}

function getLatestSitemapTimestamp(values = []) {
  let latest = 0;

  for (const value of values) {
    if (!isValidDate(value)) continue;
    latest = Math.max(latest, new Date(value).getTime());
  }

  return latest ? new Date(latest).toISOString() : "";
}

function absoluteUrl(path = "/", request) {
  return absoluteXmlUrl(path, request);
}

function buildImageXml(images = []) {
  if (!images.length) return "";
  return images
    .map(
      (imageUrl) =>
        `\n\t<image:image>\n\t\t<image:loc>${escapeXml(
          imageUrl,
        )}</image:loc>\n\t</image:image>`,
    )
    .join("");
}

export function buildUrlsetXml(entries = [], { includeImages = false } = {}) {
  const namespaces = includeImages
    ? ' xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"'
    : "";
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"${namespaces}>\n${entries
    .map((entry) => {
      const lastmod = toLastmod(entry?.lastmod);
      const images = includeImages
        ? uniqueUrls(Array.isArray(entry?.images) ? entry.images : []).slice(
            0,
            MAX_PRODUCT_IMAGES,
          )
        : [];
      return `<url>\n\t<loc>${escapeXml(entry.loc)}</loc>${
        lastmod ? `\n\t<lastmod>${escapeXml(lastmod)}</lastmod>` : ""
      }${images.length ? buildImageXml(images) : ""}\n</url>`;
    })
    .join("\n")}\n</urlset>`;
}

export function buildSitemapIndexXml(entries = []) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries
    .map((entry) => {
      const lastmod = toLastmod(entry?.lastmod);
      return `<sitemap>\n\t<loc>${escapeXml(entry.loc)}</loc>${
        lastmod ? `\n\t<lastmod>${escapeXml(lastmod)}</lastmod>` : ""
      }\n</sitemap>`;
    })
    .join("\n")}\n</sitemapindex>`;
}

function extractStandardProductImages(product = {}) {
  const urls = [];
  const topLevelImages = Array.isArray(product?.images) ? product.images : [];
  for (const image of topLevelImages) {
    const url = resolveImageUrl(image);
    if (url) urls.push(url);
  }
  const attributeImages = Array.isArray(product?.productAttributes)
    ? product.productAttributes.flatMap((attribute) =>
        Array.isArray(attribute?.images) ? attribute.images : [],
      )
    : [];
  for (const image of attributeImages) {
    const url = resolveImageUrl(image);
    if (url) urls.push(url);
  }
  return uniqueUrls(urls);
}

export function getProductSitemapImages(product = {}) {
  if (isPodProduct(product)) {
    return uniqueUrls([
      getPrimaryProductImage(product),
      ...getPodGalleryImages(product, {}, MAX_PRODUCT_IMAGES),
    ]).slice(0, MAX_PRODUCT_IMAGES);
  }
  return uniqueUrls([
    getPrimaryProductImage(product),
    ...extractStandardProductImages(product),
  ]).slice(0, MAX_PRODUCT_IMAGES);
}

function getVariantSitemapImages(product = {}, selection = {}) {
  const primaryImage = getPrimaryProductImage(product, selection);
  const fallbackImages = getProductSitemapImages(product);

  if (isPodProduct(product)) {
    return uniqueUrls([
      primaryImage,
      ...getPodGalleryImages(product, selection, MAX_PRODUCT_IMAGES),
      ...fallbackImages,
    ]).slice(0, MAX_PRODUCT_IMAGES);
  }

  return uniqueUrls([primaryImage, ...fallbackImages]).slice(
    0,
    MAX_PRODUCT_IMAGES,
  );
}

function buildProductQueryCombinations(product = {}) {
  return isPodProduct(product)
    ? buildPodQueryCombinations(product)
    : buildStandardQueryCombinations(product);
}

function parseSelectionQuery(query = "") {
  const params = new URLSearchParams(query);
  return {
    occasion: `${params.get("occasion") || ""}`.trim(),
    color: `${params.get("color") || ""}`.trim(),
    size: `${params.get("size") || ""}`.trim(),
    scent: `${params.get("scent") || ""}`.trim(),
    name: `${params.get("name") || ""}`.trim(),
  };
}

function buildProductSitemapEntriesForProduct(product = {}, request) {
  const basePath = buildProductPath(product);
  if (!basePath || basePath === "/") return [];

  const lastmod = product?.updatedAt || product?.createdAt || "";
  const queries = buildProductQueryCombinations(product);
  const entries = [
    {
      loc: absoluteUrl(basePath, request),
      lastmod,
      images: getVariantSitemapImages(product),
    },
  ];

  for (const query of queries) {
    const safeQuery = `${query || ""}`.trim();
    if (!safeQuery) continue;

    entries.push({
      loc: absoluteUrl(`${basePath}?${safeQuery}`, request),
      lastmod,
      images: getVariantSitemapImages(product, parseSelectionQuery(safeQuery)),
    });
  }

  return entries;
}

export async function getPageSitemapEntries(request) {
  return PAGE_SITEMAP_PATHS.map((path) => ({
    loc: absoluteUrl(path, request),
  }));
}

export async function getCollectionSitemapEntries(request) {
  const entries = [
    { loc: absoluteUrl("/our-products", request) },
    { loc: absoluteUrl("/custom-gifts", request) },
  ];

  const categoriesPayload = await getCategoriesAndSubcategories({
    revalidate,
  }).catch(() => null);
  const categories = Array.isArray(categoriesPayload?.categories)
    ? categoriesPayload.categories
    : [];
  let seoProducts = [];

  try {
    seoProducts = await getAllProductsForSeo({
      maxPages: 200,
      records: 200,
      revalidate,
    });
  } catch {
    seoProducts = [];
  }

  for (const category of categories) {
    const categoryId = `${category?._id || ""}`.trim();
    const categorySlug = `${category?.categorySlug || ""}`.trim();
    if (!categoryId) continue;

    const params = new URLSearchParams();
    params.set("category", categoryId);
    if (categorySlug) params.set("categorySlug", categorySlug);
    const basePath = `/our-products?${params.toString()}`;
    const categoryLastmod =
      category?.updatedAt ||
      category?.createdAt ||
      categoriesPayload?.updatedAt ||
      "";

    entries.push({
      loc: absoluteUrl(basePath, request),
      lastmod: categoryLastmod,
    });

    try {
      const productsPayload = await getFilteredProducts({
        filters: params.toString(),
        page: 1,
        records: SHOP_RECORDS_PER_PAGE,
        revalidate,
      });
      const totalRecords = Number(productsPayload?.totalRecords || 0);
      const totalPages = Math.max(
        1,
        Math.ceil(totalRecords / SHOP_RECORDS_PER_PAGE),
      );
      for (let page = 2; page <= totalPages; page += 1) {
        const pagedParams = new URLSearchParams(params);
        pagedParams.set("page", String(page));
        entries.push({
          loc: absoluteUrl(`/our-products?${pagedParams.toString()}`, request),
          lastmod: categoryLastmod,
        });
      }
    } catch {
      // Keep the canonical category URL even if pagination discovery fails.
    }
  }

  const podProducts = seoProducts.filter((product) => isPodProduct(product));
  const podLastmod = getLatestSitemapTimestamp(
    podProducts.map(
      (product) => product?.updatedAt || product?.createdAt || "",
    ),
  );
  const totalPodPages = Math.max(
    1,
    Math.ceil(podProducts.length / SHOP_RECORDS_PER_PAGE),
  );

  for (let page = 2; page <= totalPodPages; page += 1) {
    const params = new URLSearchParams();
    params.set("page", String(page));
    entries.push({
      loc: absoluteUrl(`/custom-gifts?${params.toString()}`, request),
      lastmod: podLastmod,
    });
  }

  for (const occasion of POD_OCCASIONS) {
    const params = new URLSearchParams();
    params.set("occasion", occasion);
    const occasionProducts = podProducts.filter((product) =>
      getPodOccasions(product).includes(occasion),
    );
    const occasionLastmod = getLatestSitemapTimestamp(
      occasionProducts.map(
        (product) => product?.updatedAt || product?.createdAt || "",
      ),
    );
    entries.push({
      loc: absoluteUrl(`/custom-gifts?${params.toString()}`, request),
      lastmod: occasionLastmod,
    });

    const totalOccasionPages = Math.max(
      1,
      Math.ceil(occasionProducts.length / SHOP_RECORDS_PER_PAGE),
    );
    for (let page = 2; page <= totalOccasionPages; page += 1) {
      const pagedParams = new URLSearchParams(params);
      pagedParams.set("page", String(page));
      entries.push({
        loc: absoluteUrl(`/custom-gifts?${pagedParams.toString()}`, request),
        lastmod: occasionLastmod,
      });
    }
  }

  return uniqueEntriesByLoc(entries);
}

export async function getProductSitemapEntries(request) {
  const products = await getAllProductsForSeo({
    maxPages: 200,
    records: 200,
    revalidate,
  });

  return uniqueEntriesByLoc(
    products
      .filter((product) => product?._id && getProductSlug(product))
      .flatMap((product) =>
        buildProductSitemapEntriesForProduct(product, request),
      ),
  );
}

export async function getSitemapIndexEntries(request) {
  return [
    { loc: absoluteUrl("/sitemaps/pages.xml", request) },
    { loc: absoluteUrl("/sitemaps/collections.xml", request) },
    { loc: absoluteUrl("/sitemaps/products.xml", request) },
  ];
}
