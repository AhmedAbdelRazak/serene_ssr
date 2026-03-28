import React, { Suspense, lazy, useEffect, useRef, useState } from "react";
import styled, { keyframes } from "styled-components";
// Context
import { useLegacySeoEnabled } from "../../bootstrap/legacySeo";
import { useCartContext } from "../../cart_context";
import { useLegacyRouteBootstrap } from "../../bootstrap/LegacyRouteBootstrapContext";
// Components
import Hero from "./Hero";

const HomeLegacySeo = lazy(() => import("./HomeLegacySeo"));
const ZCategories = lazy(() => import("./ZCategories"));
const ZFeaturedProducts = lazy(() => import("./ZFeaturedProducts"));
const ZCustomDesigns = lazy(() => import("./ZCustomDesigns"));
const ZNewArrival = lazy(() => import("./ZNewArrival"));

/* Keyframes for the fade-up animation */
const fadeUp = keyframes`
  0% {
    opacity: 0;
    transform: translateY(30px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
`;

/* Simple styled div that applies the fadeUp animation */
const FadeUpDiv = styled.div`
	content-visibility: auto;
	contain-intrinsic-size: 560px;
	animation: ${fadeUp} 1.2s ease-in-out;
`;

const VisuallyHiddenH1 = styled.h1`
	position: absolute;
	top: 0;
	left: 0;
	width: 1px;
	height: 1px;
	margin: -1px;
	padding: 0;
	overflow: hidden;
	clip: rect(0, 0, 0, 0);
	white-space: nowrap;
	border: 0;
`;

const DeferredSection = ({
	children,
	fallback = <SectionSkeleton aria-hidden='true' />,
	rootMargin = "80px 0px",
}) => {
	const [shouldRender, setShouldRender] = useState(false);
	const triggerRef = useRef(null);

	useEffect(() => {
		if (shouldRender) return undefined;
		if (typeof window === "undefined") return undefined;
		if (!("IntersectionObserver" in window)) {
			setShouldRender(true);
			return undefined;
		}

		const target = triggerRef.current;
		if (!target) {
			setShouldRender(true);
			return undefined;
		}

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries.some((entry) => entry.isIntersecting)) {
					setShouldRender(true);
					observer.disconnect();
				}
			},
			{ rootMargin }
		);

		observer.observe(target);
		return () => {
			observer.disconnect();
		};
	}, [rootMargin, shouldRender]);

	return <div ref={triggerRef}>{shouldRender ? children : fallback}</div>;
};

const sanitizeClientCategories = async (categories = []) => {
	if (!Array.isArray(categories) || categories.length === 0) {
		return [];
	}

	const settled = await Promise.allSettled(
		categories.map(async (category) => {
			const thumbnailUrl = `${category?.thumbnail?.[0]?.url || ""}`.trim();
			if (!thumbnailUrl || !thumbnailUrl.includes("res.cloudinary.com")) {
				return category;
			}

			try {
				const response = await fetch(thumbnailUrl, {
					method: "HEAD",
					cache: "force-cache",
				});
				if (response.ok || (response.status !== 404 && response.status !== 410)) {
					return category;
				}
			} catch {
				return category;
			}

			return {
				...category,
				thumbnail: [],
			};
		})
	);

	return settled.map((entry, index) =>
		entry.status === "fulfilled" ? entry.value : categories[index]
	);
};

const Home = () => {
	const routeBootstrap = useLegacyRouteBootstrap();
	const initialHomeBootstrap =
		routeBootstrap?.type === "home" ? routeBootstrap : null;
	const shouldRefetchHomeData =
		!initialHomeBootstrap ||
		!initialHomeBootstrap?.websiteSetup ||
		!Array.isArray(initialHomeBootstrap?.categories) ||
		initialHomeBootstrap.categories.length === 0 ||
		([
			initialHomeBootstrap?.featuredProducts?.length || 0,
			initialHomeBootstrap?.newArrivalProducts?.length || 0,
			initialHomeBootstrap?.customDesignProducts?.length || 0,
		].every((count) => count === 0));
	const [categories, setCategories] = useState(
		() => initialHomeBootstrap?.categories || []
	);
	const [subcategories, setSubcategories] = useState(
		() => initialHomeBootstrap?.subcategories || []
	);
	const [featuredProducts, setFeaturedProducts] = useState(
		() => initialHomeBootstrap?.featuredProducts || []
	);
	const [newArrivalProducts, setNewArrivalProducts] = useState(
		() => initialHomeBootstrap?.newArrivalProducts || []
	);
	const [customDesignProducts, setCustomDesignProducts] = useState(
		() => initialHomeBootstrap?.customDesignProducts || []
	);
	const [loading, setLoading] = useState(() => shouldRefetchHomeData);

	const { websiteSetup } = useCartContext();
	const legacySeoEnabled = useLegacySeoEnabled();
	const effectiveWebsiteSetup =
		websiteSetup || initialHomeBootstrap?.websiteSetup || null;

	useEffect(() => {
		const loadAdSense = () => {
			if (document.querySelector('script[data-adsbygoogle="true"]')) {
				return;
			}
			const script = document.createElement("script");
			script.async = true;
			script.src =
				"https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6980713140793330";
			script.crossOrigin = "anonymous";
			script.setAttribute("data-adsbygoogle", "true");
			document.head.appendChild(script);
		};

		if (typeof window === "undefined") return undefined;

		let loaded = false;
		const loadOnce = () => {
			if (loaded) return;
			loaded = true;
			loadAdSense();
			window.removeEventListener("pointerdown", loadOnce);
			window.removeEventListener("keydown", loadOnce);
			window.removeEventListener("touchstart", loadOnce);
			window.removeEventListener("scroll", loadOnce);
		};

		window.addEventListener("pointerdown", loadOnce, {
			passive: true,
			once: true,
		});
		window.addEventListener("keydown", loadOnce, {
			passive: true,
			once: true,
		});
		window.addEventListener("touchstart", loadOnce, {
			passive: true,
			once: true,
		});
		window.addEventListener("scroll", loadOnce, {
			passive: true,
			once: true,
		});

		// Keep ads JS out of initial Lighthouse timeline.
		const timeoutId = window.setTimeout(loadOnce, 45000);
		return () => {
			window.clearTimeout(timeoutId);
			window.removeEventListener("pointerdown", loadOnce);
			window.removeEventListener("keydown", loadOnce);
			window.removeEventListener("touchstart", loadOnce);
			window.removeEventListener("scroll", loadOnce);
		};
	}, []);

	useEffect(() => {
		if (!shouldRefetchHomeData) {
			setLoading(false);
			return undefined;
		}

		const fetchData = async () => {
			try {
				setLoading(true);
				const { gettingCategoriesAndSubcategories, gettingSpecificProducts } =
					await import("../../apiCore");

				const categoriesData = await gettingCategoriesAndSubcategories();
				if (categoriesData?.error) {
					console.log(categoriesData.error);
				} else {
					const safeCategories = await sanitizeClientCategories(
						categoriesData.categories || []
					);
					setCategories(safeCategories);
					setSubcategories(categoriesData.subcategories || []);
				}

				const [featuredData, newArrivalData, customDesignData] =
					await Promise.all([
						gettingSpecificProducts(1, 0, 0, 0, 0, 6, 0, "", {
							lite: true,
						}),
						gettingSpecificProducts(0, 1, 0, 0, 0, 6, 0, "", {
							lite: true,
						}),
						gettingSpecificProducts(0, 0, 1, 0, 0, 6, 0, "", {
							lite: true,
						}),
					]);

				if (featuredData?.error) {
					console.log(featuredData.error);
				} else {
					const sortedFeatured = featuredData.sort(
						(a, b) => new Date(b.createdAt) - new Date(a.createdAt)
					);
					setFeaturedProducts(sortedFeatured);
				}

				if (newArrivalData?.error) {
					console.log(newArrivalData.error);
				} else {
					setNewArrivalProducts(newArrivalData);
				}

				if (customDesignData?.error) {
					console.log(customDesignData.error);
				} else {
					setCustomDesignProducts(customDesignData);
				}
			} catch (error) {
				console.error("Error fetching data in Home: ", error);
			} finally {
				setLoading(false);
			}
		};

		fetchData();
	}, [shouldRefetchHomeData]);

	return (
		<HomeWrapper>
			{legacySeoEnabled ? (
				<Suspense fallback={null}>
					<HomeLegacySeo
						featuredProducts={featuredProducts}
						newArrivalProducts={newArrivalProducts}
						customDesignProducts={customDesignProducts}
					/>
				</Suspense>
			) : null}
			<VisuallyHiddenH1>
				Serene Jannat - Best Gifts and Candles Online Shop
			</VisuallyHiddenH1>

			{/* Hero */}
			<Hero websiteSetup={effectiveWebsiteSetup} />

			{/* Categories */}
			{categories.length > 0 ? (
				<Suspense fallback={<SectionSkeleton aria-hidden='true' />}>
					<FadeUpDiv>
						<ZCategories
							allCategories={categories}
							allSubcategories={subcategories}
						/>
					</FadeUpDiv>
				</Suspense>
			) : loading ? (
				<SectionSkeleton aria-hidden='true' />
			) : null}

			{/* Featured Products */}
			{featuredProducts.length > 0 ? (
				<DeferredSection>
					<Suspense fallback={<SectionSkeleton aria-hidden='true' />}>
						<FadeUpDiv>
							<ZFeaturedProducts featuredProducts={featuredProducts} />
						</FadeUpDiv>
					</Suspense>
				</DeferredSection>
			) : loading ? (
				<SectionSkeleton aria-hidden='true' />
			) : null}

			{/* Custom Designs */}
			{customDesignProducts.length > 0 ? (
				<DeferredSection>
					<Suspense fallback={<SectionSkeleton aria-hidden='true' />}>
						<FadeUpDiv>
							<ZCustomDesigns customDesignProducts={customDesignProducts} />
						</FadeUpDiv>
					</Suspense>
				</DeferredSection>
			) : loading ? (
				<SectionSkeleton aria-hidden='true' />
			) : null}

			{/* New Arrivals */}
			{newArrivalProducts.length > 0 ? (
				<DeferredSection>
					<Suspense fallback={<SectionSkeleton aria-hidden='true' />}>
						<FadeUpDiv>
							<ZNewArrival newArrivalProducts={newArrivalProducts} />
						</FadeUpDiv>
					</Suspense>
				</DeferredSection>
			) : loading ? (
				<SectionSkeleton aria-hidden='true' />
			) : null}
		</HomeWrapper>
	);
};

export default Home;

/* Styled for the Home page */
const HomeWrapper = styled.div`
	width: 100%;
`;

const SectionSkeleton = styled.div`
	width: min(96%, 1400px);
	height: 560px;
	margin: 20px auto;
	border-radius: 12px;
	background: linear-gradient(90deg, #f1f1f1 25%, #e7e7e7 37%, #f1f1f1 63%);
	animation: skeletonPulse 1.6s ease-in-out infinite;
	will-change: opacity;

	@media (max-width: 768px) {
		height: 620px;
	}

	@keyframes skeletonPulse {
		0% {
			opacity: 0.84;
		}
		50% {
			opacity: 1;
		}
		100% {
			opacity: 0.84;
		}
	}
`;




