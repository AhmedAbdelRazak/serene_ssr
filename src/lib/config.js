const FALLBACK_SITE_URL = "http://localhost:3000";
const FALLBACK_API_ORIGIN = "http://localhost:8101";

function trimTrailingSlash(value = "") {
	return `${value || ""}`.replace(/\/+$/, "");
}

function isLocalHostname(hostname = "") {
	const normalized = `${hostname || ""}`.toLowerCase();
	return (
		normalized === "localhost" ||
		normalized === "127.0.0.1" ||
		normalized === "::1"
	);
}

function normalizePublicSiteUrl(rawValue = "") {
	const normalized = trimTrailingSlash(rawValue || "");
	if (!normalized) return FALLBACK_SITE_URL;

	try {
		const url = new URL(normalized);
		if (url.protocol === "http:" && !isLocalHostname(url.hostname)) {
			url.protocol = "https:";
		}
		return trimTrailingSlash(url.toString());
	} catch {
		return normalized;
	}
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

function stripApiSuffix(value = "") {
	return trimTrailingSlash(value).replace(/\/api$/i, "");
}

function getUrlOrigin(value = "") {
	try {
		return new URL(value).origin;
	} catch {
		return "";
	}
}

function isAbsoluteUrl(value = "") {
	return /^https?:\/\//i.test(`${value || ""}`.trim());
}

function resolveApiOrigin(rawOrigin = "", rawSite = "") {
	const configuredOrigin = stripApiSuffix(rawOrigin);
	const siteOrigin = getUrlOrigin(rawSite);
	const apiOrigin = getUrlOrigin(configuredOrigin);

	if (isAbsoluteUrl(configuredOrigin) && (!siteOrigin || apiOrigin !== siteOrigin)) {
		return configuredOrigin;
	}

	return FALLBACK_API_ORIGIN;
}

const rawSiteUrl = process.env.NEXT_PUBLIC_MAIN_URL || FALLBACK_SITE_URL;
const rawApiUrl =
	process.env.NEXT_PUBLIC_API_URL ||
	process.env.NEXT_PUBLIC_API_URL_MAIN ||
	FALLBACK_API_ORIGIN;
const rawApiOrigin =
	process.env.NEXT_PUBLIC_API_ORIGIN ||
	process.env.NEXT_PUBLIC_API_URL_MAIN ||
	process.env.NEXT_PUBLIC_API_URL ||
	FALLBACK_API_ORIGIN;

export const SITE_URL = normalizePublicSiteUrl(rawSiteUrl) || FALLBACK_SITE_URL;
export const API_BASE_URL = ensureApiBase(rawApiUrl);
export const API_ORIGIN = resolveApiOrigin(rawApiOrigin, SITE_URL);
export const GOOGLE_ANALYTICS_ID =
	process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_MEASUREMENTID || "";
export const FACEBOOK_PIXEL_ID = process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID || "";

export function absoluteUrl(path = "/") {
	const safePath = ensureLeadingSlash(path);
	return `${SITE_URL}${safePath}`;
}
