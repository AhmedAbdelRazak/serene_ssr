/** @format */

import axios from "axios";
import { fetchJson } from "./utils/http";

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

export const getProducts = () => {
  return fetchJson("/products", {
    method: "GET",
  });
};

export const getShippingOptions = (token) => {
  return fetchJson("/shipping-options", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
};

export const readShippingOption = (shippingId) => {
  return fetch(`${process.env.REACT_APP_API_URL}/shipping/${shippingId}`, {
    method: "GET",
  })
    .then((response) => {
      return response.json();
    })
    .catch((err) => console.log(err));
};

export const getSortedProducts = (sortBy) => {
  return fetch(
    `${process.env.REACT_APP_API_URL}/products?sortBy=${sortBy}&order=desc&limit=8`,
    {
      method: "GET",
    },
  )
    .then((response) => {
      return response.json();
    })
    .catch((err) => console.log(err));
};

export const readProduct = (productId) => {
  return fetch(`${process.env.REACT_APP_API_URL}/product/${productId}`, {
    method: "GET",
  })
    .then((response) => {
      return response.json();
    })
    .catch((err) => console.log(err));
};

/** @format */

export const read = (userId, token) => {
  return fetch(`${process.env.REACT_APP_API_URL}/user/${userId}`, {
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

export const update = (userId, token, user) => {
  return fetch(`${process.env.REACT_APP_API_URL}/user/${userId}`, {
    method: "PUT",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(user),
  })
    .then((response) => {
      return response.json();
    })
    .catch((err) => console.log(err));
};

export const updateFromAdmin = (userId, token, user) => {
  return fetch(`${process.env.REACT_APP_API_URL}/user/admin/${userId}`, {
    method: "PUT",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(user),
  })
    .then((response) => {
      return response.json();
    })
    .catch((err) => console.log(err));
};

export const getPurchaseHistory = (userId, token) => {
  return fetchJson(`/order/history/${userId}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
};

export const userlike = (userId, token, productId) => {
  return fetch(`${process.env.REACT_APP_API_URL}/user/like`, {
    method: "PUT",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ userId, productId }),
  })
    .then((response) => {
      return response.json();
    })
    .catch((err) => console.log(err));
};

export const userunlike = (userId, token, productId) => {
  return fetch(`${process.env.REACT_APP_API_URL}/user/unlike`, {
    method: "PUT",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ userId, productId }),
  })
    .then((response) => {
      return response.json();
    })
    .catch((err) => console.log(err));
};

export const updateUser = (user, next) => {
  if (typeof window !== "undefined") {
    if (localStorage.getItem("jwt")) {
      let auth = JSON.parse(localStorage.getItem("jwt"));
      auth.user = user;
      localStorage.setItem("jwt", JSON.stringify(auth));
      next();
    }
  }
};

export const cloudinaryUpload1 = (userId, token, uploadData) => {
  // uploadData is an object like { image: base64String }
  return axios
    .post(
      `${process.env.REACT_APP_API_URL}/uploadimage/${userId}`,
      uploadData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    )
    .then((res) => {
      // Return ONLY the .data object => { public_id, url } from the server
      return res.data;
    })
    .catch((err) => {
      console.error("cloudinaryUpload1 error:", err);
      throw err;
    });
};

export const cleanupPreviewCustomDesign = (previewProductId, shopId) => {
  if (!previewProductId) {
    return Promise.resolve({
      success: false,
      deleted: false,
      error: "Missing previewProductId",
    });
  }

  return axios
    .delete(
      `${process.env.REACT_APP_API_URL}/preview-custom-design/${previewProductId}`,
      {
        data: { shop_id: shopId || null },
      },
    )
    .then((res) => res.data)
    .catch((err) => {
      console.error("cleanupPreviewCustomDesign error:", err);
      throw err;
    });
};

export const getPodListPreview = (
  productId,
  { occasion, name, variantId, forceRefresh = false } = {},
) => {
  if (!productId) {
    return Promise.resolve({
      success: false,
      error: "Missing productId",
    });
  }

  const params = new URLSearchParams();
  if (occasion) params.set("occasion", occasion);
  if (name) params.set("name", name);
  if (variantId) params.set("variant_id", variantId);
  if (forceRefresh) params.set("force", "1");
  const queryString = params.toString();
  const requestUrl = queryString
    ? `${process.env.REACT_APP_API_URL}/pod/list-preview/${productId}?${queryString}`
    : `${process.env.REACT_APP_API_URL}/pod/list-preview/${productId}`;

  return axios
    .get(requestUrl)
    .then((res) => res.data)
    .catch((err) => {
      console.error("getPodListPreview error:", err);
      throw err;
    });
};

export const cleanupPodListPreviewSession = (
  items = [],
  { keepalive = false } = {},
) => {
  const safeItems = Array.isArray(items)
    ? items
        .map((item) => {
          const previewProductId = String(
            item?.preview_product_id || item?.previewProductId || "",
          ).trim();
          if (!previewProductId) return null;
          return {
            preview_product_id: previewProductId,
            shop_id: item?.shop_id ?? item?.shopId ?? null,
            product_id:
              item?.product_id || item?.productId
                ? String(item?.product_id || item?.productId).trim()
                : null,
          };
        })
        .filter(Boolean)
    : [];

  if (!safeItems.length) {
    return Promise.resolve({
      success: true,
      requested: 0,
      deleted: 0,
      not_found: 0,
      failed: 0,
    });
  }

  const endpoint = `${process.env.REACT_APP_API_URL}/pod/list-preview/cleanup-session`;
  if (keepalive) {
    if (
      typeof navigator !== "undefined" &&
      typeof navigator.sendBeacon === "function"
    ) {
      try {
        const queued = navigator.sendBeacon(
          endpoint,
          new Blob([JSON.stringify({ items: safeItems })], {
            type: "application/json",
          }),
        );
        if (queued) {
          return Promise.resolve({ success: true, queued: true });
        }
      } catch (err) {
        console.warn("sendBeacon cleanup fallback to fetch:", err);
      }
    }
    return fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: safeItems }),
      keepalive: true,
    })
      .then(async (response) => {
        try {
          return await response.json();
        } catch {
          return { success: response.ok };
        }
      })
      .catch((err) => {
        console.error("cleanupPodListPreviewSession (keepalive) error:", err);
        throw err;
      });
  }

  return axios
    .post(endpoint, { items: safeItems })
    .then((res) => res.data)
    .catch((err) => {
      console.error("cleanupPodListPreviewSession error:", err);
      throw err;
    });
};

export const productStar = (productId, star, token, email, userId) => {
  return fetch(
    `${process.env.REACT_APP_API_URL}/product/star/${productId}/${userId}`,
    {
      method: "PUT",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ productId, star, email, userId }),
    },
  )
    .then((response) => {
      return response.json();
    })
    .catch((err) => console.log(err));
};

export const comment = (userId, token, productId, comment, commentsPhotos) => {
  return fetch(`${process.env.REACT_APP_API_URL}/post/comment`, {
    method: "PUT",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ userId, productId, comment, commentsPhotos }),
  })
    .then((response) => {
      return response.json();
    })
    .catch((err) => console.log(err));
};

export const uncomment = (userId, token, productId, comment) => {
  return fetch(`${process.env.REACT_APP_API_URL}/post/uncomment`, {
    method: "PUT",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ userId, productId, comment }),
  })
    .then((response) => {
      return response.json();
    })
    .catch((err) => console.log(err));
};

export const like = (userId, token, productId) => {
  return fetch(`${process.env.REACT_APP_API_URL}/post/like`, {
    method: "PUT",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ userId, productId }),
  })
    .then((response) => {
      return response.json();
    })
    .catch((err) => console.log(err));
};

export const unlike = (userId, token, productId) => {
  return fetch(`${process.env.REACT_APP_API_URL}/post/unlike`, {
    method: "PUT",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ userId, productId }),
  })
    .then((response) => {
      return response.json();
    })
    .catch((err) => console.log(err));
};

export const views = (productId) => {
  return fetch(`${process.env.REACT_APP_API_URL}/views`, {
    method: "PUT",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ productId }),
  })
    .then((response) => {
      return response.json();
    })
    .catch((err) => console.log(err));
};

export const viewsCounter = (productId, counter) => {
  return fetch(`${process.env.REACT_APP_API_URL}/viewscounter`, {
    method: "PUT",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ productId, counter }),
  })
    .then((response) => {
      return response.json();
    })
    .catch((err) => console.log(err));
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

export const createOrder = (token, createOrderData, paymentToken, userId) => {
  return fetch(`${process.env.REACT_APP_API_URL}/order/creation/${userId}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ orderData: createOrderData, paymentToken }),
  })
    .then((response) => {
      return response.json();
    })
    .catch((err) => console.log(err));
};

export const readSingleCoupon = (coupon) => {
  return fetch(`${process.env.REACT_APP_API_URL}/coupon/byname/${coupon}`, {
    method: "GET",
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

export const gettingCategoriesAndSubcategories = () => {
  return fetchJson("/product/categories/subcategories", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });
};

// apiCore.js (or wherever this lives)
export const gettingSpecificProducts = (
  featured,
  newArrivals,
  customDesigns,
  sortByRate,
  offers,
  records,
  skip = 0, // optional, goes in query
  storeId = "", // optional, goes in query
  options = {}, // optional flags
) => {
  // Build the query string for skip & storeId
  const params = new URLSearchParams();
  const useLitePayload = options && options.lite === true;
  // Only append skip if it's > 0
  if (skip) params.append("skip", skip);
  // Only append storeId if it's not empty
  if (storeId) params.append("storeId", storeId);
  if (useLitePayload) params.append("lite", "1");

  // Construct the URL with path params and optional query
  const query = params.toString();
  return fetchJson(
    `/specific/products/${featured}/${newArrivals}/${customDesigns}/${sortByRate}/${offers}/${records}${query ? `?${query}` : ""}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    },
  );
};

export const gettingSingleProduct = (slug, categorySlug, productId) => {
  return fetchJson(`/single-product/${slug}/${categorySlug}/${productId}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });
};

export const gettingFilteredProducts = (filters, page, records) => {
  const normalizedFilters = `${filters || ""}`.trim() || "all";
  return fetchJson(`/products/${normalizedFilters}/${page}/${records}`, {
    method: "GET",
    cache: "no-store",
  });
};

export const readSingleUserHistory = (userId, token) => {
  return fetch(`${process.env.REACT_APP_API_URL}/products/wishlist/${userId}`, {
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

export const getWebsiteSetup = (userId, token) => {
  return fetchJson("/website-basic-setup", {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  }).catch((err) => console.error("Error getting single setup:", err));
};

// 1. Create new support case (client → property owner or admin)
export const createNewSupportCase = (caseData) => {
  return fetch(`${process.env.REACT_APP_API_URL}/support-cases/new`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(caseData),
  })
    .then((response) => {
      if (!response.ok) {
        return response.text().then((text) => {
          throw new Error(text);
        });
      }
      return response.json();
    })
    .catch((err) => {
      console.error("Error creating new support case:", err);
      throw err;
    });
};

// 2. Update support case (e.g. add message, change status, etc.)
export const updateSupportCase = (caseId, updateData) => {
  // If your backend requires token-based auth, pass it in headers
  return fetch(`${process.env.REACT_APP_API_URL}/support-cases/${caseId}`, {
    method: "PUT",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      // Authorization: `Bearer ${token}`, // If needed
    },
    body: JSON.stringify(updateData),
  })
    .then((response) => {
      if (!response.ok) {
        return response.text().then((text) => {
          throw new Error(text);
        });
      }
      return response.json();
    })
    .catch((err) => {
      console.error("Error updating support case:", err);
      throw err;
    });
};

// 3. Get a support case by ID
export const getSupportCaseById = (caseId) => {
  return fetch(`${process.env.REACT_APP_API_URL}/support-cases/${caseId}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  })
    .then((response) => {
      if (!response.ok) {
        return response.text().then((text) => {
          throw new Error(text);
        });
      }
      return response.json();
    })
    .catch((err) => {
      console.error("Error fetching support case by ID:", err);
      throw err;
    });
};

// 4. Mark messages as seen by client
export const updateSeenByCustomer = (caseId) => {
  return fetch(
    `${process.env.REACT_APP_API_URL}/support-cases/${caseId}/seen/client`,
    {
      method: "PUT",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    },
  )
    .then((response) => {
      if (!response.ok) {
        return response.text().then((text) => {
          throw new Error(text);
        });
      }
      return response.json();
    })
    .catch((err) => {
      console.error("Error marking messages as seen by customer:", err);
      throw err;
    });
};

// 5. Get unseen messages for a specific client (if needed)
export const getUnseenMessagesByCustomer = (clientId) => {
  // Make sure you have a route like: GET /support-cases-client/:clientId/unseen
  return fetch(
    `${process.env.REACT_APP_API_URL}/support-cases-client/${clientId}/unseen`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    },
  )
    .then((response) => {
      if (!response.ok) {
        return response.text().then((text) => {
          throw new Error(text);
        });
      }
      return response.json();
    })
    .catch((err) => {
      console.error("Error fetching unseen messages by customer:", err);
      throw err;
    });
};

// 6. Get unseen messages count for the current support case from the customer's view
export const getUnseenMessagesCountByCustomer = (caseId) => {
  if (!caseId) {
    return Promise.resolve({ count: 0, exists: false });
  }

  const requestOptions = {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  };
  const requestUrls = [
    `${process.env.REACT_APP_API_URL}/support-cases/${caseId}/unseen/client/count`,
    `${process.env.REACT_APP_API_URL}/support-cases-customer/${caseId}/unseen-count`,
  ];

  const run = async () => {
    let sawRouteNotFound = false;

    for (const url of requestUrls) {
      const response = await fetch(url, requestOptions);

      if (response.ok) {
        return response.json();
      }

      const text = await response.text();
      if (response.status === 404) {
        sawRouteNotFound = true;
        continue;
      }

      if (
        response.status === 400 &&
        /invalid support case id/i.test(text || "")
      ) {
        return { count: 0, exists: false, invalidId: true };
      }

      throw new Error(text || `Request failed with status ${response.status}`);
    }

    return {
      count: 0,
      exists: false,
      unavailable: sawRouteNotFound,
    };
  };

  return run().catch((err) => {
    console.error("Error fetching unseen messages count by customer:", err);
    throw err;
  });
};

export const autoCompleteProducts = async (search) => {
  try {
    const response = await fetch(
      `${process.env.REACT_APP_API_URL}/products/autocomplete/for-client-chat-support?query=${encodeURIComponent(search)}`,
      {
        method: "GET",
      },
    );
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText);
    }
    return await response.json(); // array of products
  } catch (err) {
    console.error("Error in autoCompleteProducts:", err);
    return [];
  }
};

// ==================
// Check invoice
// ==================
export const checkInvoiceNumber = async (invoiceNumber) => {
  try {
    const response = await fetch(
      `${process.env.REACT_APP_API_URL}/orders/check-invoice/for-chat?invoiceNumber=${encodeURIComponent(
        invoiceNumber,
      )}`,
      {
        method: "GET",
      },
    );
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText);
    }
    return await response.json(); // { found: boolean, storeId: ???, message: string }
  } catch (err) {
    console.error("Error in checkInvoiceNumber:", err);
    return { found: false, storeId: null, message: "Error checking invoice" };
  }
};

export const createStripeCheckoutSession = (token, orderData) => {
  return fetch(`${process.env.REACT_APP_API_URL}/stripe/checkout-session`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`, // optional; your API allows guest checkout too
    },
    body: JSON.stringify({ orderData }),
  })
    .then((res) => res.json())
    .catch((err) => ({ error: "Network error", details: err }));
};
