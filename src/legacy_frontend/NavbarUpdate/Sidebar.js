import React, { useEffect } from "react";
import styled, { keyframes, css } from "styled-components";
import { Link } from "react-router-dom";
import {
	FaTimes,
	FaHome,
	FaProductHunt,
	FaUserAlt,
	FaMailBulk,
	FaSignInAlt,
	FaUserPlus,
} from "react-icons/fa";
import { isAuthenticated, signout } from "../auth";
import { useCartContext } from "../cart_context";

/* Keyframes for the fade animations */
const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateX(-100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
`;

const fadeOut = keyframes`
  from {
    opacity: 1;
    transform: translateX(0);
  }
  to {
    opacity: 0;
    transform: translateX(-100%);
  }
`;

/**
 * Helper to insert Cloudinary transformations (f_auto,q_auto,w_{width}).
 * If it's not a Cloudinary URL, return as is.
 * Optionally, force webp by appending ",f_webp" if `forceWebP=true`.
 */
const getCloudinaryOptimizedUrl = (
	url,
	{ width = 300, forceWebP = false } = {}
) => {
	if (!url || !url.includes("res.cloudinary.com")) {
		return url; // Not a Cloudinary URL
	}

	let newUrl = url;
	const hasTransform = newUrl.includes("f_auto") || newUrl.includes("q_auto");

	// If no transformations exist, insert them after "/upload/"
	if (!hasTransform) {
		const parts = newUrl.split("/upload/");
		if (parts.length === 2) {
			const base = `f_auto,q_auto,w_${width}`;
			const finalTx = forceWebP ? `${base},f_webp` : base;
			newUrl = `${parts[0]}/upload/${finalTx}/${parts[1]}`;
		}
	} else {
		// There's already "f_auto,q_auto" in the URL, but we might still need w_{width} or f_webp
		if (!newUrl.match(/w_\d+/)) {
			newUrl = newUrl.replace("f_auto,q_auto", `f_auto,q_auto,w_${width}`);
		}
		if (forceWebP && !newUrl.includes("f_webp")) {
			newUrl = newUrl.replace("f_auto,q_auto", "f_auto,q_auto,f_webp");
		}
	}

	return newUrl;
};

const Sidebar = ({
	isSidebarOpen,
	setIsSidebarOpen,
	handleNavLinkClick,
	activeLink,
	setActiveLink,
}) => {
	const auth = isAuthenticated() || {};
	const user = auth.user || null;
	const { websiteSetup } = useCartContext();
	const firstName = user?.name ? user.name.split(" ")[0] : "";

	useEffect(() => {
		const handleLocationChange = () => {
			const path = window.location.pathname;
			if (path === "/") {
				setActiveLink("home");
			} else if (path === "/our-products") {
				setActiveLink("products");
			} else if (path.startsWith("/custom-gifts")) {
				setActiveLink("customgifts");
			} else if (path === "/about") {
				setActiveLink("about");
			} else if (path === "/contact") {
				setActiveLink("contact");
			} else {
				setActiveLink("");
			}
		};

		handleLocationChange();
		window.addEventListener("popstate", handleLocationChange);

		return () => {
			window.removeEventListener("popstate", handleLocationChange);
		};
	}, [setActiveLink]);

	useEffect(() => {
		const previousOverflow = document.body.style.overflow;
		if (isSidebarOpen) {
			document.body.style.overflow = "hidden";
		}
		return () => {
			document.body.style.overflow = previousOverflow;
		};
	}, [isSidebarOpen]);

	const handleSignout = () => {
		signout(() => {
			window.location.href = "/";
		});
	};

	// If we have a Cloudinary logo URL, create both a fallback JPEG and WebP
	let fallbackLogoUrl = "";
	let webpLogoUrl = "";

	if (websiteSetup?.sereneJannatLogo?.url) {
		const originalLogo = websiteSetup.sereneJannatLogo.url;
		// JPEG/PNG fallback
		fallbackLogoUrl = getCloudinaryOptimizedUrl(originalLogo, {
			width: 300,
			forceWebP: false,
		});
		// WebP
		webpLogoUrl = getCloudinaryOptimizedUrl(originalLogo, {
			width: 300,
			forceWebP: true,
		});
	}

	return (
		<>
			{isSidebarOpen && <Overlay onClick={() => setIsSidebarOpen(false)} />}
			<SidebarWrapper $isOpen={isSidebarOpen}>
				<CloseIcon onClick={() => setIsSidebarOpen(false)} />

				{fallbackLogoUrl && (
					<Logo $isOpen={isSidebarOpen}>
						<picture>
							<source srcSet={webpLogoUrl} type='image/webp' />
							<img
								src={fallbackLogoUrl}
								alt='Serene Janat Shop Logo'
								loading='lazy'
								decoding='async'
								width={300}
								height={76}
							/>
						</picture>
					</Logo>
				)}

				<HorizontalLine />

				<NavContainer>
					<StyledLink
						to='/'
						onClick={() => handleNavLinkClick("home")}
						$isActive={activeLink === "home"}
					>
						<FaHome /> Home
					</StyledLink>

					<StyledLink
						to='/our-products'
						onClick={() => handleNavLinkClick("products")}
						$isActive={activeLink === "products"}
					>
						<FaProductHunt /> Products
					</StyledLink>

					<StyledLink
						to='/custom-gifts'
						onClick={() => handleNavLinkClick("customgifts")}
						$isActive={activeLink === "customgifts"}
					>
						<FaProductHunt /> Print on Demand
					</StyledLink>

					<StyledLink
						to='/about'
						onClick={() => handleNavLinkClick("about")}
						$isActive={activeLink === "about"}
					>
						<FaUserAlt /> About
					</StyledLink>

					<StyledLink
						to='/contact'
						onClick={() => handleNavLinkClick("contact")}
						$isActive={activeLink === "contact"}
					>
						<FaMailBulk /> Contact Us
					</StyledLink>
				</NavContainer>

				<AuthLinksContainer>
					{user && user.role === 1 ? (
						<>
							<AuthLink
								to='/admin/dashboard'
								onClick={() => setIsSidebarOpen(false)}
							>
								<FaUserPlus /> <span>Hello {firstName}</span>
							</AuthLink>
							<AuthLink as='button' type='button' onClick={handleSignout}>
								Signout
							</AuthLink>
						</>
					) : null}

					{user && user.role === 0 ? (
						<>
							<AuthLink to='/dashboard' onClick={() => setIsSidebarOpen(false)}>
								<FaUserPlus /> <span>Hello {firstName}</span>
							</AuthLink>
							<AuthLink as='button' type='button' onClick={handleSignout}>
								Signout
							</AuthLink>
						</>
					) : null}

					{(!user || !user.name) && (
						<>
							<AuthLink
								to='/signin'
								onClick={() => handleNavLinkClick("login")}
								$isActive={activeLink === "login"}
							>
								<FaSignInAlt /> Login
							</AuthLink>
							<AuthLink
								to='/signup'
								onClick={() => handleNavLinkClick("register")}
								$isActive={activeLink === "register"}
							>
								<FaUserPlus /> Register
							</AuthLink>
						</>
					)}
				</AuthLinksContainer>
			</SidebarWrapper>
		</>
	);
};

export default Sidebar;

/* -------------- STYLED COMPONENTS -------------- */

/* Overlay behind the sidebar */
const Overlay = styled.div`
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background-color: rgba(0, 0, 0, 0.5);
	z-index: 1400;
	animation: ${fadeIn} 0.3s ease-in-out;
`;

/* The sidebar container */
const SidebarWrapper = styled.div`
	position: fixed;
	top: 0;
	left: 0;
	width: min(86vw, 320px);
	height: 100vh;
	background: var(--primary-color-darker);
	padding: 24px 18px 16px;
	transform: translateX(${(props) => (props.$isOpen ? "0" : "-100%")});
	transition: transform 0.3s ease;
	z-index: 1401;
	display: flex;
	flex-direction: column;
	align-items: center;
	box-shadow: 0 0 28px rgba(0, 0, 0, 0.45);

	animation: ${(props) =>
		props.$isOpen
			? css`
					${fadeIn} 0.3s ease forwards
				`
			: css`
					${fadeOut} 0.3s ease forwards
				`};
`;

const CloseIcon = styled(FaTimes)`
	position: absolute;
	top: 12px;
	right: 12px;
	cursor: pointer;
	color: var(--neutral-light);
	font-size: 22px;
`;

/* The logo container */
const Logo = styled.div`
	width: 95%;
	margin-bottom: 14px;
	padding: 5px;
	border-radius: 5px;
	background-color: var(--neutral-light);
	margin-top: 18px;

	animation: ${(props) =>
		props.$isOpen
			? css`
					${fadeIn} 1s ease forwards
				`
			: "none"};

	img {
		width: 76%;
		height: auto;
		display: block;
		text-align: center;
		margin: auto;
		object-fit: cover !important;
	}
`;

const HorizontalLine = styled.div`
	width: 75%;
	height: 2px;
	background-color: var(--neutral-light);
	margin-bottom: 14px;
`;

const NavContainer = styled.div`
	width: 100%;
	overflow-y: auto;
	padding-right: 4px;
`;

/* We rename isActive => $isActive for styling */
const StyledLink = styled(Link)`
	display: flex;
	align-items: center;
	gap: 10px;
	color: ${(props) =>
		props.$isActive ? "var(--accent-color-1)" : "var(--neutral-light)"};
	font-size: 18px;
	text-decoration: none;
	padding: 10px 12px;
	margin-bottom: 14px;
	width: 100%;
	text-align: left;
	border-radius: 5px;
	border: 0;
	background: transparent;
	cursor: pointer;
	font-family: inherit;

	&:hover {
		background-color: var(--accent-color-1);
		color: var(--neutral-dark);
	}
`;

const AuthLinksContainer = styled.div`
	width: 100%;
	margin-top: auto;
	padding-top: 10px;
	border-top: 1px solid rgba(255, 255, 255, 0.2);

	a {
		text-decoration: underline;
		font-weight: bolder;
		color: var(--neutral-light);
	}
`;

/* Reuse StyledLink for AuthLink */
const AuthLink = styled(StyledLink)`
	display: flex;
	align-items: center;
	gap: 5px;

	span {
		font-size: 16px;
	}
`;
