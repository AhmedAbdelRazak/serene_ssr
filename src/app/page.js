import LegacyFrontendAppEntry from "@/components/legacy/LegacyFrontendAppEntry";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
	title: "Serene Jannat | Personalized Gifts, Print On Demand, and Home Decor",
	description:
		"Discover featured products, new arrivals, and custom design gifts. Personalize in seconds and shop with confidence.",
	pathname: "/",
});

export default function HomePage() {
	return <LegacyFrontendAppEntry />;
}
