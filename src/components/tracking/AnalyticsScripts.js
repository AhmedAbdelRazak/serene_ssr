"use client";

import { Suspense, lazy, useEffect, useState } from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";
import {
	GOOGLE_ANALYTICS_ID,
	FACEBOOK_PIXEL_ID,
} from "@/lib/config";

const RouteTracker = lazy(() => import("./RouteTracker"));

const HOME_TRACKER_DELAY_MS = 10000;
const DEFAULT_TRACKER_DELAY_MS = 8000;

function ensureGoogleAnalyticsQueue(measurementId) {
	if (!measurementId || typeof window === "undefined") return;

	window.dataLayer = window.dataLayer || [];
	if (typeof window.gtag !== "function") {
		window.gtag = function gtag() {
			window.dataLayer.push(arguments);
		};
	}

	if (window.__sereneGaMeasurementId === measurementId) return;
	window.gtag("js", new Date());
	window.gtag("config", measurementId, { send_page_view: false });
	window.__sereneGaMeasurementId = measurementId;
}

function ensureFacebookPixelQueue(pixelId) {
	if (!pixelId || typeof window === "undefined") return;

	if (typeof window.fbq !== "function") {
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

	if (window.__sereneFbPixelId === pixelId) return;
	window.fbq("init", pixelId);
	window.__sereneFbPixelId = pixelId;
}

export default function AnalyticsScripts() {
	const pathname = usePathname();
	const hasGa = Boolean(GOOGLE_ANALYTICS_ID);
	const hasFbPixel = Boolean(FACEBOOK_PIXEL_ID);
	const normalizedPath = `${pathname || ""}`.toLowerCase();
	const [queuesPrepared, setQueuesPrepared] = useState(false);
	const [shouldLoadTrackers, setShouldLoadTrackers] = useState(false);
	const shouldSkipForLegacyRoute =
		!normalizedPath ||
		normalizedPath.startsWith("/admin") ||
		normalizedPath.startsWith("/seller") ||
		normalizedPath.startsWith("/dashboard") ||
		normalizedPath.startsWith("/cart") ||
		normalizedPath.startsWith("/signin") ||
		normalizedPath.startsWith("/signup") ||
		normalizedPath.startsWith("/sellingagent") ||
		normalizedPath.startsWith("/payment-link");
	const hasTrackers = hasGa || hasFbPixel;
	const activationDelayMs =
		normalizedPath === "/" ? HOME_TRACKER_DELAY_MS : DEFAULT_TRACKER_DELAY_MS;

	useEffect(() => {
		if (shouldSkipForLegacyRoute || !hasTrackers || typeof window === "undefined") {
			setQueuesPrepared(false);
			return undefined;
		}

		if (hasGa) {
			ensureGoogleAnalyticsQueue(GOOGLE_ANALYTICS_ID);
		}
		if (hasFbPixel) {
			ensureFacebookPixelQueue(FACEBOOK_PIXEL_ID);
		}
		setQueuesPrepared(true);
		return undefined;
	}, [hasFbPixel, hasGa, hasTrackers, shouldSkipForLegacyRoute]);

	useEffect(() => {
		if (
			shouldSkipForLegacyRoute ||
			!hasTrackers ||
			!queuesPrepared ||
			shouldLoadTrackers ||
			typeof window === "undefined"
		) {
			return undefined;
		}

		let activated = false;
		const activateTrackers = () => {
			if (activated) return;
			activated = true;
			setShouldLoadTrackers(true);
			window.removeEventListener("pointerdown", activateTrackers);
			window.removeEventListener("keydown", activateTrackers);
			window.removeEventListener("touchstart", activateTrackers);
			window.removeEventListener("scroll", activateTrackers);
		};

		window.addEventListener("pointerdown", activateTrackers, {
			once: true,
			passive: true,
		});
		window.addEventListener("keydown", activateTrackers, {
			once: true,
			passive: true,
		});
		window.addEventListener("touchstart", activateTrackers, {
			once: true,
			passive: true,
		});
		window.addEventListener("scroll", activateTrackers, {
			once: true,
			passive: true,
		});

		const timeoutId = window.setTimeout(activateTrackers, activationDelayMs);
		return () => {
			window.clearTimeout(timeoutId);
			window.removeEventListener("pointerdown", activateTrackers);
			window.removeEventListener("keydown", activateTrackers);
			window.removeEventListener("touchstart", activateTrackers);
			window.removeEventListener("scroll", activateTrackers);
		};
	}, [
		activationDelayMs,
		hasTrackers,
		queuesPrepared,
		shouldLoadTrackers,
		shouldSkipForLegacyRoute,
	]);

	if (shouldSkipForLegacyRoute || !hasTrackers) {
		return null;
	}

	return (
		<>
			{shouldLoadTrackers && hasGa ? (
				<Script
					id='serene-ga-script'
					src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ANALYTICS_ID}`}
					strategy='afterInteractive'
				/>
			) : null}

			{shouldLoadTrackers && hasFbPixel ? (
				<>
					<Script
						id='serene-fb-pixel-script'
						src='https://connect.facebook.net/en_US/fbevents.js'
						strategy='afterInteractive'
					/>
				</>
			) : null}
			{hasFbPixel ? (
				<noscript>
					<img
						height='1'
						width='1'
						style={{ display: "none" }}
						alt=''
						src={`https://www.facebook.com/tr?id=${FACEBOOK_PIXEL_ID}&ev=PageView&noscript=1`}
					/>
				</noscript>
			) : null}

			{queuesPrepared ? (
				<Suspense fallback={null}>
					<RouteTracker />
				</Suspense>
			) : null}
		</>
	);
}
