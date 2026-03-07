/** @format */

// eslint-disable-next-line
import React, { useState, Fragment, useEffect } from "react";
// import { Link } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import styled from "styled-components";
import "react-toastify/dist/ReactToastify.min.css";
import { createSize, getSizes } from "../apiAdmin";
import { isAuthenticated } from "../../auth";
import Aos from "aos";
import "aos/dist/aos.css";
import axios from "axios";

const Sizes = () => {
	const [size, setSize] = useState("");
	const [allSizesDetails, setAllSizesDetails] = useState([]);
	const { user, token } = isAuthenticated();

	const gettingAllSizes = () => {
		getSizes(token).then((data) => {
			if (data.error) {
				toast.error("Failed to load sizes");
			} else {
				setAllSizesDetails(data);
			}
		});
	};

	useEffect(() => {
		gettingAllSizes();
		// eslint-disable-next-line
	}, []);

	const handleDelete = (sizeId) => {
		axios
			.delete(`${process.env.REACT_APP_API_URL}/size/${sizeId}/${user._id}`, {
				headers: {
					Authorization: `Bearer ${token}`,
				},
			})
			.then(() => {
				toast.success("Size deleted successfully");
				setAllSizesDetails(
					allSizesDetails.filter((size) => size._id !== sizeId)
				);
			})
			.catch((err) => {
				toast.error("Failed to delete size");
				console.error("Delete error:", err);
			});
	};

	const clickSubmit = (e) => {
		e.preventDefault();

		// Trim and normalize the size input to avoid mismatches due to capitalization or leading/trailing whitespace
		const normalizedSize = size.trim().toLowerCase();

		// Check if the size already exists
		const sizeExists = allSizesDetails.some(
			(s) => s.size.toLowerCase() === normalizedSize
		);

		if (sizeExists) {
			return toast.error("Size was added before, please try another size");
		}

		if (!normalizedSize) {
			return toast.error("Please add a size name before creating.");
		}

		createSize(user._id, token, { size: normalizedSize }).then((data) => {
			if (data.error) {
				toast.error(data.error);
			} else {
				toast.success("Size was successfully added.");
				gettingAllSizes(); // Refresh the list
				setSize(""); // Clear the input field
			}
		});
	};

	const newSizeForm = () => (
		<form onSubmit={clickSubmit}>
			<div className='form-group'>
				<label
					className='text-muted'
					style={{ fontWeight: "bold", fontSize: "20px" }}
				>
					Size Name
				</label>
				<input
					type='text'
					className='form-control'
					onChange={(e) => setSize(e.target.value)}
					value={size}
					required
				/>
			</div>

			<button className='btn btn-outline-primary mb-3'>Add Size</button>
		</form>
	);

	useEffect(() => {
		Aos.init({ duration: 1500 });
	}, []);

	return (
		<SizesWrapper>
			<ToastContainer className='toast-top-center' position='top-center' />
			<div className=''>
				<div className='container' data-aos='fade-down'>
					<h3
						style={{ color: "#009ef7", fontWeight: "bold" }}
						className='mt-1 mb-3 text-center'
					>
						Add A New Size
					</h3>
					{newSizeForm()}
					<h5 className='mt-5 text-center' style={{ fontWeight: "bold" }}>
						Already Added Sizes
					</h5>
					<table className='table table-bordered table-md-responsive table-hover table-striped col-md-8 mx-auto text-center '>
						<thead className='thead-light'>
							<tr
								style={{
									fontSize: "1rem",
									textTransform: "capitalize",
									textAlign: "center",
								}}
							>
								<th scope='col'>#</th>
								<th scope='col'>Size</th>
								<th scope='col'>Actions</th>
							</tr>
						</thead>
						<tbody
							style={{
								fontSize: "0.9rem",
								textTransform: "capitalize",
								fontWeight: "bolder",
							}}
						>
							{allSizesDetails.map((s, i) => (
								<tr key={s._id}>
									<td>{i + 1}</td>
									<td>{s.size}</td>
									<td>
										<button
											className='btn btn-danger p-1'
											style={{ fontSize: "12px", fontWeight: "bold" }}
											onClick={() => handleDelete(s._id)}
										>
											Delete
										</button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>
		</SizesWrapper>
	);
};

export default Sizes;

const SizesWrapper = styled.div`
	overflow-x: hidden;
	/* background: #ededed; */

	.grid-container {
		display: grid;
		/* grid-template-columns: 15.2% 84.8%; */
		grid-template-columns: ${(props) =>
			props.show ? "8% 92%" : "15.2% 84.8%"};
		margin: auto;
		/* border: 1px solid red; */
		/* grid-auto-rows: minmax(60px, auto); */
	}

	.container {
		margin-top: 20px;
		border: 2px solid lightgrey;
		padding: 20px;
		border-radius: 20px;
	}

	@media (max-width: 1750px) {
		background: white;

		.grid-container {
			display: grid;
			/* grid-template-columns: 18% 82%; */
			grid-template-columns: ${(props) => (props.show ? "7% 93%" : "18% 82%")};
			margin: auto;
			/* border: 1px solid red; */
			/* grid-auto-rows: minmax(60px, auto); */
		}
	}

	@media (max-width: 1400px) {
		background: white;

		.grid-container {
			display: grid;
			grid-template-columns: 12% 88%;
			margin: auto;
			/* border: 1px solid red; */
			/* grid-auto-rows: minmax(60px, auto); */
		}
	}
`;
