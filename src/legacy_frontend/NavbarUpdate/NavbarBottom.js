import React, { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { AiOutlineShoppingCart } from "react-icons/ai"; // Import for cart icon
import SidebarCart from "./SidebarCart"; // Import SidebarCart
import { Link, useLocation } from "react-router-dom";
import { useCartContext } from "../cart_context";

const NavbarBottom = () => {
	const [clickedLink, setClickedLink] = useState("");
	const [isSticky, setIsSticky] = useState(false);
	const rafRef = useRef(null);
	const lastStickyStateRef = useRef(false);
	const location = useLocation();
	const { openSidebar2, total_items } = useCartContext();

	// Sticky style logic (position is CSS sticky; JS only controls visual state).
	useEffect(() => {
		const handleScroll = () => {
			if (rafRef.current) return;
			rafRef.current = window.requestAnimationFrame(() => {
				const nextStickyState = window.scrollY > 8;
				if (lastStickyStateRef.current !== nextStickyState) {
					lastStickyStateRef.current = nextStickyState;
					setIsSticky(nextStickyState);
				}
				rafRef.current = null;
			});
		};

		handleScroll();
		window.addEventListener("scroll", handleScroll, { passive: true });
		return () => {
			window.removeEventListener("scroll", handleScroll);
			if (rafRef.current) {
				window.cancelAnimationFrame(rafRef.current);
				rafRef.current = null;
			}
		};
	}, []);

	// Track the current pathname to highlight active link
	useEffect(() => {
		const path = location.pathname;
		if (path === "/") {
			setClickedLink("home");
		} else if (path === "/our-products") {
			setClickedLink("products");
		} else if (path.startsWith("/custom-gifts")) {
			setClickedLink("customgifts");
		} else if (path === "/about") {
			setClickedLink("about");
		} else if (path === "/contact") {
			setClickedLink("contact");
		} else {
			setClickedLink("");
		}
	}, [location.pathname]);

	const handleNavLinkClick = (link) => {
		setClickedLink(link);
	};

	return (
		<>
			<NavbarBottomWrapper $isSticky={isSticky}>
				<NavLinks
					onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
				>
					<StyledNavLink
						$isSticky={isSticky}
						to='/'
						onClick={() => handleNavLinkClick("home")}
						className={clickedLink === "home" ? "active" : ""}
					>
						Home
					</StyledNavLink>
					<StyledNavLink
						$isSticky={isSticky}
						to='/our-products'
						onClick={() => handleNavLinkClick("products")}
						className={clickedLink === "products" ? "active" : ""}
					>
						Products
					</StyledNavLink>
					<StyledNavLink
						$isSticky={isSticky}
						to='/custom-gifts'
						onClick={() => handleNavLinkClick("customgifts")}
						className={clickedLink === "customgifts" ? "active" : ""}
					>
						Print on Demand
					</StyledNavLink>
					<StyledNavLink
						$isSticky={isSticky}
						to='/about'
						onClick={() => handleNavLinkClick("about")}
						className={clickedLink === "about" ? "active" : ""}
					>
						About
					</StyledNavLink>
					<StyledNavLink
						$isSticky={isSticky}
						to='/contact'
						onClick={() => handleNavLinkClick("contact")}
						className={clickedLink === "contact" ? "active" : ""}
					>
						Contact Us
					</StyledNavLink>
				</NavLinks>

				<CartIconWrapper>
					<CartIcon $isSticky={isSticky} onClick={() => openSidebar2()} />
					{total_items > 0 && <Badge>{total_items}</Badge>}
				</CartIconWrapper>
			</NavbarBottomWrapper>

			<SidebarCart from='NavbarBottom' />
		</>
	);
};

export default NavbarBottom;

/* ========== Styled Components ========== */

const NavbarBottomWrapper = styled.nav`
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 0.5rem 5rem;
	position: sticky;
	top: 0;
	z-index: 1150;
	background-color: ${(props) =>
		props.$isSticky ? "rgba(62, 62, 62, 0.94)" : "var(--accent-color-2-dark)"};
	color: var(--text-color-secondary);
	box-shadow: ${(props) =>
		props.$isSticky
			? "0 8px 24px rgba(0, 0, 0, 0.18)"
			: "0 2px 8px rgba(0, 0, 0, 0.08)"};
	transition:
		background-color 220ms ease,
		box-shadow 220ms ease;
	will-change: background-color, box-shadow;
	backdrop-filter: saturate(150%) blur(8px);
	-webkit-backdrop-filter: saturate(150%) blur(8px);
	transform: translateZ(0);

	@media (max-width: 768px) {
		display: none;
	}
`;

const NavLinks = styled.div`
	display: flex;
	flex: 1; /* Takes up available space */
	justify-content: center; /* Center links */
	align-items: center;
`;

const StyledNavLink = styled(Link)`
	color: ${(props) =>
		props.$isSticky ? "var(--neutral-light)" : "var(--text-color-light)"};
	text-decoration: none;
	margin: 0 20px;
	font-size: 1.1rem;
	font-weight: bolder;
	padding: 10px;
	border-radius: 5px;
	transition:
		background-color 0.3s ease,
		color 0.3s ease;

	&:hover,
	&.active {
		background-color: var(--background-accent);
		color: var(--text-color-dark);
	}
`;

const CartIconWrapper = styled.div`
	position: relative;
	display: flex;
	align-items: center;
	margin-left: auto;
	padding-right: 0.5rem;
`;

const CartIcon = styled(AiOutlineShoppingCart)`
	color: ${(props) =>
		props.$isSticky ? "var(--text-color-light)" : "var(--text-color-light)"};
	width: 30px;
	height: 30px;
	cursor: pointer;
`;

const Badge = styled.span`
	position: absolute;
	top: -8px;
	right: -4px;
	background: var(--primary-color-darker);
	color: var(--neutral-light);
	border-radius: 50%;
	padding: 2px 6px;
	font-size: 12px;
	font-weight: bold;
`;
