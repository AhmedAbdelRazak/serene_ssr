export const CHECKOUT_DRAFT_STORAGE_KEY = "sereneCheckoutDraftV2";

export function clampCheckoutStep(value, fallback = 1) {
	const numericStep = Number.parseInt(value, 10);
	if (Number.isNaN(numericStep)) return fallback;
	return Math.min(3, Math.max(1, numericStep));
}

export function parseCheckoutStep(search = "", fallback = 1) {
	const params = new URLSearchParams(
		`${search || ""}`.startsWith("?") ? `${search || ""}`.slice(1) : search
	);
	return clampCheckoutStep(params.get("step"), fallback);
}

export function buildCheckoutSearch(search = "", step = 1) {
	const params = new URLSearchParams(
		`${search || ""}`.startsWith("?") ? `${search || ""}`.slice(1) : search
	);
	params.set("step", String(clampCheckoutStep(step)));
	const next = params.toString();
	return next ? `?${next}` : "";
}

export function readCheckoutDraft() {
	if (typeof window === "undefined") return null;
	try {
		const raw = window.sessionStorage.getItem(CHECKOUT_DRAFT_STORAGE_KEY);
		return raw ? JSON.parse(raw) : null;
	} catch {
		return null;
	}
}

export function writeCheckoutDraft(draft) {
	if (typeof window === "undefined") return;
	try {
		window.sessionStorage.setItem(
			CHECKOUT_DRAFT_STORAGE_KEY,
			JSON.stringify(draft || {})
		);
	} catch {
		// sessionStorage may be unavailable in strict privacy modes
	}
}

export function clearCheckoutDraft() {
	if (typeof window === "undefined") return;
	try {
		window.sessionStorage.removeItem(CHECKOUT_DRAFT_STORAGE_KEY);
	} catch {
		// sessionStorage may be unavailable in strict privacy modes
	}
}
