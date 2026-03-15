import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function trimTrailingSlash(value = "") {
	return `${value || ""}`.trim().replace(/\/+$/, "");
}

function ensureApiPrefix(value = "") {
	const base = trimTrailingSlash(value);
	if (!base) return "";
	return /\/api$/i.test(base) ? base : `${base}/api`;
}

function stripApiSuffix(value = "") {
	const base = trimTrailingSlash(value);
	return base.replace(/\/api$/i, "");
}

const normalizedApiUrl = ensureApiPrefix(
	process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL_MAIN || "",
);
const normalizedApiMain = stripApiSuffix(
	process.env.NEXT_PUBLIC_API_URL_MAIN || process.env.NEXT_PUBLIC_API_URL || "",
);
const apiOrigin = normalizedApiMain || "http://localhost:8101";

const nextConfig = {
	reactStrictMode: false,
	poweredByHeader: false,
	compiler: {
		styledComponents: true,
	},
	experimental: {
		externalDir: true,
		webVitalsAttribution: ["CLS", "LCP", "INP"],
	},
	turbopack: {
		resolveAlias: {
			"react-ga4": "./src/lib/perf/react-ga4-lite.js",
			"react-facebook-pixel": "./src/lib/perf/react-facebook-pixel-lite.js",
		},
	},
	webpack: (config) => {
		config.resolve = config.resolve || {};
		config.resolve.alias = config.resolve.alias || {};
		config.resolve.alias["react-ga4"] = path.resolve(
			__dirname,
			"src/lib/perf/react-ga4-lite.js",
		);
		config.resolve.alias["react-facebook-pixel"] =
			path.resolve(__dirname, "src/lib/perf/react-facebook-pixel-lite.js");
		return config;
	},
	env: {
		REACT_APP_API_URL: normalizedApiUrl,
		REACT_APP_API_URL_MAIN: normalizedApiMain,
		REACT_APP_MAIN_URL: process.env.NEXT_PUBLIC_MAIN_URL || "",
		REACT_APP_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "",
		REACT_APP_GOOGLE_ANALYTICS_MEASUREMENTID:
			process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_MEASUREMENTID || "",
		REACT_APP_FACEBOOK_PIXEL_ID: process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID || "",
	},
	images: {
		remotePatterns: [
			{ protocol: "https", hostname: "res.cloudinary.com" },
			{ protocol: "https", hostname: "serenejannat.com" },
			{ protocol: "http", hostname: "serenejannat.com" },
			{ protocol: "https", hostname: "images-api.printify.com" },
			{ protocol: "http", hostname: "localhost" },
			{ protocol: "http", hostname: "127.0.0.1" },
			{
				protocol: "https",
				hostname: "pfy-prod-image-storage.s3.us-east-2.amazonaws.com",
			},
		],
	},
	async rewrites() {
		return [
			{
				source: "/backend-api/:path*",
				destination: `${apiOrigin.replace(/\/+$/, "")}/api/:path*`,
			},
		];
	},
	async headers() {
		return [
			{
				source: "/:path*",
				headers: [
					{ key: "X-Content-Type-Options", value: "nosniff" },
					{ key: "X-Frame-Options", value: "SAMEORIGIN" },
					{ key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
					{
						key: "Permissions-Policy",
						value: "camera=(), microphone=(), geolocation=()",
					},
					{ key: "X-DNS-Prefetch-Control", value: "on" },
				],
			},
		];
	},
};

export default nextConfig;
