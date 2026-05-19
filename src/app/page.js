import HomeRouteClient from "@/components/public/routes/HomeRouteClient";
import SeoCrawlSupport from "@/components/seo/SeoCrawlSupport";
import {
	getCategoriesAndSubcategories,
	getSpecificProducts,
	getWebsiteSetupData,
} from "@/lib/api";
import { preload } from "react-dom";
import { createMetadata } from "@/lib/seo";
import { getCloudinaryOptimizedUrl } from "@/legacy_frontend/utils/image";
import { buildProductPath, getProductDisplayName } from "@/lib/product-helpers";

export const revalidate = 300;

export const metadata = createMetadata({
	title: "Serene Jannat | Personalized Gifts, Print On Demand, and Home Decor",
	description:
		"Discover featured products, new arrivals, and custom design gifts. Personalize in seconds and shop with confidence.",
	pathname: "/",
});

function getHomeHeroAsset(websiteSetup = null) {
	const heroUrl = `${
		websiteSetup?.homeMainBanners?.[0]?.cloudinary_url ||
		websiteSetup?.homeMainBanners?.[0]?.cloudinaryUrl ||
		websiteSetup?.homeMainBanners?.[0]?.url ||
		""
	}`.trim();
	if (!heroUrl) return null;

	if (heroUrl.includes("res.cloudinary.com")) {
		const hero480 = getCloudinaryOptimizedUrl(heroUrl, {
			width: 480,
			quality: "auto:eco",
		});
		const hero768 = getCloudinaryOptimizedUrl(heroUrl, {
			width: 768,
			quality: "auto:eco",
		});
		const hero960 = getCloudinaryOptimizedUrl(heroUrl, {
			width: 960,
			quality: "auto:good",
		});
		const hero1280 = getCloudinaryOptimizedUrl(heroUrl, {
			width: 1280,
			quality: "auto:good",
		});

		return {
			preloadHref: hero960,
			src: hero480,
			srcSet: [
				`${hero480} 480w`,
				`${hero768} 768w`,
				`${hero960} 960w`,
				`${hero1280} 1280w`,
			].join(", "),
			sizes: "100vw",
		};
	}

	return {
		preloadHref: heroUrl,
		src: heroUrl,
		srcSet: "",
		sizes: "100vw",
	};
}

function preloadHomeHero(heroAsset = null) {
	if (!heroAsset?.preloadHref) return;

	preload(heroAsset.preloadHref, {
		as: "image",
		...(heroAsset.srcSet
			? {
					imageSrcSet: heroAsset.srcSet,
					imageSizes: heroAsset.sizes || "100vw",
				}
			: {}),
		fetchPriority: "high",
	});
}

function buildHomeSeoLinks({
	categories = [],
	featuredProducts = [],
	newArrivalProducts = [],
	customDesignProducts = [],
} = {}) {
	const links = [
		{ href: "/our-products", label: "Shop all products" },
		{ href: "/custom-gifts", label: "Personalized custom gifts" },
		{ href: "/about", label: "About Serene Jannat" },
		{ href: "/contact", label: "Contact us" },
	];

	for (const category of categories.slice(0, 6)) {
		const categoryId = `${category?._id || ""}`.trim();
		const categorySlug = `${category?.categorySlug || ""}`.trim();
		const categoryName = `${category?.categoryName || ""}`.trim();
		if (!categoryId || !categoryName) continue;
		const params = new URLSearchParams();
		params.set("category", categoryId);
		if (categorySlug) params.set("categorySlug", categorySlug);
		links.push({
			href: `/our-products?${params.toString()}`,
			label: categoryName,
		});
	}

	for (const product of [
		...featuredProducts,
		...newArrivalProducts,
		...customDesignProducts,
	].slice(0, 10)) {
		const href = buildProductPath(product);
		const label = getProductDisplayName(product);
		if (href && href !== "/" && label) {
			links.push({ href, label });
		}
	}

	const seen = new Set();
	return links.filter((link) => {
		if (!link.href || seen.has(link.href)) return false;
		seen.add(link.href);
		return true;
	});
}

async function sanitizeHomeCategories(categories = []) {
	if (!Array.isArray(categories) || categories.length === 0) {
		return [];
	}

	const settled = await Promise.allSettled(
		categories.map(async (category) => {
			const thumbnailUrl = `${category?.thumbnail?.[0]?.url || ""}`.trim();
			if (!thumbnailUrl) return category;
			if (!thumbnailUrl.includes("res.cloudinary.com")) return category;

			try {
				const response = await fetch(thumbnailUrl, {
					method: "HEAD",
					next: { revalidate: 1800 },
					cache: "force-cache",
				});
				if (response.ok || (response.status !== 404 && response.status !== 410)) {
					return category;
				}
			} catch {
				return category;
			}

			return {
				...category,
				thumbnail: [],
			};
		})
	);

	return settled.map((entry, index) =>
		entry.status === "fulfilled" ? entry.value : categories[index]
	);
}

export default async function HomePage() {
	const [
		websiteSetupResult,
		categoriesResult,
		featuredProductsResult,
		newArrivalProductsResult,
		customDesignProductsResult,
	] = await Promise.allSettled([
		getWebsiteSetupData({ revalidate: 600 }),
		getCategoriesAndSubcategories({ revalidate: 1800 }),
		getSpecificProducts({ featured: 1, records: 6, lite: true, revalidate: 300 }),
		getSpecificProducts({
			newArrivals: 1,
			records: 6,
			lite: true,
			revalidate: 300,
		}),
		getSpecificProducts({
			customDesigns: 1,
			records: 6,
			lite: true,
			revalidate: 300,
		}),
	]);

	const websiteSetup =
		websiteSetupResult.status === "fulfilled" ? websiteSetupResult.value : null;
	const heroAsset = getHomeHeroAsset(websiteSetup);
	preloadHomeHero(heroAsset);
	const categoriesPayload =
		categoriesResult.status === "fulfilled" ? categoriesResult.value : null;
	const sanitizedCategories = await sanitizeHomeCategories(
		Array.isArray(categoriesPayload?.categories) ? categoriesPayload.categories : []
	);
	const featuredProducts =
		featuredProductsResult.status === "fulfilled" &&
		Array.isArray(featuredProductsResult.value)
			? [...featuredProductsResult.value].sort(
					(a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0)
				)
			: [];
	const newArrivalProducts =
		newArrivalProductsResult.status === "fulfilled" &&
		Array.isArray(newArrivalProductsResult.value)
			? newArrivalProductsResult.value
			: [];
	const customDesignProducts =
		customDesignProductsResult.status === "fulfilled" &&
		Array.isArray(customDesignProductsResult.value)
			? customDesignProductsResult.value
			: [];

	const hasHomeBootstrap =
		Boolean(websiteSetup) ||
		Boolean(Array.isArray(categoriesPayload?.categories) && categoriesPayload.categories.length) ||
		Boolean(featuredProducts.length) ||
		Boolean(newArrivalProducts.length) ||
		Boolean(customDesignProducts.length);

	const initialRouteData = hasHomeBootstrap
		? {
				type: "home",
				websiteSetup,
				categories: sanitizedCategories,
				subcategories: Array.isArray(categoriesPayload?.subcategories)
					? categoriesPayload.subcategories
					: [],
				featuredProducts,
				newArrivalProducts,
				customDesignProducts,
			}
		: null;
	const seoLinks = buildHomeSeoLinks({
		categories: sanitizedCategories,
		featuredProducts,
		newArrivalProducts,
		customDesignProducts,
	});

	return (
		<>
			<HomeRouteClient initialRouteData={initialRouteData} />
			<SeoCrawlSupport
				title='Shop Personalized Gifts, Home Decor, and Custom Designs'
				description='Serene Jannat helps shoppers find handcrafted decor, thoughtful gifts, candles, seasonal pieces, and personalized print-on-demand products for birthdays, anniversaries, holidays, and everyday moments.'
				paragraphs={[
					"Explore curated collections, browse new arrivals, or customize a gift with names, photos, and occasion-ready artwork. Every public page links back to the main shopping paths so customers and crawlers can move through the storefront clearly.",
				]}
				links={seoLinks}
			/>
		</>
	);
}
