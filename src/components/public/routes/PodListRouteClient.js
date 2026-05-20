"use client";

import PublicPageFrame from "@/components/public/PublicPageFrame";
import PrintifyAvailableProducts from "@/legacy_frontend/pages/PrintOnDemand/PrintifyAvailableProducts";

export default function PodListRouteClient({ initialRouteData = null }) {
	return (
		<PublicPageFrame routePath='/custom-gifts' initialRouteData={initialRouteData}>
			<PrintifyAvailableProducts />
		</PublicPageFrame>
	);
}
