"use client";

import { Suspense } from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";
import {
	GOOGLE_ANALYTICS_ID,
	FACEBOOK_PIXEL_ID,
} from "@/lib/config";
import RouteTracker from "./RouteTracker";

export default function AnalyticsScripts() {
	const pathname = usePathname();
	const hasGa = Boolean(GOOGLE_ANALYTICS_ID);
	const hasFbPixel = Boolean(FACEBOOK_PIXEL_ID);
	const normalizedPath = `${pathname || ""}`.toLowerCase();
	const shouldSkipForLegacyRoute =
		normalizedPath === "/" ||
		normalizedPath.startsWith("/admin") ||
		normalizedPath.startsWith("/seller") ||
		normalizedPath.startsWith("/dashboard") ||
		normalizedPath.startsWith("/cart") ||
		normalizedPath.startsWith("/signin") ||
		normalizedPath.startsWith("/signup") ||
		normalizedPath.startsWith("/sellingagent") ||
		normalizedPath.startsWith("/about") ||
		normalizedPath.startsWith("/contact") ||
		normalizedPath.startsWith("/our-products") ||
		normalizedPath.startsWith("/custom-gifts") ||
		normalizedPath.startsWith("/single-product") ||
		normalizedPath.startsWith("/privacy-policy-terms-conditions") ||
		normalizedPath.startsWith("/cookie-policy") ||
		normalizedPath.startsWith("/return-refund-policy") ||
		normalizedPath.startsWith("/payment-link");

	if (shouldSkipForLegacyRoute) {
		return null;
	}

	return (
		<>
			{hasGa ? (
				<>
					<Script
						src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ANALYTICS_ID}`}
						strategy='lazyOnload'
					/>
					<Script id='ga-init' strategy='lazyOnload'>
						{`
							window.dataLayer = window.dataLayer || [];
							function gtag(){dataLayer.push(arguments);}
							window.gtag = gtag;
							gtag('js', new Date());
							gtag('config', '${GOOGLE_ANALYTICS_ID}', { send_page_view: false });
						`}
					</Script>
				</>
			) : null}

			{hasFbPixel ? (
				<>
					<Script id='fb-pixel-init' strategy='lazyOnload'>
						{`
							!function(f,b,e,v,n,t,s)
							{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
							n.callMethod.apply(n,arguments):n.queue.push(arguments)};
							if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
							n.queue=[];t=b.createElement(e);t.async=!0;
							t.src=v;s=b.getElementsByTagName(e)[0];
							s.parentNode.insertBefore(t,s)}(window, document,'script',
							'https://connect.facebook.net/en_US/fbevents.js');
							fbq('init', '${FACEBOOK_PIXEL_ID}');
						`}
					</Script>
					<noscript>
						<img
							height='1'
							width='1'
							style={{ display: "none" }}
							alt=''
							src={`https://www.facebook.com/tr?id=${FACEBOOK_PIXEL_ID}&ev=PageView&noscript=1`}
						/>
					</noscript>
				</>
			) : null}

			<Suspense fallback={null}>
				<RouteTracker />
			</Suspense>
		</>
	);
}
