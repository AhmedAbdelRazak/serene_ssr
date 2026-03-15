import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { useLocation } from "react-router-dom";
import ReactGA from "react-ga4";
import { Helmet } from "react-helmet-async";
import { useCartContext } from "../../cart_context";

const About = () => {
	const [cleanedDescription, setCleanedDescription] = useState("");
	const [plainDescription, setPlainDescription] = useState("");
	const location = useLocation();

	const { websiteSetup } = useCartContext();

	// (1) Cloudinary Transform Helper
	//     If the URL isn't Cloudinary, return original.
	//     Otherwise, inserts f_auto,q_auto,w_{width}.
	const getCloudinaryOptimizedUrl = (url, { width = 1028 } = {}) => {
		if (!url || !url.includes("res.cloudinary.com")) {
			return url; // Not a Cloudinary URL
		}

		// If we've already inserted something like f_auto,q_auto, skip
		if (url.includes("f_auto") || url.includes("q_auto")) {
			return url;
		}

		// Split at '/upload/' to insert transformations
		const parts = url.split("/upload/");
		if (parts.length !== 2) {
			return url; // Can't parse, return original
		}

		// Build transformation string, e.g. f_auto,q_auto,w_1028
		const transform = `f_auto,q_auto,w_${width}`;

		// Reconstruct URL
		return `${parts[0]}/upload/${transform}/${parts[1]}`;
	};

	// GA4 pageview tracking
	useEffect(() => {
		ReactGA.send({
			hitType: "pageview",
			page: location.pathname + location.search,
		});
	}, [location.pathname, location.search]);

	// On mount, clean the aboutUsBanner paragraph
	useEffect(() => {
		if (websiteSetup.aboutUsBanner?.paragraph) {
			const cleanedDesc = websiteSetup.aboutUsBanner.paragraph.replace(
				/<br>/g,
				""
			);
			setCleanedDescription(cleanedDesc);

			// Remove HTML tags for meta descriptions
			const plainTextDescription = cleanedDesc.replace(/<[^>]+>/g, "");
			setPlainDescription(plainTextDescription);
		}
		// eslint-disable-next-line
	}, []);

	return (
		<AboutPageWrapper className='container'>
			{websiteSetup?.aboutUsBanner?.paragraph && (
				<>
					<Helmet>
						<meta charSet='utf-8' />
						<title>Serene Jannat | About Us</title>
						<meta
							name='description'
							content={`Discover the story behind Serene Jannat Gift Shop. Learn about our commitment to providing the best gifts, candles, and glass items to show love to your loved ones. Our customer-first approach ensures the highest level of satisfaction. ${plainDescription}`}
						/>
						<meta
							name='keywords'
							content='Serene Jannat, about us, gift shop, candles, glass items, customer-first, best gifts, gift store, our story, commitment, satisfaction'
						/>
						<meta property='og:title' content='Serene Jannat | About Us' />
						<meta
							property='og:description'
							content={`Discover the story behind Serene Jannat Gift Shop. Learn about our commitment to providing the best gifts, candles, and glass items to show love to your loved ones. Our customer-first approach ensures the highest level of satisfaction. ${plainDescription}`}
						/>
						<meta property='og:image' content='%PUBLIC_URL%/logo192.png' />
						<meta property='og:url' content='https://serenejannat.com/about' />
						<meta property='og:type' content='website' />
						<meta property='og:locale' content='en_US' />
						<link rel='icon' href='/favicon.ico' />
						<link rel='canonical' href='https://serenejannat.com/about' />

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
					</Helmet>

					<div className='my-4'>
						<ImageWrapper>
							{websiteSetup?.aboutUsBanner?.url ? (
								// (2) Use Cloudinary optimization for banner image
								<img
									src={getCloudinaryOptimizedUrl(
										websiteSetup.aboutUsBanner.url,
										{
											width: 1028,
										}
									)}
									decoding='async'
									alt='Powered By infinite-apps.com'
									style={{
										marginTop: "0px",
										objectFit: "cover",
										padding: "0px",
									}}
								/>
							) : (
								<img
									decoding='async'
									alt='Powered By infinite-apps.com'
									style={{
										marginTop: "0px",
										objectFit: "cover",
										padding: "0px",
									}}
									src='https://reydemos.b-cdn.net/london/wp-content/uploads/sites/8/2019/04/our-story-01.jpg'
								/>
							)}
						</ImageWrapper>

						<DescriptionWrapper>
							<div className='about-us'>
								<CollapseContainer>
									<div
										dangerouslySetInnerHTML={{ __html: cleanedDescription }}
									/>
								</CollapseContainer>
							</div>
						</DescriptionWrapper>
					</div>
				</>
			)}
		</AboutPageWrapper>
	);
};

export default About;

/* ----------------- STYLED COMPONENTS ----------------- */

const AboutPageWrapper = styled.section`
	background: var(--neutral-light);
	padding-bottom: 40px; /* Reduced the bottom padding */
	overflow: hidden;

	.title {
		font-weight: bolder;
		color: var(--primary-color);
		margin-bottom: 15px;
	}

	.about-title {
		font-size: 40px;
		font-weight: 600;
		color: var(--accent-color-2);
		margin-left: 0px; /* no forced left margin */
		margin-top: 15px; /* add a bit of top space if needed */

		@media (max-width: 1000px) {
			margin-top: 15px;
			text-align: left; /* remove center alignment on smaller screens too */
		}
	}

	.horizLine {
		border-bottom: var(--primary-color-dark) solid 5px;
		margin: 15px 0;
	}

	@media (max-width: 1000px) {
		padding-bottom: 20px;
		padding-top: 0px;

		.about-title {
			font-size: 32px;
			margin-left: 0;
		}
	}
`;

const ImageWrapper = styled.div`
	margin-bottom: 15px;

	img {
		width: 100%;
		max-width: 1028px;
		height: 50vh;
		border-radius: 8px;

		@media (max-width: 800px) {
			width: 100%;
			height: auto !important;
			border-radius: 8px;
		}
	}
`;

const DescriptionWrapper = styled.div`
	/* No forced centering or flex here */
	margin-top: 15px;
`;

const CollapseContainer = styled.div`
	width: 100%;
	margin: 0 auto; /* center horizontally only if smaller than container */
	/* or remove margin entirely if not needed */

	/* Slightly smaller spacing between paragraphs */
	p {
		margin: 0;
		padding: 0.2em 0; /* less spacing than default */
	}
`;

