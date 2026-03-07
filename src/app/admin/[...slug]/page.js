import LegacyFrontendAppEntry from "@/components/legacy/LegacyFrontendAppEntry";
import { createMetadata } from "@/lib/seo";

export const metadata = createMetadata({
	title: "Admin Panel",
	description: "Admin route in migration mode.",
	pathname: "/admin",
	noindex: true,
});

export default async function AdminCatchAllPage() {
	return <LegacyFrontendAppEntry />;
}
