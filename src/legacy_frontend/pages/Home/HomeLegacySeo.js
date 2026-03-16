import React from "react";
import { Helmet } from "react-helmet-async";
import { escapeJsonString } from "../../bootstrap/legacySeo";
import { resolveImageUrl } from "../../utils/image";

const capitalizeWords = (str = "") => {
	return str.replace(/\b\w/g, (char) => char.toUpperCase());
};

const generateKeywords = (products = []) => {
	const categoryKeywords = products.map(
		(product) => product?.category?.categoryName || ""
	);
	const productKeywords = products.map((product) => product?.productName || "");
	return [...new Set([...categoryKeywords, ...productKeywords])].join(", ");
};

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

export default function HomeLegacySeo({
	featuredProducts = [],
	newArrivalProducts = [],
	customDesignProducts = [],
}) {
	const title = "Serene Jannat | Best Gifts and Candles Online Shop";
	const description =
		"Discover the best offers at Serene Jannat, your online gift store for candles, glass items, and more. Show love to your loved ones with our exquisite collection.";
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
}
