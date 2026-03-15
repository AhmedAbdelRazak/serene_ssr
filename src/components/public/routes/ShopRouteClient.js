"use client";

import PublicPageFrame from "@/components/public/PublicPageFrame";
import ShopPageMain from "@/legacy_frontend/pages/ShopPage/ShopPageMain";

export default function ShopRouteClient() {
	return (
		<PublicPageFrame routePath='/our-products'>
			<ShopPageMain />
		</PublicPageFrame>
	);
}
