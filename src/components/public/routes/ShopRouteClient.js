"use client";

import { Suspense, useMemo } from "react";
import { Route } from "react-router-dom";
import { CartProvider } from "@/legacy_frontend/cart_context";
import { LegacyRouteBootstrapProvider } from "@/legacy_frontend/bootstrap/LegacyRouteBootstrapContext";
import PublicRouterBridge from "@/components/public/PublicRouterBridge";
import PublicStorefrontShell from "@/components/public/PublicStorefrontShell";
import ShopPageMain from "@/legacy_frontend/pages/ShopPage/ShopPageMain";

export default function ShopRouteClient({ initialRouteData = null }) {
	const bootstrapData = useMemo(() => ({ disableLegacySeo: true }), []);
	const mergedBootstrapData = useMemo(
		() =>
			initialRouteData
				? { disableLegacySeo: true, ...initialRouteData }
				: bootstrapData,
		[bootstrapData, initialRouteData]
	);

	return (
		<LegacyRouteBootstrapProvider initialRouteData={mergedBootstrapData}>
			<CartProvider>
				<Suspense fallback={null}>
					<PublicRouterBridge>
						<PublicStorefrontShell>
							<Route path='/our-products' exact>
								<ShopPageMain />
							</Route>
						</PublicStorefrontShell>
					</PublicRouterBridge>
				</Suspense>
			</CartProvider>
		</LegacyRouteBootstrapProvider>
	);
}
