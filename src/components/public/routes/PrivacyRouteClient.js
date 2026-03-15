"use client";

import PublicPageFrame from "@/components/public/PublicPageFrame";
import PrivacyPolicy from "@/legacy_frontend/pages/PrivacyPolicy";

export default function PrivacyRouteClient({ initialRouteData = null }) {
	return (
		<PublicPageFrame
			routePath='/privacy-policy-terms-conditions'
			initialRouteData={initialRouteData}
		>
			<PrivacyPolicy />
		</PublicPageFrame>
	);
}
