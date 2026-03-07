// sections/AboutUsSection.js

import React from "react";
import axios from "axios";
import Resizer from "react-image-file-resizer";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import styled from "styled-components";

import { isAuthenticated } from "../../auth";
import { cloudinaryUpload1 } from "../apiAdmin";
import ImageCard from "./ImageCard"; // Path to your universal single-image upload card

// Quill toolbar configuration
const toolbarOptions = [
	[{ header: [1, 2, 3, false] }],
	["bold", "italic", "underline", "strike", { color: [] }],
	[{ list: "ordered" }, { list: "bullet" }],
	["link", "image", "video"],
	["clean"],
];

const AboutUsSection = ({ websiteData, setWebsiteData }) => {
	const { user, token } = isAuthenticated();

	// aboutUsBanner object in websiteData
	// Typically: { public_id: "", url: "", paragraph: "" }
	const aboutUs = websiteData.aboutUsBanner || {};

	// Upload the banner image (single)
	const fileUploadBanner = (e) => {
		const file = e.target.files[0];
		if (!file) return;

		Resizer.imageFileResizer(
			file,
			1200, // recommended width
			600, // recommended height
			"JPEG", // or "PNG"
			100, // quality
			0, // rotation
			(uri) => {
				// Send to your Cloudinary endpoint
				cloudinaryUpload1(user._id, token, { image: uri })
					.then((data) => {
						// data => { public_id, url }
						setWebsiteData((prev) => ({
							...prev,
							aboutUsBanner: {
								...(prev?.aboutUsBanner || {}),
								...data,
							},
						}));
					})
					.catch((err) => {
						console.error("About us banner upload error:", err);
					});
			},
			"base64"
		);
	};

	// Remove the banner image
	const handleImageRemove = (public_id) => {
		axios
			.post(
				`${process.env.REACT_APP_API_URL}/admin/removeimage/${user._id}`,
				{ public_id },
				{ headers: { Authorization: `Bearer ${token}` } }
			)
			.then(() => {
				// Clear out the aboutUsBanner image fields,
				// preserving the paragraph
				setWebsiteData((prev) => ({
					...prev,
					aboutUsBanner: {
						public_id: "",
						url: "",
						paragraph: prev?.aboutUsBanner?.paragraph || "",
					},
				}));
			})
			.catch((err) => {
				console.error("Remove about us banner error:", err);
			});
	};

	// Update the paragraph field with ReactQuill
	const handleParagraphChange = (value) => {
		setWebsiteData((prev) => ({
			...prev,
			aboutUsBanner: {
				...(prev?.aboutUsBanner || {}),
				paragraph: value,
			},
		}));
	};

	return (
		<div>
			<h3>About Us Banner</h3>
			{/* Single Banner Image */}
			<ImageCard
				singleImage={{ url: aboutUs.url, public_id: aboutUs.public_id }}
				setSingleImage={() => {
					/* Not used directly here */
				}}
				fileUploadAndResize={fileUploadBanner}
				handleImageRemove={handleImageRemove}
				instructions='(1200x600 recommended for banner; *.jpg / *.png)'
			/>

			<Divider />

			<label style={{ fontWeight: "bold", marginTop: "20px" }}>
				About Us Paragraph (Rich Text):
			</label>
			<ReactQuill
				value={aboutUs.paragraph || ""}
				onChange={handleParagraphChange}
				modules={{ toolbar: { container: toolbarOptions } }}
				style={{ height: "450px", marginTop: "10px" }}
			/>
		</div>
	);
};

export default AboutUsSection;

/* STYLED COMPONENTS */
const Divider = styled.div`
	margin: 20px 0;
	border-bottom: 1px solid #ccc;
`;

