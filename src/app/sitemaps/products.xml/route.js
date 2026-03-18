import { buildUrlsetXml, getProductSitemapEntries } from "@/lib/sitemap";
import { xmlResponse } from "@/lib/xml";

export const revalidate = 1800;
export const dynamic = "force-dynamic";

export async function GET(request) {
  const entries = await getProductSitemapEntries(request);
  return xmlResponse(buildUrlsetXml(entries, { includeImages: true }));
}
