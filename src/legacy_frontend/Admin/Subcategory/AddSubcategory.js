/** @format */

// eslint-disable-next-line
import React, { useState, useEffect } from "react";
import { isAuthenticated } from "../../auth/index";
import styled from "styled-components";
// import { Link } from "react-router-dom";
import {
	createSubcategory,
	getSubCategories,
	getCategories,
	cloudinaryUpload1,
} from "../apiAdmin";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.min.css";
import axios from "axios";
import ImageCard from "./ImageCard";

const AddSubcategory = () => {
	const [SubcategoryName, setSubCategoryName] = useState("");
	const [SubcategoryName_Arabic, setSubCategoryName_Arabic] = useState("");
	// eslint-disable-next-line
	const [loading, setLoading] = useState("");
	// eslint-disable-next-line
	const [SubcategorySlug, setSubCategorySlug] = useState("");
	const [SubcategorySlug_Arabic, setSubCategorySlug_Arabic] = useState("");
	const [categoryId, setSubCategory_CategoryId] = useState("");
	const [allSubcategories, setAllSubCategories] = useState([]);
	const [allCategories, setAllCategories] = useState([]);
	// eslint-disable-next-line
	const [error, setError] = useState(false);
	const [success, setSuccess] = useState(false);
	const [addThumbnail, setAddThumbnail] = useState([]);

	// destructure user and token from localstorage
	const { user, token } = isAuthenticated();

	const handleChange1 = (e) => {
		setError("");
		setSubCategoryName(e.target.value);
		setSubCategorySlug(e.target.value.split(" ").join("-"));
		setSubCategoryName_Arabic(e.target.value);
		setSubCategorySlug_Arabic(e.target.value.split(" ").join("-"));
	};

	const handleChange2 = (e) => {
		setSubCategory_CategoryId(e.target.value);
	};

	const gettingAllCategories = () => {
		getCategories(token).then((data) => {
			if (data.error) {
				setError(data.error);
			} else {
				setError("");
				setAllCategories(data);
			}
		});
	};

	const gettingAllSubcategories = () => {
		getSubCategories(token).then((data) => {
			if (data.error) {
				setError(data.error);
			} else {
				setError("");
				setAllSubCategories(
					data.map(
						(subcategory) =>
							subcategory.SubcategoryName.toLowerCase().replace(/\s/g, "") &&
							subcategory.SubcategoryName.toLowerCase()
								.replace(/\s/g, "")
								.concat(subcategory.categoryId)
					)
				);
			}
		});
	};

	useEffect(() => {
		gettingAllCategories();
		gettingAllSubcategories();
		// eslint-disable-next-line
	}, [SubcategoryName, SubcategorySlug]);

	var addedSubCategoryHelper =
		SubcategoryName &&
		categoryId &&
		SubcategoryName.toLowerCase().replace(/\s/g, "") &&
		SubcategoryName.toLowerCase().replace(/\s/g, "").concat(categoryId);

	let matchingSubCategory =
		allSubcategories.indexOf(addedSubCategoryHelper) !== -1;

	// console.log(matchingSubCategory, "El Logic");

	const clickSubmit = (e) => {
		e.preventDefault();
		if (matchingSubCategory) {
			return toast.error("This Subcategory and Category were added before.");
		}

		if (addThumbnail.length === 0) {
			return toast.error("Please add a thumbnail for this SubCategory.");
		}

		if (!SubcategoryName) {
			return toast.error("Please add a subcategory before creating.");
		}
		if (!categoryId) {
			return toast.error("Please choose a category");
		}
		setError("");
		setSuccess(false);
		// make request to api to create Category
		createSubcategory(user._id, token, {
			SubcategoryName,
			SubcategoryName_Arabic,
			SubcategorySlug,
			SubcategorySlug_Arabic,
			thumbnail: addThumbnail && addThumbnail.images,
			categoryId,
		}).then((data) => {
			if (data.error) {
				setError(data.error);
				setTimeout(function () {
					window.location.reload(false);
				}, 1000);
			} else {
				toast.success("Subcategory was successfully added.");
				setError("");
				setTimeout(function () {
					setSubCategoryName("");
					setSubCategoryName_Arabic("");
					setSubCategorySlug("");
					setSubCategorySlug_Arabic("");
					setSubCategory_CategoryId("");
				}, 2000);
				setTimeout(function () {
					window.location.reload(false);
				}, 2500);
			}
		});
	};

	const fileUploadAndResizeThumbNail = (e) => {
		let files = e.target.files;
		let allUploadedFiles = addThumbnail;

		if (files) {
			for (let i = 0; i < files.length; i++) {
				// Check file size in MB
				let fileSizeInMB = files[i].size / 1024 / 1024;

				// If file size is greater than or equal to 1 MB, display a toast error
				if (fileSizeInMB >= 1) {
					toast.error("Image should be less than 1 MB");
					continue; // Skip this file and move to the next
				}

				// If file size is less than 1 MB, proceed with resizing and uploading
				let reader = new FileReader();
				reader.readAsDataURL(files[i]);

				reader.onload = (event) => {
					let img = new Image();
					img.src = event.target.result;

					img.onload = () => {
						let canvas = document.createElement("canvas");
						let maxSize = 1200; // The maximum width or height of the resized image
						let width = img.width;
						let height = img.height;

						// Calculate the aspect ratio
						if (width > height) {
							if (width > maxSize) {
								height *= maxSize / width;
								width = maxSize;
							}
						} else {
							if (height > maxSize) {
								width *= maxSize / height;
								height = maxSize;
							}
						}

						// Set canvas dimensions
						canvas.width = width;
						canvas.height = height;

						// Draw the resized image onto the canvas
						let ctx = canvas.getContext("2d");
						ctx.drawImage(img, 0, 0, width, height);

						// Convert the canvas to a base64 string
						let uri = canvas.toDataURL("image/jpeg", 1);

						// Upload to Cloudinary
						cloudinaryUpload1(user._id, token, { image: uri })
							.then((data) => {
								allUploadedFiles.push(data);
								setAddThumbnail({ ...addThumbnail, images: allUploadedFiles });
							})
							.catch((err) => {
								console.log("CLOUDINARY UPLOAD ERR", err);
							});
					};
				};
			}
		}
	};

	const FileUploadThumbnail = () => {
		return (
			<>
				<ImageCard
					addThumbnail={addThumbnail}
					handleImageRemove={handleImageRemove}
					setAddThumbnail={setAddThumbnail}
					fileUploadAndResizeThumbNail={fileUploadAndResizeThumbNail}
				/>
			</>
		);
	};

	const handleImageRemove = (public_id) => {
		setLoading(true);

		// Make the API call to remove the image
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
			.then((res) => {
				setLoading(false);

				// Filter the image with the matching public_id out of the state
				const updatedImages = addThumbnail.images.filter(
					(image) => image.public_id !== public_id
				);

				// Update the state with the filtered images
				setAddThumbnail(updatedImages);
			})
			.catch((err) => {
				console.error("Error removing image:", err);
				setLoading(false);
				toast.error("Failed to remove image");
			});
	};

	const newSubcategoryForm = () => (
		<form onSubmit={clickSubmit}>
			<div className='form-group'>
				<label className='text-muted'>Category Name</label>
				<select
					onChange={handleChange2}
					className='form-control'
					style={{ textTransform: "capitalize" }}
				>
					<option>Please select a category</option>
					{allCategories &&
						allCategories.map((c, i) => {
							return (
								<option
									value={c._id}
									key={i}
									style={{ textTransform: "capitalize" }}
								>
									{c.categoryName}
								</option>
							);
						})}
				</select>
			</div>
			<div className='form-group'>
				<label className='text-muted'>Subcategory Name</label>
				<input
					type='text'
					className='form-control'
					onChange={handleChange1}
					value={SubcategoryName}
					required
				/>
			</div>

			<button className='btn btn-outline-primary mb-3'>Add Subcategory</button>
		</form>
	);

	// eslint-disable-next-line
	const showSuccess = () => {
		if (success) {
			return <h3 className='text-success'>{SubcategoryName} is created</h3>;
		}
	};

	return (
		<AddSubcategoryWrapper>
			<ToastContainer className='toast-top-center' position='top-center' />

			<div className=''>
				<div className='container'>
					<h3
						style={{ color: "#009ef7", fontWeight: "bold" }}
						className='mt-1 mb-3 text-center'
					>
						Add A New Subcategory
					</h3>
					<div className='row'>
						<div className='col-md-4 mx-auto'>
							<div className=''>{FileUploadThumbnail()}</div>
						</div>

						<div className='col-md-8 mx-auto my-auto'>
							{newSubcategoryForm()}
						</div>
					</div>
				</div>
			</div>
		</AddSubcategoryWrapper>
	);
};

export default AddSubcategory;

const AddSubcategoryWrapper = styled.div`
	.container {
		margin-top: 20px;
		border: 2px solid lightgrey;
		padding: 20px;
		border-radius: 20px;
		background: white;
	}
`;
