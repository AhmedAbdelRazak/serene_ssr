"use client";

import PublicPageFrame from "@/components/public/PublicPageFrame";
import CookiePolicy from "@/legacy_frontend/pages/CookiePolicy";

export default function CookieRouteClient() {
	return (
		<PublicPageFrame routePath='/cookie-policy'>
			<CookiePolicy />
		</PublicPageFrame>
	);
}
