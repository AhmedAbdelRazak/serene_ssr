/** @format */

import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { getSubCategories } from "../apiAdmin";
import { isAuthenticated } from "../../auth/index";
import { Link } from "react-router-dom";
import UpdateSubcategorySingle from "./UpdateSubcategorySingle";

const UpdateSubcategory = () => {
	const [allSubcategories, setAllSubCategories] = useState([]);
	// eslint-disable-next-line
	const { user, token } = isAuthenticated();
	// eslint-disable-next-line
	const [loading, setLoading] = useState(true);
	const [clickedSubcategory, setClickedSubcategory] = useState("");

	const gettingAllSubcategories = () => {
		setLoading(true);
		getSubCategories(token).then((data) => {
			if (data.error) {
				console.log(data.error);
			} else {
				setAllSubCategories(data);
				setLoading(false);
			}
		});
	};

	useEffect(() => {
		gettingAllSubcategories();
		// eslint-disable-next-line
	}, []);

	return (
		<UpdateSubcategoryWrapper>
			<div className='contentWrapper'>
				<h3
					style={{ color: "#009ef7", fontWeight: "bold" }}
					className='mt-1 mb-3 text-center'
				>
					Update Subcategories
				</h3>

				<br />
				<ul className='list-group text-center'>
					<h3 className='text-center'>
						Total of {allSubcategories.length} Added Subcategories
					</h3>
					<p className='mt-2 text-center'>
						Please Select Which Subcategory You Would Like To Update...
					</p>
					{allSubcategories.map((s, i) => (
						<Link
							to={`/admin/subcategories`}
							key={i}
							onClick={() => {
								setClickedSubcategory(s);
								setTimeout(() => {
									window.scrollTo({ top: 650, behavior: "smooth" });
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
									<strong>{s.SubcategoryName}</strong>
								</li>

								{!s.subCategoryStatus && (
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
			{clickedSubcategory ? (
				<UpdateSubcategorySingle
					clickedSubcategory={clickedSubcategory}
					setClickedSubcategory={setClickedSubcategory}
				/>
			) : null}
		</UpdateSubcategoryWrapper>
	);
};

export default UpdateSubcategory;

const UpdateSubcategoryWrapper = styled.div`
	min-height: 880px;
	overflow-x: hidden;
	/* background: #ededed; */

	.contentWrapper {
		margin-top: 20px;
		margin-bottom: 15px;
		border: 2px solid lightgrey;
		padding: 20px;
		border-radius: 20px;
	}
`;
