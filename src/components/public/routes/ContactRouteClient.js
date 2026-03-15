"use client";

import PublicPageFrame from "@/components/public/PublicPageFrame";
import ContactUs from "@/legacy_frontend/pages/Contact/ContactUs";

export default function ContactRouteClient({ initialRouteData = null }) {
	return (
		<PublicPageFrame routePath='/contact' initialRouteData={initialRouteData}>
			<ContactUs />
		</PublicPageFrame>
	);
}
