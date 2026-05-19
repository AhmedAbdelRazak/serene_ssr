import { NextResponse } from "next/server";

const LOCAL_HOST_PATTERN = /^(localhost|127\.0\.0\.1|\[::1\]|::1)(:\d+)?$/i;

function getFirstHeaderValue(value = "") {
	return `${value || ""}`.split(",")[0].trim();
}

function isLocalHost(host = "") {
	return LOCAL_HOST_PATTERN.test(getFirstHeaderValue(host));
}

export function proxy(request) {
	const host = getFirstHeaderValue(
		request.headers.get("x-forwarded-host") || request.headers.get("host")
	);
	const forwardedProto = getFirstHeaderValue(
		request.headers.get("x-forwarded-proto")
	).toLowerCase();
	const requestProto = request.nextUrl.protocol.replace(":", "").toLowerCase();
	const proto = forwardedProto || requestProto;

	if (host && !isLocalHost(host) && proto === "http") {
		const url = request.nextUrl.clone();
		url.protocol = "https:";
		return NextResponse.redirect(url, 308);
	}

	return NextResponse.next();
}

export const config = {
	matcher: [
		"/((?!api/|backend-api/|_next/static|_next/image|favicon.ico|logo192.png|manifest.json).*)",
	],
};
