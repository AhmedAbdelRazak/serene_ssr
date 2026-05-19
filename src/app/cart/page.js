import LegacyFrontendAppEntry from "@/components/legacy/LegacyFrontendAppEntry";
import { createMetadata } from "@/lib/seo";
import SeoCrawlSupport from "@/components/seo/SeoCrawlSupport";

export const metadata = createMetadata({
	title: "Cart",
	description: "Your shopping cart.",
	pathname: "/cart",
	noindex: true,
});

export default function CartPage() {
	return (
		<>
			<LegacyFrontendAppEntry />
			<SeoCrawlSupport
				title='Shopping Cart'
				description='Review your Serene Jannat cart, continue shopping for gifts and decor, or return to personalized print-on-demand products before checkout.'
				links={[
					{ href: "/our-products", label: "Continue shopping" },
					{ href: "/custom-gifts", label: "Custom gifts" },
					{ href: "/return-refund-policy", label: "Return policy" },
					{ href: "/contact", label: "Contact support" },
				]}
				compact
			/>
		</>
	);
}
