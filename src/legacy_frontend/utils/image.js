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
	return normalized;
};

const isCloudinaryUrl = (url) =>
	typeof url === "string" && url.includes("res.cloudinary.com");

export const getCloudinaryOptimizedUrl = (
	url,
	{ width, format = "auto", quality = "auto" } = {}
) => {
	if (!url || !isCloudinaryUrl(url)) return url || "";

	const [prefix, rest] = url.split("/upload/");
	if (!rest) return url;

	const parts = rest.split("/");
	const first = parts[0];
	const isVersion = /^v\d+/.test(first);
	const hasTransform = !isVersion && (first.includes(",") || first.includes("_"));
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

export const resolveImageUrl = (image, { preferCloudinary = true } = {}) => {
	if (!image) return "";
	if (typeof image === "string") return sanitizeUrlCandidate(image);
	if (Array.isArray(image.images) && image.images.length > 0) {
		return resolveImageUrl(image.images[0], { preferCloudinary });
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
	const primary = image.url || image.src;
	const derivedCloudinary = cloudinary || buildCloudinaryUrl(cloudinaryId);
	const safeCloudinary = sanitizeUrlCandidate(derivedCloudinary);
	const safePrimary = sanitizeUrlCandidate(primary);

	if (preferCloudinary && safeCloudinary) {
		return safeCloudinary;
	}

	return safePrimary || safeCloudinary || "";
};

export const resolveImageSources = (image) => {
	const primary = resolveImageUrl(image, { preferCloudinary: true });
	const fallback = resolveImageUrl(image, { preferCloudinary: false });
	if (primary && fallback && primary !== fallback) {
		return { primary, fallback };
	}
	return { primary: primary || fallback, fallback: fallback || primary };
};
