import React, {
	useState,
	useCallback,
	useMemo,
	lazy,
	memo,
	Suspense,
	useEffect,
} from "react";
import styled from "styled-components";

import { FaBars, FaUserPlus } from "react-icons/fa";
import { AiOutlineShoppingCart } from "react-icons/ai";
import { Link, useHistory } from "react-router-dom";
import { isAuthenticated, signout } from "../auth";
import { useCartContext } from "../cart_context";
import { useLegacyRouteBootstrap } from "../bootstrap/LegacyRouteBootstrapContext";
import {
	buildCloudinarySrcSet,
	getCloudinaryOptimizedUrl,
} from "../utils/image";

const Sidebar = lazy(() => import("./Sidebar"));
const SidebarCart = lazy(() => import("./SidebarCart"));
const LOGO_WIDTHS = [220, 320, 441];
const LOGO_SIZES = "(max-width: 768px) 180px, 348px";

function getSetupLogoUrl(websiteSetup = null, fallback = "/logo192.png") {
	return (
		websiteSetup?.sereneJannatLogo?.cloudinary_url ||
		websiteSetup?.sereneJannatLogo?.cloudinaryUrl ||
		websiteSetup?.sereneJannatLogo?.url ||
		fallback
	);
}

const NavbarTop = memo(() => {
	const [isSidebarOpen, setIsSidebarOpen] = useState(false);
	const [activeLink, setActiveLink] = useState("");
	const [isMobileViewport, setIsMobileViewport] = useState(false);
	const [authState, setAuthState] = useState(null);

	const { openSidebar2, isSidebarOpen2, total_items, websiteSetup } =
		useCartContext();
	const routeBootstrap = useLegacyRouteBootstrap();
	const navigate = useHistory();
	const user = authState?.user || null;
	const bootstrapLogoUrl = getSetupLogoUrl(routeBootstrap?.websiteSetup || null);
	const [resolvedLogoUrl, setResolvedLogoUrl] = useState(bootstrapLogoUrl);

	// Memoize the first name
	const firstName = useMemo(() => {
		return user && user.name ? user.name.split(" ")[0] : "";
	}, [user]);

	// Memoize nav link click handler
	const handleNavLinkClick = useCallback((link) => {
		setActiveLink(link);
		setIsSidebarOpen(false);
	}, []);

	// Memoize signout handler
	const handleSignout = useCallback(() => {
		signout(() => {
			navigate.push("/");
			setTimeout(() => {
				window.location.reload(false);
			}, 500);
		});
	}, [navigate]);

	// If we have a Cloudinary logo URL, generate an optimized version + WebP version
	const originalLogoUrl = resolvedLogoUrl || "/logo192.png";
	const hasCloudinaryLogo = originalLogoUrl.includes("res.cloudinary.com");
	const optimizedLogoUrl = getCloudinaryOptimizedUrl(originalLogoUrl, {
		width: 320,
		quality: "auto:eco",
	});
	const logoSrcSet = hasCloudinaryLogo
		? buildCloudinarySrcSet(originalLogoUrl, LOGO_WIDTHS, {
				quality: "auto:eco",
			})
		: "";
	const webpLogoSrcSet = hasCloudinaryLogo
		? buildCloudinarySrcSet(originalLogoUrl, LOGO_WIDTHS, {
				format: "webp",
				quality: "auto:eco",
			})
		: "";

	useEffect(() => {
		setAuthState(isAuthenticated() || null);
	}, []);

	useEffect(() => {
		setResolvedLogoUrl(
			getSetupLogoUrl(websiteSetup, bootstrapLogoUrl || "/logo192.png")
		);
	}, [
		bootstrapLogoUrl,
		websiteSetup?.sereneJannatLogo?.cloudinary_url,
		websiteSetup?.sereneJannatLogo?.cloudinaryUrl,
		websiteSetup?.sereneJannatLogo?.url,
	]);

	useEffect(() => {
		if (typeof window === "undefined") return undefined;
		const mediaQuery = window.matchMedia("(max-width: 768px)");
		const syncViewport = () => {
			setIsMobileViewport(mediaQuery.matches);
		};

		syncViewport();
		if (typeof mediaQuery.addEventListener === "function") {
			mediaQuery.addEventListener("change", syncViewport);
			return () => {
				mediaQuery.removeEventListener("change", syncViewport);
			};
		}

		mediaQuery.addListener(syncViewport);
		return () => {
			mediaQuery.removeListener(syncViewport);
		};
	}, []);

	return (
		<>
			{isSidebarOpen && <Overlay onClick={() => setIsSidebarOpen(false)} />}
			<MobileTopSpacer />

			<NavbarTopWrapper id='serene-navbar-top'>
				{/* Hamburger menu icon (mobile) */}
				<MenuIcon onClick={() => setIsSidebarOpen(true)} />

				<Link to='/' style={{ textDecoration: "none", display: "flex" }}>
					<picture>
						{webpLogoSrcSet ? (
							<source
								srcSet={webpLogoSrcSet}
								type='image/webp'
								sizes={LOGO_SIZES}
							/>
						) : null}
						<Logo
							src={optimizedLogoUrl}
							srcSet={logoSrcSet || undefined}
							sizes={logoSrcSet ? LOGO_SIZES : undefined}
							alt='Serene Jannat Shop'
							width={441}
							height={111}
							decoding='async'
							fetchPriority='high'
						/>
					</picture>
				</Link>

				{/* Nav links (desktop) */}
				<NavLinks>
					{/* Admin user */}
					{user && user.name && user.role === 1 && (
						<>
							<NavLink
								as={Link}
								to='/admin/dashboard'
								onClick={() => handleNavLinkClick("/admin/dashboard")}
								className={activeLink === "/admin/dashboard" ? "active" : ""}
							>
								<FaUserPlus /> Hello {firstName}
							</NavLink>
							<NavLink
								as={Link}
								to='#signout'
								onClick={(e) => {
									e.preventDefault();
									handleSignout();
								}}
							>
								Signout
							</NavLink>
						</>
					)}

					{/* Seller user */}

					{user && user.name && user.role === 2000 && (
						<>
							<NavLink
								as={Link}
								to='/seller/dashboard'
								onClick={() => handleNavLinkClick("/seller/dashboard")}
								className={activeLink === "/seller/dashboard" ? "active" : ""}
							>
								<FaUserPlus /> Hello {firstName}
							</NavLink>
							<NavLink
								as={Link}
								to='#signout'
								onClick={(e) => {
									e.preventDefault();
									handleSignout();
								}}
							>
								Signout
							</NavLink>
						</>
					)}

					{/* Regular user */}
					{user && user.name && user.role === 0 && (
						<>
							<FaUserPlus />
							<NavLink
								as={Link}
								to='/dashboard'
								onClick={() => handleNavLinkClick("/dashboard")}
								className={activeLink === "/dashboard" ? "active" : ""}
							>
								Hello {firstName}
							</NavLink>
							<NavLink
								as={Link}
								to='#signout'
								onClick={(e) => {
									e.preventDefault();
									handleSignout();
								}}
							>
								Signout
							</NavLink>
						</>
					)}

					{/* Not logged in */}
					{(!user || !user.name) && (
						<>
							<NavLink
								as={Link}
								to='/signin'
								onClick={() => handleNavLinkClick("/signin")}
								className={activeLink === "/signin" ? "active" : ""}
							>
								Login
							</NavLink>
							<NavLink
								as={Link}
								to='/signup'
								onClick={() => handleNavLinkClick("/signup")}
								className={activeLink === "/signup" ? "active" : ""}
							>
								Register
							</NavLink>
							<NavLink
								as={Link}
								to='/sellingagent/signup'
								onClick={() => handleNavLinkClick("/sellingagent/signup")}
								className={
									activeLink === "/sellingagent/signup" ? "active" : ""
								}
							>
								Register as a Seller
							</NavLink>
						</>
					)}
				</NavLinks>

				{/* Cart icon (mobile) */}
				<CartIcon onClick={() => openSidebar2()} />
				{total_items > 0 && <Badge>{total_items}</Badge>}
			</NavbarTopWrapper>

			{/* Sidebar overlays */}
			{isSidebarOpen ? (
				<Suspense fallback={null}>
					<Sidebar
						isSidebarOpen={isSidebarOpen}
						setIsSidebarOpen={setIsSidebarOpen}
						handleNavLinkClick={handleNavLinkClick}
						activeLink={activeLink}
						setActiveLink={setActiveLink}
					/>
				</Suspense>
			) : null}
			{isSidebarOpen2 && isMobileViewport ? (
				<Suspense fallback={null}>
					<SidebarCart from='NavbarTop' />
				</Suspense>
			) : null}
		</>
	);
});

export default NavbarTop;

/* ========== Styled Components (unchanged) ========== */

const NavbarTopWrapper = styled.nav`
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 0.5rem 5rem;
	background-color: var(--neutral-light);
	box-shadow: var(--box-shadow-light);
	position: relative;
	z-index: 1200;
	transition:
		background-color 220ms ease,
		box-shadow 220ms ease;
	will-change: background-color, box-shadow;
	transform: translateZ(0);

	@media (max-width: 768px) {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		width: 100%;
		min-height: 66px;
		z-index: 1250;
		background-color: rgba(255, 255, 255, 0.98);
		backdrop-filter: saturate(140%) blur(8px);
		-webkit-backdrop-filter: saturate(140%) blur(8px);
		padding: 0.5rem 0.5rem;
		.nav-links {
			display: none;
		}
		.logo {
			flex-grow: 1;
		}
	}
	@media (min-width: 769px) {
		.menu-icon,
		.cart-icon {
			display: none;
		}
		.logo {
			flex-grow: 0;
		}
	}
`;

const MobileTopSpacer = styled.div`
	display: none;

	@media (max-width: 768px) {
		display: block;
		height: 66px;
	}
`;

const Logo = styled.img`
	height: 50px;
	width: auto;
	cursor: pointer;
	object-fit: cover !important;
`;

const MenuIcon = styled(FaBars)`
	width: 30px;
	height: 30px;
	cursor: pointer;
	color: var(--primary-color-dark);

	@media (min-width: 769px) {
		display: none;
	}
`;

const CartIcon = styled(AiOutlineShoppingCart)`
	width: 30px;
	height: 30px;
	cursor: pointer;
	color: var(--primary-color-dark);

	@media (min-width: 769px) {
		display: none;
	}
`;

const NavLinks = styled.div`
	display: flex;
	gap: 1rem;
	align-items: center;
	font-weight: bold;

	@media (max-width: 768px) {
		display: none;
	}
`;

const NavLink = styled.a`
	color: var(--primary-color-dark);
	text-decoration: none;
	font-size: 16px;
	font-weight: bolder;
	&:hover {
		color: var(--secondary-color-dark);
	}
`;

const Overlay = styled.div`
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background-color: rgba(0, 0, 0, 0.5);
	z-index: 5;
`;

const Badge = styled.span`
	position: absolute;
	top: 0px;
	right: 0px;
	background: var(--primary-color-darker);
	color: var(--neutral-light);
	border-radius: 50%;
	padding: 1px 6px;
	font-size: 12px;
	font-weight: bold;

	@media (min-width: 769px) {
		display: none;
	}
`;
