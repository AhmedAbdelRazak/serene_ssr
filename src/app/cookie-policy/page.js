import LegacyFrontendAppEntry from "@/components/legacy/LegacyFrontendAppEntry";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
	title: "Cookie Policy",
	description: "Cookie usage policy for Serene Jannat.",
	pathname: "/cookie-policy",
});

export default function CookiePolicyPage() {
	return <LegacyFrontendAppEntry />;
}
