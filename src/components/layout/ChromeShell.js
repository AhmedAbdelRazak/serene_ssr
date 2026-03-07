"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";

export default function ChromeShell({ children }) {
	const pathname = usePathname();
	const hideLayout = useMemo(() => {
		const path = `${pathname || ""}`.toLowerCase();
		const legacyStandaloneRoutes = [
			"/",
			"/admin",
			"/seller",
			"/signin",
			"/signup",
			"/sellingagent",
			"/dashboard",
			"/cart",
			"/payment-link",
			"/about",
			"/contact",
			"/privacy-policy-terms-conditions",
			"/cookie-policy",
			"/return-refund-policy",
		];
		if (legacyStandaloneRoutes.includes(path)) {
			return true;
		}
		if (path.startsWith("/admin/")) return true;
		if (path.startsWith("/seller/")) return true;
		if (path.startsWith("/payment-link/")) return true;
		if (path.startsWith("/our-products")) return true;
		if (path.startsWith("/custom-gifts")) return true;
		if (path.startsWith("/single-product/")) return true;
		return false;
	}, [pathname]);

	return (
		<>
			{!hideLayout ? <SiteHeader /> : null}
			<main className={`page-main ${hideLayout ? "page-main--legacy" : ""}`}>
				{children}
			</main>
			{!hideLayout ? <SiteFooter /> : null}
		</>
	);
}
