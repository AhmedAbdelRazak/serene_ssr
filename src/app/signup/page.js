import LegacyFrontendAppEntry from "@/components/legacy/LegacyFrontendAppEntry";
import { createMetadata } from "@/lib/seo";
import SeoCrawlSupport from "@/components/seo/SeoCrawlSupport";

export const metadata = createMetadata({
	title: "Create Account",
	description: "Create a customer account.",
	pathname: "/signup",
	noindex: true,
});

export default function SignUpPage() {
	return (
		<>
			<LegacyFrontendAppEntry />
			<SeoCrawlSupport
				title='Create a Serene Jannat Account'
				description='Create a customer account to shop faster, follow orders, and return to personalized gifts, home decor, candles, and print-on-demand products.'
				links={[
					{ href: "/", label: "Home" },
					{ href: "/signin", label: "Sign in" },
					{ href: "/custom-gifts", label: "Custom gifts" },
					{ href: "/contact", label: "Contact support" },
				]}
				compact
			/>
		</>
	);
}
