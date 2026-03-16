import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styled, { keyframes } from "styled-components";
import { FaTrashAlt } from "react-icons/fa";
import { useHistory } from "react-router-dom";
import { Checkbox, Modal } from "antd";
import { toast } from "react-toastify";
import PayPalCheckout from "./PayPalCheckout";
import { signup, signin, authenticate, isAuthenticated } from "../../auth";
import {
	trackCheckoutInitiated,
	trackPaymentInfoAdded,
	trackPurchaseCompleted,
} from "./checkoutAnalytics";
import { clearCheckoutDraft } from "./checkoutState";

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
	setStep,
	comments,
	appliedCoupon,
	goodCoupon,
	checkoutValue,
}) => {
	const [isModalVisible, setIsModalVisible] = useState(false);
	const [isTermsAccepted, setIsTermsAccepted] = useState(false);
	const checkoutInitiatedRef = useRef(false);
	const paymentInfoTrackedRef = useRef(false);

	const history = useHistory();
	const [authInfo, setAuthInfo] = useState(isAuthenticated() || {});
	const token = authInfo.token;
	const authUser = authInfo.user;
	const userId = authUser?._id;

	const orderData = useMemo(
		() => ({
			productsNoVariable: cart
				.filter((item) => !item.chosenProductAttributes)
				.map((item) => ({
					productId: item._id,
					name: item.name,
					ordered_quantity: item.amount,
					price: item.priceAfterDiscount,
					image: item.image,
					isPrintifyProduct: item.isPrintifyProduct,
					printifyProductDetails: item.printifyProductDetails,
					customDesign: item.customDesign,
					storeId: item.storeId,
				})),
			chosenProductQtyWithVariables: cart
				.filter((item) => item.chosenProductAttributes)
				.map((item) => ({
					productId: item._id,
					name: item.name,
					ordered_quantity: item.amount,
					price: item.priceAfterDiscount,
					image: item.chosenProductAttributes?.productImages?.[0]?.url || "",
					chosenAttributes: item.chosenProductAttributes,
					isPrintifyProduct: item.isPrintifyProduct,
					printifyProductDetails: item.printifyProductDetails,
					customDesign: item.customDesign,
					storeId: item.storeId,
				})),
			customerDetails: {
				name: customerDetails.name,
				email: customerDetails.email,
				phone: customerDetails.phone,
				shipToName: customerDetails.shipToName || customerDetails.name,
				address,
				city,
				state,
				zipcode,
				userId,
			},
			totalOrderQty: cart.reduce((sum, item) => sum + item.amount, 0),
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
			paymentProvider: "PayPal",
			orderComment: comments,
			privacyPolicyAgreement: isTermsAccepted,
			checkoutFunnel: {
				stage: "review",
				checkoutStep: step,
				checkoutValue,
				paymentMethod: "PayPal",
				couponCode:
					appliedCoupon?.coupon ||
					appliedCoupon?.name ||
					(goodCoupon ? "applied" : ""),
				openedAt: new Date().toISOString(),
			},
		}),
		[
			address,
			appliedCoupon,
			cart,
			checkoutValue,
			city,
			comments,
			customerDetails,
			goodCoupon,
			isTermsAccepted,
			shipmentChosen,
			state,
			step,
			total_amount,
			userId,
			zipcode,
		]
	);

	const cleanOrderData = useMemo(() => {
		const clone = JSON.parse(JSON.stringify(orderData));
		if (clone.chosenShippingOption) {
			const keep = ["carrierName", "shippingPrice"];
			Object.keys(clone.chosenShippingOption).forEach((key) => {
				if (!keep.includes(key)) delete clone.chosenShippingOption[key];
			});
		}
		return clone;
	}, [orderData]);

	useEffect(() => {
		if (!isModalVisible || checkoutInitiatedRef.current) return;
		checkoutInitiatedRef.current = true;
		trackCheckoutInitiated({
			cart,
			value: checkoutValue,
			email: customerDetails.email,
			phone: customerDetails.phone,
		});
	}, [
		cart,
		checkoutValue,
		customerDetails.email,
		customerDetails.phone,
		isModalVisible,
	]);

	const handleProceedToCheckout = async () => {
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

		if (!authInfo.user) {
			const { name, email, phone, password, confirmPassword } = customerDetails;
			if (!name || !email || !phone || !password || !confirmPassword) {
				setStep(1);
				return toast.error("Please complete all customer fields.");
			}
			if (name.trim().split(" ").length < 2) {
				return toast.error("First and last name are required.");
			}
			if (!/\S+@\S+\.\S+/.test(email)) {
				return toast.error("Invalid email address.");
			}
			if (!/^\d{10}$/.test(phone)) {
				return toast.error("Phone must be 10 digits.");
			}
			if (password.length < 6) {
				return toast.error("Password must be at least 6 characters.");
			}
			if (password !== confirmPassword) {
				return toast.error("Passwords do not match.");
			}
		}

		if (!authInfo.user) {
			const authOk = await handleSignupAndSignin();
			if (!authOk) return;
		}

		setIsModalVisible(true);
	};

	const handleSignupAndSignin = async () => {
		if (authInfo.user) return true;

		const { name, email, phone, password } = customerDetails;

		try {
			const signInRes = await signin({ emailOrPhone: email, password });
			if (!signInRes.error) {
				authenticate(signInRes, () => {});
				setAuthInfo(isAuthenticated() || {});
				return true;
			}

			const signUpRes = await signup({ name, email, password, phone });
			if (signUpRes.error) {
				toast.error(signUpRes.error);
				return false;
			}

			const secondSignIn = await signin({ emailOrPhone: email, password });
			if (secondSignIn.error) {
				toast.error(secondSignIn.error);
				return false;
			}

			authenticate(secondSignIn, () => {});
			setAuthInfo(isAuthenticated() || {});
			return true;
		} catch (error) {
			console.error("Auth error:", error);
			toast.error("Cannot create or log in.");
			return false;
		}
	};

	const handleTermsChange = async (event) => {
		const accepted = event.target.checked;
		setIsTermsAccepted(accepted);

		if (accepted && !paymentInfoTrackedRef.current) {
			paymentInfoTrackedRef.current = true;
			await trackPaymentInfoAdded({
				cart,
				value: checkoutValue,
				email: customerDetails.email,
				phone: customerDetails.phone,
				paymentType: "PayPal",
			});
		}
	};

	const handlePaymentSuccess = useCallback(async (paidOrder) => {
		await trackPurchaseCompleted({
			order: paidOrder || cleanOrderData,
			email: customerDetails.email,
			phone: customerDetails.phone,
		});
		clearCheckoutDraft();
	}, [cleanOrderData, customerDetails.email, customerDetails.phone]);

	const handlePaymentError = useCallback((msg) => {
		toast.error(msg);
	}, []);

	const totalAmountAdjusted = goodCoupon
		? (
				total_amount -
				Number(total_amount) * (appliedCoupon.discount / 100)
			).toFixed(2)
		: total_amount;

	return (
		<>
			{step === 3 && (
				<Step>
					<StepTitle>Review</StepTitle>

					<ReviewDetails>
						<ReviewItem>
							<strong>Name:</strong> {customerDetails.name}
						</ReviewItem>
						<ReviewItem>
							<strong>Phone:</strong> {customerDetails.phone}
						</ReviewItem>
						<ReviewItem>
							<strong>Ship to Name:</strong>{" "}
							{customerDetails.shipToName || customerDetails.name}
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

					<CartItems>
						{cart.map((item, index) => (
							<CartItem key={index}>
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

					<ButtonWrapper>
						<BackButton onClick={handlePreviousStep}>Back</BackButton>
						<CheckoutButton onClick={handleProceedToCheckout}>
							Proceed to Checkout
						</CheckoutButton>
						<ClearCartButton onClick={() => history.push("/our-products")}>
							Continue Shopping...
						</ClearCartButton>
					</ButtonWrapper>

					<Modal
						title='Confirm & Pay Securely'
						open={isModalVisible}
						onCancel={() => setIsModalVisible(false)}
						footer={null}
					>
						<TermsWrapper>
							<Checkbox checked={isTermsAccepted} onChange={handleTermsChange}>
								I agree to the terms and conditions
							</Checkbox>
							<TermsLink
								href='/privacy-policy-terms-conditions'
								target='_blank'
								rel='noreferrer'
							>
								Click here to read our terms and conditions
							</TermsLink>
							<TermsNote>
								Accept the terms to load the secure payment options below.
							</TermsNote>
						</TermsWrapper>

						{isTermsAccepted ? (
							<div style={{ marginTop: 20 }}>
								<PayPalCheckout
									orderData={cleanOrderData}
									authToken={token}
									onError={handlePaymentError}
									onSuccess={handlePaymentSuccess}
								/>
							</div>
						) : null}
					</Modal>
				</Step>
			)}
		</>
	);
};

export default Z4StepThree;

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
	margin-top: 8px;
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: 8px;
`;

const TermsLink = styled.a`
	color: var(--primary-color);
	text-decoration: underline;
	cursor: pointer;

	&:hover {
		color: var(--primary-color-dark);
	}
`;

const TermsNote = styled.p`
	margin: 0;
	font-size: 0.9rem;
	color: #5c5c5c;
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
