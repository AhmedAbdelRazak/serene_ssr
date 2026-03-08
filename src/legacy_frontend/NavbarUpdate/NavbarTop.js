import React, { useState, useCallback, useMemo, lazy, memo } from "react";
import styled from "styled-components";

import { FaBars, FaUserPlus } from "react-icons/fa";
import { AiOutlineShoppingCart } from "react-icons/ai";
import { Link, useHistory } from "react-router-dom";
import { isAuthenticated, signout } from "../auth";
import { useCartContext } from "../cart_context";

const Sidebar = lazy(() => import("./Sidebar"));
const SidebarCart = lazy(() => import("./SidebarCart"));

/**
 * Helper to transform Cloudinary URLs by inserting f_auto,q_auto,
 * and an optional w_{width}.
 * If it's not a Cloudinary URL or already has transformations, return as is.
 */
const getCloudinaryOptimizedUrl = (url, { width = 300 } = {}) => {
	if (!url?.includes("res.cloudinary.com")) return url;
	if (url.includes("f_auto") || url.includes("q_auto")) return url;

	const parts = url.split("/upload/");
	if (parts.length === 2) {
		return `${parts[0]}/upload/f_auto,q_auto,w_${width}/${parts[1]}`;
	}
	return url;
};

const NavbarTop = memo(() => {
	const [isSidebarOpen, setIsSidebarOpen] = useState(false);
	const [isCartOpen, setIsCartOpen] = useState(false);
	const [activeLink, setActiveLink] = useState("");

	const { user } = isAuthenticated();
	const { openSidebar2, total_items, websiteSetup } = useCartContext();
	const navigate = useHistory();

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
	let optimizedLogoUrl = "";
	let webpLogoUrl = "";

	if (websiteSetup?.sereneJannatLogo?.url) {
		const originalLogoUrl = websiteSetup.sereneJannatLogo.url;
		optimizedLogoUrl = getCloudinaryOptimizedUrl(originalLogoUrl, {
			width: 300,
		});
		// Force WebP
		webpLogoUrl = optimizedLogoUrl.replace(
			"/f_auto,q_auto",
			"/f_auto,q_auto,f_webp"
		);
	}

	return (
		<>
			{isSidebarOpen && <Overlay onClick={() => setIsSidebarOpen(false)} />}

			<NavbarTopWrapper>
				{/* Hamburger menu icon (mobile) */}
				<MenuIcon onClick={() => setIsSidebarOpen(true)} />

				{/* Logo (only if we have a URL) */}
				{optimizedLogoUrl && (
					<Link to='/' style={{ textDecoration: "none", display: "flex" }}>
						<picture>
							<source srcSet={webpLogoUrl} type='image/webp' />
							<Logo
								src={optimizedLogoUrl}
								alt='Serene Jannat Shop'
								width={441}
								height={111}
								decoding='async'
								fetchPriority='high'
							/>
						</picture>
					</Link>
				)}

				{/* Nav links (desktop) */}
				<NavLinks
					onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
				>
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
			<Sidebar
				isSidebarOpen={isSidebarOpen}
				setIsSidebarOpen={setIsSidebarOpen}
				handleNavLinkClick={handleNavLinkClick}
				activeLink={activeLink}
				setActiveLink={setActiveLink}
			/>
			<SidebarCart
				isCartOpen={isCartOpen}
				setIsCartOpen={setIsCartOpen}
				from='NavbarTop'
			/>
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

	@media (max-width: 600px) {
		position: sticky;
		top: 0;
		z-index: 1250;
		background-color: rgba(255, 255, 255, 0.95);
		backdrop-filter: saturate(145%) blur(8px);
		-webkit-backdrop-filter: saturate(145%) blur(8px);
	}
	@media (max-width: 768px) {
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
