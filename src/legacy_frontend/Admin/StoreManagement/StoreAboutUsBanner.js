import React, { useState } from "react";
import axios from "axios";
import Resizer from "react-image-file-resizer";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import styled from "styled-components";

import { isAuthenticated } from "../../auth";
import { cloudinaryUpload1 } from "../apiAdmin";
import ImageCard from "./ImageCard";

const toolbarOptions = [
	[{ header: [1, 2, 3, false] }],
	["bold", "italic", "underline", "strike", { color: [] }],
	[{ list: "ordered" }, { list: "bullet" }],
	["link", "image", "video"],
	["clean"],
];

const StoreAboutUsBanner = ({ storeData, setStoreData }) => {
	const { user, token } = isAuthenticated();
	const about = storeData.storeAboutUsBanner || {};

	// Track whether we're uploading
	const [uploading, setUploading] = useState(false);

	/**
	 * Handle user selecting a new banner image in <ImageCard>.
	 */
	const fileUploadAndResize = (e) => {
		const file = e.target.files[0];
		if (!file) return;

		// Limit: max 3 MB
		const maxSize = 3 * 1024 * 1024; // 3MB
		if (file.size > maxSize) {
			alert("File is too large. Max 3MB allowed.");
			return;
		}

		setUploading(true);

		// Resize client-side
		Resizer.imageFileResizer(
			file,
			1200,
			600,
			"JPEG",
			100,
			0,
			(uri) => {
				// Upload to Cloudinary
				cloudinaryUpload1(user._id, token, { image: uri })
					.then((data) => {
						// data => { public_id, url, ... }
						setUploading(false);
						setStoreData((prev) => ({
							...prev,
							storeAboutUsBanner: {
								...(prev?.storeAboutUsBanner || {}),
								...data,
							},
						}));
					})
					.catch((err) => {
						console.error("Banner upload error:", err);
						setUploading(false);
					});
			},
			"base64"
		);
	};

	/**
	 * Remove the currently uploaded banner image.
	 */
	const handleImageRemove = (public_id) => {
		axios
			.post(
				`${process.env.REACT_APP_API_URL}/admin/removeimage/${user._id}`,
				{ public_id },
				{ headers: { Authorization: `Bearer ${token}` } }
			)
			.then(() => {
				// Preserve paragraph text, but clear the image fields
				setStoreData((prev) => ({
					...prev,
					storeAboutUsBanner: {
						public_id: "",
						url: "",
						paragraph: prev?.storeAboutUsBanner?.paragraph || "",
					},
				}));
			})
			.catch((err) => console.error("Error removing banner:", err));
	};

	/**
	 * Update paragraph (React Quill)
	 */
	const handleParagraphChange = (value) => {
		setStoreData((prev) => ({
			...prev,
			storeAboutUsBanner: {
				...(prev?.storeAboutUsBanner || {}),
				paragraph: value,
			},
		}));
	};

	return (
		<div>
			<h3>Store About Us Banner</h3>

			{/* Single-image upload via ImageCard */}
			<ImageCard
				singleImage={about} // { public_id, url, paragraph? }
				fileUploadAndResize={fileUploadAndResize}
				handleImageRemove={handleImageRemove}
				instructions='(1200×600 recommended) *.jpg / *.png (Max 3MB)'
				uploading={uploading}
				imageWidth={400}
				objectFit='cover'
			/>

			{/* Hero preview if we have a URL */}
			{about.url && (
				<HeroPreview style={{ backgroundImage: `url(${about.url})` }}>
					<div className='m-3' style={{ color: "white", fontWeight: "bold" }}>
						Banner Preview
					</div>
					<div className='overlay'></div>
				</HeroPreview>
			)}

			<div style={{ marginTop: 20 }}>
				<label style={{ fontWeight: "bold" }}>
					About Us Paragraph (Rich Text):
				</label>
				<ReactQuill
					value={about.paragraph || ""}
					onChange={handleParagraphChange}
					modules={{ toolbar: { container: toolbarOptions } }}
					style={{ height: "300px", marginTop: "10px" }}
				/>
			</div>
		</div>
	);
};

export default StoreAboutUsBanner;

/* Optionally style the hero preview */
const HeroPreview = styled.div`
	margin-top: 20px;
	width: 100%;
	height: 300px; /* or 400px, as you prefer */
	background-size: cover;
	background-position: center;
	position: relative;
	border-radius: 6px;
	box-shadow: 1px 1px 6px rgba(0, 0, 0, 0.3);

	.overlay {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(0, 0, 0, 0.3);
	}
`;

