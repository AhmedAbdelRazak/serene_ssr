// sections/HomeExtraSections.js
import React from "react";
import axios from "axios";
import Resizer from "react-image-file-resizer";
import { isAuthenticated } from "../../auth";
import { cloudinaryUpload1 } from "../apiAdmin";
import ImageCardHomeMainBanner from "./ImageCardHomeMainBanner";

const HomeExtraSections = ({ websiteData, setWebsiteData }) => {
	const { user, token } = isAuthenticated();

	const fileUploadExtraSections = (e) => {
		let files = e.target.files;
		if (!files) return;

		for (let i = 0; i < files.length; i++) {
			const file = files[i];
			Resizer.imageFileResizer(
				file,
				800,
				600,
				"JPEG",
				100,
				0,
				(uri) => {
					cloudinaryUpload1(user._id, token, { image: uri })
						.then((data) => {
							const nextSection = {
								...data,
								sectionNumber: "",
								textOnImage: "",
								// etc...
							};
							setWebsiteData((prev) => ({
								...prev,
								homePageSections: [
									...(prev?.homePageSections || []),
									nextSection,
								],
							}));
						})
						.catch((err) => {
							console.error("Extra section upload error:", err);
						});
				},
				"base64"
			);
		}
	};

	const handleImageRemove = (public_id) => {
		axios
			.post(
				`${process.env.REACT_APP_API_URL}/admin/removeimage`,
				{ public_id },
				{ headers: { Authorization: `Bearer ${token}` } }
			)
			.then(() => {
				setWebsiteData((prev) => ({
					...prev,
					homePageSections: (prev?.homePageSections || []).filter(
						(item) => item.public_id !== public_id
					),
				}));
			})
			.catch((err) => {
				console.error("remove extra section error:", err);
			});
	};

	const handleFieldChange = (index, field, value) => {
		setWebsiteData((prev) => {
			const arr = [...(prev?.homePageSections || [])];
			if (!arr[index]) return prev;
			arr[index] = { ...arr[index], [field]: value };
			return { ...prev, homePageSections: arr };
		});
	};

	return (
		<div>
			<h3>Additional Home Page Sections</h3>
			<ImageCardHomeMainBanner
				bannerData={{ images: websiteData.homePageSections || [] }}
				fileUploadAndResize={fileUploadExtraSections}
				handleImageRemove={handleImageRemove}
				handleFieldChange={handleFieldChange}
				instructions='(Custom size) .jpg/.png'
			/>
		</div>
	);
};

export default HomeExtraSections;
