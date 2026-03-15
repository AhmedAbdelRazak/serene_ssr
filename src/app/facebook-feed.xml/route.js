import { GET as getGoogleMerchantFeed } from "@/app/google-merchant.xml/route";

export const revalidate = 1800;
export const dynamic = "force-dynamic";

export async function GET(request) {
	const response = await getGoogleMerchantFeed(request);
	const xml = await response.text();
	const facebookXml = xml
		.replace(
			"<title>Serene Jannat Product Feed</title>",
			"<title>Serene Jannat Facebook Catalog Feed</title>"
		)
		.replace(
			"<description>Dynamic Google Merchant feed for Serene Jannat</description>",
			"<description>Dynamic Facebook and Instagram catalog feed for Serene Jannat</description>"
		);

	return new Response(facebookXml, {
		status: response.status,
		headers: {
			"Content-Type": "application/xml; charset=utf-8",
			"Cache-Control": response.headers.get("Cache-Control") || "public, s-maxage=1800",
		},
	});
}
