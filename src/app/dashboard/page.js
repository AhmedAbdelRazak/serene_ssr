import LegacyFrontendAppEntry from "@/components/legacy/LegacyFrontendAppEntry";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
	title: "Dashboard",
	description: "User dashboard route.",
	pathname: "/dashboard",
	noindex: true,
});

export default function DashboardPage() {
	return <LegacyFrontendAppEntry />;
}
