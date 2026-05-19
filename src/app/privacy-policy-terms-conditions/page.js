import PrivacyRouteClient from "@/components/public/routes/PrivacyRouteClient";
import SeoCrawlSupport from "@/components/seo/SeoCrawlSupport";
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

	return (
		<>
			<PrivacyRouteClient initialRouteData={{ websiteSetup }} />
			<SeoCrawlSupport
				title='Privacy Policy and Terms'
				description='Review how Serene Jannat handles account information, order details, personalization requests, cookies, payments, and customer support communication.'
				paragraphs={[
					"These terms explain how shoppers use the website, how product and order information supports fulfillment, and where to find related guidance for cookies, returns, refunds, and customer contact.",
					"The policy covers the account, checkout, analytics, communication, and personalization details that may be needed to process an order or improve the storefront experience.",
					"Customers can use this page alongside the cookie policy and return policy to understand how Serene Jannat handles important shopping, support, and privacy expectations.",
					"It also gives crawlers and visitors a stable public reference for the legal and service terms connected to the storefront.",
				]}
				links={[
					{ href: "/cookie-policy", label: "Cookie policy" },
					{ href: "/return-refund-policy", label: "Return and refund policy" },
					{ href: "/contact", label: "Contact support" },
					{ href: "/our-products", label: "Continue shopping" },
				]}
			/>
		</>
	);
}
