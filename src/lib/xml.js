import { SITE_URL } from "./config";

function cleanXmlInput(value = "") {
	const text = `${value ?? ""}`;
	// Remove characters forbidden by XML 1.0 except tab/newline/carriage return.
	return text.replace(/[^\u0009\u000A\u000D\u0020-\uD7FF\uE000-\uFFFD]/g, "");
}

function normalizeHostHeader(value = "") {
	if (!value) return "";
	return `${value}`.split(",")[0].trim();
}

function normalizeProtoHeader(value = "") {
	if (!value) return "";
	const proto = `${value}`.split(",")[0].trim().toLowerCase();
	return proto === "http" || proto === "https" ? proto : "";
}

function isLocalHost(value = "") {
	const host = `${value || ""}`.trim().toLowerCase();
	return /^(localhost|127\.0\.0\.1|\[::1\]|::1)(:\d+)?$/.test(host);
}

function ensureLeadingSlash(value = "") {
	if (!value) return "/";
	return value.startsWith("/") ? value : `/${value}`;
}

function trimTrailingSlash(value = "") {
	return `${value || ""}`.replace(/\/+$/, "");
}

export function getRequestOrigin(request) {
	const fallback = trimTrailingSlash(SITE_URL) || "http://localhost:3000";
	if (!request?.url) return fallback;

	let url;
	try {
		url = new URL(request.url);
	} catch {
		return fallback;
	}

	const forwardedProto = normalizeProtoHeader(
		request?.headers?.get?.("x-forwarded-proto")
	);
	const forwardedHost = normalizeHostHeader(
		request?.headers?.get?.("x-forwarded-host")
	);
	const host = forwardedHost || normalizeHostHeader(request?.headers?.get?.("host")) || url.host;
	if (!host) return fallback;

	const defaultProto = url.protocol === "https:" ? "https" : "http";
	const proto = forwardedProto || defaultProto;
	const publicProto = proto === "http" && !isLocalHost(host) ? "https" : proto;
	return `${publicProto}://${host}`;
}

export function absoluteXmlUrl(path = "/", request) {
	const rawPath = `${path || ""}`.trim();
	if (!rawPath) return `${getRequestOrigin(request)}/`;
	if (/^https?:\/\//i.test(rawPath)) return rawPath;
	const normalizedPath = ensureLeadingSlash(rawPath);
	return `${getRequestOrigin(request)}${normalizedPath}`;
}

export function escapeXml(value = "") {
	return cleanXmlInput(value)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

export function xmlResponse(xmlContent) {
	return new Response(xmlContent, {
		status: 200,
		headers: {
			"Content-Type": "application/xml; charset=utf-8",
			"Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600",
			"X-Content-Type-Options": "nosniff",
		},
	});
}
