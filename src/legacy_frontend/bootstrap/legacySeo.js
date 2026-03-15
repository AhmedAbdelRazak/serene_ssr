"use client";

import { useLegacyRouteBootstrap } from "./LegacyRouteBootstrapContext";

export function escapeJsonString(value = "") {
	return JSON.stringify(`${value ?? ""}`).slice(1, -1);
}

export function useLegacySeoEnabled() {
	const routeBootstrap = useLegacyRouteBootstrap();
	return routeBootstrap?.disableLegacySeo !== true;
}
