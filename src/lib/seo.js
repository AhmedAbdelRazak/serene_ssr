import { absoluteUrl, SITE_URL } from "./config";
import { stripHtml } from "./utils";

export function buildCanonical(pathname = "/", searchParams = null) {
	const base = absoluteUrl(pathname);
	if (!searchParams) return base;
	const params = new URLSearchParams();
	const appendSafe = (key, value) => {
		if (!key) return;
		if (value === undefined || value === null) return;
		if (typeof value === "symbol") return;
		params.append(String(key), String(value));
	};

	if (typeof searchParams?.forEach === "function") {
		searchParams.forEach((value, key) => appendSafe(key, value));
	} else if (typeof searchParams === "object") {
		Object.entries(searchParams).forEach(([key, value]) => {
			if (Array.isArray(value)) {
				value.forEach((item) => appendSafe(key, item));
				return;
			}
			appendSafe(key, value);
		});
	}
	const query = params.toString();
	return query ? `${base}?${query}` : base;
}

export function createMetadata({
	title,
	description,
	pathname = "/",
	searchParams = null,
	image = "",
	noindex = false,
	keywords = [],
} = {}) {
	const safeTitle = title || "Serene Jannat";
	const safeDescription =
		stripHtml(description || "Harmonious Glow, Natural Bliss").slice(0, 160);
	const canonical = buildCanonical(pathname, searchParams);
	const primaryImage = image || absoluteUrl("/logo192.png");

	return {
		title: safeTitle,
		description: safeDescription,
		keywords,
		alternates: {
			canonical,
		},
		robots: noindex
			? { index: false, follow: false, nocache: true }
			: { index: true, follow: true },
		openGraph: {
			type: "website",
			title: safeTitle,
			description: safeDescription,
			url: canonical,
			siteName: "Serene Jannat",
			images: [{ url: primaryImage }],
		},
		twitter: {
			card: "summary_large_image",
			title: safeTitle,
			description: safeDescription,
			images: [primaryImage],
		},
		metadataBase: new URL(SITE_URL),
	};
}

export function productSchema({
	name,
	description,
	url,
	image,
	price,
	currency = "USD",
	availability = "https://schema.org/InStock",
	brand = "Serene Jannat",
} = {}) {
	return {
		"@context": "https://schema.org",
		"@type": "Product",
		name,
		description,
		image: image ? [image] : undefined,
		brand: { "@type": "Brand", name: brand },
		offers: {
			"@type": "Offer",
			priceCurrency: currency,
			price: `${Number(price || 0).toFixed(2)}`,
			availability,
			url,
		},
	};
}

export function itemListSchema({ name, url, items = [] } = {}) {
	const listItems = (Array.isArray(items) ? items : [])
		.map((item, index) => {
			const itemUrl = item?.url || "";
			const itemName = item?.name || "";
			if (!itemUrl || !itemName) return null;
			return {
				"@type": "ListItem",
				position: index + 1,
				url: itemUrl,
				name: itemName,
				image: item?.image || undefined,
			};
		})
		.filter(Boolean);

	if (!listItems.length) return null;

	return {
		"@context": "https://schema.org",
		"@type": "ItemList",
		name,
		url,
		numberOfItems: listItems.length,
		itemListElement: listItems,
	};
}

export function breadcrumbSchema(items = []) {
	const listItems = (Array.isArray(items) ? items : [])
		.map((item, index) => {
			const itemName = item?.name || "";
			const itemUrl = item?.url || "";
			if (!itemName || !itemUrl) return null;
			return {
				"@type": "ListItem",
				position: index + 1,
				name: itemName,
				item: itemUrl,
			};
		})
		.filter(Boolean);

	if (!listItems.length) return null;

	return {
		"@context": "https://schema.org",
		"@type": "BreadcrumbList",
		itemListElement: listItems,
	};
}

export function organizationSchema() {
	return {
		"@context": "https://schema.org",
		"@type": "Organization",
		name: "Serene Jannat",
		url: SITE_URL,
		logo: absoluteUrl("/logo192.png"),
		sameAs: ["https://www.facebook.com/profile.php?id=61575325586166"],
	};
}
