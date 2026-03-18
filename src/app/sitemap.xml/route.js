import { buildSitemapIndexXml, getSitemapIndexEntries } from "@/lib/sitemap";
import { xmlResponse } from "@/lib/xml";

export const revalidate = 1800;
export const dynamic = "force-dynamic";

export async function GET(request) {
  const entries = await getSitemapIndexEntries(request);
  return xmlResponse(buildSitemapIndexXml(entries));
}
