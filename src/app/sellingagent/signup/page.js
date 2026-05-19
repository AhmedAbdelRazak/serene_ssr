import LegacyFrontendAppEntry from "@/components/legacy/LegacyFrontendAppEntry";
import { createMetadata } from "@/lib/seo";
import SeoCrawlSupport from "@/components/seo/SeoCrawlSupport";

export const metadata = createMetadata({
	title: "Seller Signup",
	description: "Create a seller account.",
	pathname: "/sellingagent/signup",
	noindex: true,
});

export default function SellerSignUpPage() {
	return (
		<>
			<LegacyFrontendAppEntry />
			<SeoCrawlSupport
				title='Seller Signup for Serene Jannat'
				description='Apply for a seller account to manage products, store details, orders, coupons, and customer support through the Serene Jannat seller tools.'
				links={[
					{ href: "/", label: "Home" },
					{ href: "/signin", label: "Sign in" },
					{ href: "/our-products", label: "View storefront" },
					{ href: "/contact", label: "Contact support" },
				]}
				compact
			/>
		</>
	);
}
