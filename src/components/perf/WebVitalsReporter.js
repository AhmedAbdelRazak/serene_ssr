"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useReportWebVitals } from "next/web-vitals";

const REPORTED_METRICS = new Set(["CLS", "LCP", "INP", "FCP", "TTFB"]);

function normalizePathname(value = "") {
	const safePath = `${value || ""}`.trim();
	if (!safePath) return "/";
	return safePath.startsWith("/") ? safePath : `/${safePath}`;
}

function getPageGroup(pathname = "") {
	const safePath = normalizePathname(pathname).toLowerCase();
	if (safePath === "/") return "home";
	if (safePath === "/about") return "about";
	if (safePath === "/contact") return "contact";
	if (safePath === "/our-products") return "shop-list";
	if (safePath === "/custom-gifts") return "pod-list";
	if (safePath === "/cookie-policy") return "cookie-policy";
	if (safePath === "/privacy-policy-terms-conditions") return "privacy-policy";
	if (safePath === "/return-refund-policy") return "return-refund-policy";
	if (safePath.startsWith("/single-product/")) return "product";
	if (safePath.startsWith("/custom-gifts/")) return "pod-product";
	return "";
}

function sanitizeAttribution(value, depth = 0) {
	if (value == null || depth > 3) return null;
	if (Array.isArray(value)) {
		const items = value
			.slice(0, 8)
			.map((entry) => sanitizeAttribution(entry, depth + 1))
			.filter((entry) => entry != null && entry !== "");
		return items.length ? items : null;
	}
	if (typeof value === "object") {
		const entries = Object.entries(value)
			.slice(0, 20)
			.map(([key, entry]) => [
				`${key || ""}`.trim().slice(0, 48),
				sanitizeAttribution(entry, depth + 1),
			])
			.filter(([key, entry]) => key && entry != null && entry !== "");
		return entries.length ? Object.fromEntries(entries) : null;
	}
	if (typeof value === "string") return value.trim().slice(0, 320);
	if (typeof value === "number") return Number.isFinite(value) ? value : null;
	if (typeof value === "boolean") return value;
	return null;
}

function buildPayload(metric, pathname) {
	if (!metric?.name || !REPORTED_METRICS.has(metric.name)) return null;
	const path = normalizePathname(pathname);
	const pageGroup = getPageGroup(path);
	if (!pageGroup) return null;

	const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
	return {
		name: metric.name,
		id: `${metric.id || ""}`.slice(0, 120),
		value: Number(metric.value),
		delta: Number(metric.delta),
		rating: `${metric.rating || "unknown"}`.toLowerCase(),
		navigationType: `${metric.navigationType || ""}`.slice(0, 32),
		path,
		pageGroup,
		href: `${window.location?.href || ""}`.slice(0, 500),
		userAgent: `${navigator.userAgent || ""}`.slice(0, 320),
		effectiveConnectionType: `${connection?.effectiveType || ""}`.slice(0, 24),
		deviceMemory: Number(navigator.deviceMemory || 0) || null,
		hardwareConcurrency: Number(navigator.hardwareConcurrency || 0) || null,
		attribution: sanitizeAttribution(metric.attribution),
	};
}

function sendPayload(payload) {
	const body = JSON.stringify(payload);
	if (!body) return;
	if (typeof navigator.sendBeacon === "function") {
		const queued = navigator.sendBeacon(
			"/backend-api/web-vitals",
			new Blob([body], { type: "application/json" }),
		);
		if (queued) return;
	}
	fetch("/backend-api/web-vitals", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body,
		cache: "no-store",
		keepalive: true,
	}).catch(() => {});
}

export default function WebVitalsReporter() {
	const pathname = usePathname();
	const pathnameRef = useRef(normalizePathname(pathname));

	useEffect(() => {
		pathnameRef.current = normalizePathname(pathname);
	}, [pathname]);

	useReportWebVitals((metric) => {
		if (typeof window === "undefined") return;
		const payload = buildPayload(
			metric,
			pathnameRef.current || window.location?.pathname || "/",
		);
		if (!payload) return;
		sendPayload(payload);
	});

	return null;
}
