"use client";

import PublicPageFrame from "@/components/public/PublicPageFrame";
import CustomizeSelectedProduct from "@/legacy_frontend/pages/PrintOnDemand/CustomizeSelectedProduct";

export default function PodProductRouteClient({ initialRouteData = null }) {
	return (
		<PublicPageFrame
			routePath={["/custom-gifts/:productSlug/:productId", "/custom-gifts/:productId"]}
			initialRouteData={initialRouteData}
		>
			<CustomizeSelectedProduct />
		</PublicPageFrame>
	);
}
