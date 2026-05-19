import LegacyFrontendAppEntry from "@/components/legacy/LegacyFrontendAppEntry";
import SeoCrawlSupport from "@/components/seo/SeoCrawlSupport";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
	title: "Reset Your Password",
	description: "Request a secure Serene Jannat password reset link.",
	pathname: "/forgot-password",
	noindex: true,
});

export default function ForgotPasswordPage() {
	return (
		<>
			<LegacyFrontendAppEntry />
			<SeoCrawlSupport
				title='Reset Your Serene Jannat Password'
				description='Use this page to request a secure password reset link for your Serene Jannat account, then return to shopping once access is restored.'
				links={[
					{ href: "/signin", label: "Sign in" },
					{ href: "/signup", label: "Create an account" },
					{ href: "/our-products", label: "Browse products" },
					{ href: "/contact", label: "Contact support" },
				]}
				compact
			/>
		</>
	);
}
