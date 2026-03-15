import ContactRouteClient from "@/components/public/routes/ContactRouteClient";
import { getWebsiteSetupData } from "@/lib/api";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
	title: "Contact Serene Jannat",
	description:
		"Contact Serene Jannat for product support, customization questions, and order help.",
	pathname: "/contact",
});

export default async function ContactPage() {
	let websiteSetup = null;
	try {
		websiteSetup = await getWebsiteSetupData({ revalidate: 1800 });
	} catch {}

	return <ContactRouteClient initialRouteData={{ websiteSetup }} />;
}
