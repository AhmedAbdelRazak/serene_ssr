import React from "react";
import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";
import {
	escapeJsonString,
	useLegacySeoEnabled,
} from "../../bootstrap/legacySeo";
import { resolveImageUrl } from "../../utils/image";

// Safely capitalize words; provide a default to avoid .replace on undefined
const capitalizeWords = (str = "") => {
	return str.replace(/\b\w/g, (char) => char.toUpperCase());
};

// (Optional) Utility for GTIN if you need it
// eslint-disable-next-line
const formatGTIN = (sku = "") => {
	let formattedSKU = sku.replace(/[^0-9]/g, ""); // Remove non-numeric characters
	if (formattedSKU.length > 14) {
		formattedSKU = formattedSKU.substring(0, 14);
	} else {
		while (formattedSKU.length < 12) {
			formattedSKU += "0"; // Pad with zeros until it reaches 12 digits
		}
	}
	return formattedSKU;
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
	return products.map((product = {}) => {
		// Safely handle arrays; fallback to empty arrays
		const productAttributes = product.productAttributes || [];
		const productRatings = product.ratings || [];
		const productComments = product.comments || [];

		const hasVariables = productAttributes.length > 0;

		// Price
		const price = hasVariables
			? productAttributes[0]?.priceAfterDiscount
			: product?.priceAfterDiscount;

		// Quantity
		const quantity = hasVariables
			? productAttributes.reduce((acc, attr) => acc + (attr.quantity || 0), 0)
			: product?.quantity || 0;

		// Ratings
		const ratingValue =
			productRatings.length > 0
				? (
						productRatings.reduce(
							(acc, rating) => acc + (rating.star || 0),
							0
						) / productRatings.length
					).toFixed(1)
				: "5.0";

		const reviewCount = productRatings.length > 0 ? productRatings.length : 1;

		// Comments -> reviews
		const reviews =
			productComments.length > 0
				? productComments.map((comment) => ({
						"@type": "Review",
						reviewRating: {
							"@type": "Rating",
							ratingValue: comment?.rating || 5,
							bestRating: 5,
							worstRating: 1,
						},
						author: {
							"@type": "Person",
							name: escapeJsonString(comment?.postedBy?.name || "Anonymous"),
						},
						reviewBody: escapeJsonString(comment?.text || ""),
						datePublished: new Date(
							comment?.created || Date.now()
						).toISOString(),
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
			? productAttributes
					.map((attr) => `${product?.productSKU || ""}-${attr?.SubSKU || ""}`)
					.join(", ")
			: product?.productSKU || "";

		// Build schema
		const productSchema = {
			"@context": "http://schema.org",
			"@type": "Product",
			name: capitalizeWords(escapeJsonString(product?.productName || "")),
			image: resolveImageUrl(product?.thumbnailImage?.[0]?.images?.[0]) || "",
			description: escapeJsonString(
				// remove HTML tags if description is present
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
				price: Number(price || 0).toFixed(2),
				priceValidUntil: "2026-12-31",
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
			productID: product?._id || "",
			url: `https://serenejannat.com/single-product/${product?.slug || ""}/${
				product?.category?.categorySlug || ""
			}/${product?._id || ""}`,
			identifier_exists: false, // For GTIN
		};

		return productSchema;
	});
};

const ShopPageHelmet = ({ products = [] }) => {
	const location = useLocation();
	const legacySeoEnabled = useLegacySeoEnabled();
	const hasQueryFilters = Boolean(location.search && location.search !== "?");

	if (!legacySeoEnabled) return null;

	const title = "Our Products - Serene Jannat Gift Store";
	const description =
		"Explore our wide range of products including candles, glass items, and more at Serene Jannat Gift Store. Find the perfect gift for any occasion.";

	// Safely generate keywords
	const keywords = generateKeywords(products);
	const productSchema = generateProductSchema(products);

	// Keep canonical stable to avoid duplicate indexing for filtered URLs.
	const canonicalUrl = `https://serenejannat.com${location.pathname}`;

	return (
		<Helmet>
			<title>{title}</title>
			<meta name='description' content={description} />
			<meta name='keywords' content={keywords} />
			{hasQueryFilters ? (
				<meta name='robots' content='noindex, follow' />
			) : null}
			<meta property='og:title' content={title} />
			<meta property='og:description' content={description} />
			<meta property='og:url' content={canonicalUrl} />
			<meta property='og:type' content='website' />
			<link rel='canonical' href={canonicalUrl} />
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

export default ShopPageHelmet;

