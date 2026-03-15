"use client";

import PublicPageFrame from "@/components/public/PublicPageFrame";
import About from "@/legacy_frontend/pages/About/About";

export default function AboutRouteClient({ initialRouteData = null }) {
	return (
		<PublicPageFrame routePath='/about' initialRouteData={initialRouteData}>
			<About />
		</PublicPageFrame>
	);
}
