import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { useParams, useHistory, useLocation } from "react-router-dom";
import SingleProductNoVariables from "./SingleProductNoVariables";
import SingleProductWithVariables from "./SingleProductWithVariables";
import { gettingSingleProduct } from "../../apiCore"; // Adjust the path if needed
import { useLegacyRouteBootstrap } from "../../bootstrap/LegacyRouteBootstrapContext";

const SingleProductMain = () => {
	const { productSlug, categorySlug, productId } = useParams();
	const routeBootstrap = useLegacyRouteBootstrap();
	const bootstrappedProduct =
		routeBootstrap?.type === "standard-product" &&
		`${routeBootstrap?.productSlug || ""}` === `${productSlug || ""}` &&
		`${routeBootstrap?.categorySlug || ""}` === `${categorySlug || ""}` &&
		`${routeBootstrap?.product?._id || ""}` === `${productId || ""}`
			? routeBootstrap.product
			: null;
	const [product, setProduct] = useState(() => bootstrappedProduct);
	const [error, setError] = useState(null);
	const [likee, setLikee] = useState(false); // State to manage wishlist status
	const history = useHistory();
	const location = useLocation();

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

			if (bootstrappedProduct && !likee) {
				setProduct(bootstrappedProduct);
				setError(null);
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
		}, [
			bootstrappedProduct,
			productSlug,
			categorySlug,
			productId,
			likee,
			history,
			location,
		]);

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
