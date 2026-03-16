import { clearCheckoutDraft } from "./checkoutState";

const TRACK_ENDPOINT = "/api/track/conversion";

function hasWindow() {
	return typeof window !== "undefined";
}

function toNumber(value, fallback = 0) {
	const numeric = Number(value);
	return Number.isFinite(numeric) ? numeric : fallback;
}

function buildItems(cart = []) {
	return cart.map((item) => ({
		item_id: item?._id || item?.id || "",
		item_name: item?.name || "",
		item_variant: [item?.color, item?.size, item?.scent]
			.filter(Boolean)
			.join(" / "),
		price: toNumber(item?.priceAfterDiscount ?? item?.price, 0),
		quantity: toNumber(item?.amount, 1),
	}));
}

function buildContentIds(cart = []) {
	return cart
		.map((item) => item?._id || item?.id)
		.filter((value) => Boolean(value));
}

function buildValue(orderOrValue) {
	if (typeof orderOrValue === "object" && orderOrValue) {
		return toNumber(
			orderOrValue.totalAmountAfterDiscount ?? orderOrValue.totalAmount,
			0
		);
	}
	return toNumber(orderOrValue, 0);
}

function buildEventId(prefix = "event", suffix = "") {
	const random = Math.random().toString(36).slice(2, 8);
	return [prefix, suffix, Date.now(), random].filter(Boolean).join("-");
}

function sendGa(eventName, params = {}) {
	if (!hasWindow() || typeof window.gtag !== "function") return;
	window.gtag("event", eventName, params);
}

function sendFb(eventName, params = {}, eventId = "") {
	if (!hasWindow() || typeof window.fbq !== "function") return;
	const options = eventId ? { eventID: eventId } : undefined;
	window.fbq("track", eventName, params, options);
}

function sendFbCustom(eventName, params = {}, eventId = "") {
	if (!hasWindow() || typeof window.fbq !== "function") return;
	const options = eventId ? { eventID: eventId } : undefined;
	window.fbq("trackCustom", eventName, params, options);
}

async function sendServerConversion({
	eventName,
	eventId,
	email,
	phone,
	currency = "USD",
	value = 0,
	contentIds = [],
}) {
	if (!hasWindow()) return;
	try {
		await fetch(TRACK_ENDPOINT, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				eventName,
				eventId,
				email: email || null,
				phone: phone || null,
				currency,
				value,
				contentIds,
				userAgent: window.navigator.userAgent,
			}),
			keepalive: true,
			credentials: "same-origin",
			cache: "no-store",
		});
	} catch {
		// Tracking should never break checkout UX.
	}
}

export function trackCheckoutStepView({
	step,
	cart,
	value,
	currency = "USD",
}) {
	sendGa("checkout_step_view", {
		checkout_step: step,
		currency,
		value: buildValue(value),
		item_count: buildItems(cart).length,
	});
}

export function trackCheckoutContactInfoSubmitted({
	cart,
	value,
	currency = "USD",
}) {
	sendGa("checkout_contact_info_submitted", {
		currency,
		value: buildValue(value),
		item_count: buildItems(cart).length,
	});
}

export function trackCheckoutShippingInfoAdded({
	cart,
	value,
	currency = "USD",
	shippingTier = "",
}) {
	sendGa("add_shipping_info", {
		currency,
		value: buildValue(value),
		shipping_tier: shippingTier,
		items: buildItems(cart),
	});
}

export async function trackCheckoutInitiated({
	cart,
	value,
	email,
	phone,
	currency = "USD",
}) {
	const checkoutValue = buildValue(value);
	const items = buildItems(cart);
	const eventId = buildEventId("initiate-checkout");
	sendGa("begin_checkout", {
		currency,
		value: checkoutValue,
		items,
	});
	sendFb(
		"InitiateCheckout",
		{
			currency,
			value: checkoutValue,
			content_type: "product",
			contents: items.map((item) => ({
				id: item.item_id,
				quantity: item.quantity,
			})),
			num_items: items.length,
		},
		eventId
	);
	await sendServerConversion({
		eventName: "InitiateCheckout",
		eventId,
		email,
		phone,
		currency,
		value: checkoutValue,
		contentIds: buildContentIds(cart),
	});
	return eventId;
}

export async function trackPaymentInfoAdded({
	cart,
	value,
	email,
	phone,
	currency = "USD",
	paymentType = "PayPal",
}) {
	const checkoutValue = buildValue(value);
	const items = buildItems(cart);
	const eventId = buildEventId("add-payment-info");
	sendGa("add_payment_info", {
		currency,
		value: checkoutValue,
		payment_type: paymentType,
		items,
	});
	sendFb(
		"AddPaymentInfo",
		{
			currency,
			value: checkoutValue,
			content_type: "product",
			contents: items.map((item) => ({
				id: item.item_id,
				quantity: item.quantity,
			})),
			num_items: items.length,
		},
		eventId
	);
	await sendServerConversion({
		eventName: "AddPaymentInfo",
		eventId,
		email,
		phone,
		currency,
		value: checkoutValue,
		contentIds: buildContentIds(cart),
	});
	return eventId;
}

export async function trackPurchaseCompleted({
	order,
	email,
	phone,
	currency = "USD",
}) {
	if (!order) return null;
	const invoiceNumber =
		order.invoiceNumber || order.paypalOrderId || buildEventId("purchase");
	const localKey = `purchase-fired-${invoiceNumber}`;
	if (hasWindow() && window.localStorage.getItem(localKey)) {
		return localKey;
	}

	const allItems = [
		...(order?.productsNoVariable || []),
		...(order?.chosenProductQtyWithVariables || []),
	];
	const items = allItems.map((item) => ({
		item_id: item?.productId || item?._id || "",
		item_name: item?.name || "",
		item_variant: [
			item?.chosenAttributes?.color,
			item?.chosenAttributes?.size,
			item?.chosenAttributes?.scent,
		]
			.filter(Boolean)
			.join(" / "),
		price: toNumber(item?.price, 0),
		quantity: toNumber(item?.ordered_quantity, 1),
	}));
	const value = buildValue(order);
	const eventId = buildEventId("purchase", invoiceNumber);

	sendGa("purchase", {
		transaction_id: invoiceNumber,
		currency,
		value,
		coupon: order?.appliedCoupon?.coupon || order?.appliedCoupon?.name || undefined,
		items,
	});
	sendFb(
		"Purchase",
		{
			currency,
			value,
			content_type: "product",
			contents: items.map((item) => ({
				id: item.item_id,
				quantity: item.quantity,
			})),
			num_items: items.length,
		},
		eventId
	);
	await sendServerConversion({
		eventName: "Purchase",
		eventId,
		email,
		phone,
		currency,
		value,
		contentIds: items.map((item) => item.item_id).filter(Boolean),
	});

	if (hasWindow()) {
		window.localStorage.setItem(localKey, "true");
	}
	clearCheckoutDraft();
	return localKey;
}

export function trackCheckoutCustomStep({ step, label = "" }) {
	const eventId = buildEventId("checkout-step", String(step));
	sendGa("checkout_step_action", {
		checkout_step: step,
		event_label: label || `step_${step}`,
	});
	sendFbCustom(
		"CheckoutStep",
		{
			checkout_step: step,
			label: label || `step_${step}`,
		},
		eventId
	);
}
