import HomeRouteClient from "@/components/public/routes/HomeRouteClient";
import {
	getCategoriesAndSubcategories,
	getSpecificProducts,
	getWebsiteSetupData,
} from "@/lib/api";
import { preload } from "react-dom";
import { createMetadata } from "@/lib/seo";
import { getCloudinaryOptimizedUrl } from "@/legacy_frontend/utils/image";

export const revalidate = 300;

export const metadata = createMetadata({
	title: "Serene Jannat | Personalized Gifts, Print On Demand, and Home Decor",
	description:
		"Discover featured products, new arrivals, and custom design gifts. Personalize in seconds and shop with confidence.",
	pathname: "/",
});

function getHomeHeroAsset(websiteSetup = null) {
	const heroUrl = `${websiteSetup?.homeMainBanners?.[0]?.url || ""}`.trim();
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
		const hero1200 = getCloudinaryOptimizedUrl(heroUrl, {
			width: 1200,
			quality: "auto",
		});
		const hero1600 = getCloudinaryOptimizedUrl(heroUrl, {
			width: 1600,
			quality: "auto",
		});

		return {
			preloadHref: hero1200,
			src: hero480,
			srcSet: [
				`${hero480} 480w`,
				`${hero768} 768w`,
				`${hero1200} 1200w`,
				`${hero1600} 1600w`,
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

	return (
		<>
			<HomeRouteClient initialRouteData={initialRouteData} />
		</>
	);
}
