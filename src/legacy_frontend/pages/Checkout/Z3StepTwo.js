import React from "react";
import styled, { keyframes } from "styled-components";
import { Select } from "antd";
import { states } from "../../Global";
import { useCartContext } from "../../cart_context"; // <-- import cart context to access cart

const { Option } = Select;

const Z3StepTwo = ({
	step,
	handleShippingOptionChange, // We'll keep it, though we're using our own handler
	handleStateChange,
	handleAddressChange,
	handleCityChange,
	allShippingOptions,
	handlePreviousStep,
	handleNextStep,
	state,
	address,
	city,
	comments,
	handleCommentsChange,
	shipmentChosen,
	zipcode,
	handleZipCodeChange,
	customerDetails,
	handleCustomerDetailChange,
}) => {
	const { cart, addShipmentDetails } = useCartContext();

	// 1) Does the cart have at least one Printify item?
	const hasPrintifyItem = cart.some((item) => item.isPrintifyProduct);

	// 2) Specifically, does the cart have a Printify item with a custom design?
	const hasCustomDesignPOD = cart.some(
		(item) => item.isPrintifyProduct && item.customDesign
	);

	// 3) Check if multiple store IDs
	const distinctStoreIds = [...new Set(cart.map((item) => item.storeId))];
	const hasMultipleStores = distinctStoreIds.length > 1;

	// 4) Helper to compute shipping cost (original logic) + 75% extra if multiple stores
	const getFinalShippingCost = (option) => {
		const personalStockCount = cart.filter(
			(item) => !item.isPrintifyProduct
		).length;
		// eslint-disable-next-line
		const printifyCount = cart.filter((item) => item.isPrintifyProduct).length;

		let finalPrice = 0;
		// If there's at least one personal-stock item, start with option.shippingPrice
		if (personalStockCount > 0) {
			finalPrice += option.shippingPrice;
			// Add $3 for each additional personal-stock item beyond the first
			if (personalStockCount > 1) {
				finalPrice += (personalStockCount - 1) * 3;
			}
		}
		// For Printify items, add $4 for each
		// ----------------------------------------------
		// Updated logic to handle "Mug" vs. non-mug, plus +4 for each additional POD item
		cart
			.filter((item) => item.isPrintifyProduct)
			.forEach((item) => {
				const isMug = item.name.toLowerCase().includes("mug");
				const isCandle = item.name.toLowerCase().includes("candle");
				const basePrice = isMug || isCandle ? 8 : 6; // If "Mug" in name => 8, otherwise 6
				const quantity = item.amount || 1;

				// Add base for the first POD product
				finalPrice += basePrice;

				// For each extra unit of this product => +4
				if (quantity > 1) {
					finalPrice += 4 * (quantity - 1);
				}
			});
		// ----------------------------------------------

		// If there are multiple store IDs, add a 75% surcharge
		if (hasMultipleStores) {
			finalPrice *= 1.75;
		}

		return finalPrice;
	};

	// 5) When user picks a shipping option, compute final shipping & save to cart context
	const handleLocalShippingOptionChange = (optionId) => {
		const chosenOption = allShippingOptions.find((opt) => opt._id === optionId);
		if (!chosenOption) return;

		const finalShippingPrice = getFinalShippingCost(chosenOption);
		const finalChosenOption = {
			...chosenOption,
			shippingPrice: finalShippingPrice,
		};
		addShipmentDetails(finalChosenOption);
	};

	// 6) Cities eligible for local shipping (Pickup/Local Delivery)
	const closeCities = [
		"San Bernardino",
		"Riverside",
		"Redlands",
		"Ontario",
		"Fontana",
		"Rancho Cucamonga",
		"Colton",
		"Loma Linda",
		"Highland",
		"Hesperia",
		"Moreno Valley",
		"Crestline",
		"Twin Peaks",
		"Big Bear",
		"Blue Jay",
		"Inland Empire",
		"Anaheim",
		"Orange County",
		"Banning",
		"Redlands", // Even if duplicated
		"Upland",
		"Chino",
		"Montclair",
	];

	// Both "Pickup" and "Local Delivery" IDs
	const localShippingIDs = [
		"67ef156040130b857c44baa1",
		"67ef157340130b857c44baa5",
	];

	// 7) Filter shipping options (original style):
	//    - Exclude local shipping if:
	//         1) not in California, OR
	//         2) city/address not in closeCities, OR
	//         3) there's at least 1 Printify item in the cart
	//    - Otherwise (UPS/USPS) show it for everyone
	const filteredShippingOptions = allShippingOptions.filter((option) => {
		if (localShippingIDs.includes(option._id)) {
			// If there's a Printify item, exclude local shipping
			if (hasPrintifyItem) {
				return false;
			}
			// If not California, exclude
			if (state.toLowerCase() !== "california") {
				return false;
			}
			// Must match city or address to at least one "closeCity"
			const cityMatch = closeCities.some((c) =>
				city.toLowerCase().includes(c.toLowerCase())
			);
			const addressMatch = closeCities.some((c) =>
				address.toLowerCase().includes(c.toLowerCase())
			);
			if (!cityMatch && !addressMatch) {
				return false;
			}
			// Passed all checks => local shipping is allowed
			return true;
		}
		// If it's not a local shipping option, show it across the board (UPS, USPS, etc.)
		return true;
	});

	return (
		<>
			{step === 2 && (
				<Step>
					<StepTitle>Shipping Options</StepTitle>

					{/* Name */}
					<ShippingOption>
						<label className='mb-0 mt-3'>Ship To Name</label>
						<Input
							type='text'
							name='shipToName'
							placeholder='Enter recipient name'
							value={customerDetails.shipToName}
							onChange={handleCustomerDetailChange}
						/>
					</ShippingOption>

					{/* State */}
					<ShippingOption>
						<label className='mb-0 mt-3'>Ship To State</label>
						<Select
							placeholder='Select a state'
							value={state}
							onChange={handleStateChange}
							style={{ width: "100%" }}
						>
							{states.map((st, i) => (
								<Option key={i} value={st.name}>
									{st.name}
								</Option>
							))}
						</Select>
					</ShippingOption>

					{/* Address, City, Zip */}
					<ShippingOptionRow>
						<ShippingOptionWrapper>
							<label className='mb-0 mt-3'>Ship To Address</label>
							<Input
								type='text'
								name='address'
								placeholder='Enter shipping address'
								value={address}
								onChange={handleAddressChange}
							/>
						</ShippingOptionWrapper>

						<ShippingOptionWrapper>
							<label className='mb-0 mt-3'>Ship To City</label>
							<Input
								type='text'
								name='city'
								placeholder='Enter city'
								value={city}
								onChange={handleCityChange}
							/>
						</ShippingOptionWrapper>

						<ShippingOptionWrapper>
							<label className='mb-0 mt-3'>Zip Code</label>
							<Input
								type='text'
								name='zipcode'
								placeholder='Enter zip code'
								value={zipcode}
								onChange={handleZipCodeChange}
							/>
						</ShippingOptionWrapper>
					</ShippingOptionRow>

					{/* Comments */}
					<ShippingOption>
						<label
							className='mb-0 mt-3'
							style={{ fontWeight: "bold", fontSize: "1.1rem" }}
						>
							Comments
						</label>
						<div className='commentNote'>
							Add special instructions here such as requesting a handwritten
							card for a special occasion or any other details we would need to
							know to best fulfill your order
							<br />
							{/* <span className='noteMessage'>
								Please note: We currently do not offer cards for candle and
								t-shirt shipments.
							</span> */}
						</div>
						<TextArea
							rows={4}
							placeholder='Enter any additional comments'
							value={comments}
							onChange={handleCommentsChange}
						/>
					</ShippingOption>

					{/* 8) Show the Printify POD note if there's a product with custom design */}
					{hasCustomDesignPOD && (
						<PODNote>
							Your custom-designed item requires extra production time. Please
							note that it can take up to <strong>10 days</strong> for Print on
							Demand (POD) items to be produced and shipped. We appreciate your
							patience and look forward to delivering your unique design!
						</PODNote>
					)}

					{/* 9) If multiple stores, show a special note */}
					{hasMultipleStores && (
						<MultipleStoresNote>
							<strong>Note:</strong> Your order contains products from multiple
							stores. Shipping fees include a extra surcharge to handle separate
							shipments.
						</MultipleStoresNote>
					)}

					{/* Choose a carrier */}
					<label
						className='mt-3'
						style={{ fontWeight: "bold", fontSize: "1.2rem" }}
					>
						Choose a carrier
					</label>

					{/* Display only the filtered shipping options */}
					{filteredShippingOptions.map((option) => {
						const finalShippingCost = getFinalShippingCost(option);
						return (
							<ShippingOption key={option._id}>
								<ShippingLabel>
									<input
										type='radio'
										name='shippingOption'
										value={option._id}
										checked={shipmentChosen._id === option._id}
										onChange={() => handleLocalShippingOptionChange(option._id)}
									/>
									{option.carrierName} - ${finalShippingCost.toFixed(2)}
								</ShippingLabel>
							</ShippingOption>
						);
					})}

					<ButtonWrapper>
						<BackButton onClick={handlePreviousStep}>Back</BackButton>
						<ContinueButton
							onClick={handleNextStep}
							disabled={
								!customerDetails.shipToName ||
								!address ||
								!city ||
								!state ||
								!/^\d{5}$/.test(zipcode) ||
								!shipmentChosen ||
								!shipmentChosen.carrierName
							}
						>
							Continue
						</ContinueButton>
					</ButtonWrapper>
				</Step>
			)}
		</>
	);
};

export default Z3StepTwo;

// -------------------------- STYLES --------------------------------

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

const Input = styled.input`
	padding: 10px;
	margin: 10px 0;
	border: 1px solid #ccc;
	border-radius: 5px;
	font-size: 1rem;
	width: 100%;
`;

const TextArea = styled.textarea`
	padding: 10px;
	margin: 10px 0;
	border: 1px solid #ccc;
	border-radius: 5px;
	font-size: 1rem;
	width: 100%;
`;

const ShippingOption = styled.div`
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	margin-bottom: 10px;

	.noteMessage {
		color: lightcoral;
		text-transform: capitalize;
	}

	.commentNote {
		font-size: 0.75rem;
		width: 80%;
		padding: 2px;
		color: darkgrey;
		font-weight: bolder;

		@media (max-width: 750px) {
			width: 95%;
		}
	}

	input {
		margin-right: 10px;
	}

	label {
		font-size: 1rem;
	}
`;

const PODNote = styled.div`
	margin: 20px 0;
	padding: 15px;
	border: 1px solid #f0c14b;
	background-color: #fff8e1;
	border-radius: 5px;
	color: #333;
	font-size: 0.9rem;
	font-weight: bold;
	line-height: 1.4;
`;

const MultipleStoresNote = styled.div`
	margin: 20px 0;
	padding: 15px;
	border: 1px solid #e38f9e;
	background-color: #fff0f3;
	border-radius: 5px;
	color: #333;
	font-size: 0.9rem;
	font-weight: bold;
	line-height: 1.4;
`;

const ShippingOptionRow = styled.div`
	display: flex;
	width: 100%;
	flex-wrap: wrap;
	gap: 10px; // Add gap between columns

	@media (max-width: 768px) {
		flex-direction: column;
	}
`;

const ShippingOptionWrapper = styled.div`
	flex: 1; // Evenly distribute space among children
	min-width: 200px; // Minimum width to prevent collapsing
	display: flex;
	flex-direction: column;

	@media (max-width: 768px) {
		width: 100%;
	}
`;

const ShippingLabel = styled.label`
	font-size: 1rem;
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

const ContinueButton = styled.button`
	padding: 10px 20px;
	background: ${(props) => (props.disabled ? "#ccc" : "black")};
	color: ${(props) => (props.disabled ? "#666" : "white")};
	border: none;
	font-size: 14px;
	transition: 0.3s;
	width: 25%;
	border-radius: 5px;
	cursor: ${(props) => (props.disabled ? "not-allowed" : "pointer")};
	&:hover {
		background: ${(props) => (props.disabled ? "#ccc" : "#005f4e")};
	}
	@media (max-width: 768px) {
		width: 100%;
		margin-bottom: 10px;
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
