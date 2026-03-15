"use client";

import PublicPageFrame from "@/components/public/PublicPageFrame";
import SingleProductMain from "@/legacy_frontend/pages/SingleProduct/SingleProductMain";

export default function ProductRouteClient({ initialRouteData = null }) {
	return (
		<PublicPageFrame
			routePath='/single-product/:productSlug/:categorySlug/:productId'
			initialRouteData={initialRouteData}
		>
			<SingleProductMain />
		</PublicPageFrame>
	);
}
