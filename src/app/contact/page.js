import LegacyFrontendAppEntry from "@/components/legacy/LegacyFrontendAppEntry";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
	title: "Contact Serene Jannat",
	description:
		"Contact Serene Jannat for product support, customization questions, and order help.",
	pathname: "/contact",
});

export default function ContactPage() {
	return <LegacyFrontendAppEntry />;
}
