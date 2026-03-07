export function escapeXml(value = "") {
	return `${value || ""}`
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

export function xmlResponse(xmlContent) {
	return new Response(xmlContent, {
		status: 200,
		headers: {
			"Content-Type": "application/xml; charset=utf-8",
			"Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600",
		},
	});
}

