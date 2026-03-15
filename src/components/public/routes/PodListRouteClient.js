"use client";

import PublicPageFrame from "@/components/public/PublicPageFrame";
import PrintifyAvailableProducts from "@/legacy_frontend/pages/PrintOnDemand/PrintifyAvailableProducts";

export default function PodListRouteClient() {
	return (
		<PublicPageFrame routePath='/custom-gifts'>
			<PrintifyAvailableProducts />
		</PublicPageFrame>
	);
}
