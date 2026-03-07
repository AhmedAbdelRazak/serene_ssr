// components/BannersPreview.js
import React from "react";
import styled from "styled-components";

const BannersPreview = ({ images }) => {
	if (!images || images.length === 0) return null; // no preview if none

	return (
		<PreviewWrapper>
			<h4 className='previewTitle'>Live Preview</h4>
			{images.map((img, idx) => {
				const title = img.title || "";
				const subTitle = img.subTitle || "";
				const buttonTitle = img.buttonTitle || "";
				const backgroundColor = img.btnBackgroundColor || "#006ad1";

				return (
					<div
						key={img.public_id || idx}
						className='bannerHero'
						style={{ backgroundImage: `url(${img.url})` }}
					>
						<div className='overlay'>
							{title && <h2 className='heroTitle'>{title}</h2>}
							{subTitle && <p className='heroSubtitle'>{subTitle}</p>}
							{buttonTitle && (
								<button
									className='heroButton'
									style={{ backgroundColor: backgroundColor }}
								>
									{buttonTitle}
								</button>
							)}
						</div>
					</div>
				);
			})}
		</PreviewWrapper>
	);
};

export default BannersPreview;

/* --------------------------------------
   Styled Components
-------------------------------------- */
const PreviewWrapper = styled.div`
	margin-top: 30px;

	.previewTitle {
		margin-bottom: 10px;
		color: #666;
		font-weight: bold;
		text-align: left;
		font-size: 1.1rem;
	}

	.bannerHero {
		position: relative;
		width: 100%;
		height: 420px; /* Adjust as you like for preview height */
		background-size: cover;
		background-position: center;
		border: 1px solid #ccc;
		border-radius: 8px;
		margin-bottom: 20px; /* space between banners */
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.overlay {
		background-color: rgba(0, 0, 0, 0.3);
		padding: 15px 20px;
		border-radius: 8px;
		text-align: center;
	}

	.heroTitle {
		color: #fff;
		margin: 0 0 10px;
		font-size: 1.4rem;
		font-weight: 600;
	}

	.heroSubtitle {
		color: #f8f8f8;
		margin: 0 0 10px;
		font-size: 1.1rem;
	}

	.heroButton {
		color: #fff;
		font-size: 1rem;
		padding: 8px 16px;
		border: none;
		border-radius: 4px;
		cursor: pointer;
	}
`;
