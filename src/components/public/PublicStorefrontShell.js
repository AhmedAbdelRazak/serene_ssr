"use client";

import { Suspense, lazy, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import NavbarTop from "@/legacy_frontend/NavbarUpdate/NavbarTop";

const NavbarBottom = lazy(() => import("@/legacy_frontend/NavbarUpdate/NavbarBottom"));
const Footer = lazy(() => import("@/legacy_frontend/Footer"));
const ChatIcon = lazy(() => import("@/legacy_frontend/Chat/ChatIcon"));

export default function PublicStorefrontShell({ children }) {
	const pathname = usePathname();
	const [shouldRenderChat, setShouldRenderChat] = useState(false);
	const [shouldRenderDesktopBottomNav, setShouldRenderDesktopBottomNav] =
		useState(false);
	const [shouldRenderFooter, setShouldRenderFooter] = useState(
		() => pathname !== "/"
	);

	useEffect(() => {
		if (typeof window === "undefined") return undefined;
		window.scrollTo({ top: 0, left: 0, behavior: "auto" });
		return undefined;
	}, [pathname]);

	useEffect(() => {
		if (typeof window === "undefined") return undefined;
		const mediaQuery = window.matchMedia("(min-width: 769px)");
		const syncDesktopBottomNav = () => {
			setShouldRenderDesktopBottomNav(mediaQuery.matches);
		};

		syncDesktopBottomNav();
		if (typeof mediaQuery.addEventListener === "function") {
			mediaQuery.addEventListener("change", syncDesktopBottomNav);
			return () => {
				mediaQuery.removeEventListener("change", syncDesktopBottomNav);
			};
		}

		mediaQuery.addListener(syncDesktopBottomNav);
		return () => {
			mediaQuery.removeListener(syncDesktopBottomNav);
		};
	}, []);

	useEffect(() => {
		if (typeof window === "undefined") return undefined;
		if (pathname && pathname !== "/") {
			setShouldRenderFooter(true);
			return undefined;
		}

		setShouldRenderFooter(false);
		let idleId = null;
		let timeoutId = null;
		let revealed = false;

		const revealFooter = () => {
			if (revealed) return;
			revealed = true;
			setShouldRenderFooter(true);
			window.removeEventListener("pointerdown", revealFooter);
			window.removeEventListener("keydown", revealFooter);
			window.removeEventListener("touchstart", revealFooter);
			window.removeEventListener("scroll", revealFooter);
		};

		window.addEventListener("pointerdown", revealFooter, {
			passive: true,
			once: true,
		});
		window.addEventListener("keydown", revealFooter, {
			passive: true,
			once: true,
		});
		window.addEventListener("touchstart", revealFooter, {
			passive: true,
			once: true,
		});
		window.addEventListener("scroll", revealFooter, {
			passive: true,
			once: true,
		});

		if (typeof window.requestIdleCallback === "function") {
			idleId = window.requestIdleCallback(revealFooter, { timeout: 2500 });
		} else {
			timeoutId = window.setTimeout(revealFooter, 1800);
		}

		return () => {
			revealed = true;
			if (idleId && typeof window.cancelIdleCallback === "function") {
				window.cancelIdleCallback(idleId);
			}
			if (timeoutId) {
				window.clearTimeout(timeoutId);
			}
			window.removeEventListener("pointerdown", revealFooter);
			window.removeEventListener("keydown", revealFooter);
			window.removeEventListener("touchstart", revealFooter);
			window.removeEventListener("scroll", revealFooter);
		};
	}, [pathname]);

	useEffect(() => {
		if (typeof window === "undefined") return undefined;
		if (shouldRenderChat) return undefined;

		let enabled = false;
		const enableChat = () => {
			if (enabled) return;
			enabled = true;
			setShouldRenderChat(true);
			window.removeEventListener("pointerdown", enableChat);
			window.removeEventListener("keydown", enableChat);
			window.removeEventListener("touchstart", enableChat);
		};

		window.addEventListener("pointerdown", enableChat, {
			once: true,
			passive: true,
		});
		window.addEventListener("keydown", enableChat, {
			once: true,
			passive: true,
		});
		window.addEventListener("touchstart", enableChat, {
			once: true,
			passive: true,
		});

		const timeoutId = window.setTimeout(enableChat, 15000);
		return () => {
			window.clearTimeout(timeoutId);
			window.removeEventListener("pointerdown", enableChat);
			window.removeEventListener("keydown", enableChat);
			window.removeEventListener("touchstart", enableChat);
		};
	}, [shouldRenderChat]);

	return (
		<>
			<NavbarTop />
			{shouldRenderDesktopBottomNav ? (
				<Suspense fallback={null}>
					<NavbarBottom />
				</Suspense>
			) : null}
			<main id='main-content' role='main'>
				{children}
				{shouldRenderChat ? (
					<Suspense fallback={null}>
						<ChatIcon />
					</Suspense>
				) : null}
				{shouldRenderFooter ? (
					<Suspense fallback={<div style={{ minHeight: "160px" }} />}>
						<Footer />
					</Suspense>
				) : null}
			</main>
		</>
	);
}
