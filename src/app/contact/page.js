import ContactRouteClient from "@/components/public/routes/ContactRouteClient";
import SeoCrawlSupport from "@/components/seo/SeoCrawlSupport";
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

	return (
		<>
			<ContactRouteClient initialRouteData={{ websiteSetup }} />
			<SeoCrawlSupport
				title='Contact Serene Jannat'
				description='Contact Serene Jannat for product questions, custom gift help, order support, seller inquiries, and print-on-demand personalization guidance.'
				paragraphs={[
					"Our team can help with choosing the right gift, understanding product options, preparing a design, checking an order, or finding the correct policy page before you purchase.",
					"Use the contact page when you need help with personalization details, product availability, checkout questions, return guidance, seller questions, or a custom design that needs a careful review.",
					"Clear communication helps us keep the shopping experience smooth, especially for orders that include photos, names, event dates, or other meaningful details.",
					"Customers can also use this route to reach the correct support flow before placing an order or after receiving an item.",
				]}
				links={[
					{ href: "/our-products", label: "Browse products" },
					{ href: "/custom-gifts", label: "Personalized gifts" },
					{ href: "/privacy-policy-terms-conditions", label: "Privacy and terms" },
					{ href: "/cookie-policy", label: "Cookie policy" },
				]}
			/>
		</>
	);
}
