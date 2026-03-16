import React, {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import {
	Alert,
	Button,
	Divider,
	Spin,
	Typography,
	message,
} from "antd";
import axios from "axios";
import {
	PayPalButtons,
	PayPalScriptProvider,
	usePayPalScriptReducer,
} from "@paypal/react-paypal-js";

const API = process.env.REACT_APP_API_URL;
const APPLE_PAY_SDK_URL =
	"https://applepay.cdn-apple.com/jsapi/1.latest/apple-pay-sdk.js";

let cachedSdkConfig = null;
let sdkConfigPromise = null;
let applePayScriptPromise = null;

const api = (method, url, data, token = "") =>
	axios({
		method,
		url: `${API}${url}`,
		data,
		headers: token ? { Authorization: `Bearer ${token}` } : {},
	}).then((response) => response.data);

const getCMID = () => window.paypal?.getClientMetadataID?.();

function normalizeSdkConfig(data) {
	if (!data?.clientToken || !data?.clientId) {
		throw new Error("PayPal SDK configuration is incomplete.");
	}

	return {
		clientId: data.clientId,
		clientToken: data.clientToken,
		environment: data.environment || "sandbox",
	};
}

async function getPayPalSdkConfig(authToken = "", forceRefresh = false) {
	if (forceRefresh) {
		cachedSdkConfig = null;
		sdkConfigPromise = null;
	}

	if (cachedSdkConfig) {
		return cachedSdkConfig;
	}

	if (!sdkConfigPromise) {
		sdkConfigPromise = api("post", "/paypal/client-token", {}, authToken)
			.then((data) => {
				cachedSdkConfig = normalizeSdkConfig(data);
				return cachedSdkConfig;
			})
			.catch((error) => {
				cachedSdkConfig = null;
				throw error;
			})
			.finally(() => {
				sdkConfigPromise = null;
			});
	}

	return sdkConfigPromise;
}

function loadApplePayScript() {
	if (typeof window === "undefined") {
		return Promise.resolve();
	}

	if (window.customElements?.get("apple-pay-button")) {
		return Promise.resolve();
	}

	if (!applePayScriptPromise) {
		applePayScriptPromise = new Promise((resolve, reject) => {
			const existingScript = document.querySelector(
				`script[src="${APPLE_PAY_SDK_URL}"]`
			);
			if (existingScript) {
				if (existingScript.dataset.loaded === "true") {
					resolve();
					return;
				}
				existingScript.addEventListener("load", () => resolve(), {
					once: true,
				});
				existingScript.addEventListener(
					"error",
					() => reject(new Error("Apple Pay SDK failed to load.")),
					{ once: true }
				);
				return;
			}

			const script = document.createElement("script");
			script.src = APPLE_PAY_SDK_URL;
			script.async = true;
			script.onload = () => {
				script.dataset.loaded = "true";
				resolve();
			};
			script.onerror = () =>
				reject(new Error("Apple Pay SDK failed to load."));
			document.head.appendChild(script);
		}).catch((error) => {
			applePayScriptPromise = null;
			throw error;
		});
	}

	return applePayScriptPromise;
}

function ApplePayExpressButton({
	totalAmount,
	orderLabel,
	createOrder,
	captureOrder,
	onError,
	setOverlay,
}) {
	const [{ isResolved }] = usePayPalScriptReducer();
	const [applePayConfig, setApplePayConfig] = useState(null);
	const [applePayEligible, setApplePayEligible] = useState(false);
	const [applePayBusy, setApplePayBusy] = useState(false);
	const onErrorRef = useRef(onError);

	useEffect(() => {
		onErrorRef.current = onError;
	}, [onError]);

	useEffect(() => {
		let isMounted = true;

		const configureApplePay = async () => {
			if (!isResolved || typeof window === "undefined") {
				return;
			}

			try {
				await loadApplePayScript();
				if (
					!window.ApplePaySession ||
					typeof window.ApplePaySession.canMakePayments !== "function" ||
					!window.ApplePaySession.canMakePayments() ||
					typeof window.paypal?.Applepay !== "function"
				) {
					if (isMounted) {
						setApplePayEligible(false);
						setApplePayConfig(null);
					}
					return;
				}

				const paypalApplePay = window.paypal.Applepay();
				const config = await paypalApplePay.config();
				if (!isMounted) {
					return;
				}

				const isEligible = Boolean(
					config?.isEligible &&
					config?.countryCode &&
					config?.currencyCode &&
					Array.isArray(config?.supportedNetworks) &&
					Array.isArray(config?.merchantCapabilities)
				);

				setApplePayEligible(isEligible);
				setApplePayConfig(isEligible ? config : null);
			} catch (error) {
				if (isMounted) {
					setApplePayEligible(false);
					setApplePayConfig(null);
				}
				console.warn("Apple Pay not available for this checkout:", error);
			}
		};

		configureApplePay();

		return () => {
			isMounted = false;
		};
	}, [isResolved]);

	const startApplePay = useCallback(async () => {
		if (
			!applePayConfig ||
			typeof window === "undefined" ||
			!window.ApplePaySession ||
			typeof window.paypal?.Applepay !== "function"
		) {
			return;
		}

		try {
			const paypalApplePay = window.paypal.Applepay();
			const request = {
				countryCode: applePayConfig.countryCode,
				currencyCode: applePayConfig.currencyCode || "USD",
				merchantCapabilities: applePayConfig.merchantCapabilities,
				supportedNetworks: applePayConfig.supportedNetworks,
				requiredBillingContactFields: ["postalAddress", "name", "email"],
				requiredShippingContactFields: [
					"postalAddress",
					"name",
					"email",
					"phone",
				],
				total: {
					label: orderLabel,
					type: "final",
					amount: Number(totalAmount || 0).toFixed(2),
				},
			};

			const session = new window.ApplePaySession(4, request);

			session.onvalidatemerchant = async (event) => {
				try {
					setOverlay(true);
					const merchantSession = await paypalApplePay.validateMerchant({
						validationUrl: event.validationURL,
						displayName: orderLabel,
					});
					session.completeMerchantValidation(merchantSession);
				} catch (error) {
					console.error("Apple Pay merchant validation failed:", error);
					session.abort();
					onErrorRef.current?.(
						"Apple Pay could not be initialized on this device."
					);
				} finally {
					setOverlay(false);
				}
			};

			session.onpaymentauthorized = async (event) => {
				setApplePayBusy(true);
				setOverlay(true);

				try {
					const paypalOrderId = await createOrder();
					await paypalApplePay.confirmOrder({
						orderId: paypalOrderId,
						token: event.payment.token,
						billingContact: event.payment.billingContact,
					});
					await captureOrder(paypalOrderId, { redirectOnSuccess: false });
					session.completePayment(window.ApplePaySession.STATUS_SUCCESS);

					window.setTimeout(() => {
						window.location.href = "/dashboard";
					}, 150);
				} catch (error) {
					console.error("Apple Pay payment failed:", error);
					session.completePayment(window.ApplePaySession.STATUS_FAILURE);
					onErrorRef.current?.(
						error?.message || "Apple Pay payment could not be completed."
					);
				} finally {
					setApplePayBusy(false);
					setOverlay(false);
				}
			};

			session.oncancel = () => {
				setApplePayBusy(false);
				setOverlay(false);
			};

			session.begin();
		} catch (error) {
			console.error("Apple Pay launch failed:", error);
			setApplePayBusy(false);
			setOverlay(false);
			onErrorRef.current?.("Apple Pay is unavailable right now.");
		}
	}, [applePayConfig, captureOrder, createOrder, orderLabel, setOverlay, totalAmount]);

	if (!applePayEligible || !applePayConfig) {
		return null;
	}

	return (
		<ExpressSection>
			<SectionTitle level={5}>Apple Pay</SectionTitle>
			<ApplePayButtonElement
				type='buy'
				buttonstyle='black'
				locale='en-US'
				aria-label='Pay with Apple Pay'
				onClick={startApplePay}
				disabled={applePayBusy}
			/>
		</ExpressSection>
	);
}

export default function PayPalCheckout({
	orderData,
	authToken = "",
	onError = (msg) => message.error(msg),
	onSuccess = async () => {},
}) {
	const [sdkConfig, setSdkConfig] = useState(cachedSdkConfig);
	const [sdkError, setSdkError] = useState("");
	const [overlay, setOverlay] = useState(false);
	const invoiceRef = useRef(null);
	const onErrorRef = useRef(onError);
	const onSuccessRef = useRef(onSuccess);

	useEffect(() => {
		onErrorRef.current = onError;
	}, [onError]);

	useEffect(() => {
		onSuccessRef.current = onSuccess;
	}, [onSuccess]);

	const loadSdkConfig = useCallback(
		async (forceRefresh = false) => {
			setSdkError("");
			try {
				const config = await getPayPalSdkConfig(authToken, forceRefresh);
				setSdkConfig(config);
			} catch (error) {
				console.error("PayPal setup error:", error?.response?.data || error);
				const errorMessage =
					error?.response?.data?.error ||
					error?.message ||
					"PayPal could not be initialized.";
				setSdkConfig(null);
				setSdkError(errorMessage);
				onErrorRef.current?.(errorMessage);
			}
		},
		[authToken]
	);

	useEffect(() => {
		if (!sdkConfig) {
			loadSdkConfig();
		}
	}, [loadSdkConfig, sdkConfig]);

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
	}, [authToken, orderData]);

	const captureOrder = useCallback(
		async (paypalOrderId, options = {}) => {
			const { redirectOnSuccess = true } = options;
			setOverlay(true);
			try {
				const result = await api(
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
				await onSuccessRef.current?.(result?.order || null);
				if (redirectOnSuccess) {
					window.location.href = "/dashboard";
				}
				return result?.order || null;
			} catch (error) {
				console.error(
					"PayPal capture error:",
					error?.response?.data || error
				);
				const errorMessage =
					error?.response?.data?.error || "Payment could not be completed.";
				onErrorRef.current?.(errorMessage);
				throw error;
			} finally {
				setOverlay(false);
			}
		},
		[authToken, orderData]
	);

	const totalAmount = useMemo(
		() =>
			Number(orderData?.totalAmountAfterDiscount ?? orderData?.totalAmount ?? 0),
		[orderData]
	);

	const paypalOptions = useMemo(
		() => ({
			"client-id": sdkConfig?.clientId || "",
			"data-client-token": sdkConfig?.clientToken || "",
			components: "buttons,applepay",
			currency: "USD",
			intent: "capture",
			commit: true,
			locale: "en_US",
			"disable-funding": "paylater",
		}),
		[sdkConfig?.clientId, sdkConfig?.clientToken]
	);

	if (sdkError) {
		return (
			<RetryState>
				<Alert
					type='error'
					showIcon
					message='PayPal is unavailable right now'
					description={sdkError}
				/>
				<Button type='default' onClick={() => loadSdkConfig(true)}>
					Retry Secure Payment
				</Button>
			</RetryState>
		);
	}

	if (!sdkConfig) {
		return (
			<LoadingState>
				<Spin />
				<span>Loading secure payment options...</span>
			</LoadingState>
		);
	}

	return (
		<PaymentWrapper style={{ position: "relative" }}>
			{overlay ? (
				<Overlay>
					<Spin />
				</Overlay>
			) : null}

			<PayPalScriptProvider
				key={`${sdkConfig.clientId}:${sdkConfig.clientToken}`}
				options={paypalOptions}
			>
				<ApplePayExpressButton
					totalAmount={totalAmount}
					orderLabel='Serene Jannat'
					createOrder={createOrder}
					captureOrder={captureOrder}
					onError={(msg) => onErrorRef.current?.(msg)}
					setOverlay={setOverlay}
				/>

				<ExpressSection>
					<SectionTitle level={5}>PayPal</SectionTitle>
					<PayPalButtons
						fundingSource='paypal'
						style={{ layout: "vertical", label: "paypal", height: 44 }}
						createOrder={createOrder}
						onApprove={({ orderID }) => captureOrder(orderID)}
						onError={(error) => {
							console.error("PayPal wallet error:", error);
							onErrorRef.current?.("PayPal wallet payment failed.");
						}}
					/>
				</ExpressSection>

				<Divider plain>Or pay with card</Divider>

				<ExpressSection>
					<SectionTitle level={5}>Debit Or Credit Card</SectionTitle>
					<PayPalButtons
						fundingSource='card'
						style={{ layout: "vertical", label: "pay", height: 44 }}
						createOrder={createOrder}
						onApprove={({ orderID }) => captureOrder(orderID)}
						onError={(error) => {
							console.error("PayPal card error:", error);
							onErrorRef.current?.("Card payment failed.");
						}}
					/>
				</ExpressSection>
			</PayPalScriptProvider>
		</PaymentWrapper>
	);
}

const PaymentWrapper = ({ children, style }) => (
	<div style={{ ...style, minHeight: 220 }}>{children}</div>
);

const LoadingState = ({ children }) => (
	<div
		style={{
			display: "flex",
			alignItems: "center",
			gap: 12,
			padding: "16px 0",
		}}
	>
		{children}
	</div>
);

const RetryState = ({ children }) => (
	<div
		style={{
			display: "grid",
			gap: 12,
			marginTop: 16,
		}}
	>
		{children}
	</div>
);

const Overlay = ({ children }) => (
	<div
		style={{
			position: "absolute",
			inset: 0,
			background: "rgba(255,255,255,0.75)",
			display: "flex",
			alignItems: "center",
			justifyContent: "center",
			zIndex: 10,
			borderRadius: 8,
		}}
	>
		{children}
	</div>
);

const ExpressSection = ({ children }) => (
	<div
		style={{
			display: "grid",
			gap: 10,
			marginTop: 12,
		}}
	>
		{children}
	</div>
);

const SectionTitle = ({ children, level = 5 }) => (
	<Typography.Title
		level={level}
		style={{ margin: 0, fontSize: "1rem", lineHeight: 1.3 }}
	>
		{children}
	</Typography.Title>
);

const ApplePayButtonElement = (props) => (
	<apple-pay-button
		{...props}
		style={{
			"--apple-pay-button-width": "100%",
			"--apple-pay-button-height": "44px",
			"--apple-pay-button-border-radius": "8px",
			display: "block",
			width: "100%",
			minHeight: 44,
			cursor: props.disabled ? "not-allowed" : "pointer",
			opacity: props.disabled ? 0.6 : 1,
		}}
	/>
);
