import { GET as getGoogleMerchantFeed } from "@/app/google-merchant.xml/route";

export const revalidate = 1800;
export const dynamic = "force-dynamic";

export async function GET(request) {
	return getGoogleMerchantFeed(request);
}
