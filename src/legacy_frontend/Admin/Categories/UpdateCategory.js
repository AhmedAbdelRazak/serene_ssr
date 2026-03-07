/** @format */

import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { getCategories } from "../apiAdmin";
import { isAuthenticated } from "../../auth/index";
import { Link } from "react-router-dom";
import UpdateCategorySingle from "./UpdateCategorySingle";

const UpdateCategory = () => {
	const [allCategories, setAllCategories] = useState([]);
	// eslint-disable-next-line
	const { user, token } = isAuthenticated();
	// eslint-disable-next-line
	const [loading, setLoading] = useState(true);
	const [clickedCategory, setClickedCategory] = useState("");

	const gettingAllCategories = () => {
		setLoading(true);
		getCategories(token).then((data) => {
			if (data.error) {
				console.log(data.error);
			} else {
				setAllCategories(data);
				setLoading(false);
			}
		});
	};

	useEffect(() => {
		gettingAllCategories();
		// eslint-disable-next-line
	}, []);

	return (
		<UpdateCategoryWrapper>
			<div className='contentWrapper'>
				<h3
					style={{ color: "#009ef7", fontWeight: "bold" }}
					className='mt-1 mb-3 text-center'
				>
					Update Categories
				</h3>

				<br />
				<ul className='list-group text-center'>
					<h3 className='text-center mt-2'>
						Total of {allCategories && allCategories.length} Added Categories
					</h3>
					<p className='mt-2 text-center'>
						Please Select Which Category You Would Like To Update...
					</p>
					{allCategories &&
						allCategories.map((s, i) => (
							<Link
								to='/admin/categories?updatecategories'
								key={i}
								onClick={() => {
									setClickedCategory(s);
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
										<strong>{s.categoryName}</strong>
									</li>

									{!s.categoryStatus && (
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
			{clickedCategory ? (
				<UpdateCategorySingle
					clickedCategory={clickedCategory}
					setClickedCategory={setClickedCategory}
				/>
			) : null}
		</UpdateCategoryWrapper>
	);
};

export default UpdateCategory;

const UpdateCategoryWrapper = styled.div`
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
