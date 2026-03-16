"use client";

import { Suspense, useMemo } from "react";
import { Route } from "react-router-dom";
import { CartProvider } from "@/legacy_frontend/cart_context";
import { LegacyRouteBootstrapProvider } from "@/legacy_frontend/bootstrap/LegacyRouteBootstrapContext";
import PublicRouterBridge from "@/components/public/PublicRouterBridge";
import PublicStorefrontShell from "@/components/public/PublicStorefrontShell";
import SingleProductMain from "@/legacy_frontend/pages/SingleProduct/SingleProductMain";

export default function ProductRouteClient({ initialRouteData = null }) {
	const bootstrapData = useMemo(
		() =>
			initialRouteData
				? { disableLegacySeo: true, ...initialRouteData }
				: { disableLegacySeo: true },
		[initialRouteData]
	);

	return (
		<LegacyRouteBootstrapProvider initialRouteData={bootstrapData}>
			<CartProvider>
				<Suspense fallback={null}>
					<PublicRouterBridge>
						<PublicStorefrontShell>
							<Route
								path='/single-product/:productSlug/:categorySlug/:productId'
								exact
							>
								<SingleProductMain />
							</Route>
						</PublicStorefrontShell>
					</PublicRouterBridge>
				</Suspense>
			</CartProvider>
		</LegacyRouteBootstrapProvider>
	);
}
