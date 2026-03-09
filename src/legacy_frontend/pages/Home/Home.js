import React, { Suspense, lazy, useEffect, useRef, useState } from "react";
import styled, { keyframes } from "styled-components";
import { Helmet } from "react-helmet-async";
// Context
import { useCartContext } from "../../cart_context";
// Components
import ZCategories from "./ZCategories";
import Hero from "./Hero";
import {
	gettingCategoriesAndSubcategories,
	gettingSpecificProducts,
} from "../../apiCore";
import {
	buildCloudinarySrcSet,
	getCloudinaryOptimizedUrl,
	resolveImageUrl,
} from "../../utils/image";

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
	will-change: transform, opacity;
	transform: translateZ(0);
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
		? buildCloudinarySrcSet(heroUrl, [480, 768, 1200, 1600])
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

const Home = () => {
	const [categories, setCategories] = useState([]);
	const [subcategories, setSubcategories] = useState([]);
	const [featuredProducts, setFeaturedProducts] = useState([]);
	const [newArrivalProducts, setNewArrivalProducts] = useState([]);
	const [customDesignProducts, setCustomDesignProducts] = useState([]);
	const [loading, setLoading] = useState(false);
	const [belowFoldReady, setBelowFoldReady] = useState(false);
	const [belowFoldFetched, setBelowFoldFetched] = useState(false);
	const belowFoldAnchorRef = useRef(null);

	const { websiteSetup } = useCartContext();
	const heroBanner = websiteSetup?.homeMainBanners?.[0];

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

		const fallbackTimeoutId = window.setTimeout(loadOnce, 60000);

		return () => {
			window.clearTimeout(fallbackTimeoutId);
			window.removeEventListener("pointerdown", loadOnce);
			window.removeEventListener("keydown", loadOnce);
			window.removeEventListener("touchstart", loadOnce);
		};
	}, []);

	useEffect(() => {
		const fetchCategories = async () => {
			try {
				setLoading(true);
				const categoriesData = await gettingCategoriesAndSubcategories();

				if (categoriesData?.error) {
					console.log(categoriesData.error);
				} else {
					setCategories(categoriesData.categories || []);
					setSubcategories(categoriesData.subcategories || []);
				}
			} catch (error) {
				console.error("Error fetching categories in Home: ", error);
			} finally {
				setLoading(false);
			}
		};

		fetchCategories();
	}, []);

	useEffect(() => {
		const shouldFetchBelowFoldData = belowFoldReady && !belowFoldFetched;
		if (!shouldFetchBelowFoldData) return;

		let isCancelled = false;
		setBelowFoldFetched(true);

		const fetchBelowFoldData = async () => {
			try {
				setLoading(true);
				const [featuredData, newArrivalData, customDesignData] = await Promise.all([
					gettingSpecificProducts(1, 0, 0, 0, 0, 6, 0, "", { lite: true }),
					gettingSpecificProducts(0, 1, 0, 0, 0, 6, 0, "", { lite: true }),
					gettingSpecificProducts(0, 0, 1, 0, 0, 6, 0, "", { lite: true }),
				]);

				if (!isCancelled) {
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
				}
			} catch (error) {
				if (!isCancelled) {
					console.error("Error fetching below-fold products in Home: ", error);
				}
			} finally {
				if (!isCancelled) {
					setLoading(false);
				}
			}
		};

		fetchBelowFoldData();

		return () => {
			isCancelled = true;
		};
	}, [
		belowFoldReady,
		belowFoldFetched,
	]);

	useEffect(() => {
		if (typeof window === "undefined") return undefined;
		if (belowFoldReady) return undefined;

		const enableBelowFold = () => setBelowFoldReady(true);

		let observer;
		if (belowFoldAnchorRef.current && "IntersectionObserver" in window) {
			observer = new IntersectionObserver(
				(entries) => {
					if (entries.some((entry) => entry.isIntersecting)) {
						enableBelowFold();
					}
				},
				{ rootMargin: "500px 0px", threshold: 0.01 }
			);
			observer.observe(belowFoldAnchorRef.current);
		}

		const onFirstInteraction = () => {
			enableBelowFold();
			window.removeEventListener("pointerdown", onFirstInteraction);
			window.removeEventListener("scroll", onFirstInteraction);
			window.removeEventListener("touchstart", onFirstInteraction);
			window.removeEventListener("keydown", onFirstInteraction);
		};

		window.addEventListener("pointerdown", onFirstInteraction, {
			passive: true,
			once: true,
		});
		window.addEventListener("scroll", onFirstInteraction, {
			passive: true,
			once: true,
		});
		window.addEventListener("touchstart", onFirstInteraction, {
			passive: true,
			once: true,
		});
		window.addEventListener("keydown", onFirstInteraction, {
			passive: true,
			once: true,
		});

		// Keep below-the-fold sections deferred long enough to avoid impacting
		// initial paint metrics if the user has not interacted yet.
		const timeoutId = window.setTimeout(enableBelowFold, 25000);

		return () => {
			if (observer) observer.disconnect();
			window.clearTimeout(timeoutId);
			window.removeEventListener("pointerdown", onFirstInteraction);
			window.removeEventListener("scroll", onFirstInteraction);
			window.removeEventListener("touchstart", onFirstInteraction);
			window.removeEventListener("keydown", onFirstInteraction);
		};
	}, [belowFoldReady]);

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
			<Hero websiteSetup={websiteSetup} />

			{/* Categories */}
			{categories.length > 0 ? (
				<FadeUpDiv>
					<ZCategories
						allCategories={categories}
						allSubcategories={subcategories}
					/>
				</FadeUpDiv>
			) : loading ? (
				<SectionSkeleton aria-hidden='true' />
			) : null}
			<BelowFoldAnchor ref={belowFoldAnchorRef} aria-hidden='true' />

			{belowFoldReady ? (
				<Suspense fallback={<SectionSkeleton aria-hidden='true' />}>
					{/* Featured Products */}
					{featuredProducts.length > 0 ? (
						<FadeUpDiv>
							<ZFeaturedProducts featuredProducts={featuredProducts} />
						</FadeUpDiv>
					) : loading ? (
						<SectionSkeleton aria-hidden='true' />
					) : null}

					{/* Custom Designs */}
					{customDesignProducts.length > 0 ? (
						<FadeUpDiv>
							<ZCustomDesigns customDesignProducts={customDesignProducts} />
						</FadeUpDiv>
					) : loading ? (
						<SectionSkeleton aria-hidden='true' />
					) : null}

					{/* New Arrivals */}
					{newArrivalProducts.length > 0 ? (
						<FadeUpDiv>
							<ZNewArrival newArrivalProducts={newArrivalProducts} />
						</FadeUpDiv>
					) : loading ? (
						<SectionSkeleton aria-hidden='true' />
					) : null}
				</Suspense>
			) : null}
		</HomeWrapper>
	);
};

export default Home;

/* Styled for the Home page */
const HomeWrapper = styled.div`
	width: 100%;
`;

const BelowFoldAnchor = styled.div`
	height: 1px;
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




