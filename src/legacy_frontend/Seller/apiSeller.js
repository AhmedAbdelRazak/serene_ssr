import axios from "axios";
import { fetchJson } from "../utils/http";

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

export const createCoupon = (userId, token, couponData) => {
	return axios
		.post(
			`${process.env.REACT_APP_API_URL}/coupon/create/${userId}`,
			couponData,
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

export const removeCoupon = (couponId, userId, token) => {
	return axios
		.delete(`${process.env.REACT_APP_API_URL}/coupon/${couponId}/${userId}`, {
			headers: {
				Authorization: `Bearer ${token}`,
			},
		})
		.then((res) => res.data)
		.catch((err) => {
			return { error: err.response?.data?.error || "Delete failed." };
		});
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

export const getProducts = (storeId) => {
	console.log(storeId, "From API Seller");
	const safeStoreId = `${storeId || ""}`.trim();
	if (!safeStoreId) return Promise.resolve([]);
	return fetchJson(`/products/${safeStoreId}`, {
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

// Get Active B2C Support Cases (client ↔ seller)
export const getActiveB2CChats = (userId, token) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/support-cases-clients/active/${userId}`,
		{
			method: "GET",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
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
			console.error("Error fetching active B2C chats:", err);
		});
};

// Get Active B2B Support Cases (seller ↔ super admin)
export const getActiveB2BChats = (userId, token) => {
	// Example route: /support-cases/active
	// Adjust if you have a custom route for B2B specifically
	return fetch(
		`${process.env.REACT_APP_API_URL}/support-cases/active/${userId}`,
		{
			method: "GET",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
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
			console.error("Error fetching active B2B chats:", err);
		});
};

// Get Closed B2C Chats (History)
export const getClosedB2CChats = (userId, token) => {
	// Example route: /support-cases/closed/clients
	return fetch(
		`${process.env.REACT_APP_API_URL}/support-cases/closed/clients/${userId}`,
		{
			method: "GET",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
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
			console.error("Error fetching closed B2C chats:", err);
		});
};

// Get Closed B2B Chats (History)
export const getClosedB2BChats = (userId, token) => {
	// Example route: /support-cases/closed
	return fetch(`${process.env.REACT_APP_API_URL}/support-cases/closed`, {
		method: "GET",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json",
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
			console.error("Error fetching closed B2B chats:", err);
		});
};

// Create a new Support Case (B2B: seller → admin)
export const createB2BSupportCase = (userId, token, supportData) => {
	// This corresponds to POST /support-cases/new
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
			console.error("Error creating new B2B support case:", err);
		});
};

// Update (PUT) an existing support case, e.g. adding a message or closing it
export const updateSupportCase = (caseId, updateData, token) => {
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
			console.error("Error updating support case:", err);
		});
};

// Get a specific support case by ID (if needed)
export const getSupportCaseById = (caseId, token) => {
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
			console.error("Error fetching support case by ID:", err);
		});
};

export const markAllMessagesAsSeenBySeller = (caseId, userId, token) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/support-cases/${caseId}/seen-by-agent`,
		{
			method: "PUT",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({ userId }),
		}
	)
		.then((res) => {
			if (!res.ok) {
				throw new Error(`HTTP error! Status: ${res.status}`);
			}
			return res.json();
		})
		.catch((err) => {
			console.error("Error marking all as seen by seller:", err);
		});
};

// 1) Already have this for the *count*
export const getUnseenMessagesCountBySeller = (storeId, token) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/support-cases/${storeId}/unseen/seller`,
		{
			method: "GET",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
		}
	)
		.then((res) => res.json())
		.catch((err) => {
			console.error("Error fetching unseen messages count for seller:", err);
		});
};

// 2) New function for the "list"
export const getUnseenMessagesListBySeller = (storeId, token) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/support-cases/${storeId}/unseen/seller/list`,
		{
			method: "GET",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
		}
	)
		.then((res) => res.json())
		.catch((err) => {
			console.error("Error fetching unseen messages list for seller:", err);
		});
};

export const getSearchOrderSeller = (token, orderquery, userId, storeId) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/seller/search-for-order/${orderquery}/${userId}/${storeId}`,
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

export const getListOfOrdersAggregatedSeller = (
	token,
	page,
	records,
	startDate,
	endDate,
	status,
	userId,
	storeId
) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/seller/list-of-orders-aggregated/${page}/${records}/${startDate}/${endDate}/${status}/${userId}/${storeId}`,
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

export const updatingAnOrderSeller = (
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

export const updatingAnOrderSeller2 = (
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

export const getStoresBasedOnOrder = (token, orderId, userId) => {
	return fetch(
		`${process.env.REACT_APP_API_URL}/get-storeids-connected-to-an-order/${orderId}/${userId}`,
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
