const GA_SCRIPT_BASE = "https://www.googletagmanager.com/gtag/js?id=";

const state = {
	measurementId: "",
	scriptRequested: false,
	bootstrapped: false,
};

function hasWindow() {
	return typeof window !== "undefined" && typeof document !== "undefined";
}

function scheduleDeferred(callback) {
	if (!hasWindow()) return;
	let fired = false;
	const runOnce = () => {
		if (fired) return;
		fired = true;
		callback();
		window.removeEventListener("pointerdown", runOnce);
		window.removeEventListener("keydown", runOnce);
		window.removeEventListener("touchstart", runOnce);
		window.removeEventListener("scroll", runOnce);
	};

	window.addEventListener("pointerdown", runOnce, { once: true, passive: true });
	window.addEventListener("keydown", runOnce, { once: true, passive: true });
	window.addEventListener("touchstart", runOnce, {
		once: true,
		passive: true,
	});
	window.addEventListener("scroll", runOnce, { once: true, passive: true });

	if (typeof window.requestIdleCallback === "function") {
		window.requestIdleCallback(runOnce, { timeout: 12000 });
	} else {
		window.setTimeout(runOnce, 10000);
	}
}

function ensureGtagStub() {
	if (!hasWindow()) return;
	window.dataLayer = window.dataLayer || [];
	if (typeof window.gtag !== "function") {
		window.gtag = function gtag() {
			window.dataLayer.push(arguments);
		};
	}
}

function bootstrapGa() {
	if (!hasWindow() || state.bootstrapped || !state.measurementId) return;
	ensureGtagStub();
	window.gtag("js", new Date());
	window.gtag("config", state.measurementId, {
		send_page_view: false,
	});
	state.bootstrapped = true;
}

function loadGaScript() {
	if (!hasWindow() || state.scriptRequested || !state.measurementId) return;
	state.scriptRequested = true;
	const src = `${GA_SCRIPT_BASE}${encodeURIComponent(state.measurementId)}`;
	if (document.querySelector(`script[src="${src}"]`)) {
		bootstrapGa();
		return;
	}
	const script = document.createElement("script");
	script.async = true;
	script.src = src;
	script.onload = bootstrapGa;
	script.onerror = () => {
		state.scriptRequested = false;
	};
	document.head.appendChild(script);
}

function normalizeEventName(action = "") {
	return `${action || "event"}`
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9_]+/g, "_")
		.replace(/^_+|_+$/g, "") || "event";
}

function sendPageView(page = "/") {
	if (!hasWindow()) return;
	ensureGtagStub();
	window.gtag("event", "page_view", { page_path: page });
}

const ReactGA = {
	initialize(measurementId) {
		state.measurementId = `${measurementId || ""}`.trim();
		if (!state.measurementId || !hasWindow()) return;
		ensureGtagStub();
		scheduleDeferred(loadGaScript);
	},

	send(payload) {
		if (!hasWindow()) return;
		if (typeof payload === "string") {
			sendPageView(payload);
			return;
		}
		if (payload && payload.hitType === "pageview") {
			sendPageView(payload.page || payload.path || window.location.pathname);
			return;
		}
		if (payload && typeof payload === "object") {
			const eventName = normalizeEventName(payload.event || payload.action || "event");
			ensureGtagStub();
			window.gtag("event", eventName, payload);
		}
	},

	event(payload) {
		if (!hasWindow()) return;
		if (!payload || typeof payload !== "object") return;
		const eventName = normalizeEventName(payload.action || payload.event || "event");
		const params = {
			event_category: payload.category,
			event_label: payload.label,
			value: payload.value,
		};
		ensureGtagStub();
		window.gtag("event", eventName, params);
	},
};

export default ReactGA;
