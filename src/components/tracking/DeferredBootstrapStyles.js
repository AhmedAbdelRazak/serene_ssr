"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const BOOTSTRAP_LINK_ID = "serene-bootstrap-css";
const BOOTSTRAP_HREF =
	"https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css";
const BOOTSTRAP_INTEGRITY =
	"sha384-ggOyR0iXCbMQv3Xipma34MD+dH/1fQ784/j6cY/iJTQUOhcWr7x9JvoRxT2MZw1T";

function ensureBootstrapStylesheet() {
	if (typeof window === "undefined" || typeof document === "undefined") return;
	if (document.getElementById(BOOTSTRAP_LINK_ID)) return;
	const link = document.createElement("link");
	link.id = BOOTSTRAP_LINK_ID;
	link.rel = "stylesheet";
	link.href = BOOTSTRAP_HREF;
	link.crossOrigin = "anonymous";
	link.integrity = BOOTSTRAP_INTEGRITY;
	document.head.appendChild(link);
}

export default function DeferredBootstrapStyles() {
	const pathname = usePathname();

	useEffect(() => {
		if (typeof window === "undefined") return undefined;
		const normalized = `${pathname || ""}`.toLowerCase();

		// Keep non-home routes fully compatible by loading bootstrap immediately.
		if (normalized && normalized !== "/") {
			ensureBootstrapStylesheet();
			return undefined;
		}

		// Home page: defer bootstrap to keep first paint/lightweight metrics better.
		let loaded = false;
		const loadOnce = () => {
			if (loaded) return;
			loaded = true;
			ensureBootstrapStylesheet();
			window.removeEventListener("pointerdown", loadOnce);
			window.removeEventListener("keydown", loadOnce);
			window.removeEventListener("touchstart", loadOnce);
			window.removeEventListener("scroll", loadOnce);
		};

		window.addEventListener("pointerdown", loadOnce, {
			once: true,
			passive: true,
		});
		window.addEventListener("keydown", loadOnce, {
			once: true,
			passive: true,
		});
		window.addEventListener("touchstart", loadOnce, {
			once: true,
			passive: true,
		});
		window.addEventListener("scroll", loadOnce, {
			once: true,
			passive: true,
		});

		const timeoutId = window.setTimeout(loadOnce, 12000);

		return () => {
			window.clearTimeout(timeoutId);
			window.removeEventListener("pointerdown", loadOnce);
			window.removeEventListener("keydown", loadOnce);
			window.removeEventListener("touchstart", loadOnce);
			window.removeEventListener("scroll", loadOnce);
		};
	}, [pathname]);

	return null;
}

