import React, { useEffect, useMemo, useState } from "react";
import Slider from "react-slick";
import styled from "styled-components";
import { getCloudinaryOptimizedUrl } from "../../utils/image";
import fallbackHeroBanner from "../../GeneralImages/HomePageBanner1.jpg";

const HERO_IMAGE_WIDTH = 1920;
const HERO_IMAGE_HEIGHT = 997;

const Hero = ({ websiteSetup }) => {
	const [autoplayEnabled, setAutoplayEnabled] = useState(false);
	const banners = websiteSetup?.homeMainBanners || [];
	const bannerItems = banners.length
		? banners
		: [
				{
					url: fallbackHeroBanner,
					title: "",
					subTitle: "",
					buttonTitle: "",
					btnBackgroundColor: "#000",
					pageRedirectURL: "",
				},
			];

	useEffect(() => {
		if (typeof window === "undefined") return undefined;
		let enabled = false;
		const enableAutoplay = () => {
			if (enabled) return;
			enabled = true;
			setAutoplayEnabled(true);
			window.removeEventListener("pointerdown", enableAutoplay);
			window.removeEventListener("keydown", enableAutoplay);
			window.removeEventListener("touchstart", enableAutoplay);
			window.removeEventListener("scroll", enableAutoplay);
		};

		window.addEventListener("pointerdown", enableAutoplay, {
			once: true,
			passive: true,
		});
		window.addEventListener("keydown", enableAutoplay, {
			once: true,
			passive: true,
		});
		window.addEventListener("touchstart", enableAutoplay, {
			once: true,
			passive: true,
		});
		window.addEventListener("scroll", enableAutoplay, {
			once: true,
			passive: true,
		});
		const timeoutId = window.setTimeout(enableAutoplay, 12000);
		return () => {
			window.clearTimeout(timeoutId);
			window.removeEventListener("pointerdown", enableAutoplay);
			window.removeEventListener("keydown", enableAutoplay);
			window.removeEventListener("touchstart", enableAutoplay);
			window.removeEventListener("scroll", enableAutoplay);
		};
	}, []);

	const settings = useMemo(
		() => ({
			dots: true,
			infinite: bannerItems.length > 1,
			speed: 500,
			slidesToShow: 1,
			slidesToScroll: 1,
			autoplay: autoplayEnabled && bannerItems.length > 1,
			autoplaySpeed: 10000,
			arrows: true,
		}),
		[autoplayEnabled, bannerItems.length]
	);

	return (
		<HeroSection>
			<SliderContainer>
				<Slider {...settings}>
					{bannerItems.map((banner, idx) => {
						const {
							url,
							title,
							subTitle,
							buttonTitle,
							btnBackgroundColor,
							pageRedirectURL,
						} = banner;

						const isFirstSlide = idx === 0;
						const quality = isFirstSlide ? "auto" : "auto:low";

						// Cloudinary transforms
						const base1600 = getCloudinaryOptimizedUrl(url, {
							width: 1600,
							quality,
						});
						const base1200 = getCloudinaryOptimizedUrl(url, {
							width: 1200,
							quality,
						});
						const base768 = getCloudinaryOptimizedUrl(url, {
							width: 768,
							quality,
						});
						const base480 = getCloudinaryOptimizedUrl(url, {
							width: 480,
							quality,
						});

						return (
							<Slide key={idx}>
								{base1600 ? (
									<BannerImageWrapper>
										<img
											src={base480}
											srcSet={`
                        ${base480} 480w,
                        ${base768} 768w,
                        ${base1200} 1200w,
                        ${base1600} 1600w
                      `}
											sizes='100vw'
											alt={`Banner ${idx + 1}`}
											loading={isFirstSlide ? "eager" : "lazy"}
											// We can safely pass fetchPriority to a raw <img>.
											// styled-components never sees this prop:
											fetchPriority={isFirstSlide ? "high" : undefined}
											decoding='async'
											width={HERO_IMAGE_WIDTH}
											height={HERO_IMAGE_HEIGHT}
										/>
									</BannerImageWrapper>
								) : (
									<Placeholder>Banner {idx + 1}</Placeholder>
								)}

								{/* Overlaid text/content */}
								<BannerContent>
									{title && <h2>{title}</h2>}
									{subTitle && <p>{subTitle}</p>}
									{buttonTitle && (
										<a
											href={pageRedirectURL || "#"}
											style={{ backgroundColor: btnBackgroundColor || "#000" }}
											className='banner-btn'
										>
											{buttonTitle}
										</a>
									)}
								</BannerContent>
							</Slide>
						);
					})}
				</Slider>
			</SliderContainer>
		</HeroSection>
	);
};

export default Hero;

/* ============== Styled Components ============== */

const HeroSection = styled.section`
	width: 100%;
	margin: 0 auto;

	@media (max-width: 768px) {
		width: 100%;
		height: auto;
	}
`;

const SliderContainer = styled.div`
	width: 100%;
	height: 100%;
	position: relative; /* for absolutely positioned arrows */

	.slick-slider {
		width: 100%;
		height: 100%;
	}

	.slick-dots {
		bottom: 10px;
	}

	.slick-prev,
	.slick-next {
		top: 50%;
		transform: translateY(-50%);
		width: 40px;
		height: 40px;
		z-index: 10; /* ensures arrows are over slides */
		background: var(--primaryBlueDarker);
		color: #fff;
		border-radius: 4px;
		display: flex;
		align-items: center;
		justify-content: center;
		opacity: 0.8;
		transition: opacity 0.3s ease;
		cursor: pointer;
	}

	.slick-prev:hover,
	.slick-next:hover {
		opacity: 1;
	}

	.slick-prev {
		left: 10px;
	}

	.slick-next {
		right: 10px;
	}

	.slick-prev:before,
	.slick-next:before {
		font-family: inherit;
		font-size: 30px;
		line-height: 1;
		opacity: 1;
		color: #fff;
	}
	.slick-prev:before {
		content: "<";
	}
	.slick-next:before {
		content: ">";
	}

	.slick-dots li button:before {
		content: "\2022";
		font-family: inherit;
		font-size: 13px;
		line-height: 1;
		color: rgba(255, 255, 255, 0.8);
		opacity: 1;
	}

	.slick-dots li.slick-active button:before {
		color: #fff;
	}

	@media (max-width: 768px) {
		.slick-prev,
		.slick-next {
			width: 30px;
			height: 30px;
		}
		.slick-prev:before,
		.slick-next:before {
			font-size: 16px;
		}
	}
`;

const Slide = styled.div`
	position: relative;
	width: 100%;
	height: clamp(260px, 52vw, 700px);
	max-height: 700px;
`;

/**
 * Instead of styled.img, we wrap a normal <img> inside:
 * This ensures "fetchpriority" won't trigger styled-components warnings.
 */
const BannerImageWrapper = styled.div`
	width: 100%;
	height: clamp(260px, 52vw, 700px);
	overflow: hidden;

	img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
`;

const Placeholder = styled.div`
	background-color: #ccc;
	width: 100%;
	height: 100%;
	min-height: 400px;
`;

const BannerContent = styled.div`
	position: absolute;
	top: 50%;
	left: 10%;
	transform: translateY(-50%);
	color: #fff;
	min-width: 40%;
	background-color: rgba(0, 0, 0, 0.3);
	padding: 15px 20px;
	border-radius: 8px;
	text-align: center;

	h2 {
		font-size: 5rem;
		margin-bottom: 1rem;
		font-family: "Allison", cursive;
		font-weight: bolder;
	}

	p {
		font-size: 1.2rem;
		line-height: 1.4;
		margin-bottom: 1rem;
	}

	.banner-btn {
		display: inline-block;
		color: #fff;
		text-decoration: none;
		padding: 0.75rem 1.5rem;
		border-radius: 5px;
		font-weight: bold;
		transition: all 0.3s ease;
		&:hover {
			opacity: 0.8;
		}
	}

	@media (max-width: 992px) {
		max-width: 60%;
		h2 {
			font-size: 4rem;
		}
		p {
			font-size: 1rem;
		}
	}

	@media (max-width: 768px) {
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		min-width: 85%;
		background-color: rgba(0, 0, 0, 0.5);
		padding: 11px 10px;
		border-radius: 8px;

		h2 {
			font-size: 3rem;
		}
		p {
			font-size: 0.9rem;
		}
	}
`;
