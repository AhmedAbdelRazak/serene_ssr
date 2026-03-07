// components/ImageCardHomeMainBanner.js
import React from "react";
import styled from "styled-components";
import imageImage from "../../GeneralImages/UploadImageImage.jpg";
import BannersPreview from "./BannersPreview";

const resolveAssetSrc = (asset) =>
	typeof asset === "string" ? asset : asset?.src || "";

/**
 * Parent component for multi-banner editing + preview
 */
const ImageCardHomeMainBanner = ({
	bannerData, // { images: [ { url, public_id, title, subTitle, buttonTitle, etc. }, ... ] }
	fileUploadAndResize,
	handleImageRemove,
	handleFieldChange,
	instructions = "Only *.png, *.jpg accepted (1920x997 recommended)",
}) => {
	const placeholderSrc = resolveAssetSrc(imageImage);

	return (
		<ImageCardHomeMainBannerWrapper>
			<div className='card card-flush py-4'>
				<div className='card-body text-center pt-0'>
					<div className='image-input mb-3' data-kt-image-input='true'>
						{/* The "Gallery" for editing banners */}
						<div className='image-gallery'>
							{bannerData.images &&
								bannerData.images.map((image, index) => (
									<div
										className='image-container'
										key={image.public_id || index}
									>
										<button
											type='button'
											className='close'
											onClick={() => handleImageRemove(image.public_id)}
											aria-label='Close'
										>
											<span aria-hidden='true'>&times;</span>
										</button>

										<img
											src={image.url}
											alt='Img Not Found'
											className='uploaded-image'
										/>

										<div className='input-fields'>
											<input
												type='text'
												placeholder='Title'
												value={image.title || ""}
												onChange={(e) =>
													handleFieldChange(index, "title", e.target.value)
												}
											/>

											<input
												type='text'
												placeholder='Subtitle'
												value={image.subTitle || ""}
												onChange={(e) =>
													handleFieldChange(index, "subTitle", e.target.value)
												}
											/>

											<input
												type='text'
												placeholder='Button Title'
												value={image.buttonTitle || ""}
												onChange={(e) =>
													handleFieldChange(
														index,
														"buttonTitle",
														e.target.value
													)
												}
											/>

											<input
												type='text'
												placeholder='Page Redirect URL'
												value={image.pageRedirectURL || ""}
												onChange={(e) =>
													handleFieldChange(
														index,
														"pageRedirectURL",
														e.target.value
													)
												}
											/>
											<input
												type='text'
												placeholder='Button Background Color'
												value={image.btnBackgroundColor || ""}
												onChange={(e) =>
													handleFieldChange(
														index,
														"btnBackgroundColor",
														e.target.value
													)
												}
											/>
										</div>
									</div>
								))}
						</div>

						{/* Upload button/placeholder */}
						<label className='upload-label'>
							<img
								src={placeholderSrc}
								alt='imageUpload'
								className='placeholder-image'
							/>
							<input
								multiple
								type='file'
								hidden
								accept='image/*'
								onChange={fileUploadAndResize}
							/>
						</label>
					</div>

					<div className='text-muted fs-7'>{instructions}</div>
				</div>
			</div>

			{/* The "live" PREVIEW of banners below (stacked) */}
			<BannersPreview images={bannerData.images || []} />
		</ImageCardHomeMainBannerWrapper>
	);
};

export default ImageCardHomeMainBanner;

/* -----------------------------------------
   STYLES
----------------------------------------- */
const ImageCardHomeMainBannerWrapper = styled.div`
	.card {
		border: 1px solid #f6f6f6 !important;
	}
	.image-gallery {
		display: flex;
		flex-wrap: wrap;
		gap: 20px;
		justify-content: flex-start;
	}
	.image-container {
		position: relative;
		width: 100%;
	}
	.uploaded-image {
		width: 100%;
		height: 350px;
		box-shadow: 1px 1px 1px 1px rgba(0, 0, 0, 0.2);
		object-fit: cover;
	}
	.input-fields {
		margin-top: 10px;
		display: flex;
		flex-direction: column;
		gap: 5px;
	}
	.input-fields input {
		padding: 5px;
		border: 1px solid #ccc;
		border-radius: 5px;
		width: 100%;
	}
	.close {
		position: absolute;
		top: -10px;
		right: -10px;
		color: white;
		background: black;
		font-size: 20px;
		border: none;
		cursor: pointer;
		padding: 0 6px;
		border-radius: 50%;
	}
	.upload-label {
		cursor: pointer;
		font-size: 0.95rem;
		margin-top: 10px;
		width: 200px;
		align-self: center;
		display: inline-block;
	}
	.placeholder-image {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
`;
