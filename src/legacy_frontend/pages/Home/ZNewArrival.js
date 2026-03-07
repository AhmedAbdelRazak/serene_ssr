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

const ZNewArrival = ({ newArrivalProducts }) => {
	const { openSidebar2, addToCart } = useCartContext();
	const { user } = isAuthenticated();
	const history = useHistory();

	// -----------------------------
	// 1) Local state for lazy-load
	// -----------------------------
	// Start with the initial 5 from context
	const [arrivalList, setArrivalList] = useState(newArrivalProducts || []);
	// Keep track of how many we have already loaded
	const [skip, setSkip] = useState(arrivalList.length);
	// Simple loading flag to prevent multiple fetches at once
	const [loadingOne, setLoadingOne] = useState(false);

	// We want at most 30 total
	const MAX_PRODUCTS = 30;
	const hasMore = arrivalList.length < MAX_PRODUCTS;

	// Function to fetch exactly ONE more product (if available).
	const fetchOneMoreProduct = useCallback(async () => {
		if (!hasMore) return; // Already have 30 or more
		setLoadingOne(true);
		try {
			// newArrivals=1 => (featured=0, newArrivals=1, customDesigns=0, etc.)
			// skip = how many we have so far, records=1 means fetch just one
			const data = await gettingSpecificProducts(0, 1, 0, 0, 0, 1, skip);
			if (data && !data.error) {
				// If we got something back, append it
				if (data.length > 0) {
					setArrivalList((prev) => [...prev, ...data]);
					setSkip(skip + data.length);
				} else {
					// No more data from server
				}
			}
		} catch (err) {
			console.error(err);
		} finally {
			setLoadingOne(false);
		}
	}, [skip, hasMore]);

	// -----------------------------
	// 2) Slider Settings
	// -----------------------------
	// We'll override `afterChange` to detect when the user is near the end
	const settings = useMemo(
		() => ({
			dots: true,
			infinite: true,
			speed: 300,
			slidesToShow: 5,
			slidesToScroll: 1,
			autoplay: false,
			autoplaySpeed: 9000,
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
				// If we're loading or no more to fetch, stop
				if (loadingOne || !hasMore) return;

				// If we are near the end of the currently loaded items,
				// let's fetch one more product
				// "slidesToShow=5" means last index would be arrivalList.length - 5
				// but we can just check if currentSlide > arrivalList.length - 6
				if (currentSlide > arrivalList.length - 6) {
					fetchOneMoreProduct();
				}
			},
		}),
		[hasMore, loadingOne, arrivalList.length, fetchOneMoreProduct]
	);

	// -----------------------------
	// 3) Handlers
	// -----------------------------

	const handleCartIconClick = useCallback(
		async (product, e) => {
			e.stopPropagation();

			if (product.isPrintifyProduct && product.printifyProductDetails?.POD) {
				history.push(`/custom-gifts/${product._id}`);
				return;
			}

			const eventId = `addToCart-newArrivals-${product._id}-${Date.now()}`;

			ReactGA.event({
				category: "Add To The Cart New Arrivals",
				action: "User Added New Arrival Product To The Cart",
				label: `User added ${product.productName} to the cart from New Arrivals`,
			});

			ReactPixel.track(
				"AddToCart",
				{
					content_name: product.productName,
					content_ids: [product._id],
					content_type: "product",
					currency: "USD",
					value: product.priceAfterDiscount || product.price,
					contents: [{ id: product._id, quantity: 1 }],
				},
				{
					eventID: eventId,
				}
			);

			try {
				await axios.post(
					`${process.env.REACT_APP_API_URL}/facebookpixel/conversionapi`,
					{
						eventName: "AddToCart",
						eventId,
						email: user?.email || "Unknown",
						phone: user?.phone || "Unknown",
						currency: "USD",
						value: product.priceAfterDiscount || product.price,
						contentIds: [product._id],
						userAgent: window.navigator.userAgent,
					}
				);
			} catch (err) {
				console.error("Server-side AddToCart error (ZNewArrival)", err);
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
		// eslint-disable-next-line
		[history, openSidebar2, addToCart]
	);

	const navigateToProduct = useCallback(
		(product) => {
			if (product.isPrintifyProduct && product.printifyProductDetails?.POD) {
				history.push(`/custom-gifts/${product._id}`);
				return;
			}
			ReactGA.event({
				category: "New Arrival Product Clicked",
				action: "New Arrival Product Clicked",
				label: `User Navigated to ${product.productName} single page`,
			});

			const eventId = `Lead-newArrivals-${product._id}-${Date.now()}`;

			ReactPixel.track("Lead", {
				content_name: `User Navigated to ${product.productName} single page`,
				click_type: "New Arrival Product Clicked",
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

	// -----------------------------
	// 4) Render
	// -----------------------------
	return (
		<Container>
			<ZNewArrivalWrapper>
				<h2>New Arrivals</h2>
				<Slider {...settings}>
					{arrivalList.map((product, i) => {
						const chosenProductAttributes = product.productAttributes?.[0];
						const images =
							chosenProductAttributes?.productImages ||
							product.thumbnailImage?.[0]?.images ||
							[];
						const firstImage = images[0];
						const primarySrc = resolveImageUrl(firstImage);
						const fallbackSrc = resolveImageUrl(firstImage, {
							preferCloudinary: false,
						});

						const originalPrice = product.price || 0;
						const discountedPrice =
							product.priceAfterDiscount > 0
								? product.priceAfterDiscount
								: chosenProductAttributes?.priceAfterDiscount || 0;

						const originalPriceFixed = originalPrice.toFixed(2);
						const discountedPriceFixed = discountedPrice.toFixed(2);

						const totalQuantity =
							product.productAttributes?.reduce(
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
											{isPOD && <PodBadge>Custom Design 💖</PodBadge>}

											{totalQuantity > 0 ? (
												<CartIcon
													onClick={(e) => handleCartIconClick(product, e)}
												/>
											) : (
												<OutOfStockBadge>Out of Stock</OutOfStockBadge>
											)}

											<ImageWrapper>
												<ProductImage
													loading='lazy'
													src={primarySrc}
													fallbackSrc={fallbackSrc}
													alt={`${product.productName} - single view`}
													sizes='(max-width: 480px) 85vw, (max-width: 600px) 50vw, (max-width: 1024px) 33vw, 20vw'
													widths={[240, 360, 480, 600, 800]}
												/>
											</ImageWrapper>
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
			</ZNewArrivalWrapper>
		</Container>
	);
};

export default ZNewArrival;

/* ==== STYLES (unchanged) ==== */

const Container = styled.div`
	background: var(--background-light);
	padding: 10px;
	border-radius: 5px;
	margin-top: 50px;
	margin-bottom: 50px;
`;

const ZNewArrivalWrapper = styled.div`
	max-width: 1400px;
	margin: auto;

	h2 {
		font-weight: bold;
		text-align: center;
		margin-bottom: 40px;
		color: var(--text-color-dark);
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
	box-shadow: var(--box-shadow-light);
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
		box-shadow: var(--box-shadow-dark);
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

const PodBadge = styled.div`
	position: absolute;
	top: 12px;
	left: 12px;
	background-color: #ffafc5;
	color: #ffffff;
	padding: 4px 8px;
	border-radius: 4px;
	font-weight: bold;
	font-size: 0.8rem;
	z-index: 20;
	box-shadow: 0 0 3px rgba(0, 0, 0, 0.3);
`;

const CartIcon = styled(ShoppingCartOutlined)`
	position: absolute;
	top: 20px;
	right: 20px;
	font-size: 24px;
	color: var(--neutral-light);
	background-color: rgba(0, 0, 0, 0.5);
	border-radius: 50%;
	padding: 3px;
	cursor: pointer;
	z-index: 10;

	&:hover {
		color: var(--secondary-color-dark);
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

const OriginalPrice = styled.span`
	color: var(--secondary-color);
	text-decoration: line-through;
	margin-right: 8px;
`;

const DiscountedPrice = styled.span`
	color: var(--text-color-primary);
`;
