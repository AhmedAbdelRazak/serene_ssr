import { POD_OCCASIONS } from "@/lib/pod-occasions";
import {
  getAllProductsForSeo,
  getCategoriesAndSubcategories,
  getFilteredProducts,
} from "@/lib/api";
import {
  buildProductPath,
  getPodGalleryImages,
  getPrimaryProductImage,
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

  for (const occasion of POD_OCCASIONS) {
    const params = new URLSearchParams();
    params.set("occasion", occasion);
    entries.push({
      loc: absoluteUrl(`/custom-gifts?${params.toString()}`, request),
    });
  }

  return entries;
}

export async function getProductSitemapEntries(request) {
  const products = await getAllProductsForSeo({
    maxPages: 200,
    records: 200,
    revalidate,
  });
  return products
    .filter((product) => product?._id)
    .map((product) => ({
      loc: absoluteUrl(buildProductPath(product), request),
      lastmod: product?.updatedAt || product?.createdAt || "",
      images: getProductSitemapImages(product),
    }));
}

export async function getSitemapIndexEntries(request) {
  return [
    { loc: absoluteUrl("/sitemaps/pages.xml", request) },
    { loc: absoluteUrl("/sitemaps/collections.xml", request) },
    { loc: absoluteUrl("/sitemaps/products.xml", request) },
  ];
}
