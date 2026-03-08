import React, { useMemo } from "react";

const CLOUDINARY_FETCH_BASE =
	"https://res.cloudinary.com/infiniteapps/image/fetch";
const DEFAULT_WIDTHS = [240, 360, 480, 600, 800, 1200];

const toAbsoluteUrl = (url) => {
	if (!url) return "";
	if (/^https?:\/\//i.test(url)) return url;
	if (url.startsWith("//")) return `https:${url}`;
	if (url.startsWith("/")) {
		if (typeof window !== "undefined" && window.location?.origin) {
			return `${window.location.origin}${url}`;
		}
	}
	return url;
};

const isCloudinaryUrl = (url) =>
	typeof url === "string" && url.includes("res.cloudinary.com");

const isCloudinaryTransformToken = (token = "") =>
	/^[a-z]{1,3}_.+/i.test(`${token || ""}`.trim());

const isCloudinaryTransformationSegment = (segment = "") => {
	const normalized = `${segment || ""}`.trim();
	if (!normalized || /^v\d+$/i.test(normalized)) return false;
	const tokens = normalized.split(",").map((token) => token.trim()).filter(Boolean);
	if (!tokens.length) return false;
	return tokens.every((token) => isCloudinaryTransformToken(token));
};

const buildCloudinaryUrl = (url, width, format) => {
	const [prefix, rest] = url.split("/upload/");
	if (!rest) return url;

	const parts = rest.split("/");
	const first = parts[0];
	const isVersion = /^v\d+/.test(first);
	const hasTransform = !isVersion && isCloudinaryTransformationSegment(first);
	const tokens = hasTransform ? first.split(",") : [];

	const setOrAppendToken = (token, predicate) => {
		const index = tokens.findIndex(predicate);
		if (index >= 0) {
			tokens[index] = token;
		} else {
			tokens.push(token);
		}
	};

	setOrAppendToken(`w_${width}`, (token) => token.startsWith("w_"));
	setOrAppendToken("q_auto", (token) => token.startsWith("q_"));

	const formatIndex = tokens.findIndex((token) => token.startsWith("f_"));
	if (format === "webp") {
		if (formatIndex >= 0) {
			tokens[formatIndex] = "f_webp";
		} else {
			tokens.push("f_webp");
		}
	} else if (formatIndex < 0) {
		tokens.push("f_auto");
	}

	const transform = tokens.join(",");
	const newParts = hasTransform
		? [transform, ...parts.slice(1)]
		: [transform, ...parts];
	return `${prefix}/upload/${newParts.join("/")}`;
};

const buildFetchUrl = (url, width, format) => {
	const encodedUrl = encodeURIComponent(url);
	const formatToken = format === "webp" ? "f_webp" : "f_auto";
	return `${CLOUDINARY_FETCH_BASE}/${formatToken},q_auto,w_${width}/${encodedUrl}`;
};

const buildOptimizedUrl = (url, width, format, { useFetch = true } = {}) => {
	if (!url) return "";
	const normalizedUrl = toAbsoluteUrl(url);
	if (isCloudinaryUrl(normalizedUrl)) {
		return buildCloudinaryUrl(normalizedUrl, width, format);
	}
	if (!useFetch) {
		return normalizedUrl;
	}
	return buildFetchUrl(normalizedUrl, width, format);
};

const buildSrcSet = (url, widths, format) =>
	widths
		.map((width) => `${buildOptimizedUrl(url, width, format)} ${width}w`)
		.join(", ");

const OptimizedImage = ({
	src,
	alt = "",
	className,
	style,
	widths = DEFAULT_WIDTHS,
	sizes,
	loading = "lazy",
	decoding = "async",
	fetchPriority,
	referrerPolicy = "strict-origin-when-cross-origin",
	fallbackSrc,
	enableFetchOptimization = false,
	...imgProps
}) => {
	const baseSrc = src || fallbackSrc || "";
	const fallback = toAbsoluteUrl(fallbackSrc || baseSrc);
	const safeWidths = Array.isArray(widths) && widths.length ? widths : DEFAULT_WIDTHS;
	const primaryWidth = safeWidths[0] || 480;
	const origin =
		typeof window !== "undefined" ? window.location.origin : "";
	const normalizedSrc = toAbsoluteUrl(baseSrc);
	const isCloudinarySource = isCloudinaryUrl(normalizedSrc);
	let isSameSite = false;

	if (origin && normalizedSrc) {
		try {
			const originHost = new URL(origin).hostname.replace(/^www\./i, "");
			const srcHost = new URL(normalizedSrc).hostname.replace(/^www\./i, "");
			isSameSite = originHost && srcHost && originHost === srcHost;
		} catch (err) {
			isSameSite = false;
		}
	}

	const useFetch = enableFetchOptimization && !isSameSite && !isCloudinarySource;
	const shouldUseResponsiveSources = useFetch || isCloudinarySource;

	const { srcSet, webpSrcSet, resolvedSrc, resolvedFallback } = useMemo(() => {
		if (!baseSrc) {
			return {
				srcSet: "",
				webpSrcSet: "",
				resolvedSrc: "",
				resolvedFallback: "",
			};
		}

		const resolved = buildOptimizedUrl(baseSrc, primaryWidth, "auto", {
			useFetch,
		});
		const optimizedFallback = fallback
			? buildOptimizedUrl(fallback, primaryWidth, "auto", { useFetch })
			: "";
		return {
			srcSet: shouldUseResponsiveSources
				? buildSrcSet(baseSrc, safeWidths, "auto")
				: "",
			webpSrcSet: shouldUseResponsiveSources
				? buildSrcSet(baseSrc, safeWidths, "webp")
				: "",
			resolvedSrc: resolved || optimizedFallback || fallback,
			resolvedFallback: optimizedFallback || fallback,
		};
	}, [
		baseSrc,
		fallback,
		primaryWidth,
		safeWidths,
		shouldUseResponsiveSources,
		useFetch,
	]);

	if (!baseSrc) {
		return null;
	}

	const handleError = (event) => {
		const img = event.currentTarget;
		if (!resolvedFallback || img.dataset.fallbackApplied === "true") {
			return;
		}
		img.dataset.fallbackApplied = "true";
		img.removeAttribute("srcset");
		img.removeAttribute("sizes");
		img.src = resolvedFallback;
	};

	if (!srcSet && !webpSrcSet) {
		return (
			<img
				{...imgProps}
				src={resolvedSrc || resolvedFallback || fallback}
				alt={alt}
				className={className}
				style={style}
				loading={loading}
				decoding={decoding}
				fetchPriority={fetchPriority}
				referrerPolicy={referrerPolicy}
				data-fallback={resolvedFallback || fallback}
				onError={handleError}
			/>
		);
	}

	return (
		<picture style={{ display: "block" }}>
			<source type='image/webp' srcSet={webpSrcSet} sizes={sizes} />
			<source type='image/jpeg' srcSet={srcSet} sizes={sizes} />
			<img
				{...imgProps}
				src={resolvedSrc || resolvedFallback || fallback}
				alt={alt}
				className={className}
				style={style}
				loading={loading}
				decoding={decoding}
				fetchPriority={fetchPriority}
				referrerPolicy={referrerPolicy}
				data-fallback={resolvedFallback || fallback}
				onError={handleError}
			/>
		</picture>
	);
};

export default OptimizedImage;
