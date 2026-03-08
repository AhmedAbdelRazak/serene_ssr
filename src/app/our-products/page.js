import LegacyFrontendAppEntry from "@/components/legacy/LegacyFrontendAppEntry";
import { createMetadata } from "@/lib/seo";

function getSafeSearchParamValue(source, key) {
	const raw = source?.[key];
	if (Array.isArray(raw)) return `${raw[0] ?? ""}`.trim();
	if (typeof raw === "symbol") return "";
	return `${raw ?? ""}`.trim();
}

export async function generateMetadata({ searchParams }) {
	const readableFilters = [];
	const filterKeys = [
		"category",
		"color",
		"size",
		"gender",
		"store",
		"searchTerm",
		"offers",
		"priceMin",
		"priceMax",
		"page",
	];
	filterKeys.forEach((key) => {
		const value = getSafeSearchParamValue(searchParams, key);
		if (!value) return;
		readableFilters.push(`${key}: ${value}`);
	});
	const suffix = readableFilters.length ? ` | ${readableFilters.join(" | ")}` : "";
	const dynamicKeywords = [
		"our products",
		"shop by category",
		"shop by color",
		"shop by size",
		...readableFilters,
	].filter(Boolean);
	return createMetadata({
		title: `Our Products${suffix}`,
		description:
			"Browse all products with advanced filtering by category, size, color, price, and store.",
		pathname: "/our-products",
		keywords: dynamicKeywords,
	});
}

export default function OurProductsPage() {
	return <LegacyFrontendAppEntry />;
}
