import React, { useMemo, useCallback, useState } from "react";
import styled from "styled-components";
import Slider from "react-slick";
import { Card } from "antd";
import { ShoppingCartOutlined } from "@ant-design/icons";
import { useCartContext } from "../../cart_context";
import { readProduct, gettingSpecificProducts } from "../../apiCore";
import { useHistory } from "react-router-dom";
import ReactGA from "react-ga4";
import ReactPixel from "react-facebook-pixel";
import axios from "axios";
import { isAuthenticated } from "../../auth";
import OptimizedImage from "../../components/OptimizedImage";
import { resolveImageUrl } from "../../utils/image";

const { Meta } = Card;

const MAX_PRODUCTS = 30;

const ZFeaturedProducts = ({ featuredProducts }) => {
	const { openSidebar2, addToCart } = useCartContext();
	const { user } = isAuthenticated();
	const history = useHistory();

	// -----------------------------------------------
	// 1) Local State for Lazy Loading
	// -----------------------------------------------
	// Start with however many featuredProducts come from context (often 5).
	const [featuredList, setFeaturedList] = useState(featuredProducts || []);
	// Keep track of how many we've loaded so far:
	const [skip, setSkip] = useState(featuredList.length);
	// Prevent multiple simultaneous fetches
	const [loadingOne, setLoadingOne] = useState(false);

	const hasMore = featuredList.length < MAX_PRODUCTS;

	// Function to fetch exactly 1 more featured product, if available
	const fetchOneMoreFeatured = useCallback(async () => {
		if (!hasMore || loadingOne) return; // no more needed or already loading
		setLoadingOne(true);

		try {
			// featured=1 => newArrivals=0 => customDesigns=0 => sortByRate=0 => offers=0 => records=1
			// skip = how many we've already loaded
			const data = await gettingSpecificProducts(1, 0, 0, 0, 0, 1, skip);
			if (data && !data.error) {
				if (data.length > 0) {
					// Append the new product(s)
					setFeaturedList((prev) => [...prev, ...data]);
					setSkip(skip + data.length);
				}
			}
		} catch (err) {
			console.error(err);
		} finally {
			setLoadingOne(false);
		}
	}, [skip, hasMore, loadingOne]);

	// -----------------------------------------------
	// 2) Main Slider Settings
	// -----------------------------------------------
	const settings = useMemo(
		() => ({
			dots: true,
			infinite: true,
			speed: 300,
			slidesToShow: 5,
			slidesToScroll: 1,
			autoplay: false,
			autoplaySpeed: 8000,
			centerMode: true,
			centerPadding: "60px",
			responsive: [
				{
					breakpoint: 1024,
					settings: {
						slidesToShow: 3,
						slidesToScroll: 1,
						infinite: true,
						dots: true,
					},
				},
				{
					breakpoint: 600,
					settings: {
						slidesToShow: 2,
						slidesToScroll: 1,
						centerPadding: "30px",
					},
				},
				{
					breakpoint: 480,
					settings: {
						slidesToShow: 1,
						slidesToScroll: 1,
						centerPadding: "25px",
					},
				},
			],
			afterChange: (currentSlide) => {
				// If near the end, fetch one more
				// e.g. if we have 10 items, the last slide index is 9
				// we can trigger if currentSlide >= featuredList.length - 3, etc.
				if (!hasMore || loadingOne) return;
				if (currentSlide > featuredList.length - 6) {
					fetchOneMoreFeatured();
				}
			},
		}),
		[featuredList.length, hasMore, loadingOne, fetchOneMoreFeatured]
	);

	// -----------------------------------------------
	// 3) Inner Image Slider Settings
	// -----------------------------------------------
	const imageSettings = useMemo(
		() => ({
			dots: true,
			infinite: true,
			speed: 1500,
			slidesToShow: 1,
			slidesToScroll: 1,
			autoplay: true,
			autoplaySpeed: 4000,
		}),
		[]
	);

	// -----------------------------------------------
	// 4) Handlers
	// -----------------------------------------------
	const handleCartIconClick = useCallback(
		async (product, e) => {
			e.stopPropagation();
			if (product.isPrintifyProduct && product.printifyProductDetails?.POD) {
				history.push(`/custom-gifts/${product._id}`);
				return;
			}
			ReactGA.event({
				category: "Add To The Cart Featured Products",
				action: "User Added Featured Product To The Cart",
				label: `User added ${product.productName} to the cart from Featured Products`,
			});
			const eventId = `AddToCart-${product._id}-${Date.now()}`; // must match client if deduplicating

			ReactPixel.track("AddToCart", {
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
				// If you want deduplication, pass an eventID:
				eventID: `AddToCart-${product._id}-${Date.now()}`,
			});

			// (B) Trigger server-side Conversions API:
			try {
				await axios.post(
					`${process.env.REACT_APP_API_URL}/facebookpixel/conversionapi`,
					{
						eventName: "AddToCart",
						eventId, // the same as you passed to client pixel for dedup
						// If user is logged in, pass their email/phone:
						email: user && user.email ? user.email : null,
						phone: user && user.phone ? user.phone : null,

						currency: "USD",
						value: product.priceAfterDiscount || product.price,
						contentIds: [product._id],

						// Optionally pass user agent or IP, but IP is often gleaned automatically on server
						userAgent: window.navigator.userAgent,
						clientIpAddress: null, // or from some other source
					}
				);
			} catch (apiError) {
				console.error("Server-side AddToCart event error", apiError);
			}

			// (C) Google Analytics Event (already in your code)
			ReactGA.event({
				category: "Add To The Cart Featured Products",
				action: "User Added Featured Product To The Cart",
				label: `User added ${product.productName} to the cart from Featured Products`,
			});

			// (D) The rest of your logic
			if (product.isPrintifyProduct && product.printifyProductDetails?.POD) {
				history.push(`/custom-gifts/${product._id}`);
				return;
			}

			try {
				const data3 = await readProduct(product._id);
				if (data3 && !data3.error) {
					openSidebar2();
					addToCart(product._id, null, 1, data3, product.productAttributes[0]);
				}
			} catch (error) {
				console.error(error);
			}
		},
		[history, openSidebar2, addToCart, user]
	);

	const navigateToProduct = useCallback(
		(product) => {
			if (product.isPrintifyProduct && product.printifyProductDetails?.POD) {
				history.push(`/custom-gifts/${product._id}`);
				return;
			}
			ReactGA.event({
				category: "Featured Product Clicked",
				action: "Featured Product Clicked",
				label: `User Navigated to ${product.productName} single page`,
			});

			const eventId = `Lead-FeaturedProducts-${product._id}-${Date.now()}`;

			ReactPixel.track("Lead", {
				content_name: `User Navigated to ${product.productName} single page`,
				click_type: "Featured Product Clicked",
				// You can add more parameters if you want
				// e.g. currency: "USD", value: 0
			});

			axios.post(
				`${process.env.REACT_APP_API_URL}/facebookpixel/conversionapi`,
				{
					eventName: "Lead",
					eventId,
					email: user?.email || "Unknown", // if you have a user object
					phone: user?.phone || "Unknown", // likewise
					currency: "USD", // not essential for "Lead," but you can pass
					value: 0,
					contentIds: [product._id], // or any ID you want
					userAgent: window.navigator.userAgent,
				}
			).catch(() => {});

			window.scrollTo({ top: 0, behavior: "smooth" });
			history.push(
				`/single-product/${product.slug}/${product.category.categorySlug}/${product._id}`
			);
		},
		// eslint-disable-next-line
		[history]
	);

	// -----------------------------------------------
	// 5) Render
	// -----------------------------------------------
	return (
		<Container>
			<ZFeaturedProductsWrapper>
				<h2>Featured Products</h2>
				<Slider {...settings}>
					{featuredList.map((product, i) => {
						const chosenProductAttributes = product.productAttributes[0];
						const images =
							chosenProductAttributes?.productImages ||
							product.thumbnailImage?.[0]?.images ||
							[];
						const singlePrimarySrc = resolveImageUrl(images[0]);
						const singleFallbackSrc = resolveImageUrl(images[0], {
							preferCloudinary: false,
						});

						// Original & discounted prices
						const originalPrice =
							chosenProductAttributes?.price || product.price || 0;
						const discountedPrice =
							product.priceAfterDiscount > 0
								? product.priceAfterDiscount
								: chosenProductAttributes?.priceAfterDiscount || 0;

						const originalPriceFixed = originalPrice.toFixed(2);
						const discountedPriceFixed = discountedPrice.toFixed(2);

						const discountPercentage =
							originalPrice > 0
								? ((originalPrice - discountedPrice) / originalPrice) * 100
								: 0;

						const totalQuantity =
							product.productAttributes.reduce(
								(acc, attr) => acc + attr.quantity,
								0
							) || product.quantity;

						const isPOD =
							product.isPrintifyProduct && product.printifyProductDetails?.POD;

						return (
							<div key={i} className='slide'>
								<ProductCard
									hoverable
									onClick={() => navigateToProduct(product)}
									cover={
										<ImageContainer>
											{/* Discount badge if applicable */}
											{discountPercentage > 0 && (
												<DiscountBadge>
													{discountPercentage.toFixed(0)}% OFF!
												</DiscountBadge>
											)}

											{/* POD badge if applicable */}
											{isPOD && <PodBadge>Custom Design 💖</PodBadge>}

											{/* In-stock vs out-of-stock */}
											{totalQuantity > 0 ? (
												<CartIcon
													onClick={(e) => handleCartIconClick(product, e)}
												/>
											) : (
												<OutOfStockBadge>Out of Stock</OutOfStockBadge>
											)}

											{images.length > 1 ? (
												<Slider {...imageSettings}>
													{images.map((img, index) => {
														const primarySrc = resolveImageUrl(img);
														const fallbackSrc = resolveImageUrl(img, {
															preferCloudinary: false,
														});
														return (
														<ImageWrapper key={index}>
															<ProductImage
																src={primarySrc}
																fallbackSrc={fallbackSrc}
																alt={`${product.productName} - view ${index + 1}`}
																sizes='(max-width: 480px) 85vw, (max-width: 600px) 50vw, (max-width: 1024px) 33vw, 20vw'
																widths={[240, 360, 480, 600, 800]}
																loading='lazy'
															/>
														</ImageWrapper>
														);
													})}
												</Slider>
											) : (
												<ImageWrapper>
													<ProductImage
														src={singlePrimarySrc}
														fallbackSrc={singleFallbackSrc}
														alt={`${product.productName} - single view`}
														sizes='(max-width: 480px) 85vw, (max-width: 600px) 50vw, (max-width: 1024px) 33vw, 20vw'
														widths={[240, 360, 480, 600, 800]}
														loading='lazy'
													/>
												</ImageWrapper>
											)}
										</ImageContainer>
									}
								>
									<Meta
										title={product.productName}
										description={
											originalPrice > discountedPrice ? (
												<span>
													Price:{" "}
													<OriginalPrice>${originalPriceFixed}</OriginalPrice>{" "}
													<DiscountedPrice>
														${discountedPriceFixed}
													</DiscountedPrice>
												</span>
											) : (
												<DiscountedPrice>
													Price: ${discountedPriceFixed}
												</DiscountedPrice>
											)
										}
									/>
								</ProductCard>
							</div>
						);
					})}
				</Slider>
			</ZFeaturedProductsWrapper>
		</Container>
	);
};

export default ZFeaturedProducts;

/* =================== STYLES =================== */
const Container = styled.div`
	background: var(--neutral-light2);
	padding: 10px;
	border-radius: 5px;
	margin-top: 50px;
	margin-bottom: 50px;
`;

const ZFeaturedProductsWrapper = styled.div`
	max-width: 1400px;
	margin: auto;

	h2 {
		font-weight: bold;
		text-align: center;
		margin-bottom: 40px;
	}

	.slick-slide {
		padding: 10px;
		box-sizing: border-box;
	}

	.slick-dots {
		bottom: -30px;
	}

	.slick-prev:before,
	.slick-next:before {
		color: var(--text-color-dark);
	}

	.slick-dots li button:before {
		color: var(--text-color-dark);
	}

	.slick-dots {
		display: none !important;
	}

	@media (max-width: 900px) {
		.slick-arrow,
		.slick-prev {
			display: none !important;
		}
	}
`;

const ProductCard = styled(Card)`
	border-radius: 10px;
	overflow: hidden;
	box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
	transition:
		transform 0.3s ease,
		box-shadow 0.3s ease;
	text-align: center;
	position: relative;
	text-transform: capitalize;
	max-height: 400px;
	min-height: 400px;

	@media (max-width: 700px) {
		max-height: 500px;
		min-height: 500px;
	}

	&:hover {
		transform: translateY(-10px);
		box-shadow: 0 6px 8px rgba(0, 0, 0, 0.15);
	}

	.ant-card-cover {
		margin: -16px -16px 0 -16px;
	}

	.ant-card-body {
		padding: 5px !important;
	}
`;

const ImageContainer = styled.div`
	position: relative;
`;

const ImageWrapper = styled.div`
	width: 100%;
	height: 300px;
	overflow: hidden;
	border-radius: 10px 10px 0 0;

	@media (max-width: 700px) {
		height: 400px;
	}
`;

const ProductImage = styled(OptimizedImage)`
	width: 100%;
	height: 100%;
	object-fit: cover;
	object-position: center;
`;

const CartIcon = styled(ShoppingCartOutlined)`
	position: absolute;
	top: 20px;
	right: 20px;
	font-size: 24px;
	color: var(--accent-color-3);
	background-color: rgba(0, 0, 0, 0.5);
	border-radius: 50%;
	padding: 3px;
	cursor: pointer;
	z-index: 10;

	&:hover {
		color: var(--accent-color-3-dark);
	}
`;

const OutOfStockBadge = styled.div`
	position: absolute;
	top: 10px;
	right: 10px;
	font-size: 13px;
	color: grey;
	background-color: #ffc6c6;
	border-radius: 5px;
	padding: 5px 10px;
	z-index: 10;
	font-style: italic;
	font-weight: bold;
`;

const DiscountBadge = styled.div`
	position: absolute;
	top: 15px;
	left: 15px;
	background-color: var(--secondary-color-darker);
	color: var(--button-font-color);
	padding: 5px 10px;
	border-radius: 5px;
	font-weight: bold;
	z-index: 10;
`;

const OriginalPrice = styled.span`
	color: var(--secondary-color);
	text-decoration: line-through;
	margin-right: 8px;
`;

const DiscountedPrice = styled.span`
	color: var(--text-color-primary);
`;

/* === New custom design badge for POD === */
const PodBadge = styled.div`
	position: absolute;
	top: 45px; /* below the discount badge so they don't overlap */
	left: 15px;
	background-color: #ffafc5; /* pinkish color */
	color: #ffffff;
	padding: 4px 8px;
	border-radius: 4px;
	font-weight: bold;
	font-size: 0.8rem;
	z-index: 11; /* ensure it's above discount badge if needed */
	box-shadow: 0 0 3px rgba(0, 0, 0, 0.3);
`;
