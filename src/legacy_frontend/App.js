import React, { useEffect, Suspense, lazy, useState } from "react";
import {
	BrowserRouter as Router,
	Switch,
	Route,
	useLocation,
} from "react-router-dom";

import NavbarTop from "./NavbarUpdate/NavbarTop";
import Home from "./pages/Home/Home";
// eslint-disable-next-line
// import AnimationWalkingComponent from "./pages/MyAnimationComponents/AnimationWalkingComponent";
// eslint-disable-next-line
// import AnimationKickoff from "./pages/MyAnimationComponents/AnimationKickoff";
// eslint-disable-next-line
// import AnimationWalkingGreeting from "./pages/MyAnimationComponents/AnimationWalkingGreeting";
// import AnimationProductPresentation from "./pages/MyAnimationComponents/AnimationProductPresentation";

const ToastContainer = lazy(() =>
	import("react-toastify").then((mod) => ({ default: mod.ToastContainer }))
);
const NavbarBottom = lazy(() => import("./NavbarUpdate/NavbarBottom"));
const Footer = lazy(() => import("./Footer"));

const GA_MEASUREMENT_ID =
	process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_MEASUREMENTID ||
	process.env.REACT_APP_GOOGLE_ANALYTICS_MEASUREMENTID ||
	"";
const FB_PIXEL_ID =
	process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID ||
	process.env.REACT_APP_FACEBOOK_PIXEL_ID ||
	"";
const BOOTSTRAP_LINK_ID = "serene-bootstrap-css";
const BOOTSTRAP_HREF =
	"https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css";
const BOOTSTRAP_INTEGRITY =
	"sha384-ggOyR0iXCbMQv3Xipma34MD+dH/1fQ784/j6cY/iJTQUOhcWr7x9JvoRxT2MZw1T";

const loadScriptOnce = (id, src) => {
	if (typeof window === "undefined" || !src) return;
	if (document.getElementById(id)) return;
	const script = document.createElement("script");
	script.id = id;
	script.src = src;
	script.async = true;
	document.head.appendChild(script);
};

const ensureBootstrapStylesheet = () => {
	if (typeof window === "undefined" || typeof document === "undefined") return;
	if (document.getElementById(BOOTSTRAP_LINK_ID)) return;
	const link = document.createElement("link");
	link.id = BOOTSTRAP_LINK_ID;
	link.rel = "stylesheet";
	link.href = BOOTSTRAP_HREF;
	link.integrity = BOOTSTRAP_INTEGRITY;
	link.crossOrigin = "anonymous";
	document.head.appendChild(link);
};

const ensureLegacyTrackers = () => {
	if (typeof window === "undefined") return;
	if (window.__sereneLegacyTrackersReady) return;

	if (GA_MEASUREMENT_ID) {
		window.dataLayer = window.dataLayer || [];
		window.gtag =
			window.gtag ||
			function gtag() {
				window.dataLayer.push(arguments);
			};
		window.gtag("js", new Date());
		window.gtag("config", GA_MEASUREMENT_ID, { send_page_view: false });
		loadScriptOnce(
			"serene-ga-script",
			`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`
		);
	}

	if (FB_PIXEL_ID) {
		// Keep fbq behavior compatible with Pixel queueing.
		(function initFacebookPixel(f, b, e, v, n, t, s) {
			if (f.fbq) return;
			n = f.fbq = function fbqShim() {
				if (n.callMethod) {
					n.callMethod.apply(n, arguments);
				} else {
					n.queue.push(arguments);
				}
			};
			if (!f._fbq) f._fbq = n;
			n.push = n;
			n.loaded = true;
			n.version = "2.0";
			n.queue = [];
			t = b.createElement(e);
			t.async = true;
			t.src = v;
			t.id = "serene-fb-pixel-script";
			s = b.getElementsByTagName(e)[0];
			s.parentNode.insertBefore(t, s);
		})(
			window,
			document,
			"script",
			"https://connect.facebook.net/en_US/fbevents.js"
		);
		window.fbq("init", FB_PIXEL_ID);
	}

	window.__sereneLegacyTrackersReady = true;
};

const trackLegacyPageView = (pagePath = "/") => {
	if (typeof window === "undefined") return;
	if (GA_MEASUREMENT_ID && typeof window.gtag === "function") {
		window.gtag("event", "page_view", { page_path: pagePath });
	}
	if (FB_PIXEL_ID && typeof window.fbq === "function") {
		window.fbq("track", "PageView");
	}
};

const SellerDashboardMain = lazy(
	() => import("./Seller/SellerDashboard/SellerDashboardMain"),
);

const SellerStoreManagementMain = lazy(
	() => import("./Seller/StoreManagement/SellerStoreManagementMain"),
);

const SellerProductManagementMain = lazy(
	() => import("./Seller/ProductManagement/SellerProductManagementMain"),
);

const CustomerServiceSellerMain = lazy(
	() => import("./Seller/CustomerService/CustomerServiceSellerMain"),
);

const CouponManagementMain = lazy(
	() => import("./Seller/CouponManagement/CouponManagementMain"),
);

const PrintifyAvailableProducts = lazy(
	() => import("./pages/PrintOnDemand/PrintifyAvailableProducts"),
);
const CustomizeSelectedProduct = lazy(
	() => import("./pages/PrintOnDemand/CustomizeSelectedProduct"),
);
const PrintifyMain = lazy(
	() => import("./Admin/PrintifyProductManagement/PrintifyMain"),
);
const WebsiteMain = lazy(() => import("./Admin/EditingWebsite/WebsiteMain"));

// Lazy load components
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const RegisterSeller = lazy(() => import("./pages/RegisterSeller"));
const Forgot = lazy(() => import("./auth/Forgot"));
const Reset = lazy(() => import("./auth/Reset"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const CookiePolicy = lazy(() => import("./pages/CookiePolicy"));
const ReturnRefundPolicy = lazy(() => import("./pages/ReturnRefundPolicy"));
const About = lazy(() => import("./pages/About/About"));
const Cart = lazy(() => import("./pages/Checkout/Cart"));
const AdminDashboard = lazy(
	() => import("./Admin/AdminMainDashboard/AdminDashboard"),
);
const CategoriesMain = lazy(() => import("./Admin/Categories/CategoriesMain"));
const SubcategoryMain = lazy(
	() => import("./Admin/Subcategory/SubcategoryMain"),
);
const ParentMain = lazy(() => import("./Admin/Gender/GenderMain"));
const AttributesMain = lazy(() => import("./Admin/Attributes/AttributesMain"));
const ProductMain = lazy(() => import("./Admin/Product/ProductMain"));
const AdminStoreManagementMain = lazy(
	() => import("./Admin/StoreManagement/AdminStoreManagementMain"),
);

const CustomerServiceMainAdmin = lazy(
	() => import("./Admin/CustomerService/CustomerServiceMainAdmin"),
);
const StorePOSMain = lazy(() => import("./Admin/StorePOS/StorePOSMain"));
const UserDashboard = lazy(() => import("./User/UserDashboard"));
const SingleProductMain = lazy(
	() => import("./pages/SingleProduct/SingleProductMain"),
);
const ShopPageMain = lazy(() => import("./pages/ShopPage/ShopPageMain"));
const ContactUs = lazy(() => import("./pages/Contact/ContactUs"));
const ChatIcon = lazy(() => import("./Chat/ChatIcon"));
const LinkGenerated = lazy(() => import("./Admin/StorePOS/LinkGenerated"));
const CouponManagement = lazy(
	() => import("./Admin/CouponManagement/CouponManagement"),
);

const AIMarketingMain = lazy(() => import("./Admin/Marketing/AIMarketingMain"));
const AdminRoute = lazy(() => import("./auth/AdminRoute"));
const SellerRoute = lazy(() => import("./auth/SellerRoute"));
const PrivateRoute = lazy(() => import("./auth/PrivateRoute"));

/**
 * Main <App /> wraps the Router,
 * then delegates main logic to <AppContent />
 * so we can use useLocation() inside <AppContent />.
 */
const App = () => {
	return (
		<Router>
			<AppContent />
		</Router>
	);
};

const AppContent = () => {
	const location = useLocation(); // get current route info
	const [shouldRenderToast, setShouldRenderToast] = useState(false);
	const [shouldRenderChat, setShouldRenderChat] = useState(false);
	const [shouldRenderDesktopBottomNav, setShouldRenderDesktopBottomNav] =
		useState(() =>
			typeof window !== "undefined"
				? window.matchMedia("(min-width: 769px)").matches
				: false
		);
	const [shouldRenderFooter, setShouldRenderFooter] = useState(
		() => location.pathname !== "/"
	);

	// Determine if path includes 'admin' or 'seller'
	const shouldHideLayout =
		location.pathname.includes("admin") || location.pathname.includes("seller");

	useEffect(() => {
		if (typeof window === "undefined") return undefined;
		window.scrollTo({ top: 0, left: 0, behavior: "auto" });
		return undefined;
	}, [location.pathname]);

	// Initialize trackers once for legacy routes
	useEffect(() => {
		if (typeof window === "undefined") return undefined;
		let initialized = false;
		const initTrackers = () => {
			if (initialized) return;
			initialized = true;
			ensureLegacyTrackers();
			const pagePath = `${window.location.pathname || "/"}${window.location.search || ""}`;
			trackLegacyPageView(pagePath);
		};

		window.addEventListener("pointerdown", initTrackers, {
			once: true,
			passive: true,
		});
		window.addEventListener("keydown", initTrackers, {
			once: true,
			passive: true,
		});
		window.addEventListener("touchstart", initTrackers, {
			once: true,
			passive: true,
		});

		const timeoutId = window.setTimeout(initTrackers, 8000);
		return () => {
			window.clearTimeout(timeoutId);
			window.removeEventListener("pointerdown", initTrackers);
			window.removeEventListener("keydown", initTrackers);
			window.removeEventListener("touchstart", initTrackers);
		};
	}, []);

	// Defer Toastify CSS so it does not block initial paint on the homepage.
	useEffect(() => {
		if (typeof window === "undefined") return undefined;
		let loaded = false;
		const loadToastStyles = () => {
			if (loaded) return;
			loaded = true;
			import("react-toastify/dist/ReactToastify.css").catch(() => {});
			setShouldRenderToast(true);
			window.removeEventListener("pointerdown", loadToastStyles);
			window.removeEventListener("keydown", loadToastStyles);
			window.removeEventListener("touchstart", loadToastStyles);
		};
		window.addEventListener("pointerdown", loadToastStyles, {
			once: true,
			passive: true,
		});
		window.addEventListener("keydown", loadToastStyles, {
			once: true,
			passive: true,
		});
		window.addEventListener("touchstart", loadToastStyles, {
			once: true,
			passive: true,
		});
		const timeoutId = window.setTimeout(loadToastStyles, 20000);
		return () => {
			window.clearTimeout(timeoutId);
			window.removeEventListener("pointerdown", loadToastStyles);
			window.removeEventListener("keydown", loadToastStyles);
			window.removeEventListener("touchstart", loadToastStyles);
		};
	}, []);

	// Delay chat widget mount so it does not contribute to initial JS execution.
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

	useEffect(() => {
		if (typeof window === "undefined") return undefined;
		if (shouldHideLayout) {
			setShouldRenderDesktopBottomNav(false);
			return undefined;
		}

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
	}, [shouldHideLayout]);

	useEffect(() => {
		if (typeof window === "undefined") return undefined;
		if (shouldHideLayout) {
			setShouldRenderFooter(false);
			return undefined;
		}

		if (location.pathname && location.pathname !== "/") {
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
	}, [location.pathname, shouldHideLayout]);

	// Track page view on route change
	useEffect(() => {
		const pagePath = `${location.pathname || "/"}${location.search || ""}`;
		if (!window.__sereneLegacyTrackersReady) return;
		trackLegacyPageView(pagePath);
	}, [location.pathname, location.search]);

	// Route-aware bootstrap loading:
	// - Skip immediate load on homepage for better PSI.
	// - Load immediately on all other legacy routes.
	useEffect(() => {
		if (typeof window === "undefined") return undefined;
		const path = `${location.pathname || ""}`.toLowerCase();
		if (path && path !== "/") {
			ensureBootstrapStylesheet();
			return undefined;
		}

		let loaded = false;
		const loadOnce = () => {
			if (loaded) return;
			loaded = true;
			ensureBootstrapStylesheet();
			window.removeEventListener("pointerdown", loadOnce);
			window.removeEventListener("keydown", loadOnce);
			window.removeEventListener("touchstart", loadOnce);
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

		const timeoutId = window.setTimeout(loadOnce, 20000);
		return () => {
			window.clearTimeout(timeoutId);
			window.removeEventListener("pointerdown", loadOnce);
			window.removeEventListener("keydown", loadOnce);
			window.removeEventListener("touchstart", loadOnce);
		};
	}, [location.pathname]);

	// Clear certain local storage keys unless we are on /checkout
	useEffect(() => {
		if (!location.pathname.includes("/checkout")) {
			localStorage.removeItem("PaidNow");
			localStorage.removeItem("storedData");
			localStorage.removeItem("chosenShippingOption");
			localStorage.removeItem("orderDataStored");
		}
		// no eslint-disable-next-line needed, location is in deps
	}, [location]);

	return (
		<>
			{shouldRenderToast ? (
				<Suspense fallback={null}>
					<ToastContainer className='toast-top-center' position='top-center' />
				</Suspense>
			) : null}
			{/* Only show Navbars if NOT admin/seller */}
			{!shouldHideLayout && (
				<>
					<NavbarTop />
					{shouldRenderDesktopBottomNav ? (
						<Suspense fallback={null}>
							<NavbarBottom />
						</Suspense>
					) : null}
				</>
			)}

			<main id='main-content' role='main'>
				<Suspense fallback={<div style={{ minHeight: "60vh" }} />}>
					<Switch>
					<Route path='/' exact component={Home} />
					<Route path='/about' exact component={() => <About />} />
					<Route
						path='/single-product/:productSlug/:categorySlug/:productId'
						exact
						component={() => <SingleProductMain />}
					/>
					<Route path='/our-products' exact component={ShopPageMain} />
					<Route
						path='/custom-gifts'
						exact
						component={PrintifyAvailableProducts}
					/>
					<Route
						path='/custom-gifts/:productSlug/:productId'
						exact
						component={CustomizeSelectedProduct}
					/>
					<Route
						path='/custom-gifts/:productId'
						exact
						component={CustomizeSelectedProduct}
					/>
					<Route path='/contact' exact component={ContactUs} />
					<Route
						path='/privacy-policy-terms-conditions'
						exact
						component={PrivacyPolicy}
					/>
					<Route path='/cookie-policy' exact component={CookiePolicy} />
					<Route
						path='/return-refund-policy'
						exact
						component={ReturnRefundPolicy}
					/>
					<Route path='/signup' exact component={Register} />
					<Route path='/sellingagent/signup' exact component={RegisterSeller} />
					<Route path='/signin' exact component={Login} />
					<Route path='/forgot-password' exact component={Forgot} />
					<Route path='/reset-password/:token' exact component={Reset} />
					<Route path='/cart' exact component={Cart} />
					{/* <Route
						path='/my-animation-component'
						exact
						component={AnimationWalkingComponent}
					/>
					<Route
						path='/my-animation-component2'
						exact
						component={AnimationKickoff}
					/> */}

					{/* <Route
						path='/my-animation-component3'
						exact
						component={AnimationWalkingGreeting}
					/> */}

					{/* <Route
						path='/my-animation-component4'
						exact
						component={AnimationProductPresentation}
					/> */}
					<Route
						path='/payment-link/:orderId'
						exact
						component={LinkGenerated}
					/>
					{/* Seller Routes */}
					<SellerRoute
						path='/seller/dashboard'
						exact
						component={SellerDashboardMain}
					/>
					<SellerRoute
						path='/seller/store-management'
						exact
						component={SellerStoreManagementMain}
					/>

					<SellerRoute
						path='/seller/products-management'
						exact
						component={SellerProductManagementMain}
					/>

					<SellerRoute
						path='/seller/customer-service'
						exact
						component={CustomerServiceSellerMain}
					/>

					<SellerRoute
						path='/seller/coupon-management'
						exact
						component={CouponManagementMain}
					/>

					{/* Admin Routes */}
					<AdminRoute
						path='/admin/dashboard'
						exact
						component={AdminDashboard}
					/>
					<AdminRoute
						path='/admin/categories'
						exact
						component={CategoriesMain}
					/>
					<AdminRoute path='/admin/gender' exact component={ParentMain} />
					<AdminRoute
						path='/admin/attributes'
						exact
						component={AttributesMain}
					/>
					<AdminRoute path='/admin/products' exact component={ProductMain} />
					<AdminRoute
						path='/admin/customer-service'
						exact
						component={CustomerServiceMainAdmin}
					/>
					<AdminRoute
						path='/admin/store-management'
						exact
						component={() => <AdminStoreManagementMain />}
					/>
					<AdminRoute
						path='/admin/subcategories'
						exact
						component={SubcategoryMain}
					/>
					<AdminRoute
						path='/admin/website-management'
						exact
						component={WebsiteMain}
					/>
					<AdminRoute path='/admin/store-pos' exact component={StorePOSMain} />
					<AdminRoute
						path='/admin/printify-management'
						exact
						component={PrintifyMain}
					/>
					<AdminRoute
						path='/admin/coupon-management'
						exact
						component={CouponManagement}
					/>

					<AdminRoute
						path='/admin/ai-marketing'
						exact
						component={AIMarketingMain}
					/>

					{/* User (Private) Routes */}
					<PrivateRoute path='/dashboard' exact component={UserDashboard} />
					</Switch>
				</Suspense>
				{!shouldHideLayout && shouldRenderChat ? (
					<Suspense fallback={null}>
						<ChatIcon />
					</Suspense>
				) : null}
				{!shouldHideLayout && shouldRenderFooter ? (
					<Suspense fallback={<div style={{ minHeight: "160px" }} />}>
						<Footer />
					</Suspense>
				) : null}
			</main>
		</>
	);
};

export default App;
