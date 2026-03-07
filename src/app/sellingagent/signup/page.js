import LegacyFrontendAppEntry from "@/components/legacy/LegacyFrontendAppEntry";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
	title: "Seller Signup",
	description: "Create a seller account.",
	pathname: "/sellingagent/signup",
	noindex: true,
});

export default function SellerSignUpPage() {
	return <LegacyFrontendAppEntry />;
}
