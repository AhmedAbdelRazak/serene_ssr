import React, { useCallback } from "react";
import styled from "styled-components";
import { isAuthenticated } from "../../auth";
import {
	buildCloudinarySrcSet,
	getCloudinaryOptimizedUrl,
	resolveImageUrl,
} from "../../utils/image";

const CATEGORY_IMAGE_WIDTHS = [240, 320, 420, 520, 640];
const CATEGORY_IMAGE_SIZES = `(max-width: 480px) 45vw,
	(max-width: 768px) 45vw,
	(max-width: 1024px) 30vw,
	18vw`;

function trackAnalyticsEvent(payload = {}) {
	if (typeof window === "undefined") return;
	const gtag = window.gtag;
	if (typeof gtag !== "function") return;
	gtag("event", payload?.action || "category_click", {
		event_category: payload?.category || "Category Clicked Home Page",
		event_label: payload?.label || "",
	});
}

function trackFacebookLead(payload = {}) {
	if (typeof window === "undefined") return;
	const fbq = window.fbq;
	if (typeof fbq !== "function") return;
	fbq(
		"track",
		"Lead",
		{
			content_name: payload?.contentName || "",
			click_type: "Category Clicked",
		},
		{
			eventID: payload?.eventId || undefined,
		}
	);
}

async function sendConversionLead(payload = {}) {
	if (typeof window === "undefined") return;
	try {
		await fetch("/api/track/conversion", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
			keepalive: true,
		});
	} catch {
		// Tracking should never block navigation.
	}
}

const ZCategories = ({ allCategories }) => {
	const auth = isAuthenticated() || {};
	const user = auth.user || null;
	// Memoize the click handler
	const handleCategoryClick = useCallback(
		(categoryName) => {
			trackAnalyticsEvent({
				category: "Category Clicked Home Page",
				action: "User Clicked On Category In Home Page",
				label: `User Clicked on ${categoryName} In The Home Page`,
			});

			const eventId = `lead-category-${Date.now()}`;

			trackFacebookLead({
				contentName: `User Clicked on ${categoryName} In The Home Page`,
				eventId,
			});

			sendConversionLead({
					eventName: "Lead",
					eventId,
					email: user?.email || "Unknown", // if you have a user object
					phone: user?.phone || "Unknown", // likewise
					currency: "USD", // not essential for "Lead," but you can pass
					value: 0,
					contentIds: [`cat-${categoryName}`], // or any ID you want
					userAgent:
						typeof window !== "undefined"
							? window.navigator.userAgent
							: undefined,
				});
		},
		[user]
	);

	return (
		<Container>
			<ZCategoriesWrapper>
				{allCategories.map((category) => {
					// Determine the target URL based on the category's id.
					// Use category ObjectId in query for backend filtering + pagination consistency.
					const linkTarget = (() => {
						if (category._id === "679bb2a7dba50a58933d01eb") {
							return "/custom-gifts";
						}
						const params = new URLSearchParams();
						if (category?._id) {
							params.set("category", category._id);
						}
						if (category?.categorySlug) {
							params.set("categorySlug", category.categorySlug);
						}
						const serialized = params.toString();
						return serialized ? `/our-products?${serialized}` : "/our-products";
					})();

					// If there's a thumbnail, generate multiple Cloudinary URLs
					let imageUrl = "";
					let webpUrl = "";
					if (category.thumbnail && category.thumbnail.length > 0) {
						const originalUrl = resolveImageUrl(category.thumbnail[0], {
							preferCloudinary: true,
						});

						if (originalUrl) {
							const hasCloudinarySource =
								originalUrl.includes("res.cloudinary.com");
							// Base (JPEG/PNG/etc.) - tuned smaller to reduce homepage payload
							const fallbackJpg = getCloudinaryOptimizedUrl(originalUrl, {
								width: 320,
								quality: "auto:eco",
							});
							imageUrl = {
								fallback: fallbackJpg,
								srcset: hasCloudinarySource
									? buildCloudinarySrcSet(originalUrl, CATEGORY_IMAGE_WIDTHS, {
											quality: "auto:eco",
										})
									: "",
							};

							webpUrl = {
								srcset: hasCloudinarySource
									? buildCloudinarySrcSet(originalUrl, CATEGORY_IMAGE_WIDTHS, {
											format: "webp",
											quality: "auto:eco",
										})
									: "",
							};
						}
					}

					return (
						<CategoryCard
							key={category.categorySlug}
							onClick={() => handleCategoryClick(category.categoryName)}
						>
							<a href={linkTarget}>
								{imageUrl && (
									<CategoryImageWrapper>
										{/* 
                      Use <picture> with multiple <source> tags to serve WebP if supported,
                      with responsive widths. The fallback <img> is for older browsers.
                    */}
										<picture>
											{webpUrl.srcset ? (
												<source
													type='image/webp'
													srcSet={webpUrl.srcset}
													sizes={CATEGORY_IMAGE_SIZES}
												/>
											) : null}

											<CategoryImage
												loading='lazy'
												src={imageUrl.fallback}
												srcSet={imageUrl.srcset || undefined}
												sizes={imageUrl.srcset ? CATEGORY_IMAGE_SIZES : undefined}
												alt={category.categoryName}
												width={640}
												height={360}
											/>
										</picture>
									</CategoryImageWrapper>
								)}
								<CategoryName>{category.categoryName}</CategoryName>
							</a>
						</CategoryCard>
					);
				})}
			</ZCategoriesWrapper>
		</Container>
	);
};

export default React.memo(ZCategories);

/* 
================ 
STYLED COMPONENTS 
================ 
(Styling remains exactly the same as before)
*/

const Container = styled.div`
	background: var(--neutral-light);
	padding: 10px;
	border-radius: 5px;
	margin-top: 50px;
	margin-bottom: 50px;
	display: flex;
	justify-content: center;
	align-items: center;
`;

const ZCategoriesWrapper = styled.div`
	display: flex;
	flex-wrap: wrap;
	justify-content: center;
	gap: 20px;
	width: 100%;
	max-width: 1200px;
	padding: 20px;
	margin: auto;

	@media (max-width: 480px) {
		gap: 10px;
		padding: 5px;
	}
`;

const CategoryCard = styled.div`
	border-radius: 10px;
	overflow: hidden;
	box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
	transition:
		transform 0.3s ease,
		box-shadow 0.3s ease;
	padding: 0 !important; /* Remove padding from the card */
	flex: 1 1 18%; /* Adjust the size of the cards */

	&:hover {
		transform: translateY(-10px);
		box-shadow: 0 6px 8px rgba(0, 0, 0, 0.15);
	}

	@media (max-width: 1024px) {
		flex: 1 1 28%;
	}

	@media (max-width: 768px) {
		flex: 1 1 45%;
	}

	@media (max-width: 480px) {
		flex: 1 1 calc(50% - 7px); /* Ensure 2 cards per row with 7px gap */
	}

	a {
		display: block;
		width: 100%;
		height: 100%;
		text-decoration: none;
	}
`;

const CategoryImageWrapper = styled.div`
	width: 100%;
	height: 170px;
	overflow: hidden;
	border-radius: 10px 10px 0 0;
	display: block;
	line-height: 0;

	picture {
		display: block;
		width: 100%;
		height: 100%;
	}
`;

const CategoryImage = styled.img`
	display: block;
	width: 100%;
	height: 100%;
	object-fit: cover;
	object-position: center;
`;

const CategoryName = styled.h3`
	text-align: center;
	margin: 0;
	padding: 10px 0;
	color: var(--text-color-dark);
	font-size: 16px;
	text-transform: capitalize;
	font-weight: bolder;
	cursor: pointer;

	&:hover {
		color: var(--secondary-color);
		text-decoration: underline;
	}

	@media (max-width: 1024px) {
		font-size: 14px;
	}
	@media (max-width: 768px) {
		font-size: 14px;
	}
	@media (max-width: 480px) {
		font-size: 14px;
	}
`;
