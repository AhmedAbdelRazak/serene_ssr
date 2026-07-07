import React, { useMemo } from "react";

const DEFAULT_WIDTHS = [240, 360, 480, 600, 800, 1200];
const NEXT_IMAGE_QUALITY = 75;
const ENABLE_NEXT_IMAGE_PROXY =
	process.env.NEXT_PUBLIC_ENABLE_NEXT_IMAGE_PROXY === "true";
const NEXT_IMAGE_WIDTHS = [
	16,
	32,
	48,
	64,
	96,
	128,
	256,
	384,
	640,
	750,
	828,
	1080,
	1200,
	1920,
	2048,
	3840,
];

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
	// Preserve any existing quality directive; otherwise prefer eco mode.
	if (!tokens.some((token) => token.startsWith("q_"))) {
		tokens.push("q_auto:eco");
	}

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

const buildNextImageUrl = (url, width) => {
	const encodedUrl = encodeURIComponent(toAbsoluteUrl(url));
	const safeWidth =
		NEXT_IMAGE_WIDTHS.find((candidate) => candidate >= Number(width || 0)) ||
		NEXT_IMAGE_WIDTHS[NEXT_IMAGE_WIDTHS.length - 1];
	return `/_next/image?url=${encodedUrl}&w=${safeWidth}&q=${NEXT_IMAGE_QUALITY}`;
};

const getSrcSetWidth = (width, { useFetch = false } = {}) => {
	if (!useFetch) return width;
	return (
		NEXT_IMAGE_WIDTHS.find((candidate) => candidate >= Number(width || 0)) ||
		NEXT_IMAGE_WIDTHS[NEXT_IMAGE_WIDTHS.length - 1]
	);
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
	return buildNextImageUrl(normalizedUrl, width);
};

const buildSrcSet = (url, widths, format, options = {}) =>
	Array.from(new Set(widths.map((width) => getSrcSetWidth(width, options))))
		.map((width) => `${buildOptimizedUrl(url, width, format, options)} ${width}w`)
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

	const useFetch =
		ENABLE_NEXT_IMAGE_PROXY &&
		enableFetchOptimization &&
		!isSameSite &&
		!isCloudinarySource;
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
		const optimizedFallback = !useFetch && fallback
			? buildOptimizedUrl(fallback, primaryWidth, "auto", { useFetch })
			: "";
		return {
			srcSet: shouldUseResponsiveSources
				? buildSrcSet(baseSrc, safeWidths, "auto", { useFetch })
				: "",
			webpSrcSet: shouldUseResponsiveSources && !useFetch
				? buildSrcSet(baseSrc, safeWidths, "webp", { useFetch })
				: "",
			resolvedSrc: resolved || optimizedFallback || fallback,
			resolvedFallback: useFetch ? fallback : optimizedFallback || fallback,
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
		if (img.parentElement?.tagName === "PICTURE") {
			img.parentElement.querySelectorAll("source").forEach((source) => {
				source.remove();
			});
		}
		img.src = resolvedFallback;
	};

	if (!webpSrcSet) {
		return (
			<img
				{...imgProps}
				src={resolvedSrc || resolvedFallback || fallback}
				srcSet={srcSet || undefined}
				sizes={srcSet ? sizes : undefined}
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
