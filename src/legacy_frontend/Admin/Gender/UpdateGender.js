/** @format */

import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { getGenders } from "../apiAdmin";
import { isAuthenticated } from "../../auth/index";
import { Link } from "react-router-dom";
import UpdateGenderSingle from "./UpdateCategorySingle";

const UpdateGender = () => {
	const [allGenders, setAllGenders] = useState([]);
	// eslint-disable-next-line
	const { user, token } = isAuthenticated();
	// eslint-disable-next-line
	const [loading, setLoading] = useState(true);
	const [clickedGender, setClickedGender] = useState("");

	const gettingAllGenders = () => {
		setLoading(true);
		getGenders(token).then((data) => {
			if (data.error) {
				console.log(data.error);
			} else {
				setAllGenders(data);
				setLoading(false);
			}
		});
	};

	useEffect(() => {
		gettingAllGenders();
		// eslint-disable-next-line
	}, []);

	return (
		<UpdateGenderWrapper>
			<div className='contentWrapper'>
				<h3
					style={{ color: "#009ef7", fontWeight: "bold" }}
					className='mt-1 mb-3 text-center'
				>
					Update Genders
				</h3>

				<br />
				<ul className='list-group text-center'>
					<h3 className='text-center mt-2'>
						Total of {allGenders && allGenders.length} Added Genders
					</h3>
					<p className='mt-2 text-center'>
						Please Select Which Gender You Would Like To Update...
					</p>
					{allGenders &&
						allGenders.map((s, i) => (
							<Link
								to='/admin/gender?updategender'
								key={i}
								onClick={() => {
									setClickedGender(s);
									setTimeout(() => {
										window.scrollTo({ top: 300, behavior: "smooth" });
									}, 500);
								}}
							>
								<div className='row text-center mx-auto'>
									<li
										className='list-group-item d-flex my-1 py-4 justify-content-between align-items-center col-md-9 mx-auto'
										style={{
											fontSize: "0.85rem",
											textTransform: "capitalize",
										}}
									>
										<strong>{s.genderName}</strong>
									</li>

									{!s.genderNameStatus && (
										<li
											className='list-group-item d-flex my-1 py-4 justify-content-between align-items-center  col-md-3 mx-auto'
											style={{
												fontSize: "0.7rem",
												color: "red",
												fontWeight: "bold",
											}}
										>
											<strong>Deactivated</strong>
										</li>
									)}
								</div>
							</Link>
						))}
				</ul>
			</div>
			{clickedGender ? (
				<UpdateGenderSingle
					clickedGender={clickedGender}
					setClickedGender={setClickedGender}
				/>
			) : null}
		</UpdateGenderWrapper>
	);
};

export default UpdateGender;

const UpdateGenderWrapper = styled.div`
	overflow-x: hidden;
	/* background: #ededed; */

	.contentWrapper {
		margin-top: 20px;
		margin-bottom: 15px;
		border: 2px solid lightgrey;
		padding: 20px;
		border-radius: 20px;
	}

	@media (max-width: 1750px) {
		background: white;

		.grid-container {
			display: grid;
			grid-template-columns: 18% 82%;
			margin: auto;
			/* border: 1px solid red; */
			/* grid-auto-rows: minmax(60px, auto); */
		}
	}

	@media (max-width: 1400px) {
		background: white;

		.grid-container {
			display: grid;
			grid-template-columns: 12% 85%;
			margin: auto;
			/* border: 1px solid red; */
			/* grid-auto-rows: minmax(60px, auto); */
		}
	}
`;
