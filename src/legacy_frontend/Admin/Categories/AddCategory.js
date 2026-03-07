/** @format */

// eslint-disable-next-line
import React, { useState, useEffect } from "react";
// import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import styled from "styled-components";
import "react-toastify/dist/ReactToastify.min.css";
import axios from "axios";
import { createCategory, cloudinaryUpload1, getCategories } from "../apiAdmin";
import { isAuthenticated } from "../../auth";
import ImageCard from "./ImageCard";

const AddCategory = () => {
	const [categoryName, setCategoryName] = useState("");
	const [categoryName_Arabic, setCategoryName_Arabic] = useState("");
	// eslint-disable-next-line
	const [loading, setLoading] = useState("");
	// eslint-disable-next-line
	const [categorySlug, setCategorySlug] = useState("");
	const [categorySlug_Arabic, setCategorySlug_Arabic] = useState("");
	const [allCategories, setAllCategories] = useState([]);
	// eslint-disable-next-line
	const [error, setError] = useState(false);
	// eslint-disable-next-line
	const [success, setSuccess] = useState(false);
	const [addThumbnail, setAddThumbnail] = useState([]);

	// destructure user and token from localstorage
	const { user, token } = isAuthenticated();

	const handleChange1 = (e) => {
		setError("");
		setCategoryName(e.target.value);
		setCategorySlug(e.target.value.split(" ").join("-"));
		setCategoryName_Arabic(e.target.value);
		setCategorySlug_Arabic(e.target.value.split(" ").join("-"));
	};

	// const handleChange3 = (e) => {
	// 	setError("");
	// 	setCategoryName_Arabic(e.target.value);
	// 	setCategorySlug_Arabic(e.target.value.split(" ").join("-"));
	// };

	const gettingAllCategories = () => {
		getCategories(token).then((data) => {
			if (data.error) {
				setError(data.error);
			} else {
				setError("");
				setAllCategories(
					data.map(
						(category) =>
							category.categoryName.toLowerCase().replace(/\s/g, "") &&
							category.categoryName
								.toLowerCase()
								.replace(/\s/g, "")
								.concat(category.categoryId)
					)
				);
			}
		});
	};

	useEffect(() => {
		gettingAllCategories();
		// eslint-disable-next-line
	}, [categoryName, categorySlug]);

	let matchingCategory =
		allCategories.indexOf(categoryName.toLowerCase().replace(/\s/g, "")) !== -1;
	// console.log(matchingCategory, "El Logic");

	const clickSubmit = (e) => {
		e.preventDefault();
		if (matchingCategory) {
			return toast.error("This Category was added before.");
		}

		if (addThumbnail.length === 0) {
			return toast.error("Please add a thumbnail for this Category.");
		}

		if (!categoryName) {
			return toast.error("Please add a category name before creating.");
		}

		setError("");
		setSuccess(false);
		// make request to api to create Category
		createCategory(user._id, token, {
			categoryName,
			categoryName_Arabic,
			categorySlug,
			categorySlug_Arabic,
			thumbnail: addThumbnail && addThumbnail.images,
		}).then((data) => {
			if (data.error) {
				setError(data.error);
				toast.error("Category Was Added Before.");
				setTimeout(function () {
					window.location.reload(false);
				}, 3000);
			} else {
				toast.success("Category Was Successfully Added.");
				setError("");
				setTimeout(function () {
					setCategoryName("");
					setCategoryName_Arabic("");
					setCategorySlug("");
					setCategorySlug_Arabic("");
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

	const newCategoryForm = () => (
		<form onSubmit={clickSubmit}>
			<div className='form-group'>
				<label
					className='text-muted'
					style={{ fontWeight: "bold", fontSize: "15px" }}
				>
					Category Name
				</label>
				<input
					type='text'
					className='form-control'
					onChange={handleChange1}
					value={categoryName}
					required
				/>
			</div>

			{/* <div className='form-group'>
				<label
					className='text-muted'
					style={{ fontWeight: "bold", fontSize: "15px" }}
				>
					اسم الفئة{" "}
				</label>
				<input
					type='text'
					className='form-control'
					onChange={handleChange3}
					value={categoryName_Arabic}
					required
				/>
			</div> */}

			<button className='btn btn-outline-primary mb-3'>Add Category</button>
		</form>
	);

	return (
		<AddCategoryWrapper>
			<div className=''>
				<div className='container'>
					<h3
						style={{ color: "#009ef7", fontWeight: "bold" }}
						className='mt-1 mb-3 text-center'
					>
						Add A New Category
					</h3>
					<div className='row'>
						<div className='col-md-4 mx-auto'>
							<div className=''>{FileUploadThumbnail()}</div>
						</div>

						<div className='col-md-8 mx-auto my-auto'>{newCategoryForm()}</div>
					</div>
				</div>
			</div>
		</AddCategoryWrapper>
	);
};

export default AddCategory;

const AddCategoryWrapper = styled.div`
	.container {
		margin-top: 20px;
		border: 2px solid lightgrey;
		padding: 20px;
		border-radius: 20px;
		background: white;
	}

	@media (max-width: 1750px) {
		background: white;
	}

	@media (max-width: 1400px) {
		background: white;
	}
`;
