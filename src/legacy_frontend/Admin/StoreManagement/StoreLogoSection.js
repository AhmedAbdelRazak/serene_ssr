import React, { useState } from "react";
import Resizer from "react-image-file-resizer";
import axios from "axios";
import { isAuthenticated } from "../../auth";
import { cloudinaryUpload1 } from "../apiAdmin";
import ImageCard from "./ImageCard";

const StoreLogoSection = ({ storeData, setStoreData }) => {
	const { user, token } = isAuthenticated();

	// Track uploading state
	const [uploading, setUploading] = useState(false);

	const fileUploadAndResize = (e) => {
		const file = e.target.files[0];
		if (!file) return;

		setUploading(true); // start uploading

		Resizer.imageFileResizer(
			file,
			300, // width
			300, // height
			"JPEG",
			100, // quality
			0, // rotation
			(uri) => {
				// Now upload to Cloudinary as base64
				cloudinaryUpload1(user._id, token, { image: uri })
					.then((data) => {
						setUploading(false); // done
						setStoreData((prev) => ({
							...prev,
							storeLogo: { ...data },
						}));
					})
					.catch((err) => {
						console.error("Store logo upload error:", err);
						setUploading(false); // error
					});
			},
			"base64"
		);
	};

	const handleImageRemove = (public_id) => {
		axios
			.post(
				`${process.env.REACT_APP_API_URL}/admin/removeimage/${user._id}`,
				{ public_id },
				{
					headers: {
						Authorization: `Bearer ${token}`,
					},
				}
			)
			.then(() => {
				setStoreData((prev) => ({
					...prev,
					storeLogo: { public_id: "", url: "" },
				}));
			})
			.catch((err) => {
				console.error("Error removing store logo:", err);
			});
	};

	return (
		<div>
			<h3>Store Logo</h3>
			<ImageCard
				singleImage={storeData.storeLogo}
				setSingleImage={(imgObj) =>
					setStoreData((prev) => ({ ...prev, storeLogo: imgObj }))
				}
				fileUploadAndResize={fileUploadAndResize}
				handleImageRemove={handleImageRemove}
				labelWidth={50}
				instructions='(Recommended 300×300) *.jpg / *.png'
				uploading={uploading} // pass down
			/>
		</div>
	);
};

export default StoreLogoSection;
