import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { useHistory } from "react-router-dom";
import { Collapse } from "antd";
import { useCartContext } from "../../cart_context";
import { toast } from "react-toastify";
import DisplayImages from "./DisplayImages"; // Adjust the path as necessary
import CommentsAndRatings from "./CommentsAndRatings"; // Import CommentsAndRatings component
import {
	HeartOutlined,
	ShoppingCartOutlined,
	ArrowLeftOutlined,
} from "@ant-design/icons";
import { isAuthenticated } from "../../auth"; // Import authentication functions
import { like, unlike, userlike, userunlike } from "../../apiCore"; // Import API functions
import RelatedProductsCarousel from "./RelatedProductsCarousel";
import SigninModal from "./SigninModal/SigninModal";
import { Helmet } from "react-helmet-async";
import ReactGA from "react-ga4";
import ReactPixel from "react-facebook-pixel";
import axios from "axios";
import { resolveImageUrl } from "../../utils/image";
import DeferredRender from "../../components/DeferredRender";
import {
	escapeJsonString,
	useLegacySeoEnabled,
} from "../../bootstrap/legacySeo";

const truncateMetaDescription = (text, limit = 155) => {
	if (!text) return "";
	const normalized = text.replace(/\s+/g, " ").trim();
	if (normalized.length <= limit) return normalized;
	return `${normalized.slice(0, limit - 3).trim()}...`;
};

const SingleProductNoVariables = ({ product, likee, setLikee }) => {
	const { addToCart, openSidebar2 } = useCartContext();
	const [chosenImages, setChosenImages] = useState([]);
	const [description, setDescription] = useState("");
	const [plainDescription, setPlainDescription] = useState("");
	const [modalVisible3, setModalVisible3] = useState(false);
	const [likes, setLikes] = useState(0);
	const history = useHistory();
	const legacySeoEnabled = useLegacySeoEnabled();

	const auth = isAuthenticated() || {};
	const token = auth.token || "";
	const user = auth.user || null;

	useEffect(() => {
		if (product.thumbnailImage.length > 0) {
			const images = product.thumbnailImage[0].images.map((img) =>
				resolveImageUrl(img)
			);
			setChosenImages(images);
		}

		// Remove <br> tags from the description
		const cleanedDescription = product.description.replace(/<br>/g, "");
		setDescription(cleanedDescription);

		// Convert description to plain text for Helmet
		const plainTextDescription = cleanedDescription.replace(/<[^>]+>/g, "");
		setPlainDescription(plainTextDescription);

		// Check if the product is already in the wishlist
		const isProductLiked = product.likes.some(
			(like) => like.toString() === user?._id
		);
		setLikee(isProductLiked);
		setLikes(product.likes.length);
		// eslint-disable-next-line
	}, [product, setLikee]);

	const handleAddToCart = () => {
		addToCart(product._id, null, 1, product);
		openSidebar2();
	};

	const handleBackToProducts = () => {
		history.push("/our-products");
	};

	const handleAddToWishlist = () => {
		if (!isAuthenticated()) {
			setModalVisible3(true);
			return;
		}

		// Update the state immediately
		setLikee(!likee);
		setLikes(likee ? likes - 1 : likes + 1);
		toast.info(likee ? "Removed from wishlist!" : "Added to wishlist!");

		const callApi = likee ? unlike : like;
		callApi(user._id, token, product._id).then((data) => {
			if (data.error) {
				// Revert state change if API call fails
				setLikee(likee);
				setLikes(likee ? likes + 1 : likes - 1);
				toast.error(data.error);
			} else {
				// Sync state with backend response
				setLikee(!likee);
				setLikes(data.likes.length);

				setTimeout(function () {
					window.location.reload(false);
				}, 2000);
			}
		});
	};

	// eslint-disable-next-line
	const handleUserLikeToggle = () => {
		if (!isAuthenticated()) {
			toast.error("Please sign in to like this product");
			return;
		}

		const callApi = likee ? userunlike : userlike;
		callApi(user._id, token, product._id).then((data) => {
			if (data.error) {
				toast.error(data.error);
			} else {
				setLikee(!likee);
				toast.info(likee ? "Removed from your likes!" : "Liked!");
			}
		});
	};

	const priceDisplay = () => {
		const { priceAfterDiscount, price } = product;
		if (priceAfterDiscount && price && priceAfterDiscount < price) {
			return (
				<div>
					<StrikethroughPrice>${price}</StrikethroughPrice>{" "}
					<DiscountedPrice>${priceAfterDiscount}</DiscountedPrice>
				</div>
			);
		}
		return <DiscountedPrice>${priceAfterDiscount || price}</DiscountedPrice>;
	};

	const capitalizeWords = (str) => {
		return str.replace(/\b\w/g, (char) => char.toUpperCase());
	};

	// eslint-disable-next-line
	const formatGTIN = (sku) => {
		let formattedSKU = sku.toString().replace(/[^0-9]/g, ""); // Remove non-numeric characters
		if (formattedSKU.length > 14) {
			formattedSKU = formattedSKU.substring(0, 14);
		} else if (formattedSKU.length < 14) {
			while (formattedSKU.length < 14) {
				formattedSKU += "0"; // Pad with zeros
			}
		}
		return formattedSKU;
	};

	const metaDescription = truncateMetaDescription(plainDescription);

	return (
		<div>
			{legacySeoEnabled ? <Helmet>
				<script type='application/ld+json'>
					{`
        {
            "@context": "http://schema.org",
            "@type": "Product",
            "name": "${escapeJsonString(product.productName)}",
            "image": "${chosenImages[0]}",
            "description": "${escapeJsonString(plainDescription)}",
            "brand": {
                "@type": "Brand",
                "name": "Serene Jannat"
            },
            "mpn": "${product.productSKU}",
            "offers": {
                "@type": "Offer",
                "priceCurrency": "USD",
                "price": "${Number(product.priceAfterDiscount).toFixed(2)}",
                "priceValidUntil": "2026-12-31",
                "availability": "${
									Number(product.quantity) > 0
										? "http://schema.org/InStock"
										: "http://schema.org/OutOfStock"
								}",
                "itemCondition": "http://schema.org/NewCondition",
                "hasMerchantReturnPolicy": {
                    "@type": "MerchantReturnPolicy",
                    "returnPolicyCategory": "https://schema.org/MerchantReturnFiniteReturnWindow",
                    "merchantReturnDays": 7,
                    "merchantReturnLink": "https://serenejannat.com/privacy-policy-terms-conditions",
                    "applicableCountry": {
                        "@type": "Country",
                        "name": "US"
                    },
                    "returnMethod": "https://schema.org/ReturnByMail",
                    "returnFees": "https://schema.org/FreeReturn"
                },
                "shippingDetails": {
                    "@type": "OfferShippingDetails",
                    "shippingRate": {
                        "@type": "MonetaryAmount",
                        "value": "5.00",
                        "currency": "USD"
                    },
                    "deliveryTime": {
                        "@type": "ShippingDeliveryTime",
                        "handlingTime": {
                            "@type": "QuantitativeValue",
                            "minValue": 0,
                            "maxValue": 1,
                            "unitCode": "d"
                        },
                        "transitTime": {
                            "@type": "QuantitativeValue",
                            "minValue": 3,
                            "maxValue": 7,
                            "unitCode": "d"
                        }
                    },
                    "shippingDestination": {
                        "@type": "DefinedRegion",
                        "addressCountry": {
                            "@type": "Country",
                            "name": "US"
                        },
                        "geoMidpoint": {
                            "@type": "GeoCoordinates",
                            "latitude": 37.7749,
                            "longitude": -122.4194
                        }
                    }
                }
            },
            "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": "${
									product.ratings.length > 0
										? (
												product.ratings.reduce(
													(acc, rating) => acc + rating.star,
													0
												) / product.ratings.length
											).toFixed(1)
										: 5.0
								}",
                "reviewCount": "${
									product.ratings.length > 0 ? product.ratings.length : 1
								}"
            },
            "review": ${JSON.stringify(
							product.comments && product.comments.length > 0
								? product.comments.map((comment) => ({
										"@type": "Review",
										reviewRating: {
											"@type": "Rating",
											ratingValue: comment.rating || 5,
										},
										author: {
											"@type": "Person",
											name: escapeJsonString(
												comment.postedBy ? comment.postedBy.name : "Anonymous"
											),
										},
										reviewBody: escapeJsonString(comment.text),
										datePublished: new Date(comment.created).toISOString(),
									}))
								: []
						)},
            "productID": "${product._id}",
            "identifier_exists": false
        }
        `}
				</script>
				<link
					rel='canonical'
					href={`https://serenejannat.com/single-product/${product.slug}/${product.category.categorySlug}/${product._id}`}
				/>
				<meta property='og:title' content={product.productName} />
				<meta property='og:description' content={metaDescription} />
				<meta property='og:image' content={chosenImages[0]} />
				<meta
					property='og:url'
					content={`https://serenejannat.com/single-product/${product.slug}/${product.category.categorySlug}/${product._id}`}
				/>
				<meta property='og:type' content='product' />
				<meta
					property='product:price:amount'
					content={product.priceAfterDiscount}
				/>
				<meta property='product:price:currency' content='USD' />
				<meta
					property='product:availability'
					content={`${Number(product.quantity) > 0 ? "instock" : "outofstock"}`}
				/>
				<meta property='product:condition' content='new' />
				<meta property='product:id' content={product._id} />
				<meta
					name='keywords'
					content={`${product.category.categoryName}, ${product.productName}, ${
						product.subcategory && product.subcategory[0]
							? product.subcategory[0].SubcategoryName
							: ""
					}, ${
						product.subcategory && product.subcategory[1]
							? product.subcategory[1].SubcategoryName
							: ""
					}`}
				/>
				<meta charSet='utf-8' />
				<title>
					{capitalizeWords(
						`${product.category.categoryName} | ${product.productName}`
					)}
				</title>
				<meta name='description' content={metaDescription} />

				<script
					type='application/ld+json'
					dangerouslySetInnerHTML={{
						__html: JSON.stringify({
							"@context": "https://schema.org",
							"@type": "Organization",
							url: "https://serenejannat.com",
							name: "Serene Jannat",
							logo: "https://serenejannat.com/logo192.png",
							sameAs: [
								"https://www.facebook.com/profile.php?id=61575325586166",
							],
						}),
					}}
				/>
			</Helmet> : null}

			<SigninModal
				modalVisible3={modalVisible3}
				setModalVisible3={setModalVisible3}
			/>
			<SingleProductWrapper>
				<ProductImagesWrapper>
					<DisplayImages images={chosenImages} />
				</ProductImagesWrapper>
				<ProductDetailsWrapper>
					<ProductTitle>{product.productName}</ProductTitle>
					<ProductPrice>{priceDisplay()}</ProductPrice>
					{product.color && (
						<ProductAttribute>
							<strong>Color:</strong>{" "}
							<span style={{ textTransform: "capitalize" }}>
								{product.color}
							</span>
						</ProductAttribute>
					)}
					{product.size && (
						<ProductAttribute>
							<strong>Size:</strong> {product.size}
						</ProductAttribute>
					)}
					{product.scent && (
						<ProductAttribute>
							<strong>Scent:</strong> {product.scent}
						</ProductAttribute>
					)}
					<CollapseContainer>
						<Collapse
							defaultActiveKey={["1"]}
							items={[
								{
									key: "1",
									label: "Product Description",
									children: (
										<>
											<ProductDescription
												dangerouslySetInnerHTML={{ __html: description }}
											/>
											<StyledGeoDataList>
												{product.geodata && product.geodata.length && (
													<li>Length: {product.geodata.length} in</li>
												)}
												{product.geodata && product.geodata.width && (
													<li>Width: {product.geodata.width} in</li>
												)}
												{product.geodata && product.geodata.height && (
													<li>Height: {product.geodata.height} in</li>
												)}
												{product.geodata && product.geodata.weight && (
													<li>Weight: {product.geodata.weight} lbs</li>
												)}
											</StyledGeoDataList>
										</>
									),
								},
							]}
						/>
					</CollapseContainer>
					{product.SubSKU && (
						<SubSKU>
							<strong>SKU:</strong> {product.SubSKU}
						</SubSKU>
					)}
					<ButtonContainer>
						<ActionButton
							disabled={product && product.quantity <= 0}
							onClick={() => {
								handleAddToCart();
								ReactGA.event({
									category: "SingleProduct Add To Cart",
									action: "User Added To The Cart From Single Product",
								});

								ReactPixel.track("AddToCart", {
									// Standard Meta parameters:
									content_name: product.productName,
									content_ids: [product._id],
									content_type: "product",
									currency: "USD",
									value: product.priceAfterDiscount || product.price, // the price you'd like to track

									// Optionally, you could pass `contents`:
									contents: [
										{
											id: product._id,
											quantity: 1,
										},
									],
								});

								const eventId = `AddToCart-SingleProduct-${product?._id}-${Date.now()}`;

								axios.post(
									`${process.env.REACT_APP_API_URL}/facebookpixel/conversionapi`,
									{
										eventName: "AddToCart",
										eventId,
										email: user?.email || "Unknown",
										phone: user?.phone || "Unknown",
										currency: "USD",
										value: product?.priceAfterDiscount || product?.price,
										contentIds: [product?._id],
										userAgent: window.navigator.userAgent,
									}
								);
							}}
							color='var(--primary-color-darker)'
						>
							<ShoppingCartOutlined />{" "}
							{(product &&
								product.productAttributes &&
								product.productAttributes.reduce(
									(acc, attr) => acc + attr.quantity,
									0
								)) ||
							(product && product.quantity <= 0)
								? "Out Of Stock"
								: "Add to Cart"}
						</ActionButton>
						<ActionButton
							onClick={handleAddToWishlist}
							color={
								likee ? "var(--secondary-color-dark)" : "var(--secondary-color)"
							}
						>
							<HeartOutlined />{" "}
							{likee ? "Remove from Wishlist" : "Add to Wishlist"}
						</ActionButton>

						<ActionButton
							onClick={handleBackToProducts}
							color='var(--accent-color-2-dark)'
						>
							<ArrowLeftOutlined /> Back to Products
						</ActionButton>
					</ButtonContainer>
				</ProductDetailsWrapper>
			</SingleProductWrapper>
			<DeferredRender rootMargin='240px 0px'>
				<CommentsAndRatings product={product} user={user} token={token} />
			</DeferredRender>
			<DeferredRender rootMargin='240px 0px'>
				<div className='my-3'>
					{product &&
					product.relatedProducts &&
					product.relatedProducts.length > 0 ? (
						<RelatedProductsCarousel relatedProducts={product.relatedProducts} />
					) : null}
				</div>
			</DeferredRender>
		</div>
	);
};

export default SingleProductNoVariables;

// Styled components...

const SingleProductWrapper = styled.div`
	display: flex;
	flex-wrap: wrap;
	padding: 20px;
	background: var(--background-light);
	border-radius: 10px;
	box-shadow: var(--box-shadow-light);
	overflow-y: auto;
`;

const ProductImagesWrapper = styled.div`
	flex: 6;
	min-width: 500px;
	margin-right: 20px;

	img {
		width: 100%;
		height: 700px; /* Ensure the height matches the height set in DisplayImages */
		object-fit: contain; /* Ensure the whole image is displayed without distortion */
		border-radius: 5px;
	}

	@media (max-width: 768px) {
		flex: 1 1 100%;
		margin-right: 0;
		min-width: 300px;

		img {
			width: 100%;
			height: 400px; /* Adjust max height as needed for smaller screens */
			object-fit: contain; /* Ensure the whole image is displayed without distortion */
		}
	}
`;

const ProductDetailsWrapper = styled.div`
	flex: 6;
	display: flex;
	flex-direction: column;
	gap: 10px; /* Ensure even spacing between elements */
	padding-top: 30px;
	@media (max-width: 768px) {
		flex: 1 1 100%;
		margin-top: 20px;
		padding-top: 10px;
	}
`;

const ProductTitle = styled.h1`
	font-size: 24px;
	font-weight: bold;
	margin-bottom: 10px;
	color: var(--text-color-primary);
	text-transform: capitalize;
`;

const ProductPrice = styled.h2`
	font-size: 20px;
	color: var(--text-color-primary);
	margin-bottom: 20px;
	font-weight: bold;
`;

const StrikethroughPrice = styled.span`
	font-size: 18px;
	color: var(--secondary-color-dark);
	text-decoration: line-through;
	margin-right: 10px;
`;

const DiscountedPrice = styled.span`
	font-size: 20px;
	color: var(--primary-color);
	font-weight: bold;
`;

const ProductAttribute = styled.div`
	font-size: 16px;
	margin-bottom: 10px;
	color: var(--text-color-secondary);
`;

const CollapseContainer = styled.div`
	margin-bottom: 20px;
`;

const ButtonContainer = styled.div`
	display: flex;
	justify-content: center;
	flex-wrap: wrap;
	gap: 10px; /* Ensure even spacing between buttons */

	@media (max-width: 768px) {
		flex-direction: column;
		button {
			margin-bottom: 10px;
		}
	}
`;

const ActionButton = styled.button`
	padding: 10px 20px;
	background: ${(props) => props.color};
	color: var(--button-font-color);
	border: none;
	border-radius: 5px;
	cursor: pointer;
	font-size: 16px;
	display: flex;
	align-items: center;
	justify-content: center; /* Center align button content */
	width: 100%; /* Ensure buttons have the same width */
	max-width: 300px; /* Set a max width to control button size */
	text-align: center; /* Center align text in button */
	margin: auto;
	transition: var(--main-transition);

	&:hover {
		background: ${(props) => darkenColor(props.color)};
		transition: var(--main-transition);
	}
`;

const darkenColor = (color) => {
	// Function to darken the button color on hover
	switch (color) {
		case "var(--primary-color)":
			return "var(--primary-color-dark)";
		case "var(--primary-color-darker)":
			return "var(--primary-color)";
		case "var(--secondary-color)":
			return "var(--secondary-color-dark)";
		case "var(--accent-color-2-dark)":
			return "var(--accent-color-2)";
		case "var(--neutral-dark)":
			return "var(--neutral-darker)";
		default:
			return color;
	}
};

const ProductDescription = styled.div`
	font-size: 16px;
	line-height: 1.5;
	color: var(--text-color-secondary);
`;

const SubSKU = styled.div`
	font-size: 16px;
	color: var(--text-color-secondary);
`;

const StyledGeoDataList = styled.ul`
	list-style: disc inside;
	padding: 0;
	margin-top: 10px;
	color: var(--text-color-primary);
	font-weight: bold;

	li {
		margin-bottom: 5px;
		color: var(--text-color-secondary);
	}
`;

