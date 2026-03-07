import LegacyFrontendAppEntry from "@/components/legacy/LegacyFrontendAppEntry";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
	title: "Seller Route",
	description: "Seller route namespace.",
	pathname: "/seller",
	noindex: true,
});

export default function SellerIndexPage() {
	return <LegacyFrontendAppEntry />;
}
