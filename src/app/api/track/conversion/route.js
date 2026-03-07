import { API_BASE_URL } from "@/lib/config";

export async function POST(request) {
	try {
		const payload = await request.json();
		const response = await fetch(`${API_BASE_URL}/facebookpixel/conversionapi`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(payload),
			cache: "no-store",
		});

		const text = await response.text();
		return new Response(text, {
			status: response.status,
			headers: {
				"Content-Type": response.headers.get("content-type") || "application/json",
			},
		});
	} catch (error) {
		return Response.json(
			{ error: error?.message || "Failed to forward conversion event." },
			{ status: 500 }
		);
	}
}

