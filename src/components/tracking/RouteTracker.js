"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { trackPageView } from "@/lib/tracking-client";

export default function RouteTracker() {
	const pathname = usePathname();
	const searchParams = useSearchParams();

	useEffect(() => {
		const query = searchParams?.toString() || "";
		const fullPath = query ? `${pathname}?${query}` : pathname;
		trackPageView(fullPath);
	}, [pathname, searchParams]);

	return null;
}

