import React, { useEffect, Suspense, lazy } from "react";
import {
	BrowserRouter as Router,
	Switch,
	Route,
	useLocation,
} from "react-router-dom";
import { ToastContainer } from "react-toastify";
import ReactGA from "react-ga4";
import ReactPixel from "react-facebook-pixel";

import NavbarTop from "./NavbarUpdate/NavbarTop";
import NavbarBottom from "./NavbarUpdate/NavbarBottom";
import Footer from "./Footer";
import Home from "./pages/Home/Home";
// eslint-disable-next-line
// import AnimationWalkingComponent from "./pages/MyAnimationComponents/AnimationWalkingComponent";
// eslint-disable-next-line
// import AnimationKickoff from "./pages/MyAnimationComponents/AnimationKickoff";
// eslint-disable-next-line
// import AnimationWalkingGreeting from "./pages/MyAnimationComponents/AnimationWalkingGreeting";
// import AnimationProductPresentation from "./pages/MyAnimationComponents/AnimationProductPresentation";

import ModalApp from "./ModalApp";

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

	// Determine if path includes 'admin' or 'seller'
	const shouldHideLayout =
		location.pathname.includes("admin") || location.pathname.includes("seller");

	// Initialize trackers once for legacy routes
	useEffect(() => {
		try {
			if (process.env.REACT_APP_GOOGLE_ANALYTICS_MEASUREMENTID) {
				ReactGA.initialize(process.env.REACT_APP_GOOGLE_ANALYTICS_MEASUREMENTID);
			}
			if (process.env.REACT_APP_FACEBOOK_PIXEL_ID) {
				ReactPixel.init(process.env.REACT_APP_FACEBOOK_PIXEL_ID);
			}
		} catch {
			// no-op
		}
	}, []);

	// Defer Toastify CSS so it does not block initial paint on the homepage.
	useEffect(() => {
		if (typeof window === "undefined") return undefined;
		let loaded = false;
		const loadToastStyles = () => {
			if (loaded) return;
			loaded = true;
			import("react-toastify/dist/ReactToastify.css").catch(() => {});
			window.removeEventListener("pointerdown", loadToastStyles);
			window.removeEventListener("keydown", loadToastStyles);
			window.removeEventListener("touchstart", loadToastStyles);
			window.removeEventListener("scroll", loadToastStyles);
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
		window.addEventListener("scroll", loadToastStyles, {
			once: true,
			passive: true,
		});
		const timeoutId = window.setTimeout(loadToastStyles, 60000);
		return () => {
			window.clearTimeout(timeoutId);
			window.removeEventListener("pointerdown", loadToastStyles);
			window.removeEventListener("keydown", loadToastStyles);
			window.removeEventListener("touchstart", loadToastStyles);
			window.removeEventListener("scroll", loadToastStyles);
		};
	}, []);

	// Track page view on route change
	useEffect(() => {
		const pagePath = `${location.pathname || "/"}${location.search || ""}`;
		try {
			ReactGA.send({ hitType: "pageview", page: pagePath });
			ReactPixel.pageView();
		} catch {
			// no-op
		}
	}, [location.pathname, location.search]);

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
			<ToastContainer className='toast-top-center' position='top-center' />
			{/* Only show Navbars if NOT admin/seller */}
			{!shouldHideLayout && (
				<>
					<NavbarTop />
					<NavbarBottom />
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

					{/* Chat & Footer only if NOT admin/seller */}
					{!shouldHideLayout && <ChatIcon />}
					{!shouldHideLayout && <Footer />}
				</Suspense>
			</main>

			<ModalApp shouldHideLayout={shouldHideLayout} location={location} />
		</>
	);
};

export default App;
