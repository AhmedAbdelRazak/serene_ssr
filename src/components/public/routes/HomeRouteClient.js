"use client";

import { Suspense, useMemo } from "react";
import { CartProvider } from "@/legacy_frontend/cart_context";
import { LegacyRouteBootstrapProvider } from "@/legacy_frontend/bootstrap/LegacyRouteBootstrapContext";
import PublicRouterBridge from "@/components/public/PublicRouterBridge";
import PublicStorefrontShell from "@/components/public/PublicStorefrontShell";
import Home from "@/legacy_frontend/pages/Home/Home";

export default function HomeRouteClient({ initialRouteData = null }) {
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
							<Home />
						</PublicStorefrontShell>
					</PublicRouterBridge>
				</Suspense>
			</CartProvider>
		</LegacyRouteBootstrapProvider>
	);
}
