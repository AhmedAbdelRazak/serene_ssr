export function stripHtml(input = "") {
	return `${input || ""}`.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export function toSlug(value = "") {
	return `${value || ""}`
		.toLowerCase()
		.replace(/[^a-z0-9\s-]/g, "")
		.trim()
		.replace(/\s+/g, "-")
		.replace(/-+/g, "-");
}

export function decodeMaybe(value = "") {
	try {
		return decodeURIComponent(value);
	} catch {
		return value;
	}
}

export function uniqueStrings(values = []) {
	return Array.from(new Set(values.filter(Boolean)));
}

export function parseQueryArray(rawValue = "") {
	if (!rawValue) return [];
	if (Array.isArray(rawValue)) {
		return uniqueStrings(
			rawValue
				.map((item) => (typeof item === "symbol" ? "" : `${item || ""}`.trim()))
				.filter(Boolean)
		);
	}
	if (typeof rawValue === "symbol") return [];
	return uniqueStrings(
		`${rawValue || ""}`
			.split(",")
			.map((item) => decodeMaybe(item).trim())
			.filter(Boolean)
	);
}

export function clampNumber(value, min, max) {
	return Math.min(max, Math.max(min, value));
}

export function formatPrice(price, currency = "USD") {
	const amount = Number(price || 0);
	if (!Number.isFinite(amount)) return `0 ${currency}`;
	return `${amount.toFixed(2)} ${currency}`;
}
