/* ------------------------------------------------------------------
   Z4StepThree – Order review & Stripe Checkout redirect
   ------------------------------------------------------------------ */

import React, { useState } from "react";
import styled, { keyframes } from "styled-components";
import { FaTrashAlt } from "react-icons/fa";
import { useHistory } from "react-router-dom";
import { Modal, Spin, Checkbox } from "antd";
import { toast } from "react-toastify";
import ReactGA from "react-ga4";
import ReactPixel from "react-facebook-pixel";
import PayPalCheckout from "./PayPalCheckout";
// eslint-disable-next-line
import axios from "axios";

import { signup, signin, authenticate, isAuthenticated } from "../../auth";
import { createStripeCheckoutSession } from "../../apiCore";

/* ─────────────────────────────────────────────────────────────── */

const Z4StepThree = ({
	step,
	customerDetails,
	state,
	address,
	city,
	handlePreviousStep,
	zipcode,
	shipmentChosen,
	cart,
	total_amount,
	removeItem,
	user,
	setStep,
	comments,
	appliedCoupon,
	goodCoupon,
}) => {
	const [isModalVisible, setIsModalVisible] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [isTermsAccepted, setIsTermsAccepted] = useState(false);

	const history = useHistory();

	const [authInfo, setAuthInfo] = useState(isAuthenticated() || {});
	const token = authInfo.token;
	const authUser = authInfo.user;
	const userId = authUser?._id;

	/** Build the order payload ONCE so both Stripe and PayPal share it */
	const orderData = React.useMemo(
		() => ({
			productsNoVariable: cart
				.filter((i) => !i.chosenProductAttributes)
				.map((i) => ({
					productId: i._id,
					name: i.name,
					ordered_quantity: i.amount,
					price: i.priceAfterDiscount,
					image: i.image,
					isPrintifyProduct: i.isPrintifyProduct,
					printifyProductDetails: i.printifyProductDetails,
					customDesign: i.customDesign,
					storeId: i.storeId,
				})),
			chosenProductQtyWithVariables: cart
				.filter((i) => i.chosenProductAttributes)
				.map((i) => ({
					productId: i._id,
					name: i.name,
					ordered_quantity: i.amount,
					price: i.priceAfterDiscount,
					image: i.chosenProductAttributes?.productImages?.[0]?.url || "",
					chosenAttributes: i.chosenProductAttributes,
					isPrintifyProduct: i.isPrintifyProduct,
					printifyProductDetails: i.printifyProductDetails,
					customDesign: i.customDesign,
				})),
			customerDetails: {
				name: customerDetails.name,
				email: customerDetails.email,
				phone: customerDetails.phone,
				address,
				city,
				state,
				zipcode,
				userId,
			},
			totalOrderQty: cart.reduce((s, i) => s + i.amount, 0),
			status: "Awaiting Payment",
			onHoldStatus: "None",
			totalAmount: total_amount,
			totalAmountAfterDiscount: goodCoupon
				? (
						total_amount -
						Number(total_amount) * (appliedCoupon.discount / 100)
					).toFixed(2)
				: total_amount,
			chosenShippingOption: shipmentChosen,
			orderSource: "Website",
			appliedCoupon: goodCoupon ? appliedCoupon : {},
			shipDate: new Date(),
			orderCreationDate: new Date(),
			sendSMS: true,
			freeShipping: false,
			shippingFees: shipmentChosen?.shippingPrice || 10,
			paymentStatus: "Pending",
			orderComment: comments,
			privacyPolicyAgreement: isTermsAccepted,
		}),
		[
			cart,
			customerDetails,
			address,
			city,
			state,
			zipcode,
			userId,
			total_amount,
			appliedCoupon,
			goodCoupon,
			shipmentChosen,
			comments,
			isTermsAccepted,
		]
	);

	const cleanOrderData = React.useMemo(() => {
		const clone = JSON.parse(JSON.stringify(orderData));

		if (clone.chosenShippingOption) {
			const keep = ["carrierName", "shippingPrice"]; // fields the backend expects
			Object.keys(clone.chosenShippingOption).forEach((k) => {
				if (!keep.includes(k)) delete clone.chosenShippingOption[k];
			});
		}
		return clone;
	}, [orderData]);
	/* ───────── helpers ───────── */

	/* quick validations then open modal */
	const handleProceedToCheckout = async () => {
		/* ➊  Shipping block validations */
		if (
			!address ||
			!city ||
			!state ||
			!/^\d{5}$/.test(zipcode) ||
			!shipmentChosen?.carrierName
		) {
			setStep(2);
			return toast.error("Please complete the shipping section.");
		}

		/* ➋  Guest‑only field validations */
		if (!authInfo.user) {
			const { name, email, phone, password, confirmPassword } = customerDetails;
			if (!name || !email || !phone || !password || !confirmPassword) {
				setStep(1);
				return toast.error("Please complete all customer fields.");
			}
			if (name.trim().split(" ").length < 2)
				return toast.error("First & last name required.");
			if (!/\S+@\S+\.\S+/.test(email))
				return toast.error("Invalid e‑mail address.");
			if (!/^\d{10}$/.test(phone))
				return toast.error("Phone must be 10 digits.");
			if (password.length < 6)
				return toast.error("Password must be ≥ 6 characters.");
			if (password !== confirmPassword)
				return toast.error("Passwords do not match.");
		}

		/* ➌  Ensure the guest really has an account before payment */
		if (!authInfo.user) {
			const ok = await handleSignupAndSignin();
			if (!ok) return; // abort if signup/login failed
		}

		/* ➍  Open PayPal / Stripe modal */
		setIsModalVisible(true);
	};

	/* guest account helper */
	const handleSignupAndSignin = async () => {
		// Already logged‑in – nothing to do
		if (authInfo.user) return true;

		const { name, email, phone, password } = customerDetails;

		try {
			/* 1) Try to sign‑in (maybe the e‑mail already exists) */
			const signInRes = await signin({ emailOrPhone: email, password });
			if (!signInRes.error) {
				authenticate(signInRes, () => {});
				setAuthInfo(isAuthenticated() || {}); // ← refresh token + _id
				return true;
			}

			/* 2) Create the account */
			const signUpRes = await signup({ name, email, password, phone });
			if (signUpRes.error) {
				toast.error(signUpRes.error);
				return false;
			}

			/* 3) Log‑in the newly created account */
			const secondSignIn = await signin({ emailOrPhone: email, password });
			if (secondSignIn.error) {
				toast.error(secondSignIn.error);
				return false;
			}
			authenticate(secondSignIn, () => {});
			setAuthInfo(isAuthenticated() || {});
			return true;
		} catch (err) {
			console.error("Auth error:", err);
			toast.error("Cannot create or log in.");
			return false;
		}
	};

	/* coupon */
	const totalAmountAdjusted = goodCoupon
		? (
				total_amount -
				Number(total_amount) * (appliedCoupon.discount / 100)
			).toFixed(2)
		: total_amount;

	/* ─────────  Stripe call  ───────── */
	// eslint-disable-next-line
	const startStripeCheckout = async () => {
		try {
			const authOk = await handleSignupAndSignin();
			if (!authOk) return;

			setIsLoading(true);
			const { token, user: authUser } = isAuthenticated();
			// eslint-disable-next-line
			const userId = authUser?._id;

			/* build backend payload */
			const payload = cleanOrderData;

			/* analytics */
			ReactGA.event({ category: "Stripe Checkout", action: "Redirect" });
			const fbEventId = `checkout-${Date.now()}`;
			ReactPixel.track(
				"InitiateCheckout",
				{
					currency: "USD",
					value: Number(totalAmountAdjusted),
					num_items: cart.length,
					content_type: "product",
					contents: cart.map((i) => ({ id: i._id, quantity: i.amount })),
				},
				{ eventID: fbEventId }
			);

			/* server call */
			const resp = await createStripeCheckoutSession(token, payload);
			console.log("Stripe response:", resp);

			const redirectUrl = resp.redirectUrl || resp.url; // accept either
			if (!redirectUrl) throw new Error("No redirect URL from server");

			window.location.href = redirectUrl;
		} catch (err) {
			console.error("Stripe checkout error:", err);
			toast.error("Unable to start payment. Please try again.");
			setIsLoading(false);
		}
	};

	/* UI ‑‑ unchanged below this line */
	return (
		<>
			{step === 3 && (
				<Step>
					{/* title */}
					<StepTitle>Review</StepTitle>

					{/* customer / shipping */}
					<ReviewDetails>
						<ReviewItem>
							<strong>Name:</strong> {customerDetails.name}
						</ReviewItem>
						<ReviewItem>
							<strong>Phone:</strong> {customerDetails.phone}
						</ReviewItem>
						<ReviewItem>
							<strong>Ship to State:</strong> {state}
						</ReviewItem>
						<ReviewItem>
							<strong>Ship to Address:</strong> {address}
						</ReviewItem>
						<ReviewItem>
							<strong>Ship to City:</strong> {city}
						</ReviewItem>
						<ReviewItem>
							<strong>Zipcode:</strong> {zipcode}
						</ReviewItem>
						<ReviewItem>
							<strong>Shipping Price:</strong> ${shipmentChosen?.shippingPrice}
						</ReviewItem>
					</ReviewDetails>

					{/* cart */}
					<CartItems>
						{cart.map((item, i) => (
							<CartItem key={i}>
								<ItemImage src={item.image} alt={item.name} />
								<ItemDetails>
									<ItemName>Product: {item.name}</ItemName>
									<ItemQuantity>Quantity: {item.amount}</ItemQuantity>
									<ItemPrice>
										Price / unit: ${item.priceAfterDiscount}
									</ItemPrice>
									<RemoveButton
										onClick={() => removeItem(item.id, item.size, item.color)}
									>
										<FaTrashAlt />
									</RemoveButton>
								</ItemDetails>
							</CartItem>
						))}
					</CartItems>

					{/* totals */}
					<TotalAmount>
						{goodCoupon ? (
							<DiscountedTotal>
								Total Amount:&nbsp;
								<s style={{ color: "red" }}>
									${Number(total_amount).toFixed(2)}
								</s>
								<DiscountedPrice>${totalAmountAdjusted}</DiscountedPrice>
							</DiscountedTotal>
						) : (
							`Total Amount: $${Number(total_amount).toFixed(2)}`
						)}
						<hr className='col-md-6' />
					</TotalAmount>

					{/* buttons */}
					<ButtonWrapper>
						<BackButton onClick={handlePreviousStep}>Back</BackButton>
						<CheckoutButton onClick={handleProceedToCheckout}>
							Proceed to Checkout
						</CheckoutButton>
						<ClearCartButton onClick={() => history.push("/our-products")}>
							Continue Shopping…
						</ClearCartButton>
					</ButtonWrapper>

					{/* modal */}
					<Modal
						title='Confirm & Pay Securely'
						open={isModalVisible}
						onCancel={() => setIsModalVisible(false)}
						footer={null}
					>
						{isLoading ? (
							<Spin />
						) : isTermsAccepted ? (
							<>
								{/* Stripe button (unchanged) */}
								{/* <PayNowButton onClick={startStripeCheckout}>
									Pay with Card — Secure Stripe Checkout
								</PayNowButton> */}

								{/* PayPal wallet + inline card */}
								<div style={{ marginTop: 20 }}>
									{/* {isLoading && <Spin style={{ marginBottom: 16 }} />} */}
									<PayPalCheckout
										orderData={cleanOrderData}
										authToken={token}
										onLoading={setIsLoading}
										onError={(msg) => toast.error(msg)}
									/>
								</div>
							</>
						) : (
							<TermsWrapper>
								<Checkbox
									checked={isTermsAccepted}
									onChange={(e) => {
										ReactGA.event({
											category: "User Accepted Terms And Conditions",
											action: "User Accepted Terms And Conditions",
										});
										setIsTermsAccepted(e.target.checked);
									}}
								>
									I agree to the terms and conditions
								</Checkbox>
								<TermsLink
									href='/privacy-policy-terms-conditions'
									target='_blank'
								>
									Click here to read our terms and conditions
								</TermsLink>
							</TermsWrapper>
						)}
					</Modal>
				</Step>
			)}
		</>
	);
};

export default Z4StepThree;

/* ───────── styled components (unchanged) ───────── */
const fadeIn = keyframes`
  from { opacity:0; transform:translateX(100%);} 
  to   { opacity:1; transform:translateX(0);}
`;
const Step = styled.div`
	display: flex;
	flex-direction: column;
	animation: ${fadeIn} 0.5s forwards;
`;
const StepTitle = styled.h2`
	text-align: center;
	margin-bottom: 20px;
	font-weight: bold;
	font-size: 1.2rem;
	border-bottom: 3px solid #ccc;
	width: 25%;
	margin-left: auto;
	margin-right: auto;
	padding-bottom: 5px;
	@media (max-width: 790px) {
		width: 80%;
	}
`;
const CartItems = styled.div`
	margin-top: 20px;
`;
const CartItem = styled.div`
	display: flex;
	align-items: center;
	margin-bottom: 15px;
	border-bottom: 1px solid #ccc;
	padding-bottom: 15px;
`;
const ItemImage = styled.img`
	width: 80px;
	height: 80px;
	object-fit: cover;
	border-radius: 8px;
	margin-right: 15px;
`;
const ItemDetails = styled.div`
	display: flex;
	flex-direction: column;
	width: 100%;
	position: relative;
`;
const ItemName = styled.p`
	font-weight: bold;
	margin: 0 0 5px;
	text-transform: capitalize;
	font-size: 0.9rem;
`;
const ItemQuantity = styled.p`
	margin: 0 10px;
	font-size: 0.9rem;
	font-weight: bold;
`;
const ItemPrice = styled.p`
	font-weight: bold;
	color: #0c1d2d;
	font-size: 0.9rem;
`;
const RemoveButton = styled.button`
	position: absolute;
	right: 0;
	top: 0;
	background: none;
	border: none;
	color: red;
	font-size: 18px;
	cursor: pointer;
	&:hover {
		color: darkred;
	}
`;
const TotalAmount = styled.div`
	margin-top: 20px;
	font-size: 1.2rem;
	font-weight: bold;
	color: #0c1d2d;
	text-align: center;
`;
const ButtonWrapper = styled.div`
	display: flex;
	justify-content: space-between;
	margin-top: 20px;
	@media (max-width: 768px) {
		flex-direction: column;
		align-items: center;
	}
`;
const BackButton = styled.button`
	padding: 10px 20px;
	background: #ddd;
	color: black;
	border: none;
	font-size: 14px;
	transition: 0.3s;
	border-radius: 5px;
	width: 25%;
	cursor: pointer;
	&:hover {
		background: #ccc;
	}
	@media (max-width: 768px) {
		width: 100%;
		margin-bottom: 10px;
	}
`;
const CheckoutButton = styled.button`
	padding: 10px 20px;
	background: black;
	color: white;
	border: none;
	font-size: 14px;
	transition: 0.3s;
	width: 25%;
	border-radius: 5px;
	cursor: pointer;
	&:hover {
		background: #005f4e;
	}
	@media (max-width: 768px) {
		width: 100%;
		margin-bottom: 10px;
	}
`;
const ClearCartButton = styled.button`
	padding: 10px 20px;
	background: #4c1414;
	color: white;
	border: none;
	font-size: 14px;
	transition: 0.3s;
	width: 25%;
	border-radius: 5px;
	cursor: pointer;
	&:hover {
		background: darkred;
	}
	@media (max-width: 768px) {
		width: 100%;
	}
`;
const ReviewDetails = styled.div`
	display: flex;
	flex-direction: column;
	gap: 10px;
	margin-bottom: 20px;
	strong {
		font-weight: bold;
	}
`;
const ReviewItem = styled.p`
	font-size: 1rem;
	color: #333;
`;
const TermsWrapper = styled.div`
	margin-top: 20px;
	display: flex;
	flex-direction: column;
	align-items: flex-start;
`;
const TermsLink = styled.a`
	color: var(--primary-color);
	text-decoration: underline;
	margin-top: 10px;
	cursor: pointer;
	&:hover {
		color: var(--primary-color-dark);
	}
`;
const DiscountedTotal = styled.div`
	display: flex;
	justify-content: center;
	align-items: center;
	font-size: 1.2rem;
	font-weight: bold;
	color: #0c1d2d;
`;
const DiscountedPrice = styled.span`
	margin-left: 10px;
	font-weight: bold;
`;

// eslint-disable-next-line
const PayNowButton = styled.button`
	padding: 10px 20px;
	background: var(--button-bg-primary, #25a26f);
	color: white;
	border: none;
	font-size: 14px;
	transition: 0.3s;
	width: 100%;
	border-radius: 5px;
	cursor: pointer;
	margin-top: 15px;
	&:hover {
		background: #14885c;
	}
`;
