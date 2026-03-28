const LOCALHOST_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"]);

export const getGoogleClientId = () =>
	process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
	process.env.REACT_APP_GOOGLE_CLIENT_ID ||
	"";

export const shouldRenderGoogleAuth = () => {
	const clientId = getGoogleClientId();
	if (!clientId) return false;
	if (typeof window === "undefined") return true;

	const allowLoopbackGoogleAuth =
		process.env.NEXT_PUBLIC_ENABLE_LOCAL_GOOGLE_AUTH === "true" ||
		process.env.REACT_APP_ENABLE_LOCAL_GOOGLE_AUTH === "true";
	if (allowLoopbackGoogleAuth) return true;

	return !LOCALHOST_HOSTNAMES.has(`${window.location.hostname || ""}`.toLowerCase());
};
