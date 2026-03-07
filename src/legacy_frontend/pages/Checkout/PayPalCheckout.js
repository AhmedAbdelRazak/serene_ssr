/*********************************************************************
 *  PayPalCheckout.js • Jul‑2025 (Wallet + Card Fields with fallback)
 *********************************************************************/

import React, { useState, useEffect, useRef, useCallback, memo } from "react";
import { Spin, Button, message } from "antd";
import axios from "axios";
import {
	PayPalScriptProvider,
	PayPalButtons,
	usePayPalScriptReducer,
} from "@paypal/react-paypal-js";

/* ─────────────────────── 1. Config & helper ─────────────────────── */
const API = process.env.REACT_APP_API_URL;
const NODE_ENV = (process.env.REACT_APP_NODE_ENV || "").toUpperCase();
const CLIENT_ID =
	NODE_ENV === "PRODUCTION"
		? process.env.REACT_APP_PAYPAL_CLIENT_ID_LIVE
		: process.env.REACT_APP_PAYPAL_CLIENT_ID_SANDBOX;

const api = (method, url, data, token = "") =>
	axios({
		method,
		url: `${API}${url}`,
		data,
		headers: token ? { Authorization: `Bearer ${token}` } : {},
	}).then((r) => r.data);

const getCMID = () => window.paypal?.getClientMetadataID?.();

/* ─────────────────────── 2. Card Fields UI ──────────────────────── */
// eslint-disable-next-line
const CardFields = memo(function CardFields({
	createOrder,
	captureOrder,
	onError,
}) {
	const [{ isResolved }] = usePayPalScriptReducer();
	const nameRef = useRef(null);
	const numberRef = useRef(null);
	const expiryRef = useRef(null);
	const cvvRef = useRef(null);

	const [fields, setFields] = useState(null);
	const [busy, setBusy] = useState(false);
	const [eligible, setEligible] = useState(true);

	/* init once SDK ready */
	useEffect(() => {
		if (!isResolved || fields || !window.paypal?.CardFields) return;

		const cf = window.paypal.CardFields({
			createOrder,
			onApprove: ({ orderID }) => captureOrder(orderID),
			onError: (e) => {
				console.error("CardFields error:", e);
				onError("Card payment error.");
			},
			style: {
				input: { fontSize: "16px", color: "#000" },
				".invalid": { color: "red" },
			},
		});

		if (!cf.isEligible()) {
			setEligible(false);
			return;
		}

		cf.NameField().render(nameRef.current);
		cf.NumberField().render(numberRef.current);
		cf.ExpiryField().render(expiryRef.current);
		cf.CVVField().render(cvvRef.current);
		setFields(cf);
	}, [isResolved, fields, createOrder, captureOrder, onError]);

	if (!eligible) return null;

	const payNow = async () => {
		if (!fields) return;
		setBusy(true);
		try {
			await fields.submit({});
		} catch (e) {
			console.error(e);
			onError("Card submission failed.");
		} finally {
			setBusy(false);
		}
	};

	return (
		<div style={{ marginTop: 32, position: "relative" }}>
			{busy && (
				<div
					style={{
						position: "absolute",
						inset: 0,
						background: "rgba(255,255,255,.6)",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						zIndex: 5,
					}}
				>
					<Spin />
				</div>
			)}

			<div ref={nameRef} style={{ marginBottom: 8 }} />
			<div ref={numberRef} style={{ marginBottom: 8 }} />
			<div style={{ display: "flex", gap: 8 }}>
				<div ref={expiryRef} style={{ flex: 1 }} />
				<div ref={cvvRef} style={{ flex: 1 }} />
			</div>

			<Button
				type='primary'
				block
				style={{ marginTop: 16 }}
				onClick={payNow}
				disabled={!fields || busy}
			>
				Pay now with Card
			</Button>
		</div>
	);
});

/* ─────────────────────── 3. Main component ──────────────────────── */
export default function PayPalCheckout({
	orderData,
	authToken = "",
	onError = (msg) => message.error(msg),
}) {
	const [clientToken, setClientToken] = useState(null);
	const [overlay, setOverlay] = useState(false);
	const invoiceRef = useRef(null);

	/* 3.1 get JS‑SDK client‑token */
	useEffect(() => {
		api("post", "/paypal/client-token", {}, authToken)
			.then((d) => setClientToken(d.clientToken))
			.catch((e) => {
				console.error(e);
				onError("PayPal initialisation failed.");
			});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	/* 3.2 create & capture helpers */
	const createOrder = useCallback(async () => {
		setOverlay(true);
		try {
			const { paypalOrderId, provisionalInvoice } = await api(
				"post",
				"/paypal/create-order",
				{ orderData, cmid: getCMID() },
				authToken
			);
			invoiceRef.current = provisionalInvoice;
			return paypalOrderId;
		} finally {
			setOverlay(false);
		}
	}, [orderData, authToken]);

	const captureOrder = useCallback(
		async (paypalOrderId) => {
			setOverlay(true);
			try {
				await api(
					"post",
					"/paypal/capture-order",
					{
						paypalOrderId,
						orderData,
						cmid: getCMID(),
						provisionalInvoice: invoiceRef.current,
					},
					authToken
				);
				window.location.href = "/dashboard";
			} catch (e) {
				console.error("capture‑order error:", e?.response?.data || e);
				onError("Payment could not be completed.");
			} finally {
				setOverlay(false);
			}
		},
		[orderData, authToken, onError]
	);

	if (!clientToken) return <Spin />;

	return (
		<div style={{ position: "relative" }}>
			{overlay && (
				<div
					style={{
						position: "absolute",
						inset: 0,
						background: "rgba(255,255,255,.6)",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						zIndex: 10,
					}}
				>
					<Spin />
				</div>
			)}

			<PayPalScriptProvider
				options={{
					"client-id": CLIENT_ID,
					"data-client-token": clientToken,
					components: "buttons,card-fields",
					currency: "USD",
					intent: "capture",
					commit: true,
					"enable-funding": "paypal,card,venmo,paylater",
					"disable-funding": "credit",
					locale: "en_US",
				}}
			>
				{/* 3a. Wallet / Venmo / Pay Later */}
				<PayPalButtons
					style={{ layout: "vertical", label: "paypal" }}
					createOrder={createOrder}
					onApprove={({ orderID }) => captureOrder(orderID)}
					onError={(e) => {
						console.error("wallet error:", e);
						onError("PayPal wallet error.");
					}}
				/>

				{/* 3b. Inline Card Fields (only if eligible) */}
				{/* <CardFields
					createOrder={createOrder}
					captureOrder={captureOrder}
					onError={onError}
				/> */}

				{/* 3c. Optional dedicated “Card” button if CardFields not eligible  */}
				<PayPalButtons
					fundingSource='card'
					style={{ layout: "vertical", label: "pay" }}
					createOrder={createOrder}
					onApprove={({ orderID }) => captureOrder(orderID)}
					onError={(e) => {
						console.error("card button error:", e);
						onError("Card payment error.");
					}}
				/>
			</PayPalScriptProvider>
		</div>
	);
}
