import LegacyFrontendAppEntry from "@/components/legacy/LegacyFrontendAppEntry";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
	title: "Privacy Policy & Terms",
	description: "Privacy policy and terms and conditions for Serene Jannat.",
	pathname: "/privacy-policy-terms-conditions",
});

export default function PrivacyPolicyPage() {
	return <LegacyFrontendAppEntry />;
}
