import LegacyFrontendAppEntry from "@/components/legacy/LegacyFrontendAppEntry";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
	title: "Cart",
	description: "Your shopping cart.",
	pathname: "/cart",
	noindex: true,
});

export default function CartPage() {
	return <LegacyFrontendAppEntry />;
}
