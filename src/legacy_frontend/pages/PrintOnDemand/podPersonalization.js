export const POD_DEFAULT_OCCASION = "Birthday";
export const POD_DEFAULT_NAME = "";

export const POD_OCCASION_OPTIONS = [
	{ value: "Birthday", icon: "\u{1F382}" },
	{ value: "Anniversary", icon: "\u{1F49E}" },
	{ value: "Wedding", icon: "\u{1F48D}" },
	{ value: "Graduation", icon: "\u{1F393}" },
	{ value: "Baby Shower", icon: "\u{1F37C}" },
	{ value: "Bridal Shower", icon: "\u{1F470}" },
	{ value: "Housewarming", icon: "\u{1F3E1}" },
	{ value: "Mother's Day", icon: "\u{1F339}" },
	{ value: "Father's Day", icon: "\u{1F9D4}" },
	{ value: "Valentine's Day", icon: "\u{2764}\u{FE0F}" },
	{ value: "Ramadan", icon: "\u{1F319}" },
	{ value: "Eid", icon: "\u{2728}" },
	{ value: "Christmas", icon: "\u{1F384}" },
	{ value: "Thanksgiving", icon: "\u{1F983}" },
	{ value: "Retirement", icon: "\u{1F334}" },
	{ value: "Get Well Soon", icon: "\u{1F490}" },
	{ value: "New Baby", icon: "\u{1F476}" },
	{ value: "Just Because", icon: "\u{1F381}" },
];
export const POD_OCCASIONS = POD_OCCASION_OPTIONS.map((item) => item.value);

export const POD_PERSONALIZATION_STORAGE_KEY = "podPersonalizationPrefsV1";
export const POD_ONBOARDING_LAST_SHOWN_KEY = "podOnboardingLastShownAt";

const occasionLookup = new Map(
	POD_OCCASION_OPTIONS.flatMap((option) => {
		const value = option.value;
		const normalized = value.toLowerCase();
		const slug = value
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/(^-|-$)/g, "");
		return [
			[normalized, value],
			[slug, value],
		];
	})
);

function normalizeOccasion(value) {
	if (!value || typeof value !== "string") return POD_DEFAULT_OCCASION;
	const trimmed = decodeURIComponent(value).trim();
	if (!trimmed) return POD_DEFAULT_OCCASION;
	const exact = occasionLookup.get(trimmed.toLowerCase());
	return exact || POD_DEFAULT_OCCASION;
}

function safeDecodeQueryValue(value) {
	if (typeof value !== "string") return "";
	try {
		return decodeURIComponent(value.replace(/\+/g, "%20"));
	} catch {
		return value.replace(/\+/g, " ");
	}
}

function sanitizeName(value) {
	if (typeof value !== "string") return POD_DEFAULT_NAME;
	const decoded = safeDecodeQueryValue(value);
	const cleaned = decoded.replace(/[\r\n\t]/g, " ").trim();
	if (!cleaned) return POD_DEFAULT_NAME;
	return cleaned.slice(0, 40);
}

export function sanitizePersonalization(input = {}) {
	return {
		occasion: normalizeOccasion(input.occasion),
		name: sanitizeName(input.name),
	};
}

export function getOccasionOption(occasion) {
	const normalized = normalizeOccasion(occasion);
	return (
		POD_OCCASION_OPTIONS.find((option) => option.value === normalized) ||
		POD_OCCASION_OPTIONS[0]
	);
}

export function getStoredPodPersonalization() {
	try {
		const raw = localStorage.getItem(POD_PERSONALIZATION_STORAGE_KEY);
		if (!raw) return null;
		return sanitizePersonalization(JSON.parse(raw));
	} catch {
		return null;
	}
}

export function savePodPersonalization(input = {}) {
	const safe = sanitizePersonalization(input);
	try {
		localStorage.setItem(POD_PERSONALIZATION_STORAGE_KEY, JSON.stringify(safe));
	} catch {
		// no-op: localStorage may be unavailable in private mode
	}
	return safe;
}

export function hasStoredPodPersonalization() {
	try {
		const raw = localStorage.getItem(POD_PERSONALIZATION_STORAGE_KEY);
		if (!raw) return false;
		const parsed = JSON.parse(raw);
		if (!parsed || typeof parsed !== "object") return false;
		const safe = sanitizePersonalization(parsed);
		return (
			safe.occasion !== POD_DEFAULT_OCCASION || safe.name !== POD_DEFAULT_NAME
		);
	} catch {
		return false;
	}
}

export function parsePersonalizationFromSearch(search = "") {
	const params = new URLSearchParams(search);
	const occasionFromUrl = params.get("occasion");
	const nameFromUrl = params.get("name");

	// If URL contains no personalization keys at all, return null and fallback to storage/defaults.
	if (!occasionFromUrl && !nameFromUrl) return null;
	return sanitizePersonalization({
		occasion: occasionFromUrl || POD_DEFAULT_OCCASION,
		name: nameFromUrl || "",
	});
}

export function resolvePodPersonalization(search = "") {
	const fromUrl = parsePersonalizationFromSearch(search);
	if (fromUrl) return fromUrl;
	const fromStorage = getStoredPodPersonalization();
	return fromStorage || sanitizePersonalization({});
}

export function buildPersonalizationSearch(input = {}, extras = {}) {
	const safe = sanitizePersonalization(input);
	const params = new URLSearchParams();
	params.set("occasion", safe.occasion);
	if (safe.name) {
		params.set("name", safe.name);
	}

	Object.entries(extras).forEach(([key, value]) => {
		if (value !== undefined && value !== null && `${value}`.trim() !== "") {
			params.set(key, value);
		}
	});

	return `?${params.toString()}`;
}

const occasionLineMap = {
	Birthday: {
		withName: (name) => `Happy Birthday, ${name}!`,
		withoutName: "Happy Birthday!",
	},
	Anniversary: {
		withName: (name) => `Happy Anniversary, ${name}!`,
		withoutName: "Happy Anniversary!",
	},
	Wedding: {
		withName: (name) => `Congrats on your wedding, ${name}!`,
		withoutName: "Congrats on your wedding!",
	},
	Graduation: {
		withName: (name) => `Congrats, ${name} - you did it!`,
		withoutName: "Congrats - you did it!",
	},
	"Baby Shower": {
		withName: (name) => `Celebrating Baby ${name}!`,
		withoutName: "Celebrating a new little one!",
	},
	"Bridal Shower": {
		withName: (name) => `Showered with love, ${name}!`,
		withoutName: "Showered with love!",
	},
	Housewarming: {
		withName: (name) => `Home sweet home, ${name}!`,
		withoutName: "Home sweet home!",
	},
	"Mother's Day": {
		withName: (name) => `Happy Mother's Day, ${name}!`,
		withoutName: "Happy Mother's Day!",
	},
	"Father's Day": {
		withName: (name) => `Happy Father's Day, ${name}!`,
		withoutName: "Happy Father's Day!",
	},
	"Valentine's Day": {
		withName: (name) => `Happy Valentine's Day, ${name}!`,
		withoutName: "Happy Valentine's Day!",
	},
	Ramadan: {
		withName: (name) => `Ramadan Mubarak, ${name}!`,
		withoutName: "Ramadan Mubarak!",
	},
	Eid: {
		withName: (name) => `Eid Mubarak, ${name}!`,
		withoutName: "Eid Mubarak!",
	},
	Christmas: {
		withName: (name) => `Merry Christmas, ${name}!`,
		withoutName: "Merry Christmas!",
	},
	Thanksgiving: {
		withName: (name) => `Grateful for you, ${name}!`,
		withoutName: "Grateful for you!",
	},
	Retirement: {
		withName: (name) => `Happy Retirement, ${name}!`,
		withoutName: "Happy Retirement!",
	},
	"Get Well Soon": {
		withName: (name) => `Get well soon, ${name}!`,
		withoutName: "Get well soon!",
	},
	"New Baby": {
		withName: (name) => `Welcome baby ${name}!`,
		withoutName: "Welcome, little one!",
	},
	"Just Because": {
		withName: (name) => `Made with love for ${name}`,
		withoutName: "Made with love",
	},
};

export function buildGiftMessage(occasion, name) {
	const safe = sanitizePersonalization({ occasion, name });
	const template = occasionLineMap[safe.occasion];
	if (!template) {
		return safe.name ? `Made with love for ${safe.name}` : "Made with love";
	}
	return safe.name ? template.withName(safe.name) : template.withoutName;
}

export function shouldShowPodModalNow() {
	try {
		const lastShown = Number(localStorage.getItem(POD_ONBOARDING_LAST_SHOWN_KEY));
		if (!Number.isFinite(lastShown)) return true;
		const twentyFourHoursMs = 24 * 60 * 60 * 1000;
		return Date.now() - lastShown >= twentyFourHoursMs;
	} catch {
		return true;
	}
}

export function markPodModalShown() {
	try {
		localStorage.setItem(POD_ONBOARDING_LAST_SHOWN_KEY, String(Date.now()));
	} catch {
		// no-op
	}
}

