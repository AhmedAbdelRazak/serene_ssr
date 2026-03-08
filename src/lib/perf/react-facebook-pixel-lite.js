const FB_SCRIPT_SRC = "https://connect.facebook.net/en_US/fbevents.js";

const state = {
	pixelId: "",
	initOptions: {},
	scriptRequested: false,
	initialized: false,
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
		window.requestIdleCallback(runOnce, { timeout: 14000 });
	} else {
		window.setTimeout(runOnce, 12000);
	}
}

function ensureFbqStub() {
	if (!hasWindow()) return;
	if (typeof window.fbq === "function") return;
	const fbq = function fbq() {
		if (fbq.callMethod) {
			fbq.callMethod.apply(fbq, arguments);
		} else {
			fbq.queue.push(arguments);
		}
	};
	fbq.push = fbq;
	fbq.loaded = true;
	fbq.version = "2.0";
	fbq.queue = [];
	window.fbq = fbq;
	if (!window._fbq) window._fbq = fbq;
}

function initPixel() {
	if (!hasWindow() || state.initialized || !state.pixelId) return;
	ensureFbqStub();
	window.fbq("init", state.pixelId, state.initOptions || {});
	state.initialized = true;
}

function loadPixelScript() {
	if (!hasWindow() || state.scriptRequested || !state.pixelId) return;
	state.scriptRequested = true;
	ensureFbqStub();
	if (document.querySelector(`script[src="${FB_SCRIPT_SRC}"]`)) {
		initPixel();
		return;
	}
	const script = document.createElement("script");
	script.async = true;
	script.src = FB_SCRIPT_SRC;
	script.onload = initPixel;
	script.onerror = () => {
		state.scriptRequested = false;
	};
	document.head.appendChild(script);
}

const ReactPixel = {
	init(pixelId, options = {}) {
		state.pixelId = `${pixelId || ""}`.trim();
		state.initOptions = options && typeof options === "object" ? options : {};
		if (!state.pixelId || !hasWindow()) return;
		ensureFbqStub();
		scheduleDeferred(loadPixelScript);
	},

	pageView() {
		if (!hasWindow()) return;
		ensureFbqStub();
		window.fbq("track", "PageView");
	},

	track(eventName, data = {}, options = {}) {
		if (!hasWindow() || !eventName) return;
		ensureFbqStub();
		const safeData = data && typeof data === "object" ? data : {};
		const safeOptions = options && typeof options === "object" ? options : {};
		window.fbq("track", eventName, safeData, safeOptions);
	},

	trackCustom(eventName, data = {}, options = {}) {
		if (!hasWindow() || !eventName) return;
		ensureFbqStub();
		const safeData = data && typeof data === "object" ? data : {};
		const safeOptions = options && typeof options === "object" ? options : {};
		window.fbq("trackCustom", eventName, safeData, safeOptions);
	},
};

export default ReactPixel;
