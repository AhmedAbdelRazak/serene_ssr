// components/ImageCard.js
import React from "react";
import styled from "styled-components";
import imageImage from "../../GeneralImages/UploadImageImage.jpg";

const resolveAssetSrc = (asset) =>
	typeof asset === "string" ? asset : asset?.src || "";

// A universal single-image upload
const ImageCard = ({
	singleImage, // { url, public_id } or null
	setSingleImage, // function to update
	fileUploadAndResize,
	handleImageRemove,
	labelWidth = 75, // optional label image width
	instructions = "Only *.png, *.jpg, *.jpeg accepted",
}) => {
	const placeholderSrc = resolveAssetSrc(imageImage);

	return (
		<ImageCardWrapper>
			<div className='card card-flush py-4'>
				<div className='card-body text-center pt-0'>
					<div className='image-input mb-3' data-kt-image-input='true'>
						{/* If we have an image, show it */}
						{singleImage && singleImage.url ? (
							<div className='image-container m-3'>
								<button
									type='button'
									className='close'
									onClick={() => {
										handleImageRemove(singleImage.public_id);
									}}
									aria-label='Close'
								>
									<span aria-hidden='true'>&times;</span>
								</button>
								<img
									src={singleImage.url}
									alt='Img Not Found'
									className='thumbnail-image'
								/>
								<label className='change-image-btn'>
									Change
									<input
										type='file'
										hidden
										accept='image/*'
										onChange={fileUploadAndResize}
									/>
								</label>
							</div>
						) : (
							// Else show placeholder to upload
							<label
								style={{ cursor: "pointer", fontSize: "0.95rem" }}
								className='upload-label'
							>
								<img
									src={placeholderSrc}
									alt='imageUpload'
									style={{ width: `${labelWidth}%` }}
								/>
								<input
									type='file'
									hidden
									accept='image/*'
									onChange={fileUploadAndResize}
								/>
							</label>
						)}
					</div>
					<div className='text-muted fs-7'>{instructions}</div>
				</div>
			</div>
		</ImageCardWrapper>
	);
};

export default ImageCard;

const ImageCardWrapper = styled.div`
	.card {
		border: 1px #f6f6f6 solid !important;
	}
	.image-container {
		position: relative;
	}
	.thumbnail-image {
		width: 40%;
		height: auto;
		box-shadow: 1px 1px 1px 1px rgba(0, 0, 0, 0.2);
		object-fit: cover;
	}
	.close {
		position: absolute;
		color: white;
		top: -20px;
		right: 370px;
		background: black;
		font-size: 20px;
		border: none;
		cursor: pointer;
		padding: 0 6px;
		border-radius: 50%;
	}

	.change-image-btn {
		position: absolute;
		left: 10px;
		bottom: 10px;
		background: rgba(0, 0, 0, 0.72);
		color: #fff;
		border-radius: 6px;
		padding: 4px 10px;
		font-size: 12px;
		cursor: pointer;
	}

	.upload-label {
		display: inline-block;
	}
`;
