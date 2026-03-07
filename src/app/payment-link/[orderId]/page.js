import LegacyFrontendAppEntry from "@/components/legacy/LegacyFrontendAppEntry";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
	title: "Payment Link",
	description: "Payment link checkout route.",
	pathname: "/payment-link",
	noindex: true,
});

export default async function PaymentLinkPage() {
	return <LegacyFrontendAppEntry />;
}
