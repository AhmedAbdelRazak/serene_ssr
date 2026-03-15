import PrivacyRouteClient from "@/components/public/routes/PrivacyRouteClient";
import { getWebsiteSetupData } from "@/lib/api";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
	title: "Privacy Policy & Terms",
	description: "Privacy policy and terms and conditions for Serene Jannat.",
	pathname: "/privacy-policy-terms-conditions",
});

export default async function PrivacyPolicyPage() {
	let websiteSetup = null;
	try {
		websiteSetup = await getWebsiteSetupData({ revalidate: 1800 });
	} catch {}

	return <PrivacyRouteClient initialRouteData={{ websiteSetup }} />;
}
