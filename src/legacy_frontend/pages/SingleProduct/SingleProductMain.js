import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { useParams, useHistory, useLocation } from "react-router-dom";
import SingleProductNoVariables from "./SingleProductNoVariables";
import SingleProductWithVariables from "./SingleProductWithVariables";
import { gettingSingleProduct } from "../../apiCore"; // Adjust the path if needed
import ReactGA from "react-ga4";

const SingleProductMain = () => {
	const { productSlug, categorySlug, productId } = useParams();
	const [product, setProduct] = useState(null);
	const [error, setError] = useState(null);
	const [likee, setLikee] = useState(false); // State to manage wishlist status
	const history = useHistory();
	const location = useLocation();

	useEffect(() => {
		ReactGA.send(window.location.pathname + window.location.search);

		// eslint-disable-next-line
	}, [window.location.pathname]);

	useEffect(() => {
		const currentPath = location.pathname;

		const redirectMappings = {
			"/single-product/glass-jellyfish-windchime-green-small/home-decor-outdoor/668881f07c77e46961b309e1":
				"/single-product/glass-jellyfish-windchime-small-green/outdoors/668881f07c77e46961b309e1",
			"/single-product/glass-jellyfish-windchime-large-blue-large/home-decor-outdoor/668df0ae1faae48b9c615699":
				"/single-product/glass-jellyfish-windchime-small-royal-blue/outdoors/669334c85e796e948f7f978f",
		};

		if (redirectMappings[currentPath]) {
			history.push(redirectMappings[currentPath]);
			return;
		}

		const fetchProduct = async () => {
			try {
				const product = await gettingSingleProduct(
					productSlug,
					categorySlug,
					productId
				);
				setProduct(product);
			} catch (err) {
				setError(err.message);
			}
		};

		fetchProduct();
	}, [productSlug, categorySlug, productId, likee, history, location]);

	if (error) {
		return <div>{error}</div>;
	}

	if (!product) {
		return <div>Loading...</div>;
	}

	return (
		<SingleProductMainWrapper>
			{product &&
			product._id &&
			product.productName &&
			product.category &&
			product.category.categoryName ? (
				<>
					{product.addVariables ? (
						<SingleProductWithVariables
							product={product}
							likee={likee}
							setLikee={setLikee}
						/>
					) : (
						<SingleProductNoVariables
							product={product}
							likee={likee}
							setLikee={setLikee}
						/>
					)}
				</>
			) : null}
		</SingleProductMainWrapper>
	);
};

export default SingleProductMain;

const SingleProductMainWrapper = styled.div`
	min-height: 800px;
`;
