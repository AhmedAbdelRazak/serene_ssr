import CookieRouteClient from "@/components/public/routes/CookieRouteClient";
import SeoCrawlSupport from "@/components/seo/SeoCrawlSupport";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
	title: "Cookie Policy",
	description: "Cookie usage policy for Serene Jannat.",
	pathname: "/cookie-policy",
});

export default function CookiePolicyPage() {
	return (
		<>
			<CookieRouteClient />
			<SeoCrawlSupport
				title='Cookie Policy'
				description='Serene Jannat uses cookies and similar technologies to support storefront functionality, analytics, personalization, account flows, and a smoother shopping experience.'
				paragraphs={[
					"Customers can review how cookies relate to browsing, cart behavior, sign-in experiences, advertising measurement, and other privacy terms before continuing through the website.",
					"These technologies help the storefront remember useful context, measure site performance, support secure account flows, and keep shopping actions like carts and preferences working properly.",
					"The cookie policy should be read with the privacy policy and contact page so visitors know where to find details about data choices, support, and website usage.",
					"This page keeps that information accessible from the public site without requiring shoppers to sign in or load the full storefront interface first.",
				]}
				links={[
					{ href: "/privacy-policy-terms-conditions", label: "Privacy and terms" },
					{ href: "/contact", label: "Contact support" },
					{ href: "/our-products", label: "Browse products" },
					{ href: "/custom-gifts", label: "Browse custom gifts" },
				]}
			/>
		</>
	);
}
