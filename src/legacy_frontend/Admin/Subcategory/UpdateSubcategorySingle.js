/** @format */
import React, { useState, useEffect } from "react";
import styled from "styled-components";
import {
	updateSubcategory,
	getCategories,
	getSubCategories,
	cloudinaryUpload1,
} from "../apiAdmin";
import { isAuthenticated } from "../../auth/index";
// eslint-disable-next-line
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.min.css";
import axios from "axios";
import Aos from "aos";
import "aos/dist/aos.css";

const UpdateSubcategorySingle = ({
	clickedSubcategory,
	setClickedSubcategory,
}) => {
	// eslint-disable-next-line
	const [allCategories, setAllCategories] = useState([]);
	const { user, token } = isAuthenticated();
	const [selectedSubcategory, setSelectedSubcategory] = useState({});
	const [SubcategoryName, setSubcategoryName] = useState("");
	const [SubcategoryName_Arabic, setSubcategoryName_Arabic] = useState("");
	const [subCategoryStatus, setSubCategoryStatus] = useState("1");
	// eslint-disable-next-line
	const [linkClick, setLinkClick] = useState(false);
	const [loading, setLoading] = useState(false);
	const [SubcategorySlug, setSubcategorySlug] = useState("");
	const [SubcategorySlug_Arabic, setSubcategorySlug_Arabic] = useState("");
	const [categoryId, setSubCategory_CategoryId] = useState("");
	// eslint-disable-next-line
	const [allSubCategoriesForCheck, setAllSubCategoriesForCheck] = useState([]);
	// eslint-disable-next-line
	const [allSubCategories, setAllSubcategories] = useState([]);
	const [imageDeletedFlag1, setImageDeletedFlag1] = useState(false);
	const [addThumbnail, setAddThumbnail] = useState([]);

	const gettingAllCategories = () => {
		getCategories(token).then((data) => {
			if (data.error) {
				console.log(data.error);
			} else {
				setAllCategories(data);

				//gettingSubCategories
				getSubCategories(token).then((data2) => {
					if (data2.error) {
						console.log(data2.error, "error getting subcategories");
					} else {
						setAllSubcategories(data2);
						setAllSubCategoriesForCheck(
							data2.map(
								(subcategory) =>
									subcategory.SubcategoryName.toLowerCase().replace(
										/\s/g,
										""
									) &&
									subcategory.SubcategoryName.toLowerCase()
										.replace(/\s/g, "")
										.concat(subcategory.categoryId)
							)
						);
						setSelectedSubcategory(
							clickedSubcategory._id &&
								clickedSubcategory._id !== "undefined" &&
								data2.filter((s) => s._id === clickedSubcategory._id)
						);
						setSubcategoryName(
							clickedSubcategory._id &&
								clickedSubcategory._id !== "undefined" &&
								data2.filter((s) => s._id === clickedSubcategory._id)[0]
									.SubcategoryName
						);
						setSubcategoryName_Arabic(
							clickedSubcategory._id &&
								clickedSubcategory._id !== "undefined" &&
								data2.filter((s) => s._id === clickedSubcategory._id)[0]
									.SubcategoryName_Arabic
						);
						setSubcategorySlug(
							clickedSubcategory._id &&
								clickedSubcategory._id !== "undefined" &&
								data2.filter((s) => s._id === clickedSubcategory._id)[0]
									.SubcategorySlug
						);
						setSubcategorySlug_Arabic(
							clickedSubcategory._id &&
								clickedSubcategory._id !== "undefined" &&
								data2.filter((s) => s._id === clickedSubcategory._id)[0]
									.SubcategorySlug_Arabic
						);
						setSubCategory_CategoryId(
							clickedSubcategory._id &&
								clickedSubcategory._id !== "undefined" &&
								data2.filter((s) => s._id === clickedSubcategory._id)[0]
									.categoryId
						);
						setSubCategoryStatus(
							clickedSubcategory._id &&
								clickedSubcategory._id !== "undefined" &&
								data2.filter((s) => s._id === clickedSubcategory._id)[0]
									.subCategoryStatus
						);
					}
				});
				//End Of GettingSubCategories
			}
		});
	};

	useEffect(() => {
		gettingAllCategories();
		// eslint-disable-next-line
	}, [clickedSubcategory._id, loading]);

	const handleChange1 = (e) => {
		setSubcategoryName(e.target.value);
		setSubcategorySlug(e.target.value.split(" ").join("-"));
		setSubcategoryName_Arabic(e.target.value);
		setSubcategorySlug_Arabic(e.target.value.split(" ").join("-"));
	};

	const handleChange2 = (e) => {
		setSubCategory_CategoryId(e.target.value);
	};

	const handleChange5 = (e) => {
		setSubCategoryStatus(e.target.value);
	};

	const clickSubmit = (e) => {
		e.preventDefault();
		setLoading(true);
		if (subCategoryStatus === "0") {
			if (
				window.confirm(
					"Are you sure you want to deactivate the selected Subcategory?"
				)
			) {
				updateSubcategory(clickedSubcategory._id, user._id, token, {
					SubcategoryName,
					SubcategoryName_Arabic,
					subCategoryStatus,
					SubcategorySlug,
					SubcategorySlug_Arabic,
					categoryId,
					thumbnail:
						addThumbnail && addThumbnail.images !== undefined
							? addThumbnail && addThumbnail.images
							: selectedSubcategory &&
								selectedSubcategory.length > 0 &&
								selectedSubcategory[0].thumbnail,
				}).then((data) => {
					if (data.error) {
						console.log(data.error);
						setLoading(false);
						setTimeout(function () {
							window.location.reload(false);
						}, 2500);
					} else {
						toast.success("Subcategory was successfully Updated.");
						setTimeout(function () {
							setLinkClick(false);
							setLoading(false);
						}, 2000);
						setTimeout(function () {
							window.location.reload(false);
						}, 2500);
					}
				});
			}
		} else {
			updateSubcategory(clickedSubcategory._id, user._id, token, {
				SubcategoryName,
				SubcategoryName_Arabic,
				subCategoryStatus,
				SubcategorySlug,
				SubcategorySlug_Arabic,
				categoryId,
				thumbnail:
					addThumbnail && addThumbnail.images !== undefined
						? addThumbnail && addThumbnail.images
						: selectedSubcategory &&
							selectedSubcategory.length > 0 &&
							selectedSubcategory[0].thumbnail,
			}).then((data) => {
				if (data.error) {
					console.log(data.error);
					setLoading(false);
					setTimeout(function () {
						window.location.reload(false);
					}, 2500);
				} else {
					toast.success("Subcategory was successfully Updated.");
					setTimeout(function () {
						setLinkClick(false);
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
					Update Subcategory Thumbnail
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

	useEffect(() => {
		Aos.init({ duration: 1500 });
	}, []);

	return (
		<UpdateSubcategorySingleWrapper>
			<div className='contentWrapper' data-aos='fade-down'>
				<div
					style={{
						fontWeight: "bold",
						fontSize: "1.1rem",
						textDecoration: "underline",
						cursor: "pointer",
					}}
					className='col-md-6 mx-auto my-3 mx-auto text-center'
					onClick={() => {
						setClickedSubcategory("");
						window.scrollTo({ top: 0, behavior: "smooth" });
					}}
				>
					Back to subcategories list...
				</div>
				<form
					onSubmit={clickSubmit}
					className=''
					// style={{ borderLeft: "1px solid brown" }}
				>
					<h3
						style={{
							fontSize: "1.15rem",
							fontWeight: "bold",
							textTransform: "capitalize",
							color: "#009ef7",
						}}
						className='text-center mt-1'
					>
						The Selected Subcategory is "
						{selectedSubcategory &&
							selectedSubcategory[0] &&
							selectedSubcategory[0].SubcategoryName}
						"
					</h3>
					<div className='m-3 col-8'>
						<div className='col-12'>
							{addThumbnail && addThumbnail.images !== undefined ? (
								<>
									{addThumbnail.images.map((image) => {
										return (
											<div className='m-3 col-2'>
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
										<div className='m-3 col-2 '>
											<button
												type='button'
												className='close'
												onClick={() => {
													handleImageRemove(
														selectedSubcategory &&
															selectedSubcategory.length > 0 &&
															selectedSubcategory[0].thumbnail[0].public_id
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
													selectedSubcategory &&
													selectedSubcategory.length > 0 &&
													selectedSubcategory[0].thumbnail[0].url
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
						<label className='text-muted'>Subcategory Name</label>
						<input
							type='text'
							className='form-control'
							onChange={handleChange1}
							value={SubcategoryName}
						/>
					</div>

					<div className='form-group my-4 '>
						<label className='text-muted'>Category</label>
						<select onChange={handleChange2} className='form-control'>
							<option>Please select a category</option>
							{allCategories &&
								allCategories.map((c, i) => {
									return (
										<option
											style={{ textTransform: "capitalize" }}
											value={c._id}
											key={i}
											selected={c._id === categoryId}
										>
											{c.categoryName}
										</option>
									);
								})}
						</select>
					</div>

					<div className='form-group'>
						<label className='text-muted'>Active Subcategory?</label>
						<select
							onChange={handleChange5}
							className='form-control'
							style={{ fontSize: "0.80rem" }}
						>
							<option>Please select / Required*</option>
							<option value='0'>Deactivate Subcategory</option>
							<option value='1'>Activate Subcategory</option>
						</select>
					</div>
					<button className='btn btn-outline-primary mb-3'>
						Update Subcategory
					</button>
				</form>
			</div>
		</UpdateSubcategorySingleWrapper>
	);
};

export default UpdateSubcategorySingle;

const UpdateSubcategorySingleWrapper = styled.div`
	min-height: 880px;
	overflow-x: hidden;

	.contentWrapper {
		margin-top: 100px;
		margin-bottom: 15px;
		border: 2px solid lightgrey;
		padding: 20px;
		border-radius: 20px;
	}
`;
