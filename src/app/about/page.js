import AboutRouteClient from "@/components/public/routes/AboutRouteClient";
import SeoCrawlSupport from "@/components/seo/SeoCrawlSupport";
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

	return (
		<>
			<AboutRouteClient initialRouteData={{ websiteSetup }} />
			<SeoCrawlSupport
				title='About Serene Jannat'
				description='Serene Jannat creates thoughtful gifts, home decor, candles, and personalized print-on-demand pieces for meaningful everyday moments and special occasions.'
				paragraphs={[
					"Our storefront brings together handcrafted style and flexible customization so shoppers can browse decor, discover seasonal gifts, and personalize products with names, messages, images, and occasion-ready designs.",
					"We focus on clear product paths, dependable support, and useful design tools so each customer can move from inspiration to checkout without losing the personal feeling behind the gift.",
					"Whether the order is a home accent, a candle, a keepsake, or a custom printed item, Serene Jannat is built around thoughtful presentation and practical shopping guidance.",
				]}
				links={[
					{ href: "/our-products", label: "Shop all products" },
					{ href: "/custom-gifts", label: "Explore custom gifts" },
					{ href: "/contact", label: "Contact Serene Jannat" },
					{ href: "/return-refund-policy", label: "Return and refund policy" },
				]}
			/>
		</>
	);
}
