import React, { Suspense, lazy, useEffect, useState } from "react";
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
	return products.map((product) => {
		const hasVariables =
			product?.productAttributes && product.productAttributes.length > 0;

		const price = hasVariables
			? product.productAttributes[0].priceAfterDiscount
			: product?.priceAfterDiscount || 0;

		const quantity = hasVariables
			? product.productAttributes.reduce((acc, attr) => acc + attr.quantity, 0)
			: product?.quantity || 0;

		const priceValidUntil = "2026-12-31";

		// Ratings
		const ratingValue =
			product?.ratings?.length > 0
				? (
						product.ratings.reduce((acc, rating) => acc + rating.star, 0) /
						product.ratings.length
					).toFixed(1)
				: "5.0";
		const reviewCount =
			product?.ratings?.length > 0 ? product.ratings.length : 1;

		// Reviews
		const reviews =
			product?.comments?.length > 0
				? product.comments.map((comment) => ({
						"@type": "Review",
						reviewRating: {
							"@type": "Rating",
							ratingValue: comment?.rating || 5,
							bestRating: 5,
							worstRating: 1,
						},
						author: {
							"@type": "Person",
							name: escapeJsonString(
								comment?.postedBy ? comment.postedBy.name : "Anonymous"
							),
						},
						reviewBody: escapeJsonString(comment?.text || ""),
						datePublished: new Date(comment.created).toISOString(),
					}))
				: [
						{
							"@type": "Review",
							reviewRating: {
								"@type": "Rating",
								ratingValue: 5,
								bestRating: 5,
								worstRating: 1,
							},
							author: {
								"@type": "Person",
								name: "Anonymous",
							},
							reviewBody: "Excellent product!",
							datePublished: new Date().toISOString(),
						},
					];

		// MPN
		const mpn = hasVariables
			? product.productAttributes
					.map((attr) => `${product?.productSKU || ""}-${attr.SubSKU || ""}`)
					.join(", ")
			: product?.productSKU || "N/A";

		const productSchema = {
			"@context": "http://schema.org",
			"@type": "Product",
			name: capitalizeWords(escapeJsonString(product?.productName || "")),
			image: resolveImageUrl(product?.thumbnailImage?.[0]?.images?.[0]),
			description: escapeJsonString(
				(product?.description || "").replace(/<[^>]+>/g, "")
			),
			brand: {
				"@type": "Brand",
				name: "Serene Jannat",
			},
			mpn,
			offers: {
				"@type": "Offer",
				priceCurrency: "USD",
				price: Number(price).toFixed(2),
				priceValidUntil,
				availability:
					quantity > 0
						? "http://schema.org/InStock"
						: "http://schema.org/OutOfStock",
				itemCondition: "http://schema.org/NewCondition",
				hasMerchantReturnPolicy: {
					"@type": "MerchantReturnPolicy",
					returnPolicyCategory:
						"https://schema.org/MerchantReturnFiniteReturnWindow",
					merchantReturnDays: 7,
					merchantReturnLink:
						"https://serenejannat.com/privacy-policy-terms-conditions",
					applicableCountry: {
						"@type": "Country",
						name: "US",
					},
					returnMethod: "https://schema.org/ReturnByMail",
					returnFees: "https://schema.org/FreeReturn",
				},
				shippingDetails: {
					"@type": "OfferShippingDetails",
					shippingRate: {
						"@type": "MonetaryAmount",
						value: "5.00",
						currency: "USD",
					},
					deliveryTime: {
						"@type": "ShippingDeliveryTime",
						handlingTime: {
							"@type": "QuantitativeValue",
							minValue: 0,
							maxValue: 1,
							unitCode: "d",
						},
						transitTime: {
							"@type": "QuantitativeValue",
							minValue: 3,
							maxValue: 7,
							unitCode: "d",
						},
					},
					shippingDestination: {
						"@type": "DefinedRegion",
						addressCountry: {
							"@type": "Country",
							name: "US",
						},
						geoMidpoint: {
							"@type": "GeoCoordinates",
							latitude: 37.7749,
							longitude: -122.4194,
						},
					},
				},
			},
			aggregateRating: {
				"@type": "AggregateRating",
				ratingValue,
				reviewCount,
			},
			review: reviews,
			productID: product?._id,
			url: `https://serenejannat.com/single-product/${product?.slug || ""}/${
				product?.category?.categorySlug || ""
			}/${product?._id}`,
		};

		// We set identifier_exists to false by default
		productSchema.identifier_exists = false;

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
			window.removeEventListener("scroll", loadOnce);
			window.removeEventListener("touchstart", loadOnce);
			window.removeEventListener("mousemove", loadOnce);
			window.removeEventListener("keydown", loadOnce);
		};

		window.addEventListener("scroll", loadOnce, { passive: true });
		window.addEventListener("touchstart", loadOnce, { passive: true });
		window.addEventListener("mousemove", loadOnce, { passive: true });
		window.addEventListener("keydown", loadOnce, { passive: true });

		const fallbackTimeoutId = window.setTimeout(loadOnce, 15000);

		return () => {
			window.clearTimeout(fallbackTimeoutId);
			window.removeEventListener("scroll", loadOnce);
			window.removeEventListener("touchstart", loadOnce);
			window.removeEventListener("mousemove", loadOnce);
			window.removeEventListener("keydown", loadOnce);
		};
	}, []);

	useEffect(() => {
		const fetchData = async () => {
			try {
				// Turn on loading
				setLoading(true);

				// (B) Categories & Subcategories
				const categoriesData = await gettingCategoriesAndSubcategories();
				if (categoriesData?.error) {
					console.log(categoriesData.error);
				} else {
					setCategories(categoriesData.categories || []);
					setSubcategories(categoriesData.subcategories || []);
				}

				// // (C) Featured Products => { featured:1, newArrivals:0, customDesigns:0, sortByRate:0, offers:0, records:5, skip=0 }
				const featuredData = await gettingSpecificProducts(1, 0, 0, 0, 0, 6);
				if (featuredData?.error) {
					console.log(featuredData.error);
				} else {
					// Sort by date descending
					const sortedFeatured = featuredData.sort(
						(a, b) => new Date(b.createdAt) - new Date(a.createdAt)
					);

					setFeaturedProducts(sortedFeatured);
				}

				// // (D) New Arrival Products => { featured=0, newArrivals=1, ... }
				const newArrivalData = await gettingSpecificProducts(0, 1, 0, 0, 0, 6);
				if (newArrivalData?.error) {
					console.log(newArrivalData.error);
				} else {
					setNewArrivalProducts(newArrivalData);
				}

				// (E) Custom Design Products => { featured=0, newArrivals=0, customDesigns=1, ... }
				const customDesignData = await gettingSpecificProducts(
					0,
					0,
					1,
					0,
					0,
					6
				);
				if (customDesignData?.error) {
					console.log(customDesignData.error);
				} else {
					setCustomDesignProducts(customDesignData);
				}
			} catch (error) {
				console.error("Error fetching data in CartContext: ", error);
			} finally {
				// Turn off loading
				setLoading(false);
			}
		};

		fetchData();
	}, []);

	useEffect(() => {
		if (typeof window === "undefined") return undefined;

		const enableBelowFold = () => setBelowFoldReady(true);
		const onFirstInteraction = () => {
			enableBelowFold();
			window.removeEventListener("scroll", onFirstInteraction);
			window.removeEventListener("touchstart", onFirstInteraction);
			window.removeEventListener("mousemove", onFirstInteraction);
		};

		if ("requestIdleCallback" in window) {
			const idleId = window.requestIdleCallback(enableBelowFold, {
				timeout: 4000,
			});
			window.addEventListener("scroll", onFirstInteraction, { passive: true });
			window.addEventListener("touchstart", onFirstInteraction, {
				passive: true,
			});
			window.addEventListener("mousemove", onFirstInteraction, { passive: true });
			return () => {
				window.cancelIdleCallback?.(idleId);
				window.removeEventListener("scroll", onFirstInteraction);
				window.removeEventListener("touchstart", onFirstInteraction);
				window.removeEventListener("mousemove", onFirstInteraction);
			};
		}

		const timeoutId = window.setTimeout(enableBelowFold, 1200);
		window.addEventListener("scroll", onFirstInteraction, { passive: true });
		window.addEventListener("touchstart", onFirstInteraction, {
			passive: true,
		});
		window.addEventListener("mousemove", onFirstInteraction, { passive: true });
		return () => {
			window.clearTimeout(timeoutId);
			window.removeEventListener("scroll", onFirstInteraction);
			window.removeEventListener("touchstart", onFirstInteraction);
			window.removeEventListener("mousemove", onFirstInteraction);
		};
	}, []);

	// Scroll to top on mount
	useEffect(() => {
		window.scrollTo({ top: 0, behavior: "smooth" });
	}, []);

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




