/** @format */

// eslint-disable-next-line
import React, { useState, useEffect } from "react";
// import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import styled from "styled-components";
import "react-toastify/dist/ReactToastify.min.css";
import axios from "axios";
import { createGender, cloudinaryUpload1, getGenders } from "../apiAdmin";
import { isAuthenticated } from "../../auth";
import ImageCard from "./ImageCard";

const AddGender = () => {
	const [genderName, setGenderName] = useState("");
	const [genderName_Arabic, setGenderName_Arabic] = useState("");
	// eslint-disable-next-line
	const [loading, setLoading] = useState("");
	// eslint-disable-next-line
	const [genderNameSlug, setGenderNameSlug] = useState("");
	const [genderNameSlug_Arabic, setGenderNameSlug_Arabic] = useState("");
	const [allGenders, setAllGenders] = useState([]);
	// eslint-disable-next-line
	const [error, setError] = useState(false);
	const [success, setSuccess] = useState(false);
	const [addThumbnail, setAddThumbnail] = useState([]);

	// destructure user and token from localstorage
	const { user, token } = isAuthenticated();

	const handleChange1 = (e) => {
		setError("");
		setGenderName(e.target.value);
		setGenderNameSlug(e.target.value.split(" ").join("-"));
		setGenderName_Arabic(e.target.value);
		setGenderNameSlug_Arabic(e.target.value.split(" ").join("-"));
	};

	const gettingAllGenders = () => {
		getGenders(token).then((data) => {
			if (data.error) {
				setError(data.error);
			} else {
				setError("");
				setAllGenders(
					data.map(
						(gender) =>
							gender.genderName.toLowerCase().replace(/\s/g, "") &&
							gender.genderName
								.toLowerCase()
								.replace(/\s/g, "")
								.concat(gender.genderId)
					)
				);
			}
		});
	};

	useEffect(() => {
		gettingAllGenders();
		// eslint-disable-next-line
	}, [genderName, genderNameSlug]);

	let matchingGender =
		allGenders &&
		allGenders.indexOf(genderName.toLowerCase().replace(/\s/g, "")) !== -1;

	const clickSubmit = (e) => {
		e.preventDefault();
		if (matchingGender) {
			return toast.error("This Gender was added before.");
		}

		if (addThumbnail.length === 0) {
			return toast.error("Please add a thumbnail for this Gender.");
		}

		if (!genderName) {
			return toast.error("Please add a gender name before creating.");
		}

		setError("");
		setSuccess(false);
		// make request to api to create Gender
		createGender(user._id, token, {
			genderName,
			genderName_Arabic,
			genderNameSlug,
			genderNameSlug_Arabic,
			thumbnail: addThumbnail && addThumbnail.images,
		}).then((data) => {
			if (data.error) {
				setError(data.error);
				toast.error("Gender Was Added Before.");
				setTimeout(function () {
					window.location.reload(false);
				}, 3000);
			} else {
				toast.success("Gender Was Successfully Added.");
				setError("");
				setTimeout(function () {
					setGenderName("");
					setGenderName_Arabic("");
					setGenderNameSlug("");
					setGenderNameSlug_Arabic("");
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

	const newGenderForm = () => (
		<form onSubmit={clickSubmit}>
			<div className='form-group'>
				<label
					className='text-muted'
					style={{ fontWeight: "bold", fontSize: "15px" }}
				>
					Gender Name
				</label>
				<input
					type='text'
					className='form-control'
					onChange={handleChange1}
					value={genderName}
					required
				/>
			</div>

			<button className='btn btn-outline-primary mb-3'>Add Gender</button>
		</form>
	);

	// eslint-disable-next-line
	const showSuccess = () => {
		if (success) {
			return <h3 className='text-success'>{genderName} is created</h3>;
		}
	};

	return (
		<AddGenderWrapper>
			<div className=''>
				<div className='container'>
					<h3
						style={{ color: "#009ef7", fontWeight: "bold" }}
						className='mt-1 mb-3 text-center'
					>
						Add A New Gender
					</h3>
					<div className='row'>
						<div className='col-md-4 mx-auto'>
							<div className=''>{FileUploadThumbnail()}</div>
						</div>

						<div className='col-md-8 mx-auto my-auto'>{newGenderForm()}</div>
					</div>
				</div>
			</div>
		</AddGenderWrapper>
	);
};

export default AddGender;

const AddGenderWrapper = styled.div`
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
