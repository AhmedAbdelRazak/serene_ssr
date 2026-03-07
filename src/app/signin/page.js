import LegacyFrontendAppEntry from "@/components/legacy/LegacyFrontendAppEntry";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
	title: "Sign In",
	description: "Sign in to your Serene Jannat account.",
	pathname: "/signin",
	noindex: true,
});

export default function SignInPage() {
	return <LegacyFrontendAppEntry />;
}
