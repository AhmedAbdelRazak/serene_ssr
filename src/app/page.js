import HomeRouteClient from "@/components/public/routes/HomeRouteClient";
import {
	getCategoriesAndSubcategories,
	getSpecificProducts,
	getWebsiteSetupData,
} from "@/lib/api";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
	title: "Serene Jannat | Personalized Gifts, Print On Demand, and Home Decor",
	description:
		"Discover featured products, new arrivals, and custom design gifts. Personalize in seconds and shop with confidence.",
	pathname: "/",
});

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
	const categoriesPayload =
		categoriesResult.status === "fulfilled" ? categoriesResult.value : null;
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

	const initialRouteData = {
		type: "home",
		websiteSetup,
		categories: Array.isArray(categoriesPayload?.categories)
			? categoriesPayload.categories
			: [],
		subcategories: Array.isArray(categoriesPayload?.subcategories)
			? categoriesPayload.subcategories
			: [],
		featuredProducts,
		newArrivalProducts,
		customDesignProducts,
	};

	return <HomeRouteClient initialRouteData={initialRouteData} />;
}
