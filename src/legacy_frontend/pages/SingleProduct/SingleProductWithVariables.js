import React, { useState, useEffect, useCallback } from "react";
import styled from "styled-components";
import { Suspense, lazy, useMemo } from "react";
import { useRef } from "react";
import { useHistory, useLocation } from "react-router-dom";
import { Collapse } from "antd";
import { useCartContext } from "../../cart_context";
import { toast } from "react-toastify";
import { getColors, like, unlike, userlike, userunlike } from "../../apiCore";
import ColorsAndSizes from "./ColorsAndSizes";
import DisplayImages from "./DisplayImages";
import { resolveImageUrl } from "../../utils/image";

import {
	HeartOutlined,
	ShoppingCartOutlined,
	ArrowLeftOutlined,
} from "@ant-design/icons";
import { isAuthenticated } from "../../auth";
import { Helmet } from "react-helmet-async";
import DeferredRender from "../../components/DeferredRender";
import {
	escapeJsonString,
	useLegacySeoEnabled,
} from "../../bootstrap/legacySeo";

const CommentsAndRatings = lazy(() => import("./CommentsAndRatings"));
const RelatedProductsCarousel = lazy(() => import("./RelatedProductsCarousel"));
const SigninModal = lazy(() => import("./SigninModal/SigninModal"));

const truncateMetaDescription = (text, limit = 155) => {
	if (!text) return "";
	const normalized = text.replace(/\s+/g, " ").trim();
	if (normalized.length <= limit) return normalized;
	return `${normalized.slice(0, limit - 3).trim()}...`;
};

const buildVariantSearch = ({ color = "", size = "" } = {}) => {
	const params = new URLSearchParams();
	if (color) params.set("color", color);
	if (size && size !== "nosizes") params.set("size", size);
	return params.toString();
};

function emitGaEvent(payload = {}) {
	if (typeof window === "undefined" || typeof window.gtag !== "function") return;
	try {
		window.gtag("event", `${payload.action || "event"}`.trim(), {
			event_category: payload.category,
			event_label: payload.label,
			value: payload.value,
		});
	} catch {}
}

function emitFbTrack(eventName, payload = {}, options = {}) {
	if (typeof window === "undefined" || typeof window.fbq !== "function") return;
	try {
		window.fbq("track", eventName, payload, options);
	} catch {}
}

async function postFacebookConversion(payload = {}) {
	try {
		await fetch(`${process.env.REACT_APP_API_URL}/facebookpixel/conversionapi`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(payload),
			keepalive: true,
		});
	} catch {}
}

function resolveClosestProductAttribute(productAttributes = [], color = "", size = "") {
	if (!Array.isArray(productAttributes) || productAttributes.length === 0) return null;
	const exactMatch = productAttributes.find(
		(attr) => attr.color === color && attr.size === size
	);
	if (exactMatch) return exactMatch;
	const colorMatch = productAttributes.find((attr) => attr.color === color);
	if (colorMatch) return colorMatch;
	const sizeMatch = productAttributes.find((attr) => attr.size === size);
	if (sizeMatch) return sizeMatch;
	return productAttributes[0];
}

function resolveChosenImagesForAttribute(product = {}, attribute = null) {
	if (!attribute) return [];
	return (Array.isArray(product?.productAttributes) ? product.productAttributes : [])
		.filter(
			(attr) =>
				attr.color === attribute.color &&
				attr.size === attribute.size &&
				Array.isArray(attr.productImages) &&
				attr.productImages.length > 0
		)
		.flatMap((attr) => attr.productImages.map((img) => resolveImageUrl(img)))
		.slice(0, 5);
}

const SingleProductWithVariables = ({ product, likee, setLikee }) => {
	const { addToCart, openSidebar2 } = useCartContext();
	const history = useHistory();
	const location = useLocation();
	const isSyncingVariantFromLocationRef = useRef(false);
	const initialVariantState = useMemo(() => {
		const queryParams = new URLSearchParams(location.search);
		const requestedColor = queryParams.get("color") || "";
		const requestedSize = queryParams.get("size") || "";
		const initialAttribute = resolveClosestProductAttribute(
			product?.productAttributes,
			requestedColor,
			requestedSize
		);
		return {
			attribute: initialAttribute || {},
			images: resolveChosenImagesForAttribute(product, initialAttribute),
			color: initialAttribute?.color || "",
			size: initialAttribute?.size || "",
		};
	}, [location.search, product]);
	const [selectedColor, setSelectedColor] = useState(() => initialVariantState.color);
	const [selectedSize, setSelectedSize] = useState(() => initialVariantState.size);
	const [chosenAttributes, setChosenAttributes] = useState(
		() => initialVariantState.attribute
	);
	const [chosenImages, setChosenImages] = useState(() => initialVariantState.images);
	const [allColors, setAllColors] = useState([]);
	const [likes, setLikes] = useState(0);
	const [modalVisible3, setModalVisible3] = useState(false);
	const legacySeoEnabled = useLegacySeoEnabled();
	const auth = isAuthenticated() || {};
	const token = auth.token || "";
	const user = auth.user || null;

	useEffect(() => {
		getColors().then((data) => {
			if (data.error) {
				console.error(data.error);
			} else {
				setAllColors(data);
			}
		});
	}, []);

	const updateChosenAttributes = useCallback(
		(color, size) => {
			const nextAttribute = resolveClosestProductAttribute(
				product.productAttributes,
				color,
				size
			);
			setChosenAttributes(nextAttribute || {});
			setChosenImages(resolveChosenImagesForAttribute(product, nextAttribute));
		},
		[product]
	);

	const resolveClosestAttribute = useCallback(
		(color = "", size = "") =>
			resolveClosestProductAttribute(product.productAttributes, color, size),
		[product.productAttributes]
	);

	useEffect(() => {
		const nextAttribute = initialVariantState.attribute;
		if (!nextAttribute?.color && !nextAttribute?.size && !nextAttribute?.PK) return;
		isSyncingVariantFromLocationRef.current = true;
		setSelectedColor((prev) => (prev === initialVariantState.color ? prev : initialVariantState.color));
		setSelectedSize((prev) => (prev === initialVariantState.size ? prev : initialVariantState.size));
		setChosenAttributes((prev) =>
			prev?.PK === nextAttribute?.PK ? prev : nextAttribute
		);
		setChosenImages((prev) => {
			const nextImages = initialVariantState.images;
			if (
				prev.length === nextImages.length &&
				prev.every((image, index) => image === nextImages[index])
			) {
				return prev;
			}
			return nextImages;
		});
	}, [initialVariantState]);

	useEffect(() => {
		const userId = user?._id;
		const isProductLiked = userId
			? product.likes.some((like) => like.toString() === userId)
			: false;
		setLikee(isProductLiked);
		setLikes(product.likes.length);
	}, [product.likes, setLikee, user?._id]);

	useEffect(() => {
		if (!product.productAttributes.length) return;
		const nextSearch = buildVariantSearch({
			color: selectedColor,
			size: selectedSize,
		});
		const normalizedNextSearch = nextSearch ? `?${nextSearch}` : "";
		if (isSyncingVariantFromLocationRef.current) {
			if (normalizedNextSearch === location.search) {
				isSyncingVariantFromLocationRef.current = false;
			}
			return;
		}
		if (normalizedNextSearch !== location.search) {
			history.replace({
				pathname: location.pathname,
				search: normalizedNextSearch,
			});
		}
	}, [history, location.pathname, location.search, product, selectedColor, selectedSize]);

	const handleColorChange = (color) => {
		const nextAttribute = resolveClosestAttribute(color, selectedSize);
		if (!nextAttribute) return;
		setSelectedColor(nextAttribute.color);
		setSelectedSize(nextAttribute.size);
		updateChosenAttributes(nextAttribute.color, nextAttribute.size);
	};

	const handleSizeChange = (size) => {
		const nextAttribute = resolveClosestAttribute(selectedColor, size);
		if (!nextAttribute) return;
		setSelectedColor(nextAttribute.color);
		setSelectedSize(nextAttribute.size);
		updateChosenAttributes(nextAttribute.color, nextAttribute.size);
	};

	const handleAddToCart = () => {
		if (!chosenAttributes) {
			toast.error("Please select valid color and size");
			return;
		}
		if (chosenAttributes.quantity <= 0) {
			toast.error("No enough stock available");
			return;
		}
		addToCart(product._id, null, 1, product, chosenAttributes);
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

		setLikee(!likee);
		setLikes(likee ? likes - 1 : likes + 1);
		toast.info(likee ? "Removed from wishlist!" : "Added to wishlist!");

		const callApi = likee ? unlike : like;
		callApi(user._id, token, product._id).then((data) => {
			if (data.error) {
				setLikee(likee);
				setLikes(likee ? likes + 1 : likes - 1);
				toast.error(data.error);
			} else {
				setLikee(!likee);
				setLikes(data.likes.length);

				setTimeout(function () {
					window.location.reload(false);
				}, 2000);
			}
		});
	};

	const getColorName = (hex) => {
		if (!hex) return hex;
		const color = allColors.find(
			(c) => c.hexa.toLowerCase() === hex.toLowerCase()
		);
		return color ? color.color : hex;
	};

	const uniqueColors = [
		...new Set(product.productAttributes.map((attr) => attr.color)),
	].map((cc) => ({
		value: cc,
		name: getColorName(cc),
	}));

	const uniqueSizes = [
		...new Set(
			product.productAttributes
				.filter((attr) => attr.color === selectedColor)
				.map((attr) => attr.size)
		),
	];

	const priceDisplay = () => {
		const { priceAfterDiscount, price } = chosenAttributes;
		if (priceAfterDiscount && price && priceAfterDiscount < price) {
			return (
				<div>
					<StrikethroughPrice>${price}</StrikethroughPrice>{" "}
					<DiscountedPrice>${priceAfterDiscount}</DiscountedPrice>
				</div>
			);
		}
		return (
			<DiscountedPrice>
				${priceAfterDiscount || product.productAttributes[0].priceAfterDiscount}
			</DiscountedPrice>
		);
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

	const capitalizeWords = (str) => {
		return str.replace(/\b\w/g, (char) => char.toUpperCase());
	};

	const gettingTotalProductQty = () => {
		let totalQuantity = 0;

		if (
			product &&
			product.productAttributes &&
			product.productAttributes.length > 0
		) {
			for (let i = 0; i < product.productAttributes.length; i++) {
				totalQuantity += product.productAttributes[i].quantity;
			}
		}

		return totalQuantity;
	};

	const isOutOfStock = chosenAttributes.quantity <= 0;

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

	const plainDescription = product.description.replace(/<[^>]+>/g, "");
	const metaDescription = truncateMetaDescription(plainDescription);
	const canonicalVariantSearch = buildVariantSearch({
		color: selectedColor,
		size: selectedSize,
	});
	const canonicalUrl = `https://serenejannat.com/single-product/${product.slug}/${product.category.categorySlug}/${product._id}${
		canonicalVariantSearch ? `?${canonicalVariantSearch}` : ""
	}`;
	const metaVariantLabel = [getColorName(selectedColor), selectedSize]
		.filter(Boolean)
		.join(" / ");
	const metaTitle = metaVariantLabel
		? `${capitalizeWords(escapeJsonString(product.productName))} | ${metaVariantLabel} | Serene Jannat`
		: `${capitalizeWords(escapeJsonString(product.productName))} | Serene Jannat`;

	return (
		<div>
			{legacySeoEnabled ? <Helmet>
				<script type='application/ld+json'>
					{`
        {
            "@context": "http://schema.org/",
            "@type": "Product",
            "name": "${capitalizeWords(escapeJsonString(product.productName))}",
            "image": "${chosenImages[0]}",
            "description": "${escapeJsonString(product.description.replace(/<[^>]+>/g, ""))}",
            "brand": {
                "@type": "Brand",
                "name": "Serene Jannat"
            },
            "mpn": "${escapeJsonString(product.productAttributes.map((attr) => `${product.productSKU}-${attr.SubSKU}`).join(", "))}",
            "offers": {
                "@type": "Offer",
                "priceCurrency": "USD",
                "price": "${Number(chosenAttributes.priceAfterDiscount || product.productAttributes[0].priceAfterDiscount).toFixed(2)}",
                "priceValidUntil": "2026-12-31",
                "availability": "${gettingTotalProductQty() > 0 ? "http://schema.org/InStock" : "http://schema.org/OutOfStock"}",
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
                "ratingValue": "${product.ratings.length > 0 ? (product.ratings.reduce((acc, rating) => acc + rating.star, 0) / product.ratings.length).toFixed(1) : 5.0}",
                "reviewCount": "${product.ratings.length > 0 ? product.ratings.length : 1}"
            },
            "review": ${JSON.stringify(
							product.comments.map((comment) => ({
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
						)},
            "productID": "${product._id}",
            "identifier_exists": false,
            "url": "${canonicalUrl}"${
							selectedColor
								? `,
            "color": "${escapeJsonString(getColorName(selectedColor))}"`
								: ""
						}${
							selectedSize && selectedSize !== "nosizes"
								? `,
            "size": "${escapeJsonString(selectedSize)}"`
								: ""
						}
        }
        `}
				</script>
				<link rel='canonical' href={canonicalUrl} />
				<meta
					property='og:title'
					content={metaTitle}
				/>
				<meta property='og:description' content={metaDescription} />
				<meta property='og:image' content={chosenImages[0]} />
				<meta property='og:url' content={canonicalUrl} />
				<meta property='og:type' content='product' />
				<meta
					property='product:price:amount'
					content={
						chosenAttributes.priceAfterDiscount ||
						product.productAttributes[0].priceAfterDiscount
					}
				/>
				<meta property='product:price:currency' content='USD' />
				<meta
					property='product:availability'
					content={`${gettingTotalProductQty() > 0 ? "instock" : "outofstock"}`}
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
				<title>{metaTitle}</title>
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

			{modalVisible3 ? (
				<Suspense fallback={null}>
					<SigninModal
						modalVisible3={modalVisible3}
						setModalVisible3={setModalVisible3}
					/>
				</Suspense>
			) : null}
			<SingleProductWrapper>
				<ProductImagesWrapper>
					<DisplayImages images={chosenImages} />
				</ProductImagesWrapper>
				<ProductDetailsWrapper>
					<ProductTitle>{product.productName}</ProductTitle>
					{isOutOfStock && (
						<OutOfStockMessage>ðŸšš No Enough Stock</OutOfStockMessage>
					)}
					<ProductPrice>{priceDisplay()}</ProductPrice>
					<ColorsAndSizes
						colors={uniqueColors}
						sizes={uniqueSizes}
						selectedColor={selectedColor}
						selectedSize={selectedSize}
						handleColorChange={handleColorChange}
						handleSizeChange={handleSizeChange}
					/>
					<CollapseContainer>
						<Collapse
							defaultActiveKey={
								uniqueSizes.length === 1 && uniqueSizes[0] === "nosizes"
									? ["1"]
									: []
							}
							items={[
								{
									key: "1",
									label: "Product Description",
									children: (
										<>
											<ProductDescription
												dangerouslySetInnerHTML={{ __html: product.description }}
											/>
											{uniqueSizes.length === 1 &&
												uniqueSizes[0] === "nosizes" && (
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
												)}
										</>
									),
								},
							]}
						/>
					</CollapseContainer>
					{chosenAttributes.SubSKU && (
						<SubSKU>
							<strong>SKU:</strong> {chosenAttributes.SubSKU}
						</SubSKU>
					)}
					<ButtonContainer>
						<ActionButton
							onClick={() => {
								handleAddToCart();
								emitGaEvent({
									category: "SingleProduct Add To Cart",
									action: "User Added To The Cart From Single Product",
								});

								emitFbTrack("AddToCart", {
									content_name: product.productName,
									content_ids: [product._id],
									content_type: "product",
									currency: "USD",
									value: product.priceAfterDiscount || product.price,
									contents: [
										{
											id: product._id,
											quantity: 1,
										},
									],
								});

								const eventId = `AddToCart-SingleProduct-${product?._id}-${Date.now()}`;

								void postFacebookConversion({
									eventName: "AddToCart",
									eventId,
									email: user?.email || "Unknown",
									phone: user?.phone || "Unknown",
									currency: "USD",
									value: product?.priceAfterDiscount || product?.price,
									contentIds: [product?._id],
									userAgent: window.navigator.userAgent,
								});
							}}
							color='var(--primary-color-darker)'
							disabled={isOutOfStock}
						>
							<ShoppingCartOutlined />{" "}
							{isOutOfStock ? "Out Of Stock" : "Add to Cart"}
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
				<Suspense fallback={null}>
					<CommentsAndRatings product={product} user={user} token={token} />
				</Suspense>
			</DeferredRender>
			<DeferredRender rootMargin='240px 0px'>
				<RelatedProductsSection>
					{product &&
					product.relatedProducts &&
					product.relatedProducts.length > 0 ? (
						<Suspense fallback={null}>
							<RelatedProductsCarousel relatedProducts={product.relatedProducts} />
						</Suspense>
					) : null}
				</RelatedProductsSection>
			</DeferredRender>
		</div>
	);
};

export default SingleProductWithVariables;

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
	min-height: 500px;

	img {
		width: 100%;
		height: 500px;
		object-fit: contain;
		border-radius: 5px;
	}

	@media (max-width: 768px) {
		flex: 1 1 100%;
		margin-right: 0;
		min-width: 300px;
		min-height: 400px;

		img {
			width: 100%;
			height: 400px;
		}
	}
`;

const ProductDetailsWrapper = styled.div`
	flex: 6;
	display: flex;
	flex-direction: column;
	gap: 10px;
	min-height: 420px;

	@media (max-width: 768px) {
		flex: 1 1 100%;
		margin-top: 20px;
		min-height: auto;
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

const OutOfStockMessage = styled.p`
	color: darkred;
	font-weight: bold;
	font-size: 14px;
	display: flex;
	align-items: center;
	gap: 5px;
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

const CollapseContainer = styled.div`
	margin-bottom: 20px;
`;

const ButtonContainer = styled.div`
	display: flex;
	justify-content: center;
	flex-wrap: wrap;
	gap: 10px;
	min-height: 142px;

	@media (max-width: 768px) {
		flex-direction: column;
		min-height: 182px;
		button {
			margin-bottom: 10px;
		}
	}
`;

const RelatedProductsSection = styled.div`
	margin-top: 1rem;
	margin-bottom: 1rem;
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
	justify-content: center;
	width: 100%;
	max-width: 300px;
	text-align: center;
	margin: auto;
	transition: var(--main-transition);

	&:hover {
		background: ${(props) => darkenColor(props.color)};
		transition: var(--main-transition);
	}

	&:disabled {
		background: var(--neutral-medium);
		cursor: not-allowed;
	}
`;

const darkenColor = (color) => {
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

