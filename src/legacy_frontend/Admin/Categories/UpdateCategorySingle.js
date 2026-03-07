/** @format */

import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { getCategories, updateCategory, cloudinaryUpload1 } from "../apiAdmin";
import { toast } from "react-toastify";
import { isAuthenticated } from "../../auth";
import axios from "axios";
import Aos from "aos";
import "aos/dist/aos.css";

const UpdateCategorySingle = ({ clickedCategory, setClickedCategory }) => {
	// eslint-disable-next-line
	const [allCategories, setAllCategories] = useState([]);
	const { user, token } = isAuthenticated();
	const [selectedCategory, setSelectedCategory] = useState([]);
	const [categoryName, setCategoryName] = useState("");
	const [categoryName_Arabic, setCategoryName_Arabic] = useState("");
	const [categoryStatus, setCategoryStatus] = useState("1");
	const [loading, setLoading] = useState(true);
	const [categorySlug, setCategorySlug] = useState("");
	const [categorySlug_Arabic, setCategorySlug_Arabic] = useState("");
	// eslint-disable-next-line
	const [imageDeletedFlag1, setImageDeletedFlag1] = useState(false);
	const [addThumbnail, setAddThumbnail] = useState([]);

	const gettingAllCategories = () => {
		setLoading(true);
		getCategories(token).then((data) => {
			if (data.error) {
				console.log(data.error);
			} else {
				setAllCategories(data);
				setSelectedCategory(
					clickedCategory._id &&
						clickedCategory._id !== "undefined" &&
						data.filter((s) => s._id === clickedCategory._id)
				);
				setCategoryName(
					clickedCategory._id &&
						clickedCategory._id !== "undefined" &&
						data.filter((s) => s._id === clickedCategory._id)[0].categoryName
				);
				setCategorySlug(
					clickedCategory._id &&
						clickedCategory._id !== "undefined" &&
						data.filter((s) => s._id === clickedCategory._id)[0].categorySlug
				);
				setCategoryName_Arabic(
					clickedCategory._id &&
						clickedCategory._id !== "undefined" &&
						data.filter((s) => s._id === clickedCategory._id)[0]
							.categoryName_Arabic
				);
				setCategorySlug_Arabic(
					clickedCategory._id &&
						clickedCategory._id !== "undefined" &&
						data.filter((s) => s._id === clickedCategory._id)[0]
							.categorySlug_Arabic
				);

				setLoading(false);
			}
		});
	};

	useEffect(() => {
		gettingAllCategories();
		// eslint-disable-next-line
	}, [clickedCategory._id]);

	const handleChange1 = (e) => {
		setCategoryName(e.target.value);
		setCategorySlug(e.target.value.split(" ").join("-"));
		setCategoryName_Arabic(e.target.value);
		setCategorySlug_Arabic(e.target.value.split(" ").join("-"));
	};

	const handleChange5 = (e) => {
		setCategoryStatus(e.target.value);
	};

	const clickSubmit = (e) => {
		e.preventDefault();
		setLoading(true);
		if (categoryStatus === "0") {
			if (
				window.confirm(
					"Are you sure you want to deactivate the selected Category?"
				)
			) {
				updateCategory(clickedCategory._id, user._id, token, {
					categoryName,
					categoryName_Arabic,
					categoryStatus,
					categorySlug,
					categorySlug_Arabic,
					thumbnail:
						addThumbnail && addThumbnail.images !== undefined
							? addThumbnail && addThumbnail.images
							: selectedCategory &&
								selectedCategory.length > 0 &&
								selectedCategory[0].thumbnail,
				}).then((data) => {
					if (data.error) {
						console.log(data.error);
						setLoading(false);
						setTimeout(function () {
							window.location.reload(false);
						}, 2500);
					} else {
						toast.success("Category was successfully Updated.");
						setTimeout(function () {
							setLoading(false);
						}, 2000);
						setTimeout(function () {
							window.location.reload(false);
						}, 2500);
					}
				});
			}
		} else {
			updateCategory(clickedCategory._id, user._id, token, {
				categoryName,
				categoryName_Arabic,
				categoryStatus,
				categorySlug,
				categorySlug_Arabic,
				thumbnail:
					addThumbnail && addThumbnail.images !== undefined
						? addThumbnail && addThumbnail.images
						: selectedCategory &&
							selectedCategory.length > 0 &&
							selectedCategory[0].thumbnail,
			}).then((data) => {
				if (data.error) {
					console.log(data.error);
					setLoading(false);
					setTimeout(function () {
						window.location.reload(false);
					}, 2500);
				} else {
					toast.success("Category was successfully Updated.");
					setTimeout(function () {
						setLoading(false);
					}, 2000);
					setTimeout(function () {
						window.location.reload(false);
					}, 2500);
				}
			});
		}
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
				<label
					className='btn btn-info btn-raised'
					style={{ cursor: "pointer", fontSize: "0.85rem" }}
				>
					Update Category Thumbnail
					<input
						type='file'
						hidden
						accept='images/*'
						onChange={fileUploadAndResizeThumbNail}
					/>
				</label>
			</>
		);
	};
	// console.log(addThumbnail);

	const handleImageRemove = (public_id) => {
		setLoading(true);
		// console.log("remove image", public_id);
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
				// eslint-disable-next-line
				const { images } = addThumbnail;
				// let filteredImages = images.filter((item) => {
				// 	return item.public_id !== public_id;
				// });
				setAddThumbnail([]);
			})
			.catch((err) => {
				console.log(err);
				setLoading(false);
				setTimeout(function () {
					window.location.reload(false);
				}, 1000);
			});
	};

	useEffect(() => {
		Aos.init({ duration: 1500 });
	}, []);

	return (
		<UpdateCategorySingleWrapper>
			{selectedCategory && allCategories && !loading ? (
				<div className='contentWrapper'>
					<div
						style={{
							fontWeight: "bold",
							fontSize: "1.1rem",
							textDecoration: "underline",
							cursor: "pointer",
						}}
						className='col-md-6 mx-auto my-3 mx-auto text-center'
						onClick={() => {
							setClickedCategory("");
							window.scrollTo({ top: 0, behavior: "smooth" });
						}}
					>
						Back to category list...
					</div>
					<form
						onSubmit={clickSubmit}
						className='col-md-5 mx-auto'
						// style={{ borderLeft: "1px solid brown" }}
					>
						<h3
							style={{
								color: "#009ef7",
								fontSize: "1.15rem",
								fontWeight: "bold",
							}}
							className='text-center mt-1'
						>
							The Selected Category is "
							{selectedCategory &&
								selectedCategory[0] &&
								selectedCategory[0].categoryName}
							"
						</h3>
						<div className='m-3 col-8'>
							<div className='col-12'>
								{addThumbnail && addThumbnail.images !== undefined ? (
									<>
										{addThumbnail.images.map((image) => {
											return (
												<div className='m-3 col-6 '>
													<button
														type='button'
														className='close'
														onClick={() => {
															handleImageRemove(image.public_id);
															setAddThumbnail([]);
														}}
														style={{
															color: "white",
															background: "black",
															fontSize: "20px",
														}}
														aria-label='Close'
													>
														<span aria-hidden='true'>&times;</span>
													</button>
													<img
														src={image.url}
														alt='Img Not Found'
														style={{
															width: "90px",
															height: "90px",
															boxShadow: "1px 1px 1px 1px rgba(0,0,0,0.2)",
														}}
														key={image.public_id}
													/>
												</div>
											);
										})}
									</>
								) : (
									<>
										{imageDeletedFlag1 ? null : (
											<div className='m-3 col-6 '>
												<button
													type='button'
													className='close'
													onClick={() => {
														handleImageRemove(
															selectedCategory &&
																selectedCategory.length > 0 &&
																selectedCategory[0].thumbnail[0].public_id
														);
														setAddThumbnail([]);
														setImageDeletedFlag1(true);
													}}
													style={{
														color: "white",
														background: "black",
														fontSize: "20px",
													}}
													aria-label='Close'
												>
													<span aria-hidden='true'>&times;</span>
												</button>

												<img
													src={
														selectedCategory &&
														selectedCategory.length > 0 &&
														selectedCategory[0].thumbnail[0].url
													}
													alt='Img Not Found'
													style={{
														width: "90px",
														height: "90px",
														boxShadow: "1px 1px 1px 1px rgba(0,0,0,0.2)",
													}}
												/>
											</div>
										)}
									</>
								)}
							</div>
							{FileUploadThumbnail()}
						</div>
						<div className='form-group mt-5 '>
							<label className='text-muted'>Category Name</label>
							<input
								type='text'
								className='form-control'
								onChange={handleChange1}
								value={categoryName}
							/>
						</div>

						<div className='form-group'>
							<label className='text-muted'>Active Category?</label>
							<select
								onChange={handleChange5}
								className='form-control'
								style={{ fontSize: "0.80rem" }}
							>
								<option>Please select / Required*</option>
								<option value='0'>Deactivate Category</option>
								<option value='1'>Activate Category</option>
							</select>
						</div>
						<button className='btn btn-outline-primary mb-3'>
							Update Category
						</button>
					</form>
				</div>
			) : (
				<div className='mx-auto'>Loading</div>
			)}
		</UpdateCategorySingleWrapper>
	);
};

export default UpdateCategorySingle;

const UpdateCategorySingleWrapper = styled.div`
	overflow-x: hidden;
	padding-bottom: 100px;

	.contentWrapper {
		margin-top: 20px;
		margin-bottom: 50px;
		border: 2px solid lightgrey;
		padding: 20px;
		border-radius: 20px;
	}
`;
