"use client";

import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useLegacyRouteBootstrap } from "@/legacy_frontend/bootstrap/LegacyRouteBootstrapContext";
import { getCloudinaryOptimizedUrl } from "@/legacy_frontend/utils/image";

const NavbarTop = lazy(() => import("@/legacy_frontend/NavbarUpdate/NavbarTop"));
const NavbarBottom = lazy(() => import("@/legacy_frontend/NavbarUpdate/NavbarBottom"));
const Footer = lazy(() => import("@/legacy_frontend/Footer"));
const ChatIcon = lazy(() => import("@/legacy_frontend/Chat/ChatIcon"));

function buildFallbackLogoUrl(websiteSetup = null) {
	const logoUrl = websiteSetup?.sereneJannatLogo?.url || "/logo192.png";
	return getCloudinaryOptimizedUrl(logoUrl, {
		width: 300,
		quality: "auto",
	});
}

function PublicNavbarFallback() {
	const routeBootstrap = useLegacyRouteBootstrap();
	const fallbackLogoUrl = buildFallbackLogoUrl(routeBootstrap?.websiteSetup || null);

	return (
		<>
			<div className='serene-navbar-fallback-spacer' aria-hidden='true' />
			<nav className='serene-navbar-fallback' aria-label='Serene Jannat primary'>
				<a
					className='serene-navbar-fallback__icon serene-navbar-fallback__icon--menu'
					href='/our-products'
					aria-label='Browse products'
				>
					<span />
					<span />
					<span />
				</a>
				<a className='serene-navbar-fallback__logo' href='/'>
					<img
						src={fallbackLogoUrl}
						alt='Serene Jannat Shop'
						width='441'
						height='111'
						decoding='async'
						fetchPriority='high'
					/>
				</a>
				<div className='serene-navbar-fallback__links'>
					<a href='/signin'>Login</a>
					<a href='/signup'>Register</a>
					<a href='/sellingagent/signup'>Register as a Seller</a>
				</div>
				<a
					className='serene-navbar-fallback__icon serene-navbar-fallback__icon--cart'
					href='/cart'
					aria-label='View cart'
				>
					<svg viewBox='0 0 24 24' aria-hidden='true' focusable='false'>
						<path
							d='M7 4H3v2h2l2.2 7.2c.1.5.6.8 1 .8h8.9c.5 0 .9-.3 1-.8L20 7H8.3l-.5-1.7A1.1 1.1 0 0 0 7 4Zm2.2 12A2.3 2.3 0 1 0 11.5 18a2.3 2.3 0 0 0-2.3-2Zm7 0a2.3 2.3 0 1 0 2.3 2 2.2 2.2 0 0 0-2.3-2Z'
							fill='currentColor'
						/>
					</svg>
				</a>
			</nav>
			<style jsx>{`
				.serene-navbar-fallback {
					display: flex;
					align-items: center;
					justify-content: space-between;
					padding: 0.5rem 5rem;
					background: var(--neutral-light);
					box-shadow: var(--box-shadow-light);
					position: relative;
					z-index: 1200;
				}

				.serene-navbar-fallback-spacer {
					display: none;
				}

				.serene-navbar-fallback__logo {
					display: flex;
					text-decoration: none;
				}

				.serene-navbar-fallback__logo img {
					height: 50px;
					width: auto;
					display: block;
					object-fit: cover;
				}

				.serene-navbar-fallback__links {
					display: flex;
					align-items: center;
					gap: 1rem;
					font-size: 16px;
					font-weight: 700;
				}

				.serene-navbar-fallback__links a {
					color: var(--primary-color-dark);
					text-decoration: none;
				}

				.serene-navbar-fallback__icon {
					display: none;
					align-items: center;
					justify-content: center;
					width: 30px;
					height: 30px;
					color: var(--primary-color-dark);
					text-decoration: none;
					flex-shrink: 0;
				}

				.serene-navbar-fallback__icon--menu {
					flex-direction: column;
					gap: 4px;
				}

				.serene-navbar-fallback__icon--menu span {
					width: 22px;
					height: 2px;
					border-radius: 999px;
					background: currentColor;
				}

				.serene-navbar-fallback__icon--cart svg {
					width: 30px;
					height: 30px;
				}

				@media (max-width: 768px) {
					.serene-navbar-fallback {
						position: fixed;
						top: 0;
						left: 0;
						right: 0;
						width: 100%;
						min-height: 66px;
						padding: 0.5rem;
						background: rgba(255, 255, 255, 0.98);
						backdrop-filter: saturate(140%) blur(8px);
						-webkit-backdrop-filter: saturate(140%) blur(8px);
						z-index: 1250;
					}

					.serene-navbar-fallback-spacer {
						display: block;
						height: 66px;
					}

					.serene-navbar-fallback__icon {
						display: inline-flex;
					}

					.serene-navbar-fallback__links {
						display: none;
					}

					.serene-navbar-fallback__logo {
						flex: 1;
						justify-content: center;
						padding: 0 0.5rem;
					}
				}

				@media (min-width: 769px) {
					.serene-navbar-fallback__icon {
						display: none;
					}
				}
			`}</style>
		</>
	);
}

export default function PublicStorefrontShell({ children }) {
	const pathname = usePathname();
	const hasMountedRef = useRef(false);
	const [shouldRenderChat, setShouldRenderChat] = useState(false);
	const [shouldRenderDesktopBottomNav, setShouldRenderDesktopBottomNav] =
		useState(false);
	const [shouldRenderFooter, setShouldRenderFooter] = useState(
		() => pathname !== "/"
	);

	useEffect(() => {
		if (typeof window === "undefined") return undefined;
		if (!hasMountedRef.current) {
			hasMountedRef.current = true;
			return undefined;
		}
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
			<Suspense fallback={<PublicNavbarFallback />}>
				<NavbarTop />
			</Suspense>
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
