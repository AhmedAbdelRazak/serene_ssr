import React from "react";
import styled from "styled-components";
import { Carousel } from "antd";
import OptimizedImage from "../../components/OptimizedImage";
import { resolveImageSources } from "../../utils/image";

const DisplayImages = ({ images }) => {
	const safeImages = Array.isArray(images) ? images.slice(0, 5) : [];

	return (
		<ImageCarousel>
			{safeImages.length > 0 ? (
				<Carousel>
					{safeImages.map((img, index) => {
							const { primary, fallback } = resolveImageSources(img);
							return (
								<OptimizedImage
									key={index}
									src={primary}
									fallbackSrc={fallback}
									alt={`Product view ${index + 1}`}
									sizes='(max-width: 768px) 100vw, 700px'
									widths={[600, 800, 1000, 1200, 1600]}
									loading={index === 0 ? "eager" : "lazy"}
									fetchPriority={index === 0 ? "high" : undefined}
								/>
							);
						})}
				</Carousel>
			) : (
				<ImagePlaceholder aria-hidden='true' />
			)}
		</ImageCarousel>
	);
};

export default DisplayImages;

const ImageCarousel = styled.div`
	min-height: 700px;

	.ant-carousel,
	.slick-slider,
	.slick-list,
	.slick-track,
	.slick-slide > div {
		min-height: 700px;
	}

	img {
		width: 100%;
		height: 700px; /* Adjust this height as necessary */
		object-fit: contain; /* Ensure the whole image is displayed without distortion */
		border-radius: 5px;
	}

	@media (max-width: 768px) {
		min-height: 400px;

		.ant-carousel,
		.slick-slider,
		.slick-list,
		.slick-track,
		.slick-slide > div {
			min-height: 400px;
		}
	}

	.ant-carousel .slick-dots li {
		width: 30px; /* Line width */
		height: 2px; /* Line height */
		background-color: #fbeeee !important;
		border: none;
		margin: 0 2px;
		cursor: pointer;
		transition: background-color 0.6s ease;

		&.slick-active {
			background-color: #f6dede !important;
		}

		button {
			width: 100%;
			height: 100%;
			opacity: 0; /* Hide the default dot */
		}
	}
`;

const ImagePlaceholder = styled.div`
	width: 100%;
	height: 700px;
	border-radius: 5px;
	background: linear-gradient(90deg, #f2f6f9 0%, #e7eef4 45%, #f2f6f9 100%);

	@media (max-width: 768px) {
		height: 400px;
	}
`;
