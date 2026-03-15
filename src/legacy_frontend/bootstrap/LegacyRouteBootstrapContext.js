"use client";

import React, { useContext, useMemo } from "react";

const LegacyRouteBootstrapContext = React.createContext(null);

export function LegacyRouteBootstrapProvider({
	initialRouteData = null,
	children,
}) {
	const value = useMemo(() => initialRouteData || null, [initialRouteData]);
	return (
		<LegacyRouteBootstrapContext.Provider value={value}>
			{children}
		</LegacyRouteBootstrapContext.Provider>
	);
}

export function useLegacyRouteBootstrap() {
	return useContext(LegacyRouteBootstrapContext);
}
