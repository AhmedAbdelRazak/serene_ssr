import LegacyFrontendAppEntry from "@/components/legacy/LegacyFrontendAppEntry";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
	title: "Create Account",
	description: "Create a customer account.",
	pathname: "/signup",
	noindex: true,
});

export default function SignUpPage() {
	return <LegacyFrontendAppEntry />;
}
