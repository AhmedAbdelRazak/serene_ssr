const trimTrailingSlash = (value = "") => `${value || ""}`.trim().replace(/\/+$/, "");

const ensureApiSuffix = (value = "") => {
	const normalized = trimTrailingSlash(value);
	if (!normalized) return "";
	return /\/api$/i.test(normalized) ? normalized : `${normalized}/api`;
};

const CONFIGURED_API_BASE_URL = ensureApiSuffix(
	process.env.REACT_APP_API_URL || process.env.NEXT_PUBLIC_API_URL || "",
);

const isLoopbackHostname = (hostname = "") => {
	const safeHost = `${hostname || ""}`.trim().toLowerCase();
	return (
		safeHost === "localhost" ||
		safeHost === "127.0.0.1" ||
		safeHost === "::1" ||
		safeHost === "0.0.0.0"
	);
};

const getHostname = (url = "") => {
	try {
		return new URL(url).hostname;
	} catch {
		return "";
	}
};

const getClientProxyApiBase = () => {
	if (typeof window === "undefined") return "";
	const origin = trimTrailingSlash(window.location?.origin || "");
	return origin ? `${origin}/backend-api` : "";
};

const resolveApiBaseUrl = () => {
	const configuredHost = getHostname(CONFIGURED_API_BASE_URL);
	if (typeof window === "undefined") {
		return CONFIGURED_API_BASE_URL;
	}

	const currentHost = `${window.location?.hostname || ""}`.trim().toLowerCase();
	const proxyApiBase = getClientProxyApiBase();
	const shouldUseProxy =
		!CONFIGURED_API_BASE_URL ||
		(isLoopbackHostname(configuredHost) && !isLoopbackHostname(currentHost));

	if (shouldUseProxy && proxyApiBase) {
		return proxyApiBase;
	}

	return CONFIGURED_API_BASE_URL || proxyApiBase;
};

export const apiUrl = (path = "") => {
	const safePath = `${path || ""}`.trim();
	const apiBaseUrl = resolveApiBaseUrl();
	if (!safePath) return apiBaseUrl;
	if (/^https?:\/\//i.test(safePath)) return safePath;
	if (!apiBaseUrl) return safePath;
	const prefixedPath = safePath.startsWith("/") ? safePath : `/${safePath}`;
	return `${apiBaseUrl}${prefixedPath}`;
};

const buildErrorFromResponse = (requestUrl, response, bodySnippet = "") => ({
	error: `Request failed (${response.status})`,
	status: response.status,
	url: requestUrl,
	details: bodySnippet?.slice(0, 180) || "",
});

export const fetchJson = async (path, options = {}) => {
	const requestUrl = apiUrl(path);
	try {
		const response = await fetch(requestUrl, options);
		const contentType = response.headers.get("content-type") || "";
		const payloadText = await response.text();

		if (!response.ok) {
			return buildErrorFromResponse(requestUrl, response, payloadText);
		}

		if (!payloadText) return null;

		if (contentType.includes("application/json")) {
			return JSON.parse(payloadText);
		}

		try {
			return JSON.parse(payloadText);
		} catch (_err) {
			return {
				error: "Expected JSON response but received non-JSON payload",
				url: requestUrl,
				status: response.status,
				contentType,
				details: payloadText.slice(0, 180),
			};
		}
	} catch (err) {
		console.error("fetchJson error:", err);
		return { error: err?.message || "Network request failed", url: requestUrl };
	}
};
