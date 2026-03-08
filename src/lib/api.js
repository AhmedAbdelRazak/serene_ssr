import { cache } from "react";
import { API_BASE_URL } from "./config";

function toApiPath(path = "") {
	const safePath = `${path || ""}`;
	return safePath.startsWith("/") ? safePath : `/${safePath}`;
}

async function fetchJson(
	path,
	{ revalidate = 300, cacheMode = "force-cache", timeoutMs = 15000 } = {}
) {
	const url = `${API_BASE_URL}${toApiPath(path)}`;
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

	let response;
	try {
		response = await fetch(url, {
			method: "GET",
			headers: {
				Accept: "application/json",
			},
			next: { revalidate },
			cache: cacheMode,
			signal: controller.signal,
		});
	} finally {
		clearTimeout(timeoutId);
	}

	if (!response.ok) {
		const body = await response.text().catch(() => "");
		throw new Error(
			`API request failed (${response.status}) for ${url}${
				body ? ` | ${body.slice(0, 180)}` : ""
			}`
		);
	}

	const fallbackResponse =
		typeof response.clone === "function" ? response.clone() : null;
	try {
		return await response.json();
	} catch (error) {
		const body = await fallbackResponse?.text?.().catch(() => "");
		throw new Error(
			`Invalid JSON payload for ${url}${
				body ? ` | ${body.slice(0, 180)}` : ""
			}${error?.message ? ` | ${error.message}` : ""}`
		);
	}
}

export const getSpecificProducts = cache(
	async ({
		featured = 0,
		newArrivals = 0,
		customDesigns = 0,
		sortByRate = 0,
		offers = 0,
		records = 10,
		skip = 0,
		storeId = "",
		revalidate = 300,
	} = {}) => {
		const params = new URLSearchParams();
		if (Number(skip) > 0) params.set("skip", String(skip));
		if (storeId) params.set("storeId", storeId);
		const query = params.toString();
		const suffix = query ? `?${query}` : "";
		return fetchJson(
			`/specific/products/${featured}/${newArrivals}/${customDesigns}/${sortByRate}/${offers}/${records}${suffix}`,
			{ revalidate }
		);
	}
);

export const getFilteredProducts = cache(
	async ({
		filters = "all",
		page = 1,
		records = 30,
		revalidate = 180,
		cacheMode = "force-cache",
	} = {}) => {
		return fetchJson(
			`/products/${encodeURIComponent(filters || "all")}/${page}/${records}`,
			{ revalidate, cacheMode }
		);
	}
);

export async function getPodProducts({ revalidate = 180 } = {}) {
	return fetchJson("/products/pod/print-on-demand-products", { revalidate });
}

export const getProductById = cache(async (productId, { revalidate = 300 } = {}) => {
	if (!productId) throw new Error("productId is required");
	return fetchJson(`/product/${productId}`, { revalidate });
});

export const getSingleProductBySlug = cache(
	async ({ productSlug, categorySlug, productId, revalidate = 300 } = {}) => {
		if (!productSlug || !categorySlug || !productId) {
			throw new Error("productSlug, categorySlug, and productId are required");
		}
		return fetchJson(`/single-product/${productSlug}/${categorySlug}/${productId}`, {
			revalidate,
		});
	}
);

export const getCategoriesAndSubcategories = cache(async ({ revalidate = 1800 } = {}) => {
	return fetchJson("/product/categories/subcategories", { revalidate });
});

export const getAllProductsForSeo = cache(
	async ({ maxPages = 200, records = 200, revalidate = 1800 } = {}) => {
		const safeRecords = Math.max(10, Number(records) || 200);
		const firstPage = await fetchJson(`/seo/products/1/${safeRecords}`, {
			revalidate,
			cacheMode: "no-store",
		});
		const firstProducts = Array.isArray(firstPage?.products)
			? firstPage.products
			: [];
		const totalRecords = Number(firstPage?.totalRecords || firstProducts.length || 0);
		const totalPages = Math.min(
			maxPages,
			Math.max(1, Math.ceil(totalRecords / safeRecords))
		);

		if (totalPages <= 1) return firstProducts;

		const extraProducts = [];
		const batchSize = 6;
		for (let page = 2; page <= totalPages; page += batchSize) {
			const currentBatch = [];
			for (
				let currentPage = page;
				currentPage < page + batchSize && currentPage <= totalPages;
				currentPage += 1
			) {
				currentBatch.push(
					fetchJson(`/seo/products/${currentPage}/${safeRecords}`, {
						revalidate,
						cacheMode: "no-store",
					})
				);
			}

			const settled = await Promise.allSettled(currentBatch);
			for (const entry of settled) {
				if (entry.status !== "fulfilled") continue;
				const pageProducts = Array.isArray(entry.value?.products)
					? entry.value.products
					: [];
				if (pageProducts.length) {
					extraProducts.push(...pageProducts);
				}
			}
		}

		return [...firstProducts, ...extraProducts];
	}
);
