import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { Link } from "react-router-dom";
import { getColors, readSingleUserHistory } from "../apiCore";
import { isAuthenticated } from "../auth";
import ProductCard from "./ProductCard"; // Adjust the path as necessary
import ReactGA from "react-ga4";

const UserWishlist = () => {
	const [allColors, setAllColors] = useState([]);
	const [allProducts, setAllProducts] = useState([]);

	const { user, token } = isAuthenticated();

	const fetchUserWishlist = () => {
		readSingleUserHistory(user._id, token).then((data) => {
			if (data.error) {
				console.log(data.error);
			} else {
				setAllProducts(data);
			}
		});
	};

	const fetchAllColors = () => {
		getColors(token).then((data) => {
			if (data.error) {
				console.log(data.error);
			} else {
				setAllColors(data);
			}
		});
	};

	useEffect(() => {
		fetchUserWishlist();
		fetchAllColors();
		// eslint-disable-next-line
	}, []);

	useEffect(() => {
		ReactGA.initialize(process.env.REACT_APP_GOOGLE_ANALYTICS_MEASUREMENTID);
		ReactGA.send(window.location.pathname + window.location.search);
		// eslint-disable-next-line
	}, [window.location.pathname]);

	return (
		<UserWishlistWrapper>
			<h3>PRODUCTS YOU LIKED!</h3>
			{allProducts && allProducts.length === 0 ? (
				<h4>
					Sorry, No products in your wishlist,{" "}
					<Link to='/our-products'>Continue Shopping</Link> and we guarantee you
					will find something you will love!
				</h4>
			) : (
				<CardWrapper>
					{allProducts &&
						allProducts.map((product, i) => (
							<ProductCard key={i} product={product} allColors={allColors} />
						))}
				</CardWrapper>
			)}
		</UserWishlistWrapper>
	);
};

export default UserWishlist;

const UserWishlistWrapper = styled.div`
	min-height: 700px;
	background: var(--background-light);

	h3 {
		text-align: center;
		padding-top: 20px;
		font-weight: bold;
		color: var(--text-color-primary);
	}

	h4 {
		padding: 10px;
		font-weight: bold;
		font-size: 1.2rem;
		color: var(--text-color-secondary);
	}
`;

const CardWrapper = styled.div`
	display: grid;
	grid-template-columns: repeat(4, 1fr);
	gap: 20px;
	padding: 20px;

	@media (max-width: 1200px) {
		grid-template-columns: repeat(3, 1fr);
	}

	@media (max-width: 992px) {
		grid-template-columns: repeat(2, 1fr);
	}

	@media (max-width: 576px) {
		grid-template-columns: 1fr;
	}
`;
