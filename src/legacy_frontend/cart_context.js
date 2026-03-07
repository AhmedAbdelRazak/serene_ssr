// cart_context.js
import React, { useEffect, useContext, useReducer } from "react";
import reducer from "./cart_reducer";
import {
	ADD_TO_CART,
	REMOVE_CART_ITEM,
	TOGGLE_CART_ITEM_AMOUNT,
	CHANGE_COLOR,
	CHANGE_SIZE,
	CLEAR_CART,
	COUNT_CART_TOTALS,
	SIDEBAR_OPEN,
	SIDEBAR_CLOSE,
	SHIPPING_FEES,
	SHIPPING_DETAILS,
	SIDEBAR_OPEN2,
	SIDEBAR_CLOSE2,
	SIDEFILTERS_CLOSE,
	SIDEFILTERS_OPEN,
	SET_WEBSITE_SETUP,
	SET_LOADING,
} from "./actions";

import {
	// eslint-disable-next-line
	getWebsiteSetup,
	// eslint-disable-next-line
	gettingCategoriesAndSubcategories,
	// eslint-disable-next-line
	gettingSpecificProducts,
	cleanupPreviewCustomDesign,
} from "./apiCore";

// Utility to load cart from localStorage
const getLocalStorage = () => {
	let cart = localStorage.getItem("cart");
	if (cart) {
		return JSON.parse(localStorage.getItem("cart"));
	} else {
		return [];
	}
};

// Initial state, leaving your existing fields intact.
// Added new fields for the data we fetch once on mount.
const initialState = {
	isSidebarOpen: false,
	isSidebarOpen2: false,
	isSideFilterOpen: false,
	cart: getLocalStorage(),
	total_items: 0,
	total_amount: 0,
	shipping_fee: 0,
	shipmentChosen: {},

	// New fields for single-fetch data
	loading: false,
	websiteSetup: null,
	categories: [],
	subcategories: [],
	featuredProducts: [],
	newArrivalProducts: [],
	customDesignProducts: [],
};

const CartContext = React.createContext();

export const CartProvider = ({ children }) => {
	const [state, dispatch] = useReducer(reducer, initialState);

	// ------------------------------------
	// 1) Existing Cart Logic (unchanged)
	// ------------------------------------
	const openSidebar = () => {
		dispatch({ type: SIDEBAR_OPEN });
	};
	const closeSidebar = () => {
		dispatch({ type: SIDEBAR_CLOSE });
	};

	const openSidebar2 = () => {
		dispatch({ type: SIDEBAR_OPEN2 });
	};
	const closeSidebar2 = () => {
		dispatch({ type: SIDEBAR_CLOSE2 });
	};

	const openSideFilter = () => {
		dispatch({ type: SIDEFILTERS_OPEN });
	};
	const closeSideFilter = () => {
		dispatch({ type: SIDEFILTERS_CLOSE });
	};

	// add to cart
	// NOTE: We add a new argument "customDesign" for POD
	const addToCart = (
		id,
		color,
		amount,
		product,
		chosenProductAttributes,
		customDesign // <-- new optional parameter
	) => {
		dispatch({
			type: ADD_TO_CART,
			payload: {
				id,
				color,
				amount,
				product,
				chosenProductAttributes,
				customDesign,
			},
		});
	};

	const isSameCartEntry = (item, id, size, color) =>
		item.id === id &&
		(item.size?.toLowerCase() ?? "") + " " + (item.color?.toLowerCase() ?? "") ===
			(size?.toLowerCase() ?? "") + " " + (color?.toLowerCase() ?? "");

	const cleanupPreviewForCartItem = async (cartItem) => {
		const previewProductId = cartItem?.customDesign?.previewProductId;
		if (!previewProductId) return;

		const previewShopId =
			cartItem?.customDesign?.previewShopId ||
			cartItem?.printifyProductDetails?.shop_id;
		try {
			await cleanupPreviewCustomDesign(previewProductId, previewShopId);
		} catch (error) {
			console.warn("Failed to clean preview product from cart removal:", error);
		}
	};

	// remove item
	const removeItem = async (id, size, color) => {
		const itemsToRemove = state.cart.filter((item) =>
			isSameCartEntry(item, id, size, color)
		);
		await Promise.allSettled(
			itemsToRemove.map((item) => cleanupPreviewForCartItem(item))
		);
		dispatch({ type: REMOVE_CART_ITEM, payload: { id, size, color } });
	};

	// toggle amount
	const toggleAmount = (id, value, chosenAttribute, newMax) => {
		dispatch({
			type: TOGGLE_CART_ITEM_AMOUNT,
			payload: { id, value, chosenAttribute, newMax },
		});
	};

	// clear cart
	const clearCart = async () => {
		const itemsWithPreview = state.cart.filter(
			(item) => !!item?.customDesign?.previewProductId
		);
		await Promise.allSettled(
			itemsWithPreview.map((item) => cleanupPreviewForCartItem(item))
		);
		dispatch({ type: CLEAR_CART });
	};

	// change color
	const changeColor = (
		id,
		color,
		size,
		chosenColorImage,
		quantity,
		prevColor
	) => {
		dispatch({
			type: CHANGE_COLOR,
			payload: { id, color, size, chosenColorImage, quantity, prevColor },
		});
	};

	// change Size
	const changeSize = (id, size, color, quantity, prevSize) => {
		dispatch({
			type: CHANGE_SIZE,
			payload: { id, size, color, quantity, prevSize },
		});
	};

	const addShipmentFee = (ShippingPrice) => {
		dispatch({ type: SHIPPING_FEES, payload: { ShippingPrice } });
	};

	const addShipmentDetails = (chosenShipmentDetails) => {
		dispatch({ type: SHIPPING_DETAILS, payload: { chosenShipmentDetails } });
	};

	// Keep totals in sync with localStorage
	useEffect(() => {
		dispatch({ type: COUNT_CART_TOTALS });
		localStorage.setItem("cart", JSON.stringify(state.cart));
	}, [state.cart]);

	// ------------------------------------
	// 2) Fetch Once on Mount
	// ------------------------------------
	useEffect(() => {
		const fetchData = async () => {
			try {
				// Turn on loading
				dispatch({ type: SET_LOADING, payload: true });

				// (A) Website setup
				const websiteData = await getWebsiteSetup();
				dispatch({ type: SET_WEBSITE_SETUP, payload: websiteData });

				// (B) Categories & Subcategories
				// const categoriesData = await gettingCategoriesAndSubcategories();
				// if (categoriesData?.error) {
				// 	console.log(categoriesData.error);
				// } else {
				// 	dispatch({
				// 		type: SET_CATEGORIES_SUBCATEGORIES,
				// 		payload: {
				// 			categories: categoriesData.categories || [],
				// 			subcategories: categoriesData.subcategories || [],
				// 		},
				// 	});
				// }

				// // (C) Featured Products => { featured:1, newArrivals:0, customDesigns:0, sortByRate:0, offers:0, records:5, skip=0 }
				// const featuredData = await gettingSpecificProducts(1, 0, 0, 0, 0, 6);
				// if (featuredData?.error) {
				// 	console.log(featuredData.error);
				// } else {
				// 	// Sort by date descending
				// 	const sortedFeatured = featuredData.sort(
				// 		(a, b) => new Date(b.createdAt) - new Date(a.createdAt)
				// 	);
				// 	dispatch({ type: SET_FEATURED_PRODUCTS, payload: sortedFeatured });
				// }

				// // (D) New Arrival Products => { featured=0, newArrivals=1, ... }
				// const newArrivalData = await gettingSpecificProducts(0, 1, 0, 0, 0, 6);
				// if (newArrivalData?.error) {
				// 	console.log(newArrivalData.error);
				// } else {
				// 	dispatch({
				// 		type: SET_NEW_ARRIVAL_PRODUCTS,
				// 		payload: newArrivalData,
				// 	});
				// }

				// // (E) Custom Design Products => { featured=0, newArrivals=0, customDesigns=1, ... }
				// const customDesignData = await gettingSpecificProducts(
				// 	0,
				// 	0,
				// 	1,
				// 	0,
				// 	0,
				// 	6
				// );
				// if (customDesignData?.error) {
				// 	console.log(customDesignData.error);
				// } else {
				// 	dispatch({
				// 		type: SET_CUSTOM_DESIGN_PRODUCTS,
				// 		payload: customDesignData,
				// 	});
				// }
			} catch (error) {
				console.error("Error fetching data in CartContext: ", error);
			} finally {
				// Turn off loading
				dispatch({ type: SET_LOADING, payload: false });
			}
		};

		fetchData();
	}, []);

	// ------------------------------------
	// 3) Provide the Context
	// ------------------------------------
	return (
		<CartContext.Provider
			value={{
				...state,
				// existing cart actions:
				addToCart,
				removeItem,
				toggleAmount,
				clearCart,
				openSidebar,
				closeSidebar,
				openSidebar2,
				closeSidebar2,
				openSideFilter,
				closeSideFilter,
				addShipmentFee,
				addShipmentDetails,
				changeColor,
				changeSize,
			}}
		>
			{children}
		</CartContext.Provider>
	);
};

// make sure use
export const useCartContext = () => {
	return useContext(CartContext);
};
