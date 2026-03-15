"use client";

import { Suspense, useMemo } from "react";
import { Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { CartProvider } from "@/legacy_frontend/cart_context";
import { LegacyRouteBootstrapProvider } from "@/legacy_frontend/bootstrap/LegacyRouteBootstrapContext";
import PublicRouterBridge from "./PublicRouterBridge";
import PublicStorefrontShell from "./PublicStorefrontShell";

export default function PublicPageFrame({
	routePath,
	routeExact = true,
	initialRouteData = null,
	children,
}) {
	const bootstrapData = useMemo(
		() =>
			initialRouteData
				? { disableLegacySeo: true, ...initialRouteData }
				: { disableLegacySeo: true },
		[initialRouteData]
	);

	return (
		<HelmetProvider>
			<LegacyRouteBootstrapProvider initialRouteData={bootstrapData}>
				<CartProvider>
					<Suspense fallback={null}>
						<PublicRouterBridge>
							<PublicStorefrontShell>
								<Route path={routePath} exact={routeExact}>
									{children}
								</Route>
							</PublicStorefrontShell>
						</PublicRouterBridge>
					</Suspense>
				</CartProvider>
			</LegacyRouteBootstrapProvider>
		</HelmetProvider>
	);
}
