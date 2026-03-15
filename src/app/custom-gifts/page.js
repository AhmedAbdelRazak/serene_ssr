import LegacyFrontendAppEntry from "@/components/legacy/LegacyFrontendAppEntry";
import { createMetadata } from "@/lib/seo";

function getSafeSearchParamValue(source, key) {
	const raw = source?.[key];
	if (Array.isArray(raw)) return `${raw[0] ?? ""}`.trim();
	if (typeof raw === "symbol") return "";
	return `${raw ?? ""}`.trim();
}

export async function generateMetadata({ searchParams }) {
	const resolvedSearchParams = await searchParams;
	const occasion = getSafeSearchParamValue(resolvedSearchParams, "occasion");
	const name = getSafeSearchParamValue(resolvedSearchParams, "name");
	const color = getSafeSearchParamValue(resolvedSearchParams, "color");
	const size = getSafeSearchParamValue(resolvedSearchParams, "size");
	const scent = getSafeSearchParamValue(resolvedSearchParams, "scent");
	const page = getSafeSearchParamValue(resolvedSearchParams, "page");
	const hasActiveFilters = [occasion, name, color, size, scent, page].some(Boolean);
	const personalization = [occasion, name].filter(Boolean).join(" - ");
	const filtersSummary = [color && `color: ${color}`, size && `size: ${size}`, scent && `scent: ${scent}`, page && `page: ${page}`]
		.filter(Boolean)
		.join(" | ");
	const titleSuffix = [personalization, filtersSummary].filter(Boolean).join(" | ");
	return createMetadata({
		title: titleSuffix
			? `Custom Gifts | ${titleSuffix}`
			: "Custom Gifts | Print On Demand",
		description:
			"Choose a product, personalize with your occasion and name, and preview premium Print On Demand gifts.",
		pathname: "/custom-gifts",
		keywords: [
			"custom gifts",
			"print on demand",
			"personalized gifts",
			occasion || "",
			color || "",
			size || "",
			scent || "",
		].filter(Boolean),
		noindex: hasActiveFilters,
	});
}

export default function CustomGiftsPage() {
	return <LegacyFrontendAppEntry />;
}
