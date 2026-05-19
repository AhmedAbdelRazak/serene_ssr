import LegacyFrontendAppEntry from "@/components/legacy/LegacyFrontendAppEntry";
import SeoCrawlSupport from "@/components/seo/SeoCrawlSupport";
import { createMetadata } from "@/lib/seo";

export async function generateMetadata({ params }) {
	const resolvedParams = await params;
	const token = `${resolvedParams?.token || ""}`.trim();

	return createMetadata({
		title: "Choose a New Password",
		description: "Set a new password for your Serene Jannat account.",
		pathname: token
			? `/reset-password/${encodeURIComponent(token)}`
			: "/reset-password",
		noindex: true,
	});
}

export default function ResetPasswordPage() {
	return (
		<>
			<LegacyFrontendAppEntry />
			<SeoCrawlSupport
				title='Choose a New Serene Jannat Password'
				description='Set a new account password from a secure reset link, then sign in to continue managing orders and saved account details.'
				links={[
					{ href: "/signin", label: "Sign in" },
					{ href: "/forgot-password", label: "Request another reset link" },
					{ href: "/our-products", label: "Browse products" },
					{ href: "/contact", label: "Contact support" },
				]}
				compact
			/>
		</>
	);
}
