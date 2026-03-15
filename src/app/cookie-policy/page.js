import CookieRouteClient from "@/components/public/routes/CookieRouteClient";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
	title: "Cookie Policy",
	description: "Cookie usage policy for Serene Jannat.",
	pathname: "/cookie-policy",
});

export default function CookiePolicyPage() {
	return <CookieRouteClient />;
}
