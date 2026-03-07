/** @format */

import axios from "axios";
import { fetchJson } from "../utils/http";

/**Gender */
export const createGender = (userId, token, gender) => {
	return fetch(`${process.env.REACT_APP_API_URL}/gender/create/${userId}`, {
		method: "POST",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify(gender),
	})
		.then((response) => {
			return response.json();
		})
		.catch((err) => {
			console.log(err);
		});
};

export const updateGender2 = (genderId, userId, token, gender) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/gender/${genderId}/${userId}`,
		{
			method: "PUT",
			headers: {
				// content type?
				"Content-Type": "application/json",
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify(gender),
		}
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const removeGender = (genderId, userId, token) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/gender/${genderId}/${userId}`,
		{
			method: "DELETE",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
		}
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const getGenders = (token) => {
	return fetchJson("/genders", {
		method: "GET",
		headers: {
			"Content-Type": "application/json",
			Accept: "application/json",
			Authorization: `Bearer ${token}`,
		},
	});
};
/**End Gender */

/**
 * Category
 * */

export const createParent = (userId, token, parent) => {
	return fetch(`${process.env.REACT_APP_API_URL}/parent/create/${userId}`, {
		method: "POST",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify(parent),
	})
		.then((response) => {
			return response.json();
		})
		.catch((err) => {
			console.log(err);
		});
};

export const updateParent = (parentId, userId, token, parent) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/parent/${parentId}/${userId}`,
		{
			method: "PUT",
			headers: {
				// content type?
				"Content-Type": "application/json",
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify(parent),
		}
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const removeParent = (parentId, userId, token) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/parent/${parentId}/${userId}`,
		{
			method: "DELETE",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
		}
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const getParents = (token) => {
	return fetch(`${process.env.REACT_APP_API_URL}/parents`, {
		method: "GET",
		headers: {
			// content type?
			"Content-Type": "application/json",
			Accept: "application/json",
			Authorization: `Bearer ${token}`,
		},
	})
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

/**
 * Category
 * */

export const createCategory = (userId, token, category) => {
	return fetch(`${process.env.REACT_APP_API_URL}/category/create/${userId}`, {
		method: "POST",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify(category),
	})
		.then((response) => {
			return response.json();
		})
		.catch((err) => {
			console.log(err);
		});
};

export const updateCategory = (categoryId, userId, token, category) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/category/${categoryId}/${userId}`,
		{
			method: "PUT",
			headers: {
				// content type?
				"Content-Type": "application/json",
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify(category),
		}
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const removeCategory = (categoryId, userId, token) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/category/${categoryId}/${userId}`,
		{
			method: "DELETE",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
		}
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const getCategories = (token) => {
	return fetchJson("/categories", {
		method: "GET",
		headers: {
			"Content-Type": "application/json",
			Accept: "application/json",
			Authorization: `Bearer ${token}`,
		},
	});
};

/**End Category */

/**Start Subcategories */
export const getSubCategories = (token) => {
	return fetchJson("/subcategories", {
		method: "GET",
		headers: {
			"Content-Type": "application/json",
			Accept: "application/json",
			Authorization: `Bearer ${token}`,
		},
	});
};

export const createSubcategory = (userId, token, subcategory) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/subcategory/create/${userId}`,
		{
			method: "POST",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify(subcategory),
		}
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => {
			console.log(err);
		});
};

export const updateSubcategory = (
	subcategoryId,
	userId,
	token,
	subcategory
) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/subcategory/${subcategoryId}/${userId}`,
		{
			method: "PUT",
			headers: {
				// content type?
				"Content-Type": "application/json",
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify(subcategory),
		}
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const removeSubcategory = (subcategoryId, userId, token) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/subcategory/${subcategoryId}/${userId}`,
		{
			method: "DELETE",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
		}
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const getListOfSubs = (_id) => {
	return fetch(`${process.env.REACT_APP_API_URL}/category/subs/${_id}`, {
		method: "GET",
		headers: {
			// content type?
			"Content-Type": "application/json",
			Accept: "application/json",
		},
	})
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

/**End Subcategory */

export const cloudinaryUpload1 = (userId, token, image) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/admin/uploadimages/${userId}`,
		{
			method: "POST",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify(image),
			// body: image,
		}
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => {
			console.log(err);
		});
};

/**Start Product */

export const createProduct = (userId, token, product) => {
	return fetch(`${process.env.REACT_APP_API_URL}/product/create/${userId}`, {
		method: "POST",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify(product),
	})
		.then((response) => {
			return response.json();
		})
		.catch((err) => {
			console.log(err);
		});
};

export const getProducts = () => {
	return fetchJson("/products", {
		method: "GET",
	});
};

export const updateProduct = (productId, userId, token, product) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/product/${productId}/${userId}`,
		{
			method: "PUT",
			headers: {
				// content type?
				"Content-Type": "application/json",
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify(product),
		}
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const removeProduct = (productId, userId, token) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/product/${productId}/${userId}`,
		{
			method: "DELETE",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
		}
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

/**End Of Product */

export const getVendors = () => {
	return fetch(`${process.env.REACT_APP_API_URL}/vendors`, {
		method: "GET",
	})
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

/**Orders Management */

export const createOrder = (userId, token, createOrderData) => {
	return fetch(`${process.env.REACT_APP_API_URL}/order/create/${userId}`, {
		method: "POST",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify({ order: createOrderData }),
	})
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const listOrders = (userId, token) => {
	return fetch(`${process.env.REACT_APP_API_URL}/order/list/${userId}`, {
		method: "GET",
		headers: {
			Accept: "application/json",
			Authorization: `Bearer ${token}`,
		},
	})
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const ordersLength = (userId, token) => {
	return fetch(`${process.env.REACT_APP_API_URL}/order/length/${userId}`, {
		method: "GET",
		headers: {
			Accept: "application/json",
			Authorization: `Bearer ${token}`,
		},
	})
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const ordersLengthAce = (userId, token) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/order/length/offline-store/${userId}`,
		{
			method: "GET",
			headers: {
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
			},
		}
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const listOrdersDates = (userId, token, day1, day2) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/order/list/dates/${day1}/${day2}/${userId}`,
		{
			method: "GET",
			headers: {
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
			},
			// body: JSON.stringify(today),
		}
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const listOrdersProcessing = (userId, token) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/order/list/order-processing/${userId}`,
		{
			method: "GET",
			headers: {
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
			},
		}
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const listOrdersReturn = (userId, token) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/order/list/order-return/${userId}`,
		{
			method: "GET",
			headers: {
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
			},
		}
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const listOrdersExchange = (userId, token) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/order/list/order-exchange/${userId}`,
		{
			method: "GET",
			headers: {
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
			},
		}
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const listOrdersProcessingDetermined = (userId, token, day1, day2) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/order/list/order-processing/${day1}/${day2}/${userId}`,
		{
			method: "GET",
			headers: {
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
			},
		}
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const listOrdersProcessed = (userId, token) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/order/list/order-processed/${userId}`,
		{
			method: "GET",
			headers: {
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
			},
		}
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const readSingleOrder = (userId, token, orderId) => {
	return fetch(`${process.env.REACT_APP_API_URL}/order/${orderId}/${userId}`, {
		method: "GET",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
		},
	})
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const readSingleOrderByInvoice = (userId, token, invoice) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/order/byinvoice/${invoice}/${userId}`,
		{
			method: "GET",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
		}
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const readSingleOrderByPhoneNumber = (userId, token, phoneNumber) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/order/byphone/${phoneNumber}/${userId}`,
		{
			method: "GET",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
		}
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const updateOrder = (orderId, userId, token, order) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/update/order/${orderId}/${userId}`,
		{
			method: "PUT",
			headers: {
				// content type?
				"Content-Type": "application/json",
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({ order: order }),
		}
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const updateOrderNoDecrease = (orderId, userId, token, order) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/update/order/nodecrease/${orderId}/${userId}`,
		{
			method: "PUT",
			headers: {
				// content type?
				"Content-Type": "application/json",
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({ order: order }),
		}
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const updateOrderExchange = (orderId, userId, token, order) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/update/order-exchange/${orderId}/${userId}`,
		{
			method: "PUT",
			headers: {
				// content type?
				"Content-Type": "application/json",
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({ order: order }),
		}
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const updateOrderExchangeOfflineStore = (
	orderId,
	userId,
	token,
	order
) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/update/order-exchange-offline-store/${orderId}/${userId}`,
		{
			method: "PUT",
			headers: {
				// content type?
				"Content-Type": "application/json",
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({ order: order }),
		}
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const updateOrderExchangeAndReturn = (orderId, userId, token, order) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/update/order-exchange-return/${orderId}/${userId}`,
		{
			method: "PUT",
			headers: {
				// content type?
				"Content-Type": "application/json",
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({ order: order }),
		}
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const updateOrderExchangeRevert = (orderId, userId, token, order) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/revert/order-exchange-revert/${orderId}/${userId}`,
		{
			method: "PUT",
			headers: {
				// content type?
				"Content-Type": "application/json",
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({ order: order }),
		}
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const listOfOrdersFiltered = (userId, token, limit) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/order/get-limited/orders/${userId}`,
		{
			method: "POST",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({ limit: limit }),
		}
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const createOrderOfflineStore = (userId, token, createOrderData) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/order/create-offline-store/${userId}`,
		{
			method: "POST",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({ order: createOrderData }),
		}
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

/**End Of Orders Management*/

export const createShippingOptions = (userId, token, shippingOptions) => {
	return fetch(`${process.env.REACT_APP_API_URL}/shipping/create/${userId}`, {
		method: "POST",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify(shippingOptions),
	})
		.then((response) => {
			return response.json();
		})
		.catch((err) => {
			console.log(err);
		});
};

export const updateShippingOptions = (
	shippingId,
	userId,
	token,
	shippingOptions
) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/shipping/${shippingId}/${userId}`,
		{
			method: "PUT",
			headers: {
				// content type?
				"Content-Type": "application/json",
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify(shippingOptions),
		}
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const getShippingOptions = (token) => {
	return fetch(`${process.env.REACT_APP_API_URL}/shipping-options`, {
		method: "GET",
		headers: {
			// content type?
			"Content-Type": "application/json",
			Accept: "application/json",
			Authorization: `Bearer ${token}`,
		},
	})
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const getAllUsers = (userId, token) => {
	return fetch(`${process.env.REACT_APP_API_URL}/allusers/${userId}`, {
		method: "GET",
		headers: {
			// content type?
			"Content-Type": "application/json",
			Accept: "application/json",
			Authorization: `Bearer ${token}`,
		},
	})
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const updateUserByAdmin = (updatedUserId, userId, token, user) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/user/${updatedUserId}/${userId}`,
		{
			method: "PUT",
			headers: {
				// content type?
				"Content-Type": "application/json",
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({ updatedUserByAdmin: user }),
		}
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const removeOrder = (orderId, userId, token) => {
	return fetch(`${process.env.REACT_APP_API_URL}/order/${orderId}/${userId}`, {
		method: "DELETE",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
		},
	})
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const updateOrderInvoice = (userId, token, orderId, invoiceNumber) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/order/${orderId}/invoice/${userId}`,
		{
			method: "PUT",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({ invoiceNumber, orderId }),
		}
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const updateOrderInvoiceStock = (
	userId,
	token,
	orderId,
	order,
	invoiceNumber,
	onholdStatus
) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/order/${orderId}/invoice/stock/${userId}`,
		{
			method: "PUT",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({ invoiceNumber, orderId, order, onholdStatus }),
		}
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

/**
 * Attributes Management
 * */

export const createColor = (userId, token, color) => {
	return fetch(`${process.env.REACT_APP_API_URL}/color/create/${userId}`, {
		method: "POST",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify(color),
	})
		.then((response) => {
			return response.json();
		})
		.catch((err) => {
			console.log(err);
		});
};

export const createSize = (userId, token, size) => {
	return fetch(`${process.env.REACT_APP_API_URL}/size/create/${userId}`, {
		method: "POST",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify(size),
	})
		.then((response) => {
			return response.json();
		})
		.catch((err) => {
			console.log(err);
		});
};

export const getColors = (token) => {
	return fetchJson("/colors", {
		method: "GET",
		headers: {
			"Content-Type": "application/json",
			Accept: "application/json",
			Authorization: `Bearer ${token}`,
		},
	});
};

export const getSizes = (token) => {
	return fetchJson("/sizes", {
		method: "GET",
		headers: {
			"Content-Type": "application/json",
			Accept: "application/json",
			Authorization: `Bearer ${token}`,
		},
	});
};

/**End Attributes Management */

/**
 * Store Management
 * */

export const createStore = (userId, token, store) => {
	return fetch(`${process.env.REACT_APP_API_URL}/store/create/${userId}`, {
		method: "POST",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify(store),
	})
		.then((response) => {
			return response.json();
		})
		.catch((err) => {
			console.log(err);
		});
};

export const updateStore = (storeId, userId, token, store) => {
	return fetch(`${process.env.REACT_APP_API_URL}/store/${storeId}/${userId}`, {
		method: "PUT",
		headers: {
			// content type?
			"Content-Type": "application/json",
			Accept: "application/json",
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify(store),
	})
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const removeStore = (storeId, userId, token) => {
	return fetch(`${process.env.REACT_APP_API_URL}/store/${storeId}/${userId}`, {
		method: "DELETE",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
		},
	})
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const getStores = (token) => {
	return fetch(`${process.env.REACT_APP_API_URL}/stores`, {
		method: "GET",
		headers: {
			// content type?
			"Content-Type": "application/json",
			Accept: "application/json",
			Authorization: `Bearer ${token}`,
		},
	})
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

/**End Store Management */

// Loyalty Points

export const allLoyaltyPointsAndStoreStatus = (token) => {
	return fetch(`${process.env.REACT_APP_API_URL}/store-management`, {
		method: "GET",
		headers: {
			// content type?
			"Content-Type": "application/json",
			Accept: "application/json",
			Authorization: `Bearer ${token}`,
		},
	})
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const LoyaltyPointsAndStoreStatus = (userId, token, StoreManagement) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/store-management/create/${userId}`,
		{
			method: "POST",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify(StoreManagement),
		}
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => {
			console.log(err);
		});
};

// End Of Loyalty Points

// Ads Management
export const createAds = (userId, token, ads) => {
	return fetch(`${process.env.REACT_APP_API_URL}/ads/create/${userId}`, {
		method: "POST",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify(ads),
	})
		.then((response) => {
			return response.json();
		})
		.catch((err) => {
			console.log(err);
		});
};

export const updateAds = (addsId, userId, token, ads) => {
	return fetch(`${process.env.REACT_APP_API_URL}/ads/${addsId}/${userId}`, {
		method: "PUT",
		headers: {
			// content type?
			"Content-Type": "application/json",
			Accept: "application/json",
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify(ads),
	})
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const getAllAds = (token) => {
	return fetch(`${process.env.REACT_APP_API_URL}/all-adds`, {
		method: "GET",
		headers: {
			// content type?
			"Content-Type": "application/json",
			Accept: "application/json",
			Authorization: `Bearer ${token}`,
		},
	})
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

// End of Ads Management

// Hero Comp Management
export const createHero = (userId, token, hero) => {
	return fetch(`${process.env.REACT_APP_API_URL}/hero/create/${userId}`, {
		method: "POST",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify(hero),
	})
		.then((response) => {
			return response.json();
		})
		.catch((err) => {
			console.log(err);
		});
};

export const updateHero = (addsId, userId, token, hero) => {
	return fetch(`${process.env.REACT_APP_API_URL}/hero/${addsId}/${userId}`, {
		method: "PUT",
		headers: {
			// content type?
			"Content-Type": "application/json",
			Accept: "application/json",
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify(hero),
	})
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const getAllHeros = (token) => {
	return fetch(`${process.env.REACT_APP_API_URL}/heroes`, {
		method: "GET",
		headers: {
			// content type?
			"Content-Type": "application/json",
			Accept: "application/json",
			Authorization: `Bearer ${token}`,
		},
	})
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

// End of Ads Management

export const getCoupons = async () =>
	await axios.get(`${process.env.REACT_APP_API_URL}/coupons`);

export const createCoupon = (userId, token, name, expiry, discount) => {
	return fetch(`${process.env.REACT_APP_API_URL}/coupon/create/${userId}`, {
		method: "POST",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify(name, expiry, discount),
	})
		.then((response) => {
			return response.json();
		})
		.catch((err) => {
			console.log(err);
		});
};

export const removeCoupon = (couponId, userId, token) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/coupon/${couponId}/${userId}`,
		{
			method: "DELETE",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
		}
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const JanatWebsitePrivacy = (
	documentId,
	JanatWebsite,
	userId,
	token
) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/serene-jannat-website/${documentId}/${userId}`,
		{
			method: "POST",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify(JanatWebsite),
			// body: image,
		}
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => {
			console.log(err);
		});
};

export const getJanatWebsiteRecord = () => {
	return fetch(`${process.env.REACT_APP_API_URL}/janat-website-document`, {
		method: "GET",
	})
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const aceOrders = (userId, token, day1, day2) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/ace/orderslist/dates/${day1}/${day2}/${userId}`,
		{
			method: "GET",
			headers: {
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
			},
			// body: JSON.stringify(today),
		}
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const listOrdersAce = (userId, token) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/order/list/order-processing/offline-store/${userId}`,
		{
			method: "GET",
			headers: {
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
			},
		}
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const createContact = (userId, token, contact) => {
	return fetch(`${process.env.REACT_APP_API_URL}/contact/create/${userId}`, {
		method: "POST",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify(contact),
	})
		.then((response) => {
			return response.json();
		})
		.catch((err) => {
			console.log(err);
		});
};

export const updateContact = (contactId, userId, token, contact) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/contact/${contactId}/${userId}`,
		{
			method: "PUT",
			headers: {
				// content type?
				"Content-Type": "application/json",
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify(contact),
		}
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const getContacts = (token) => {
	return fetch(`${process.env.REACT_APP_API_URL}/contact`, {
		method: "GET",
		headers: {
			// content type?
			"Content-Type": "application/json",
			Accept: "application/json",
			Authorization: `Bearer ${token}`,
		},
	})
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const createAbout = (userId, token, about) => {
	return fetch(`${process.env.REACT_APP_API_URL}/about/create/${userId}`, {
		method: "POST",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify(about),
	})
		.then((response) => {
			return response.json();
		})
		.catch((err) => {
			console.log(err);
		});
};

export const updateAbout = (aboutId, userId, token, about) => {
	return fetch(`${process.env.REACT_APP_API_URL}/about/${aboutId}/${userId}`, {
		method: "PUT",
		headers: {
			// content type?
			"Content-Type": "application/json",
			Accept: "application/json",
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify(about),
	})
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const getAbouts = (token) => {
	return fetch(`${process.env.REACT_APP_API_URL}/about`, {
		method: "GET",
		headers: {
			// content type?
			"Content-Type": "application/json",
			Accept: "application/json",
			Authorization: `Bearer ${token}`,
		},
	})
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const receiveNew = (userId, token, receiving) => {
	return fetch(`${process.env.REACT_APP_API_URL}/receiving/create/${userId}`, {
		method: "POST",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify(receiving),
	})
		.then((response) => {
			return response.json();
		})
		.catch((err) => {
			console.log(err);
		});
};

export const getReceivingLogs = (token) => {
	return fetch(`${process.env.REACT_APP_API_URL}/receivings`, {
		method: "GET",
		headers: {
			// content type?
			"Content-Type": "application/json",
			Accept: "application/json",
			Authorization: `Bearer ${token}`,
		},
	})
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const createHomePage = (userId, token, home) => {
	return fetch(`${process.env.REACT_APP_API_URL}/hero/create/${userId}`, {
		method: "POST",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify(home),
	})
		.then((response) => {
			return response.json();
		})
		.catch((err) => {
			console.log(err);
		});
};

export const updateHomePage = (homeId, userId, token, home) => {
	return fetch(`${process.env.REACT_APP_API_URL}/hero/${homeId}/${userId}`, {
		method: "PUT",
		headers: {
			// content type?
			"Content-Type": "application/json",
			Accept: "application/json",
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify(home),
	})
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const getHomes = (token) => {
	return fetch(`${process.env.REACT_APP_API_URL}/heroes`, {
		method: "GET",
		headers: {
			// content type?
			"Content-Type": "application/json",
			Accept: "application/json",
			Authorization: `Bearer ${token}`,
		},
	})
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const createInfo = (userId, token, info) => {
	return fetch(`${process.env.REACT_APP_API_URL}/info/create/${userId}`, {
		method: "POST",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify(info),
	})
		.then((response) => {
			return response.json();
		})
		.catch((err) => {
			console.log(err);
		});
};

export const updateInfo = (infoId, userId, token, info) => {
	return fetch(`${process.env.REACT_APP_API_URL}/info/${infoId}/${userId}`, {
		method: "PUT",
		headers: {
			// content type?
			"Content-Type": "application/json",
			Accept: "application/json",
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify(info),
	})
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const getInfo = (token) => {
	return fetch(`${process.env.REACT_APP_API_URL}/info`, {
		method: "GET",
		headers: {
			// content type?
			"Content-Type": "application/json",
			Accept: "application/json",
			Authorization: `Bearer ${token}`,
		},
	})
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const getListOfOrders = (
	token,
	page,
	records,
	startDate,
	endDate,
	status,
	userId
) => {
	console.log("Hello From Orders");
	return fetch(
		`${process.env.REACT_APP_API_URL}/list-of-orders/${page}/${records}/${startDate}/${endDate}/${status}/${userId}`,
		{
			method: "GET",
			headers: {
				// content type?
				"Content-Type": "application/json",
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
			},
		}
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const getListOfOrdersAggregated = (
	token,
	page,
	records,
	startDate, // "YYYY-MM-DD" _or_ "all"
	endDate, // "YYYY-MM-DD" _or_ "all"
	status,
	userId // "all" when admin needs every user
) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/list-of-orders-aggregated/` +
			`${page}/${records}/${startDate}/${endDate}/${status}/${userId}`,
		{
			method: "GET",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
		}
	)
		.then((r) => r.json())
		.catch(console.error);
};

export const updatingAnOrder = (
	orderId,
	userId,
	token,
	order,
	updateType,
	productData
) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/single-order/${orderId}/${userId}`,
		{
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify(order, updateType, productData),
		}
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const updatingAnOrder2 = (
	orderId,
	userId,
	token,
	updateType,
	updateData // This can be { trackingNumber }, { status }, { customerDetails }, etc.
) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/single-order/${orderId}/${userId}`,
		{
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({ ...updateData, updateType }),
		}
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const getSearchOrder = (token, orderquery, userId) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/search-for-order/${orderquery}/${userId}`,
		{
			method: "GET",
			headers: {
				// content type?
				"Content-Type": "application/json",
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
			},
		}
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const createNewSupportCase = async (data) => {
	return fetch(`${process.env.REACT_APP_API_URL}/support-cases/new`, {
		method: "POST",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json",
		},
		body: JSON.stringify(data),
	})
		.then((response) => {
			if (!response.ok) {
				throw new Error("Network response was not ok " + response.statusText);
			}
			return response.json();
		})
		.catch((err) => {
			console.error("API error: ", err);
		});
};

export const getSupportCases = (status, token) => {
	const url = `${process.env.REACT_APP_API_URL}/support-cases?status=${status}`;
	return fetch(url, {
		method: "GET",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
		},
	})
		.then((response) => response.json())
		.catch((err) => console.log(err));
};

export const getUnassignedSupportCases = (token) => {
	return fetch(`${process.env.REACT_APP_API_URL}/support-cases?status=open`, {
		method: "GET",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
		},
	})
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const getSupportCaseById = (caseId, token) => {
	return fetch(`${process.env.REACT_APP_API_URL}/support-cases/${caseId}`, {
		method: "GET",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
		},
	})
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const updateSupportCase = (caseId, data, token) => {
	return fetch(`${process.env.REACT_APP_API_URL}/support-cases/${caseId}`, {
		method: "PUT",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify(data),
	})
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const getUnassignedSupportCasesCount = (token) => {
	return fetchJson("/support-cases/unassigned/count", {
		method: "GET",
		headers: {
			Authorization: `Bearer ${token}`,
		},
	});
};

export const updateSeenByAdmin = (caseId, token) => {
	const admin = JSON.parse(localStorage.getItem("jwt"))?.user;
	const userId = admin?._id || "";

	return fetch(
		`${process.env.REACT_APP_API_URL}/support-cases/${caseId}/seen-by-admin`,
		{
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({ userId }),
		}
	)
		.then((res) => res.json())
		.catch((err) => {
			console.error("Error updating messages as seen by admin:", err);
		});
};

export const getUnseenMessagesCountByAdmin = (token) => {
	// We need the admin's userId. If you pass it from the frontend:
	const admin = JSON.parse(localStorage.getItem("jwt"))?.user;
	const userId = admin?._id || "";

	return fetchJson(`/support-cases/unseen/count?userId=${userId}`, {
		method: "GET",
		headers: {
			Authorization: `Bearer ${token}`,
		},
	});
};

export const getUnseenMessagesDetails = (token) => {
	return fetchJson("/support-cases/admin/unseen/list", {
		method: "GET",
		headers: {
			Authorization: `Bearer ${token}`,
		},
	});
};

export const getUnseenMessagesDetailsByCustomer = async (token) => {
	try {
		return await fetchJson("/support-cases-customer/unseen/details", {
			method: "GET",
			headers: {
				Authorization: `Bearer ${token}`,
			},
		});
	} catch (error) {
		console.error("Error fetching unseen messages count", error);
		throw error;
	}
};

export const getUnseenMessagesCountByCustomer = async (caseId) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/support-cases-customer/${caseId}/unseen-count`,
		{
			method: "GET",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
			},
		}
	)
		.then((response) => response.json())
		.catch((err) => {
			console.error("API error: ", err);
		});
};

export const updateSeenByCustomer = async (caseId) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/support-cases-customer/${caseId}/seen`,
		{
			method: "PUT",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
			},
		}
	)
		.then((response) => response.json())
		.catch((err) => {
			console.error("API error: ", err);
		});
};

export const createOrderPOS = (
	token,
	createOrderData,
	paymentToken,
	userId
) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/pos-order/creation/${userId}`,
		{
			method: "POST",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({ orderData: createOrderData, paymentToken }),
		}
	)
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const gettingPrintifyProducts = () => {
	return fetch(`${process.env.REACT_APP_API_URL}/add-printify-products`, {
		method: "POST",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json",
			// Authorization: `Bearer ${token}`,
		},
	})
		.then((response) => {
			return response.json();
		})
		.catch((err) => console.log(err));
};

export const getWebsiteSetup = (userId, token) => {
	return fetch(`${process.env.REACT_APP_API_URL}/website-basic-setup`, {
		method: "GET",
		headers: {
			Accept: "application/json",
			Authorization: `Bearer ${token}`,
		},
	})
		.then((res) => {
			if (!res.ok) {
				// If 404, doc not found
				throw new Error(`HTTP error! Status: ${res.status}`);
			}
			return res.json();
		})
		.catch((err) => console.error("Error getting single setup:", err));
};

export const updateWebsiteSetup = (userId, token, updateData) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/website-basic-setup/${userId}`,
		{
			method: "PUT",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify(updateData),
		}
	)
		.then((res) => {
			if (!res.ok) {
				throw new Error(`HTTP error! Status: ${res.status}`);
			}
			return res.json();
		})
		.catch((err) => console.error("Error updating single setup:", err));
};

//Support Cases
export const adminGetActiveB2CChats = (userId, token) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/admin/support-cases/b2c/open/${userId}`,
		{
			method: "GET",
			headers: {
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
			},
		}
	)
		.then((res) => {
			if (!res.ok) {
				throw new Error(`HTTP error! Status: ${res.status}`);
			}
			return res.json();
		})
		.catch((err) => {
			console.error("Error fetching admin active B2C chats:", err);
		});
};

/**
 * 2) Get closed B2C (client ↔ admin) cases
 *    GET /admin/support-cases/b2c/closed/:userId
 */
export const adminGetClosedB2CChats = (userId, token) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/admin/support-cases/b2c/closed/${userId}`,
		{
			method: "GET",
			headers: {
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
			},
		}
	)
		.then((res) => {
			if (!res.ok) {
				throw new Error(`HTTP error! Status: ${res.status}`);
			}
			return res.json();
		})
		.catch((err) => {
			console.error("Error fetching admin closed B2C chats:", err);
		});
};

/**
 * 3) Get active B2B (agent ↔ admin) cases
 *    GET /admin/support-cases/b2b/open/:userId
 */
export const adminGetActiveB2BChats = (userId, token) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/admin/support-cases/b2b/open/${userId}`,
		{
			method: "GET",
			headers: {
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
			},
		}
	)
		.then((res) => {
			if (!res.ok) {
				throw new Error(`HTTP error! Status: ${res.status}`);
			}
			return res.json();
		})
		.catch((err) => {
			console.error("Error fetching admin active B2B chats:", err);
		});
};

/**
 * 4) Get closed B2B (agent ↔ admin) cases
 *    GET /admin/support-cases/b2b/closed/:userId
 */
export const adminGetClosedB2BChats = (userId, token) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/admin/support-cases/b2b/closed/${userId}`,
		{
			method: "GET",
			headers: {
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
			},
		}
	)
		.then((res) => {
			if (!res.ok) {
				throw new Error(`HTTP error! Status: ${res.status}`);
			}
			return res.json();
		})
		.catch((err) => {
			console.error("Error fetching admin closed B2B chats:", err);
		});
};

/**
 * 5) Create a new support case (B2C or B2B) as Admin
 *    POST /support-cases/new
 *
 *    - If you want to create a new B2B (admin↔agent), you'd set role=1000 in the body
 *    - If you want to create a new B2C (admin↔client), also possible but typically a client starts it.
 */
export const adminCreateSupportCase = (token, supportData) => {
	return fetch(`${process.env.REACT_APP_API_URL}/support-cases/new`, {
		method: "POST",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify(supportData),
	})
		.then((res) => {
			if (!res.ok) {
				throw new Error(`HTTP error! Status: ${res.status}`);
			}
			return res.json();
		})
		.catch((err) => {
			console.error("Error creating new admin support case:", err);
		});
};

/**
 * 6) Get a specific support case by ID (admin can see everything)
 *    GET /support-cases/:id
 */
export const adminGetSupportCaseById = (caseId, token) => {
	return fetch(`${process.env.REACT_APP_API_URL}/support-cases/${caseId}`, {
		method: "GET",
		headers: {
			Accept: "application/json",
			Authorization: `Bearer ${token}`,
		},
	})
		.then((res) => {
			if (!res.ok) {
				throw new Error(`HTTP error! Status: ${res.status}`);
			}
			return res.json();
		})
		.catch((err) => {
			console.error("Error fetching support case by ID (admin):", err);
		});
};

/**
 * 7) Update an existing support case (e.g., add a message, close it, etc.)
 *    PUT /support-cases/:id
 *
 *    "updateData" example: { conversation: {...} } or { caseStatus: "closed" }
 */
export const adminUpdateSupportCase = (caseId, token, updateData) => {
	return fetch(`${process.env.REACT_APP_API_URL}/support-cases/${caseId}`, {
		method: "PUT",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify(updateData),
	})
		.then((res) => {
			if (!res.ok) {
				throw new Error(`HTTP error! Status: ${res.status}`);
			}
			return res.json();
		})
		.catch((err) => {
			console.error("Error updating support case (admin):", err);
		});
};

/**
 * 8) Mark all messages as seen by Admin in a specific case
 *    PUT /support-cases/:id/seen-by-admin
 *
 *    Pass userId in the body if your controller requires it (some do).
 */
export const adminMarkAllMessagesAsSeen = (caseId, token, userId) => {
	return fetch(`${process.env.REACT_APP_API_URL}/mark-all-cases-as-seen`, {
		method: "PUT",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`,
		},
		body: JSON.stringify({ userId }),
	})
		.then((res) => {
			if (!res.ok) {
				throw new Error(`HTTP error! Status: ${res.status}`);
			}
			return res.json();
		})
		.catch((err) => {
			console.error("Error marking messages as seen by admin:", err);
		});
};

/**
 * 9) Delete a specific message from a conversation in a support case
 *    DELETE /support-cases/:caseId/messages/:messageId
 */
export const adminDeleteMessageFromConversation = (
	caseId,
	messageId,
	token
) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/support-cases/${caseId}/messages/${messageId}`,
		{
			method: "DELETE",
			headers: {
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
			},
		}
	)
		.then((res) => {
			if (!res.ok) {
				throw new Error(`HTTP error! Status: ${res.status}`);
			}
			return res.json();
		})
		.catch((err) => {
			console.error("Error deleting message (admin):", err);
		});
};

/**
 * 10) (Optional) Get unseen messages count by Admin
 *     GET /support-cases/unseen/count?userId=xxx
 *     If you want an integer count of how many new messages are waiting for the admin.
 */
export const adminGetUnseenMessagesCount = (token, userId) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/support-cases/unseen/count?userId=${userId}`,
		{
			method: "GET",
			headers: {
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
			},
		}
	)
		.then((res) => {
			if (!res.ok) {
				throw new Error(`HTTP error! Status: ${res.status}`);
			}
			return res.json(); // returns { count: number }
		})
		.catch((err) => {
			console.error("Error fetching unseen messages count (admin):", err);
		});
};

//Store Management
export const getStoreManagement = (userId, token) => {
	return axios
		.get(`${process.env.REACT_APP_API_URL}/store-management/${userId}`, {
			headers: {
				Authorization: `Bearer ${token}`,
			},
		})
		.then((res) => res.data)
		.catch((err) => {
			return { error: err.response?.data?.error || "Something went wrong." };
		});
};

export const updateStoreManagement = (userId, token, storeData) => {
	return axios
		.put(
			`${process.env.REACT_APP_API_URL}/store-management/${userId}`,
			storeData,
			{
				headers: {
					Authorization: `Bearer ${token}`,
				},
			}
		)
		.then((res) => res.data)
		.catch((err) => {
			return { error: err.response?.data?.error || "Update failed." };
		});
};

export const createStoreManagement = (userId, token, storeData) => {
	return axios
		.post(
			`${process.env.REACT_APP_API_URL}/store-management/${userId}`,
			storeData,
			{
				headers: {
					Authorization: `Bearer ${token}`,
				},
			}
		)
		.then((res) => res.data)
		.catch((err) => {
			return { error: err.response?.data?.error || "Creation failed." };
		});
};

export const deleteStoreManagement = (userId, token) => {
	return axios
		.delete(`${process.env.REACT_APP_API_URL}/store-management/${userId}`, {
			headers: {
				Authorization: `Bearer ${token}`,
			},
		})
		.then((res) => res.data)
		.catch((err) => {
			return { error: err.response?.data?.error || "Delete failed." };
		});
};

/**
 * 1) GET all shipping options
 *    (then filter on the front-end by storeId if you wish)
 */
export const listShippingOptions = () => {
	return axios
		.get(`${process.env.REACT_APP_API_URL}/shipping-options`)
		.then((res) => res.data)
		.catch((err) => {
			return { error: err.response?.data?.error || "Something went wrong." };
		});
};

/**
 * 2) CREATE a shipping option
 *    /shipping/create/:userId  (POST)
 */
export const createShippingOption = (userId, token, shippingData) => {
	return axios
		.post(
			`${process.env.REACT_APP_API_URL}/shipping/create/${userId}`,
			shippingData,
			{
				headers: {
					Authorization: `Bearer ${token}`,
				},
			}
		)
		.then((res) => res.data)
		.catch((err) => {
			return { error: err.response?.data?.error || "Create failed." };
		});
};

/**
 * 3) UPDATE a shipping option
 *    /shipping/:shippingId/:userId  (PUT)
 */
export const updateShippingOption = (
	shippingId,
	userId,
	token,
	shippingData
) => {
	return axios
		.put(
			`${process.env.REACT_APP_API_URL}/shipping/${shippingId}/${userId}`,
			shippingData,
			{
				headers: {
					Authorization: `Bearer ${token}`,
				},
			}
		)
		.then((res) => res.data)
		.catch((err) => {
			return { error: err.response?.data?.error || "Update failed." };
		});
};

/**
 * 4) DELETE a shipping option
 *    /shipping/:shippingId/:userId  (DELETE) -- if you add it in your backend
 */
export const removeShippingOption = (shippingId, userId, token) => {
	return axios
		.delete(
			`${process.env.REACT_APP_API_URL}/shipping/${shippingId}/${userId}`,
			{
				headers: {
					Authorization: `Bearer ${token}`,
				},
			}
		)
		.then((res) => res.data)
		.catch((err) => {
			return { error: err.response?.data?.error || "Delete failed." };
		});
};

export const listCoupons = () => {
	return axios
		.get(`${process.env.REACT_APP_API_URL}/coupons`)
		.then((res) => res.data)
		.catch((err) => {
			return { error: err.response?.data?.error || "Something went wrong." };
		});
};

/** ================= AI MARKETING CAMPAIGNS ================= **/

export const createAiCampaign = (userId, token, campaign) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/ai/campaign/create/${userId}`,
		{
			method: "POST",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify(campaign),
		}
	)
		.then((response) => response.json())
		.catch((err) => {
			console.log(err);
		});
};

export const getAiCampaigns = (userId, token) => {
	return fetch(`${process.env.REACT_APP_API_URL}/ai/campaigns/${userId}`, {
		method: "GET",
		headers: {
			Accept: "application/json",
			Authorization: `Bearer ${token}`,
		},
	})
		.then((response) => response.json())
		.catch((err) => {
			console.log(err);
		});
};

export const getAiCampaign = (campaignId, token) => {
	return fetch(`${process.env.REACT_APP_API_URL}/ai/campaign/${campaignId}`, {
		method: "GET",
		headers: {
			Accept: "application/json",
			Authorization: `Bearer ${token}`,
		},
	})
		.then((response) => response.json())
		.catch((err) => {
			console.log(err);
		});
};

export const runAiCampaignAudit = (campaignId, userId, token) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/ai/campaign/${campaignId}/audit/${userId}`,
		{
			method: "PUT",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
		}
	)
		.then((response) => response.json())
		.catch((err) => {
			console.log(err);
		});
};

export const refreshAiCampaignAnalytics = (campaignId, userId, token) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/ai/campaign/${campaignId}/analytics/refresh/${userId}`,
		{
			method: "GET",
			headers: {
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
			},
		}
	)
		.then((response) => response.json())
		.catch((err) => {
			console.log(err);
		});
};

export const updateAiCampaignStatus = (campaignId, userId, token, status) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/ai/campaign/${campaignId}/status/${userId}`,
		{
			method: "PATCH",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({ status }),
		}
	)
		.then((response) => response.json())
		.catch((err) => {
			console.log(err);
		});
};

// Optional: trigger cron endpoint manually from UI if ever needed
export const runDueAiCampaignAudits = () => {
	return fetch(`${process.env.REACT_APP_API_URL}/ai/campaigns/run-due-audits`, {
		method: "GET",
	})
		.then((response) => response.json())
		.catch((err) => {
			console.log(err);
		});
};

/** =========================
 *  AI MARKETING CAMPAIGNS
 *  Backend routes (aimarketing.js):
 *  - POST   /api/ai/campaign/create/:userId
 *  - GET    /api/ai/campaign/:campaignId
 *  - GET    /api/ai/campaigns/:userId
 *  - PUT    /api/ai/campaign/:campaignId/audit/:userId
 *  - PATCH  /api/ai/campaign/:campaignId/status/:userId
 *  - GET    /api/ai/campaign/:campaignId/analytics/refresh/:userId
 *  - GET    /api/ai/campaign/products-and-categories/:userId
 *  ========================= */

export const createAICampaign = (userId, token, campaign) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/ai/campaign/create/${userId}`,
		{
			method: "POST",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify(campaign),
		}
	)
		.then((response) => response.json())
		.catch((err) => console.log(err));
};

export const listAICampaigns = (userId, token, query = {}) => {
	const params = new URLSearchParams();
	if (query.storeId) params.append("storeId", query.storeId);

	const qs = params.toString() ? `?${params.toString()}` : "";

	return fetch(`${process.env.REACT_APP_API_URL}/ai/campaigns/${userId}${qs}`, {
		method: "GET",
		headers: {
			Accept: "application/json",
			Authorization: `Bearer ${token}`,
		},
	})
		.then((response) => response.json())
		.catch((err) => console.log(err));
};

export const getAICampaign = (campaignId, token) => {
	return fetch(`${process.env.REACT_APP_API_URL}/ai/campaign/${campaignId}`, {
		method: "GET",
		headers: {
			Accept: "application/json",
			Authorization: `Bearer ${token}`,
		},
	})
		.then((response) => response.json())
		.catch((err) => console.log(err));
};

export const manualAuditAICampaign = (campaignId, userId, token) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/ai/campaign/${campaignId}/audit/${userId}`,
		{
			method: "PUT",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
		}
	)
		.then((response) => response.json())
		.catch((err) => console.log(err));
};

export const updateAICampaignStatus = (campaignId, userId, token, status) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/ai/campaign/${campaignId}/status/${userId}`,
		{
			method: "PATCH",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({ status }),
		}
	)
		.then((response) => response.json())
		.catch((err) => console.log(err));
};

export const refreshAICampaignAnalytics = (campaignId, userId, token) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/ai/campaign/${campaignId}/analytics/refresh/${userId}`,
		{
			method: "GET",
			headers: {
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
			},
		}
	)
		.then((response) => response.json())
		.catch((err) => console.log(err));
};

// NEW: Get active products + distinct categories for campaign creation
export const getAiCampaignProductsAndCategories = (
	userId,
	token,
	query = {}
) => {
	const params = new URLSearchParams();
	if (query.storeId) params.append("storeId", query.storeId);

	const qs = params.toString() ? `?${params.toString()}` : "";

	return fetch(
		`${process.env.REACT_APP_API_URL}/ai/campaign/products-and-categories/${userId}${qs}`,
		{
			method: "GET",
			headers: {
				Accept: "application/json",
				Authorization: `Bearer ${token}`,
			},
		}
	)
		.then((response) => response.json())
		.catch((err) => console.log(err));
};
