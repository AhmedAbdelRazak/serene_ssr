const FALLBACK_SITE_URL = "http://localhost:3000";
const FALLBACK_API_ORIGIN = "http://localhost:8101";

function trimTrailingSlash(value = "") {
	return `${value || ""}`.replace(/\/+$/, "");
}

function ensureLeadingSlash(value = "") {
	if (!value) return "/";
	return value.startsWith("/") ? value : `/${value}`;
}

function ensureApiBase(rawValue = "") {
	const normalized = trimTrailingSlash(rawValue || "");
	if (!normalized) return `${FALLBACK_API_ORIGIN}/api`;
	if (/\/api$/i.test(normalized)) return normalized;
	return `${normalized}/api`;
}

const rawSiteUrl = process.env.NEXT_PUBLIC_MAIN_URL || FALLBACK_SITE_URL;
const rawApiUrl =
	process.env.NEXT_PUBLIC_API_URL ||
	process.env.NEXT_PUBLIC_API_URL_MAIN ||
	FALLBACK_API_ORIGIN;
const rawApiOrigin =
	process.env.NEXT_PUBLIC_API_URL_MAIN ||
	process.env.NEXT_PUBLIC_API_URL ||
	FALLBACK_API_ORIGIN;

export const SITE_URL = trimTrailingSlash(rawSiteUrl) || FALLBACK_SITE_URL;
export const API_BASE_URL = ensureApiBase(rawApiUrl);
export const API_ORIGIN = trimTrailingSlash(rawApiOrigin) || FALLBACK_API_ORIGIN;
export const GOOGLE_ANALYTICS_ID =
	process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_MEASUREMENTID || "";
export const FACEBOOK_PIXEL_ID = process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID || "";

export const POD_OCCASIONS = [
	"Birthday",
	"Anniversary",
	"Graduation",
	"Valentine's Day",
	"Mother's Day",
	"Father's Day",
	"Christmas",
	"Eid",
	"New Year",
	"Baby Shower",
	"Wedding",
	"Engagement",
	"Get Well Soon",
	"Congratulations",
	"Thank You",
	"New Baby",
	"Housewarming",
	"Just Because",
];

export function absoluteUrl(path = "/") {
	const safePath = ensureLeadingSlash(path);
	return `${SITE_URL}${safePath}`;
}

