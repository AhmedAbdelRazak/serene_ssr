import LegacyFrontendAppEntry from "@/components/legacy/LegacyFrontendAppEntry";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
	title: "About Serene Jannat",
	description:
		"Learn about Serene Jannat and our mission to deliver meaningful handcrafted and personalized gifts.",
	pathname: "/about",
});

export default function AboutPage() {
	return <LegacyFrontendAppEntry />;
}
