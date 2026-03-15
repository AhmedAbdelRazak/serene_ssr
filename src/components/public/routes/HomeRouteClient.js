"use client";

import PublicPageFrame from "@/components/public/PublicPageFrame";
import Home from "@/legacy_frontend/pages/Home/Home";

export default function HomeRouteClient({ initialRouteData = null }) {
	return (
		<PublicPageFrame routePath='/' initialRouteData={initialRouteData}>
			<Home />
		</PublicPageFrame>
	);
}
