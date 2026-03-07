import LegacyFrontendAppEntry from "@/components/legacy/LegacyFrontendAppEntry";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
	title: "Admin Route",
	description: "Admin route namespace.",
	pathname: "/admin",
	noindex: true,
});

export default function AdminIndexPage() {
	return <LegacyFrontendAppEntry />;
}
