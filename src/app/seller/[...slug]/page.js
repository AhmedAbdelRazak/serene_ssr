import LegacyFrontendAppEntry from "@/components/legacy/LegacyFrontendAppEntry";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
	title: "Seller Panel",
	description: "Seller route in migration mode.",
	pathname: "/seller",
	noindex: true,
});

export default async function SellerCatchAllPage() {
	return <LegacyFrontendAppEntry />;
}
