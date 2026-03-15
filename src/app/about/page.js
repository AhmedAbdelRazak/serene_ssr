import AboutRouteClient from "@/components/public/routes/AboutRouteClient";
import { getWebsiteSetupData } from "@/lib/api";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
	title: "About Serene Jannat",
	description:
		"Learn about Serene Jannat and our mission to deliver meaningful handcrafted and personalized gifts.",
	pathname: "/about",
});

export default async function AboutPage() {
	let websiteSetup = null;
	try {
		websiteSetup = await getWebsiteSetupData({ revalidate: 1800 });
	} catch {}

	return <AboutRouteClient initialRouteData={{ websiteSetup }} />;
}
