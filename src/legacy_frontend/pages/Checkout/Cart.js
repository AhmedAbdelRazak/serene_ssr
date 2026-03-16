import React, { useEffect, useState } from "react";
import styled, { css, keyframes } from "styled-components";
import { useHistory, useLocation } from "react-router-dom";
import { message } from "antd";
import { Helmet } from "react-helmet-async";
import { useCartContext } from "../../cart_context";
import { isAuthenticated } from "../../auth";
import { getShippingOptions, readSingleCoupon } from "../../apiCore";
import Z1CartDetails from "./Z1CartDetails";
import Z2StepOne from "./Z2StepOne";
import Z3StepTwo from "./Z3StepTwo";
import Z4StepThree from "./Z4StepThree";
import {
	trackCheckoutContactInfoSubmitted,
	trackCheckoutShippingInfoAdded,
	trackCheckoutStepView,
} from "./checkoutAnalytics";
import {
	buildCheckoutSearch,
	clearCheckoutDraft,
	parseCheckoutStep,
	readCheckoutDraft,
	writeCheckoutDraft,
} from "./checkoutState";

const EMPTY_CUSTOMER_DETAILS = {
	name: "",
	email: "",
	phone: "",
	password: "",
	confirmPassword: "",
	shipToName: "",
};

function getInitialDraft() {
	return readCheckoutDraft() || {};
}

function clampStep(value) {
	return Math.min(3, Math.max(1, Number(value) || 1));
}

const Cart = () => {
	const initialDraft = getInitialDraft();
	const history = useHistory();
	const location = useLocation();
	const { user } = isAuthenticated();
	const { cart, total_amount, addShipmentDetails, shipmentChosen, removeItem } =
		useCartContext();

	const [step, setStep] = useState(() =>
		parseCheckoutStep(
			typeof window !== "undefined" ? window.location.search : "",
			initialDraft.step || (user?.name && user?.phone ? 2 : 1)
		)
	);
	const [customerDetails, setCustomerDetails] = useState(() => ({
		...EMPTY_CUSTOMER_DETAILS,
		...(initialDraft.customerDetails || {}),
	}));
	const [passwordError, setPasswordError] = useState("");
	const [allShippingOptions, setAllShippingOptions] = useState([]);
	const [goodCoupon, setGoodCoupon] = useState(() => Boolean(initialDraft.goodCoupon));
	const [appliedCoupon, setAppliedCoupon] = useState(
		() => initialDraft.appliedCoupon || null
	);
	const [state, setState] = useState(() => initialDraft.state || "");
	const [address, setAddress] = useState(() => initialDraft.address || "");
	const [city, setCity] = useState(() => initialDraft.city || "");
	const [zipcode, setZipCode] = useState(() => initialDraft.zipcode || "");
	const [comments, setComments] = useState(() => initialDraft.comments || "");
	const [coupon, setCoupon] = useState(() => initialDraft.coupon || "");
	const [accountType, setAccountType] = useState(
		() => initialDraft.accountType || ""
	);

	const checkoutValue =
		goodCoupon && appliedCoupon
			? Number(
					total_amount - Number(total_amount) * (appliedCoupon.discount / 100)
				)
			: Number(total_amount);

	const updateStep = (nextStep) => {
		setStep((prevStep) => {
			const resolved = clampStep(nextStep);
			return prevStep === resolved ? prevStep : resolved;
		});
	};

	const handleApplyCoupon = () => {
		readSingleCoupon(coupon)
			.then((data) => {
				if (data.error) {
					message.error("Coupon is not available, please try another one");
					setGoodCoupon(false);
				} else if (new Date(data.expiry) < new Date()) {
					message.error("Coupon Expired. Please Try Another One");
					setGoodCoupon(false);
				} else if (data && data.length === 0) {
					message.error("Coupon is not available, please try another one");
					setGoodCoupon(false);
				} else {
					setGoodCoupon(true);
					setAppliedCoupon(data[0]);
				}
			})
			.catch((err) => {
				console.log(err);
				message.error("An error occurred while applying the coupon");
			});
	};

	useEffect(() => {
		let isMounted = true;
		getShippingOptions().then((data) => {
			if (!isMounted) return;
			if (data.error) {
				console.log(data.error);
				return;
			}
			setAllShippingOptions(data);

			const draft = readCheckoutDraft();
			if (!draft?.shipmentChosen) return;

			const matchingOption = data.find(
				(option) => option._id === draft.shipmentChosen?._id
			);
			if (matchingOption) {
				addShipmentDetails({
					...matchingOption,
					shippingPrice:
						draft.shipmentChosen?.shippingPrice ?? matchingOption.shippingPrice,
				});
				return;
			}

			if (draft.shipmentChosen?.carrierName) {
				addShipmentDetails(draft.shipmentChosen);
			}
		});

		return () => {
			isMounted = false;
		};
	}, [addShipmentDetails]);

	useEffect(() => {
		if (!user?.name) return;

		setCustomerDetails((prevDetails) => {
			const nextName = prevDetails.name || user.name;
			const nextEmail = prevDetails.email || user.email || "";
			const nextPhone = prevDetails.phone || user.phone || "";
			const nextShipToName = prevDetails.shipToName || user.name || "";
			const sameDetails =
				prevDetails.name === nextName &&
				prevDetails.email === nextEmail &&
				prevDetails.phone === nextPhone &&
				prevDetails.shipToName === nextShipToName;

			if (sameDetails) {
				return prevDetails;
			}

			return {
				...prevDetails,
				name: nextName,
				email: nextEmail,
				phone: nextPhone,
				shipToName: nextShipToName,
			};
		});
	}, [user?.email, user?.name, user?.phone]);

	useEffect(() => {
		const params = new URLSearchParams(
			location.search.startsWith("?")
				? location.search.slice(1)
				: location.search
		);
		if (!params.has("step")) {
			return;
		}

		const stepFromSearch = parseCheckoutStep(location.search, 1);
		setStep((prevStep) => (prevStep === stepFromSearch ? prevStep : stepFromSearch));
	}, [location.search]);

	useEffect(() => {
		const nextSearch = buildCheckoutSearch(location.search, step);
		if (nextSearch !== location.search) {
			history.replace({
				pathname: location.pathname,
				search: nextSearch,
			});
		}
	}, [history, location.pathname, location.search, step]);

	useEffect(() => {
		if (!cart?.length) {
			clearCheckoutDraft();
			return;
		}

		writeCheckoutDraft({
			step,
			customerDetails,
			goodCoupon,
			appliedCoupon,
			state,
			address,
			city,
			zipcode,
			comments,
			coupon,
			accountType,
			shipmentChosen:
				shipmentChosen && shipmentChosen.carrierName ? shipmentChosen : null,
		});
	}, [
		accountType,
		address,
		appliedCoupon,
		cart,
		city,
		comments,
		coupon,
		customerDetails,
		goodCoupon,
		shipmentChosen,
		state,
		step,
		zipcode,
	]);

	useEffect(() => {
		if (!cart?.length) return;
		trackCheckoutStepView({
			step,
			cart,
			value: checkoutValue,
		});
	}, [cart, checkoutValue, step]);

	const handleNextStep = () => {
		if (step === 1) {
			const { name, email, phone, password, confirmPassword } = customerDetails;

			if (
				!name ||
				!email ||
				!phone ||
				(!isAuthenticated() && (!password || !confirmPassword))
			) {
				message.error("Please fill in all required fields.");
				return;
			}

			if (name.split(" ").length < 2) {
				message.error("Please enter both first and last names.");
				return;
			}

			if (!/\S+@\S+\.\S+/.test(email)) {
				message.error("Please enter a valid email address.");
				return;
			}

			if (!/^\d{10}$/.test(phone)) {
				message.error("Please enter a valid 10-digit phone number.");
				return;
			}

			if (!isAuthenticated() && password !== confirmPassword) {
				setPasswordError("Passwords do not match");
				return;
			}

			setPasswordError("");
			trackCheckoutContactInfoSubmitted({
				cart,
				value: checkoutValue,
			});
		}

		if (step === 2) {
			if (
				!customerDetails.shipToName ||
				!address ||
				!city ||
				!state ||
				!/^\d{5}$/.test(zipcode) ||
				!shipmentChosen ||
				!shipmentChosen.carrierName
			) {
				if (!customerDetails.shipToName) {
					message.error("Please enter the recipient's name.");
				} else if (!address) {
					message.error("Please provide a valid address.");
				} else if (!city) {
					message.error("Please provide a valid city.");
				} else if (!state) {
					message.error("Please select your state.");
				} else if (!/^\d{5}$/.test(zipcode)) {
					message.error("Please enter a valid 5-digit zipcode.");
				} else if (!shipmentChosen || !shipmentChosen.carrierName) {
					message.error("Please choose a shipping option.");
				}
				return;
			}

			trackCheckoutShippingInfoAdded({
				cart,
				value: checkoutValue,
				shippingTier: shipmentChosen?.carrierName || "",
			});
		}

		updateStep(step + 1);
	};

	const handlePreviousStep = () => {
		updateStep(step - 1);
	};

	const handleCustomerDetailChange = (e) => {
		const { name, value } = e.target;
		setCustomerDetails((prevDetails) => ({
			...prevDetails,
			[name]: value,
		}));
	};

	const handleAccountTypeChange = (newAccountType) => {
		setAccountType(newAccountType);
		if (newAccountType === "guest") {
			setCustomerDetails((prevDetails) => ({
				...prevDetails,
				password: "SereneJannat123!",
				confirmPassword: "SereneJannat123!",
			}));
			return;
		}

		setCustomerDetails((prevDetails) => ({
			...prevDetails,
			password: "",
			confirmPassword: "",
		}));
	};

	return (
		<CartWrapper>
			<Helmet>
				<title>Checkout - Serene Jannat</title>
				<meta
					name='description'
					content='Complete your purchase at Serene Jannat. Review your cart, provide shipping details, and proceed to checkout for the best online shopping experience.'
				/>
				<meta
					name='keywords'
					content='Serene Jannat, checkout, cart, online shopping, shipping details, purchase, best gifts'
				/>
				<meta property='og:title' content='Checkout - Serene Jannat' />
				<meta
					property='og:description'
					content='Complete your purchase at Serene Jannat. Review your cart, provide shipping details, and proceed to checkout for the best online shopping experience.'
				/>
				<meta property='og:url' content='https://serenejannat.com/cart' />
				<link rel='canonical' href='https://serenejannat.com/cart' />
				<meta property='og:type' content='website' />
			</Helmet>
			{cart && cart.length === 0 ? (
				<div>
					<h3
						style={{
							textAlign: "center",
							marginTop: "20px",
							fontWeight: "bold",
						}}
					>
						Your Cart Is Empty...
					</h3>
				</div>
			) : (
				<>
					<StepIndicator>Step {step} of 3</StepIndicator>
					<Z1CartDetails
						appliedCoupon={appliedCoupon}
						goodCoupon={goodCoupon}
					/>
					<CouponWrapper>
						<div className='row'>
							<div className='col-md-6 my-auto'>
								<Input
									type='text'
									name='coupon'
									placeholder='Enter Coupon Code'
									value={coupon}
									onChange={(e) => setCoupon(e.target.value)}
								/>
							</div>

							<div className='col-md-6 mx-auto text-center my-auto'>
								<ApplyCouponButton onClick={handleApplyCoupon}>
									Apply Coupon
								</ApplyCouponButton>
							</div>
							{goodCoupon ? (
								<div
									style={{
										fontSize: "0.78rem",
										fontWeight: "bold",
										color: "darkgreen",
									}}
								>
									Congrats! You got {appliedCoupon && appliedCoupon.discount}%
									OFF of your purchase.
								</div>
							) : null}
						</div>
					</CouponWrapper>
					<StepTransition step={step}>
						<Z2StepOne
							step={step}
							customerDetails={customerDetails}
							handleCustomerDetailChange={handleCustomerDetailChange}
							handleNextStep={handleNextStep}
							passwordError={passwordError}
							accountType={accountType}
							handleAccountTypeChange={handleAccountTypeChange}
						/>
						<Z3StepTwo
							step={step}
							handleShippingOptionChange={(e) => {
								const chosenOption = allShippingOptions.find(
									(option) => option._id === e.target.value
								);
								addShipmentDetails(chosenOption);
							}}
							handleStateChange={(value) => setState(value)}
							handleAddressChange={(e) => setAddress(e.target.value)}
							handleCityChange={(e) => setCity(e.target.value)}
							allShippingOptions={allShippingOptions}
							handlePreviousStep={handlePreviousStep}
							handleNextStep={handleNextStep}
							state={state}
							address={address}
							city={city}
							setCity={setCity}
							comments={comments}
							handleCommentsChange={(e) => setComments(e.target.value)}
							shipmentChosen={shipmentChosen}
							zipcode={zipcode}
							handleZipCodeChange={(e) => setZipCode(e.target.value)}
							customerDetails={customerDetails}
							handleCustomerDetailChange={handleCustomerDetailChange}
						/>
						<Z4StepThree
							step={step}
							customerDetails={customerDetails}
							state={state}
							address={address}
							city={city}
							handlePreviousStep={handlePreviousStep}
							zipcode={zipcode}
							shipmentChosen={shipmentChosen}
							cart={cart}
							total_amount={total_amount}
							removeItem={(id, size, color) => removeItem(id, size, color)}
							user={user}
							setStep={updateStep}
							comments={comments}
							coupon={coupon}
							appliedCoupon={appliedCoupon}
							goodCoupon={goodCoupon}
							checkoutValue={checkoutValue}
						/>
					</StepTransition>
				</>
			)}
		</CartWrapper>
	);
};

export default Cart;

const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateX(100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
`;

const StepTransition = styled.div`
	${(props) =>
		props.step === 1
			? css`
					animation: ${fadeIn} 0.5s forwards;
				`
			: props.step === 2
				? css`
						animation: ${fadeIn} 0.5s forwards;
					`
				: css`
						animation: ${fadeIn} 0.5s forwards;
					`}
`;

const CartWrapper = styled.div`
	padding: 20px;
	max-width: 900px;
	margin: 100px auto;
	background-color: #ffffff;
	border-radius: 10px;
	box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
	min-height: 1000px;
	overflow: hidden !important;

	@media (max-width: 768px) {
		padding: 10px;
		margin: 50px auto;
	}

	.ant-collapse-header-text {
		font-weight: bolder !important;
		font-size: 1rem;
	}
`;

const StepIndicator = styled.p`
	text-align: center;
	font-size: 1.2rem;
	font-weight: bold;
	margin-bottom: 20px;
`;

const CouponWrapper = styled.div`
	margin: 20px 0;
	display: flex;
	justify-content: center;
	input {
		width: 100%;
	}

	@media (max-width: 670px) {
		input {
			width: 100%;
		}
	}
`;

const Input = styled.input`
	padding: 10px;
	margin: 10px 0;
	border: 1px solid #ccc;
	border-radius: 5px;
	font-size: 1rem;
`;

const ApplyCouponButton = styled.button`
	padding: 5px 10px;
	background-color: #005f4e;
	color: white;
	border: none;
	border-radius: 5px;
	cursor: pointer;
	&:hover {
		background-color: #00493e;
	}

	@media (max-width: 700px) {
		padding: 5px;
		font-size: 13px;
		width: 50%;
		text-align: center;
		margin: auto;
	}
`;
