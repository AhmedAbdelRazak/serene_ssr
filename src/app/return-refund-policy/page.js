import LegacyFrontendAppEntry from "@/components/legacy/LegacyFrontendAppEntry";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
	title: "Return & Refund Policy",
	description: "Return and refund policy for Serene Jannat orders.",
	pathname: "/return-refund-policy",
});

export default function ReturnRefundPolicyPage() {
	return <LegacyFrontendAppEntry />;
}
