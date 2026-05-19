import ReturnRefundRouteClient from "@/components/public/routes/ReturnRefundRouteClient";
import SeoCrawlSupport from "@/components/seo/SeoCrawlSupport";
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

	return (
		<>
			<ReturnRefundRouteClient initialRouteData={{ websiteSetup }} />
			<SeoCrawlSupport
				title='Return and Refund Policy'
				description='Learn how Serene Jannat handles returns, refunds, exchanges, damaged items, order questions, and custom product concerns.'
				paragraphs={[
					"Before placing an order, customers can review eligibility, timelines, support steps, and related privacy and contact information so every purchase is clear and confidence-building.",
					"The policy is especially important for personalized and print-on-demand products, where artwork, names, photos, sizes, colors, and production details can affect the final order.",
					"If something arrives damaged, incorrect, or unclear, this page points customers toward the support path and explains how order questions should be handled.",
					"Customers should review this information with product details before checkout so expectations are clear for both standard and custom orders.",
				]}
				links={[
					{ href: "/contact", label: "Contact support" },
					{ href: "/privacy-policy-terms-conditions", label: "Privacy and terms" },
					{ href: "/our-products", label: "Shop products" },
					{ href: "/custom-gifts", label: "Shop custom gifts" },
				]}
			/>
		</>
	);
}
