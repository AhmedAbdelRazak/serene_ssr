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

const buildCloudinaryUrl = (url, width, format) => {
	const [prefix, rest] = url.split("/upload/");
	if (!rest) return url;

	const parts = rest.split("/");
	const first = parts[0];
	const isVersion = /^v\d+/.test(first);
	const hasTransform =
		!isVersion && (first.includes(",") || first.includes("_"));
	const tokens = hasTransform ? first.split(",") : [];

	if (!tokens.some((token) => token.startsWith("w_"))) {
		tokens.push(`w_${width}`);
	}
	if (!tokens.some((token) => token.startsWith("q_"))) {
		tokens.push("q_auto");
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

	const { srcSet, webpSrcSet, resolvedSrc } = useMemo(() => {
		if (!baseSrc) {
			return { srcSet: "", webpSrcSet: "", resolvedSrc: "" };
		}

		const resolved = buildOptimizedUrl(baseSrc, widths[0], "auto", {
			useFetch,
		});
		return {
			srcSet: useFetch ? buildSrcSet(baseSrc, widths, "auto") : "",
			webpSrcSet: useFetch ? buildSrcSet(baseSrc, widths, "webp") : "",
			resolvedSrc: resolved || fallback,
		};
	}, [baseSrc, fallback, useFetch, widths]);

	if (!baseSrc) {
		return null;
	}

	const handleError = (event) => {
		const img = event.currentTarget;
		if (!fallback || img.dataset.fallbackApplied === "true") {
			return;
		}
		img.dataset.fallbackApplied = "true";
		img.removeAttribute("srcset");
		img.removeAttribute("sizes");
		img.src = fallback;
	};

	if (!useFetch) {
		return (
			<img
				{...imgProps}
				src={resolvedSrc || fallback}
				alt={alt}
				className={className}
				style={style}
				loading={loading}
				decoding={decoding}
				fetchPriority={fetchPriority}
				referrerPolicy={referrerPolicy}
				data-fallback={fallback}
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
				src={resolvedSrc}
				alt={alt}
				className={className}
				style={style}
				loading={loading}
				decoding={decoding}
				fetchPriority={fetchPriority}
				referrerPolicy={referrerPolicy}
				data-fallback={fallback}
				onError={handleError}
			/>
		</picture>
	);
};

export default OptimizedImage;
