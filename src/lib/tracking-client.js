"use client";

function randomId(prefix = "evt") {
	return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function trackPageView(path) {
	try {
		if (typeof window !== "undefined" && typeof window.gtag === "function") {
			window.gtag("event", "page_view", { page_path: path });
		}
		if (typeof window !== "undefined" && typeof window.fbq === "function") {
			window.fbq("track", "PageView");
		}
	} catch {
		// no-op
	}
}

export async function trackConversionEvent({
	eventName,
	contentIds = [],
	value = 0,
	currency = "USD",
	email,
	phone,
	extra = {},
} = {}) {
	const safeEventName = eventName || "CustomEvent";
	const eventId = randomId(safeEventName);

	try {
		if (typeof window !== "undefined" && typeof window.gtag === "function") {
			window.gtag("event", safeEventName, {
				event_id: eventId,
				value,
				currency,
				content_ids: contentIds,
				...extra,
			});
		}
		if (typeof window !== "undefined" && typeof window.fbq === "function") {
			window.fbq("track", safeEventName, {
				eventID: eventId,
				value,
				currency,
				content_ids: contentIds,
				...extra,
			});
		}
	} catch {
		// no-op
	}

	try {
		await fetch("/api/track/conversion", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				eventName: safeEventName,
				eventId,
				email: email || "Unknown",
				phone: phone || "Unknown",
				currency,
				value,
				contentIds,
				userAgent:
					typeof window !== "undefined" ? window.navigator.userAgent : "",
				extra,
			}),
		});
	} catch {
		// no-op
	}

	return eventId;
}

