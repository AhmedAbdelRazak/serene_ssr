const CLOUDINARY_BASE_URL =
	"https://res.cloudinary.com/infiniteapps/image/upload/";

const buildCloudinaryUrl = (publicId) =>
	publicId ? `${CLOUDINARY_BASE_URL}${publicId}` : "";

const INVALID_URL_TOKENS = new Set([
	"",
	"undefined",
	"null",
	"[object object]",
	"nan",
]);

const sanitizeUrlCandidate = (value = "") => {
	const normalized = `${value || ""}`.trim();
	if (!normalized) return "";
	if (INVALID_URL_TOKENS.has(normalized.toLowerCase())) return "";
	if (normalized.startsWith("//")) return `https:${normalized}`;
	return normalized.replace(/^http:\/\//i, "https://");
};

const getDirectImageUrl = (value) => {
	if (!value) return "";
	if (typeof value === "string") return sanitizeUrlCandidate(value);
	if (typeof value === "object") {
		return sanitizeUrlCandidate(
			value.url || value.src || value.secure_url || value.secureUrl || ""
		);
	}
	return "";
};

const isCloudinaryUrl = (url) =>
	typeof url === "string" && url.includes("res.cloudinary.com");

const isSameSiteUrl = (url = "") => {
	const safeUrl = sanitizeUrlCandidate(url);
	if (!safeUrl) return false;
	try {
		return new URL(safeUrl, "https://serenejannat.com").origin === "https://serenejannat.com";
	} catch {
		return false;
	}
};

const isCloudinaryTransformToken = (token = "") =>
	/^[a-z]{1,3}_.+/i.test(`${token || ""}`.trim());

const isCloudinaryTransformationSegment = (segment = "") => {
	const normalized = `${segment || ""}`.trim();
	if (!normalized || /^v\d+$/i.test(normalized)) return false;
	const tokens = normalized.split(",").map((token) => token.trim()).filter(Boolean);
	if (!tokens.length) return false;
	return tokens.every((token) => isCloudinaryTransformToken(token));
};

export const getCloudinaryOptimizedUrl = (
	url,
	{ width, format = "auto", quality = "auto" } = {}
) => {
	const rawUrl = getDirectImageUrl(url);
	if (!rawUrl || !isCloudinaryUrl(rawUrl)) return rawUrl || "";

	const [prefix, rest] = rawUrl.split("/upload/");
	if (!rest) return rawUrl;

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

	if (quality) {
		setOrAppendToken(`q_${quality}`, (t) => t.startsWith("q_"));
	}

	if (width) {
		setOrAppendToken(`w_${width}`, (t) => t.startsWith("w_"));
	}

	if (format) {
		const formatToken = format === "webp" ? "f_webp" : "f_auto";
		setOrAppendToken(formatToken, (t) => t.startsWith("f_"));
	}

	const transform = tokens.join(",");
	const newParts = hasTransform
		? [transform, ...parts.slice(1)]
		: [transform, ...parts];
	return `${prefix}/upload/${newParts.join("/")}`;
};

export const buildCloudinarySrcSet = (
	url,
	widths = [],
	{ format = "auto", quality = "auto" } = {}
) => {
	if (!url || widths.length === 0) return "";
	return widths
		.map(
			(width) =>
				`${getCloudinaryOptimizedUrl(url, { width, format, quality })} ${width}w`
		)
		.join(", ");
};

const getImagePreferenceRank = (url = "", { preferCloudinary = false } = {}) => {
	if (preferCloudinary && isCloudinaryUrl(url)) return 0;
	if (!preferCloudinary && isSameSiteUrl(url)) return 0;
	if (preferCloudinary && isSameSiteUrl(url)) return 1;
	if (!preferCloudinary && isCloudinaryUrl(url)) return 1;
	return 2;
};

const prioritizeImageUrls = (urls = [], { preferCloudinary = false } = {}) => {
	return Array.from(new Set(urls.filter(Boolean))).sort((left, right) => {
		return (
			getImagePreferenceRank(left, { preferCloudinary }) -
			getImagePreferenceRank(right, { preferCloudinary })
		);
	});
};

export const resolveImageUrl = (image, { preferCloudinary = false } = {}) => {
	if (!image) return "";
	if (typeof image === "string") return sanitizeUrlCandidate(image);
	if (Array.isArray(image.images) && image.images.length > 0) {
		return resolveImageUrl(image.images, { preferCloudinary });
	}
	if (Array.isArray(image)) {
		return (
			prioritizeImageUrls(
				image
					.map((entry) => resolveImageUrl(entry, { preferCloudinary }))
					.filter(Boolean),
				{ preferCloudinary }
			)[0] || ""
		);
	}

	const cloudinary =
		image.cloudinary_url ||
		image.cloudinaryUrl ||
		image.cloudinaryURL ||
		image.cloudinary_url;
	const cloudinaryId =
		image.cloudinary_public_id ||
		image.cloudinaryPublicId ||
		image.public_id ||
		image.publicId;
	const derivedCloudinary = cloudinary || buildCloudinaryUrl(cloudinaryId);
	return (
		prioritizeImageUrls(
			[
				image.url,
				image.src,
				image.secure_url,
				image.secureUrl,
				derivedCloudinary,
			].map((entry) => sanitizeUrlCandidate(entry)),
			{ preferCloudinary }
		)[0] || ""
	);
};

export const resolveImageSources = (image) => {
	const primary = resolveImageUrl(image, { preferCloudinary: false });
	const fallback = resolveImageUrl(image, { preferCloudinary: true });
	if (primary && fallback && primary !== fallback) {
		return { primary, fallback };
	}
	return { primary: primary || fallback, fallback: fallback || primary };
};
