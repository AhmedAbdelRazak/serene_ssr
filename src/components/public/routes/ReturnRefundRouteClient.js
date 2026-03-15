"use client";

import PublicPageFrame from "@/components/public/PublicPageFrame";
import ReturnRefundPolicy from "@/legacy_frontend/pages/ReturnRefundPolicy";

export default function ReturnRefundRouteClient({ initialRouteData = null }) {
	return (
		<PublicPageFrame
			routePath='/return-refund-policy'
			initialRouteData={initialRouteData}
		>
			<ReturnRefundPolicy />
		</PublicPageFrame>
	);
}
