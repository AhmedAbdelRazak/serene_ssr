import ReturnRefundRouteClient from "@/components/public/routes/ReturnRefundRouteClient";
import { getWebsiteSetupData } from "@/lib/api";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
	title: "Return & Refund Policy",
	description: "Return and refund policy for Serene Jannat orders.",
	pathname: "/return-refund-policy",
});

export default async function ReturnRefundPolicyPage() {
	let websiteSetup = null;
	try {
		websiteSetup = await getWebsiteSetupData({ revalidate: 1800 });
	} catch {}

	return <ReturnRefundRouteClient initialRouteData={{ websiteSetup }} />;
}
