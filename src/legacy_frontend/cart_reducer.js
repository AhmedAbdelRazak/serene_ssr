// cart_reducer.js
import {
	ADD_TO_CART,
	CLEAR_CART,
	COUNT_CART_TOTALS,
	REMOVE_CART_ITEM,
	TOGGLE_CART_ITEM_AMOUNT,
	SIDEBAR_OPEN,
	SIDEBAR_CLOSE,
	SIDEBAR_OPEN2,
	SIDEBAR_CLOSE2,
	SHIPPING_FEES,
	SHIPPING_DETAILS,
	CHANGE_COLOR,
	CHANGE_SIZE,
	SIDEFILTERS_OPEN,
	SIDEFILTERS_CLOSE,
	// New action types
	SET_WEBSITE_SETUP,
	SET_CATEGORIES_SUBCATEGORIES,
	SET_FEATURED_PRODUCTS,
	SET_NEW_ARRIVAL_PRODUCTS,
	SET_CUSTOM_DESIGN_PRODUCTS,
	SET_LOADING,
} from "./actions";

// OPTIONAL HELPER to find the correct Printify variant image by color/size
function getVariantImageForColorSize(product, chosenAttributes) {
	// If any crucial arrays are missing, bail out
	if (
		!product ||
		!Array.isArray(product.options) ||
		!Array.isArray(product.variants) ||
		!Array.isArray(product.images)
	) {
		return null;
	}

	// 1) Find the "Colors" and "Sizes" options from printify
	const colorOption = product.options.find(
		(o) => o.name.toLowerCase() === "colors"
	);
	const sizeOption = product.options.find(
		(o) => o.name.toLowerCase() === "sizes"
	);
	if (!colorOption || !sizeOption) return null;

	// 2) Attempt to match chosenAttributes color/size to the printify "title"
	const colorVal = colorOption.values.find(
		(val) => val.title.toLowerCase() === chosenAttributes.color?.toLowerCase()
	);
	const sizeVal = sizeOption.values.find(
		(val) => val.title.toLowerCase() === chosenAttributes.size?.toLowerCase()
	);
	if (!colorVal || !sizeVal) return null;

	// 3) Find the matching variant
	const matchingVariant = product.variants.find(
		(v) => v.options.includes(colorVal.id) && v.options.includes(sizeVal.id)
	);
	if (!matchingVariant) return null;

	// 4) Among product.images, find one whose variant_ids has matchingVariant.id
	for (let imgObj of product.images) {
		if (
			Array.isArray(imgObj.variant_ids) &&
			imgObj.variant_ids.includes(matchingVariant.id)
		) {
			return imgObj.src;
		}
	}
	return null;
}

const cart_reducer = (state, action) => {
	if (action.type === SIDEBAR_OPEN) {
		return { ...state, isSidebarOpen: true };
	}
	if (action.type === SIDEBAR_CLOSE) {
		return { ...state, isSidebarOpen: false };
	}

	if (action.type === SIDEBAR_OPEN2) {
		return { ...state, isSidebarOpen2: true };
	}
	if (action.type === SIDEBAR_CLOSE2) {
		return { ...state, isSidebarOpen2: false };
	}

	if (action.type === SIDEFILTERS_OPEN) {
		return { ...state, isSideFilterOpen: true };
	}
	if (action.type === SIDEFILTERS_CLOSE) {
		return { ...state, isSideFilterOpen: false };
	}

	// ======================= ADD TO CART =======================
	if (action.type === ADD_TO_CART) {
		const { id, amount, product, chosenProductAttributes, customDesign } =
			action.payload;

		// If the product has "addVariables === true", we have local "productAttributes"
		if (product.addVariables) {
			// Check if same item is already in cart
			const tempItem = state.cart.find(
				(i) =>
					i.id === id &&
					chosenProductAttributes.SubSKU === i.chosenProductAttributes.SubSKU
			);
			if (tempItem) {
				// If we already have that SubSKU => increment amount
				const tempCart = state.cart.map((cartItem) => {
					if (
						cartItem.id === id &&
						cartItem.chosenProductAttributes.SubSKU ===
							chosenProductAttributes.SubSKU
					) {
						let newAmount = cartItem.amount + amount;
						if (newAmount > cartItem.max) {
							newAmount = cartItem.max;
						}
						return { ...cartItem, amount: newAmount };
					}
					return cartItem;
				});
				return { ...state, cart: tempCart };
			} else {
				// It's a brand-new item with variations
				let finalImage = "";
				let finalMax = chosenProductAttributes.quantity || 999;

				// If isPrintify
				if (product.isPrintifyProduct) {
					const isPOD = product.printifyProductDetails?.POD === true;
					if (isPOD) {
						// ------------------ Printify POD ------------------
						// If user used our screenshot-based customization
						if (customDesign?.finalScreenshotUrl) {
							finalImage = customDesign.finalScreenshotUrl;
						} else {
							// fallback to variant-based image if color/size is set
							const possibleImg = getVariantImageForColorSize(
								product.printifyProductDetails,
								chosenProductAttributes
							);
							if (possibleImg) {
								finalImage = possibleImg;
							} else {
								// fallback to thumbnail if none
								finalImage =
									product?.thumbnailImage?.[0]?.images?.[0]?.url || "";
							}
						}
					} else {
						// ------------------ Printify (not POD) ------------------
						// If you want to pick a color/size-based image, try:
						const possibleImg = getVariantImageForColorSize(
							product.printifyProductDetails,
							chosenProductAttributes
						);
						if (possibleImg) {
							finalImage = possibleImg;
						} else if (
							chosenProductAttributes.productImages &&
							chosenProductAttributes.productImages.length > 0
						) {
							// or if user had local images
							finalImage = chosenProductAttributes.productImages[0].url;
						} else {
							// fallback to the product's main thumbnail
							finalImage = product?.thumbnailImage?.[0]?.images?.[0]?.url || "";
						}
					}
				} else {
					// ------------------ Non-Printify variant product ------------------
					if (
						chosenProductAttributes.productImages &&
						chosenProductAttributes.productImages.length > 0
					) {
						finalImage = chosenProductAttributes.productImages[0].url;
					} else {
						finalImage = product.thumbnailImage[0].images[0].url;
					}
				}

				// Build the cart item
				const newItem = {
					id,
					_id: product._id,
					name: product.productName,
					nameArabic: product.productName_Arabic,
					color: chosenProductAttributes.color,
					size: chosenProductAttributes.size,
					amount,
					image: finalImage,
					price: chosenProductAttributes.price,
					priceAfterDiscount: chosenProductAttributes.priceAfterDiscount,
					max: finalMax,
					loyaltyPoints: product.loyaltyPoints,
					slug: product.slug,
					categorySlug: product.category.categorySlug,
					categoryName: product.category.categoryName,
					categoryNameArabic: product.category.categoryName_Arabic,
					relatedProducts: product.relatedProducts,
					allProductDetailsIncluded: product,
					storeId: product.store,
					chosenProductAttributes,
					isPrintifyProduct: product.isPrintifyProduct,
					printifyProductDetails: product.printifyProductDetails,
					customDesign: customDesign || null, // for POD design data
				};
				return { ...state, cart: [...state.cart, newItem] };
			}
		} else {
			// ================== For products WITHOUT variations ==================
			const tempItem = state.cart.find((i) => i.id === id);
			if (tempItem) {
				// increment if already in cart
				const tempCart = state.cart.map((cartItem) => {
					if (cartItem.id === id) {
						let newAmount = cartItem.amount + amount;
						if (newAmount > cartItem.max) {
							newAmount = cartItem.max;
						}
						return { ...cartItem, amount: newAmount };
					} else {
						return cartItem;
					}
				});
				return { ...state, cart: tempCart };
			} else {
				// brand new item (no local variants)
				let finalImage = product.thumbnailImage[0].images[0].url;
				let finalMax = product.quantity;

				// If isPrintify
				if (product.isPrintifyProduct) {
					const isPOD = product.printifyProductDetails?.POD === true;
					if (isPOD) {
						// e.g., use customDesign screenshot or fallback
						if (customDesign?.finalScreenshotUrl) {
							finalImage = customDesign.finalScreenshotUrl;
						} else {
							// fallback to product thumbnail
							finalImage = product?.thumbnailImage?.[0]?.images?.[0]?.url || "";
						}
						finalMax = 999;
					} else {
						// not POD => just do default thumbnail or logic you want
						finalImage = product?.thumbnailImage?.[0]?.images?.[0]?.url || "";
						finalMax = product.quantity;
					}
				}

				const newItem = {
					id,
					_id: product._id,
					name: product.productName,
					nameArabic: product.productName_Arabic,
					amount,
					image: finalImage,
					price: product.price,
					priceAfterDiscount: product.priceAfterDiscount,
					max: finalMax,
					loyaltyPoints: product.loyaltyPoints,
					slug: product.slug,
					categorySlug: product.category.categorySlug,
					categoryName: product.category.categoryName,
					categoryNameArabic: product.category.categoryName_Arabic,
					relatedProducts: product.relatedProducts,
					allProductDetailsIncluded: product,
					storeId: product.store,
					isPrintifyProduct: product.isPrintifyProduct,
					printifyProductDetails: product.printifyProductDetails,
					customDesign: customDesign || null,
				};
				return { ...state, cart: [...state.cart, newItem] };
			}
		}
	}
	// ===================== END ADD_TO_CART ======================

	if (action.type === REMOVE_CART_ITEM) {
		const { id, size, color } = action.payload;
		// Use optional chaining / fallback to empty
		const tempCart = state.cart.filter(
			(item) =>
				!(
					item.id === id &&
					(item.size?.toLowerCase() ?? "") +
						" " +
						(item.color?.toLowerCase() ?? "") ===
						(size?.toLowerCase() ?? "") + " " + (color?.toLowerCase() ?? "")
				)
		);
		return { ...state, cart: tempCart };
	}

	if (action.type === CLEAR_CART) {
		return { ...state, cart: [] };
	}

	if (action.type === TOGGLE_CART_ITEM_AMOUNT) {
		const { id, value, chosenAttribute, newMax } = action.payload;
		const tempCart = state.cart.map((item) => {
			if (item.id === id) {
				// if we have variations
				if (chosenAttribute) {
					if (chosenAttribute.SubSKU === item.chosenProductAttributes.SubSKU) {
						let newAmount = item.amount;
						if (value === "inc") {
							newAmount = Math.min(item.amount + 1, newMax);
						} else if (value === "dec") {
							newAmount = Math.max(item.amount - 1, 1);
						}
						return { ...item, amount: newAmount };
					}
				} else {
					// no variations
					let newAmount = item.amount;
					if (value === "inc") {
						newAmount = Math.min(item.amount + 1, item.max);
					} else if (value === "dec") {
						newAmount = Math.max(item.amount - 1, 1);
					}
					return { ...item, amount: newAmount };
				}
			}
			return item;
		});
		return { ...state, cart: tempCart };
	}

	if (action.type === COUNT_CART_TOTALS) {
		const { total_items, total_amount } = state.cart.reduce(
			(total, cartItem) => {
				const { amount, priceAfterDiscount } = cartItem;
				total.total_items += amount;
				total.total_amount += priceAfterDiscount * amount;
				return total;
			},
			{
				total_items: 0,
				total_amount: 0,
			}
		);
		return { ...state, total_items, total_amount };
	}

	if (action.type === SHIPPING_FEES) {
		const { ShippingPrice } = action.payload;
		return { ...state, shipping_fee: ShippingPrice };
	}

	if (action.type === SHIPPING_DETAILS) {
		const { chosenShipmentDetails } = action.payload;
		const shippingPrice = chosenShipmentDetails.shippingPrice || 0;
		const total_amount =
			state.cart.reduce(
				(sum, item) => sum + item.priceAfterDiscount * item.amount,
				0
			) + shippingPrice;
		return {
			...state,
			shipmentChosen: chosenShipmentDetails,
			total_amount,
		};
	}

	if (action.type === CHANGE_COLOR) {
		const { id, color, size, chosenColorImage, quantity, prevColor } =
			action.payload;
		const tempCart = state.cart.map((item) => {
			const chosenAttribute =
				item.allProductDetailsIncluded.productAttributes.filter(
					(i) => i.color === color && i.size === size
				)[0];
			if (item.id === id && item.size === size && item.color === prevColor) {
				return {
					...item,
					image: chosenColorImage ? chosenColorImage : item.image,
					max: quantity,
					color: color,
					chosenProductAttributes: chosenAttribute,
				};
			}
			return item;
		});
		return { ...state, cart: tempCart };
	}

	if (action.type === CHANGE_SIZE) {
		const { id, size, color, quantity, prevSize } = action.payload;
		const tempCart = state.cart.map((item) => {
			const chosenAttribute =
				item.allProductDetailsIncluded.productAttributes.filter(
					(i) => i.color === color && i.size === size
				)[0];
			if (item.id === id && item.color === color && item.size === prevSize) {
				return {
					...item,
					size: size,
					max: quantity,
					chosenProductAttributes: chosenAttribute,
				};
			}
			return item;
		});
		return { ...state, cart: tempCart };
	}

	// ==============================
	// New actions for single-fetch data
	// ==============================
	if (action.type === SET_LOADING) {
		return { ...state, loading: action.payload };
	}

	if (action.type === SET_WEBSITE_SETUP) {
		return { ...state, websiteSetup: action.payload };
	}

	if (action.type === SET_CATEGORIES_SUBCATEGORIES) {
		return {
			...state,
			categories: action.payload.categories,
			subcategories: action.payload.subcategories,
		};
	}

	if (action.type === SET_FEATURED_PRODUCTS) {
		return { ...state, featuredProducts: action.payload };
	}

	if (action.type === SET_NEW_ARRIVAL_PRODUCTS) {
		return { ...state, newArrivalProducts: action.payload };
	}

	if (action.type === SET_CUSTOM_DESIGN_PRODUCTS) {
		return { ...state, customDesignProducts: action.payload };
	}

	throw new Error(`No Matching "${action.type}" - action type`);
};

export default cart_reducer;
