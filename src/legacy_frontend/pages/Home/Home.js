import React, { Suspense, lazy, useEffect, useRef, useState } from "react";
import styled, { keyframes } from "styled-components";
import { Helmet } from "react-helmet-async";
// Context
import { useCartContext } from "../../cart_context";
import { useLegacyRouteBootstrap } from "../../bootstrap/LegacyRouteBootstrapContext";
// Components
import Hero from "./Hero";
import {
	gettingCategoriesAndSubcategories,
	gettingSpecificProducts,
} from "../../apiCore";
import {
	getCloudinaryOptimizedUrl,
	resolveImageUrl,
} from "../../utils/image";

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
	contain-intrinsic-size: 1000px;
	animation: ${fadeUp} 1.2s ease-in-out;
`;

// Utility function to capitalize the first letter of each word
const capitalizeWords = (str = "") => {
	return str.replace(/\b\w/g, (char) => char.toUpperCase());
};

// Utility function to escape JSON strings
const escapeJsonString = (str = "") => {
	return str
		.replace(/\\/g, "\\\\")
		.replace(/"/g, '\\"')
		.replace(/\n/g, "\\n")
		.replace(/\r/g, "\\r")
		.replace(/\t/g, "\\t")
		.replace(/\b/g, "\\b")
		.replace(/\f/g, "\\f");
};

// Generate keywords from products array
const generateKeywords = (products = []) => {
	const categoryKeywords = products.map(
		(product) => product?.category?.categoryName || ""
	);
	const productKeywords = products.map((product) => product?.productName || "");
	return [...new Set([...categoryKeywords, ...productKeywords])].join(", ");
};

// Generate structured data for products
const generateProductSchema = (products = []) => {
	return products.slice(0, 8).map((product) => {
		const attributes = Array.isArray(product?.productAttributes)
			? product.productAttributes
			: [];
		const hasVariables = attributes.length > 0;
		const firstAttribute = attributes[0] || {};
		const price =
			Number(firstAttribute?.priceAfterDiscount || 0) ||
			Number(product?.priceAfterDiscount || 0) ||
			Number(firstAttribute?.price || 0) ||
			Number(product?.price || 0) ||
			0;
		const quantity = hasVariables
			? attributes.reduce((acc, attr) => acc + Number(attr?.quantity || 0), 0)
			: Number(product?.quantity || 0);
		const rawDescription = (product?.description || "")
			.replace(/<[^>]+>/g, " ")
			.replace(/\s+/g, " ")
			.trim();
		const description = escapeJsonString(rawDescription.slice(0, 320));
		const image =
			resolveImageUrl(firstAttribute?.productImages?.[0]) ||
			resolveImageUrl(product?.thumbnailImage?.[0]?.images?.[0]);
		const productSchema = {
			"@context": "https://schema.org",
			"@type": "Product",
			name: capitalizeWords(escapeJsonString(product?.productName || "")),
			image,
			description,
			brand: {
				"@type": "Brand",
				name: "Serene Jannat",
			},
			offers: {
				"@type": "Offer",
				priceCurrency: "USD",
				price: Number(price).toFixed(2),
				availability:
					quantity > 0
						? "https://schema.org/InStock"
						: "https://schema.org/OutOfStock",
				itemCondition: "https://schema.org/NewCondition",
				url: `https://serenejannat.com/single-product/${product?.slug || ""}/${
					product?.category?.categorySlug || ""
				}/${product?._id}`,
			},
			productID: product?._id,
			url: `https://serenejannat.com/single-product/${product?.slug || ""}/${
				product?.category?.categorySlug || ""
			}/${product?._id}`,
			identifier_exists: false,
		};

		const ratings = Array.isArray(product?.ratings) ? product.ratings : [];
		if (ratings.length > 0) {
			const ratingValue =
				ratings.reduce((acc, rating) => acc + Number(rating?.star || 0), 0) /
				ratings.length;
			productSchema.aggregateRating = {
				"@type": "AggregateRating",
				ratingValue: Number(ratingValue.toFixed(1)),
				reviewCount: ratings.length,
			};
		}

		return productSchema;
	});
};

const HomePageHelmet = ({
	featuredProducts = [],
	newArrivalProducts = [],
	customDesignProducts = [],
	heroBanner,
}) => {
	const title = "Serene Jannat | Best Gifts and Candles Online Shop";
	const description =
		"Discover the best offers at Serene Jannat, your online gift store for candles, glass items, and more. Show love to your loved ones with our exquisite collection.";

	// Combine all arrays for broader SEO coverage
	const keywords = generateKeywords([
		...featuredProducts,
		...newArrivalProducts,
		...customDesignProducts,
	]);

	const productSchema = generateProductSchema([
		...featuredProducts,
		...newArrivalProducts,
		...customDesignProducts,
	]);

	const heroUrl = heroBanner?.url || "";
	const isCloudinaryHero =
		heroUrl && heroUrl.includes("res.cloudinary.com");
	const heroSrcSet = isCloudinaryHero
		? [
				`${getCloudinaryOptimizedUrl(heroUrl, {
					width: 480,
					quality: "auto:eco",
				})} 480w`,
				`${getCloudinaryOptimizedUrl(heroUrl, {
					width: 768,
					quality: "auto:eco",
				})} 768w`,
				`${getCloudinaryOptimizedUrl(heroUrl, {
					width: 1200,
					quality: "auto",
				})} 1200w`,
				`${getCloudinaryOptimizedUrl(heroUrl, {
					width: 1600,
					quality: "auto",
				})} 1600w`,
			].join(", ")
		: "";
	const heroHref = heroUrl
		? isCloudinaryHero
			? getCloudinaryOptimizedUrl(heroUrl, { width: 1200 })
			: heroUrl
		: "";
	const heroSizes = "100vw";

	return (
		<Helmet>
			<title>{title}</title>
			<meta name='description' content={description} />
			<meta name='keywords' content={keywords} />
			<meta property='og:title' content={title} />
			<meta property='og:description' content={description} />
			<meta
				property='og:image'
				content={
					resolveImageUrl(featuredProducts?.[0]?.thumbnailImage?.[0]?.images?.[0])
				}
			/>
			<meta property='og:url' content='https://serenejannat.com' />
			<meta property='og:type' content='website' />
			<link rel='canonical' href='https://serenejannat.com' />
			{heroHref && (
				<link
					rel='preload'
					as='image'
					href={heroHref}
					{...(heroSrcSet
						? { imageSrcSet: heroSrcSet, imageSizes: heroSizes }
						: {})}
					fetchPriority='high'
				/>
			)}
			<script type='application/ld+json'>
				{JSON.stringify(productSchema)}
			</script>
			<script
				type='application/ld+json'
				dangerouslySetInnerHTML={{
					__html: JSON.stringify({
						"@context": "https://schema.org",
						"@type": "Organization",
						url: "https://serenejannat.com",
						name: "Serene Jannat",
						logo: "https://serenejannat.com/logo192.png",
						sameAs: ["https://www.facebook.com/profile.php?id=61575325586166"],
					}),
				}}
			/>

		</Helmet>
	);
};

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
	rootMargin = "320px 0px",
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
	const effectiveWebsiteSetup =
		websiteSetup || initialHomeBootstrap?.websiteSetup || null;
	const heroBanner = effectiveWebsiteSetup?.homeMainBanners?.[0];

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

				const categoriesData = await gettingCategoriesAndSubcategories();
				if (categoriesData?.error) {
					console.log(categoriesData.error);
				} else {
					setCategories(categoriesData.categories || []);
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
			{/* Helmet / SEO */}
			<HomePageHelmet
				featuredProducts={featuredProducts}
				newArrivalProducts={newArrivalProducts}
				customDesignProducts={customDesignProducts}
				heroBanner={heroBanner}
			/>
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
				<DeferredSection rootMargin='260px 0px'>
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
				<DeferredSection rootMargin='260px 0px'>
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
				<DeferredSection rootMargin='260px 0px'>
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
	height: 340px;
	margin: 20px auto;
	border-radius: 12px;
	background: linear-gradient(90deg, #f1f1f1 25%, #e7e7e7 37%, #f1f1f1 63%);
	background-size: 400% 100%;
	animation: shimmer 1.4s ease infinite;

	@keyframes shimmer {
		0% {
			background-position: 100% 0;
		}
		100% {
			background-position: -100% 0;
		}
	}
`;




