import React, { useEffect, useState } from "react";
import { FaTrashAlt, FaChevronDown, FaChevronUp } from "react-icons/fa";
import { Collapse, Modal } from "antd";
import { useCartContext } from "../../cart_context";
import styled from "styled-components";
import { getColors } from "../../apiCore"; // Ensure the path is correct

const Z1CartDetails = ({ appliedCoupon, goodCoupon }) => {
	const {
		cart,
		total_amount,
		removeItem,
		clearCart,
		toggleAmount,
		changeColor,
		changeSize,
		changeScent, // <-- If you allow changing scents, ensure your context has this
		// eslint-disable-next-line
		shipmentChosen,
	} = useCartContext();

	const [allColors, setAllColors] = useState([]);
	const [modalItem, setModalItem] = useState(null);

	useEffect(() => {
		// Fetch all available colors (for color naming)
		getColors().then((data) => {
			if (data.error) {
				console.log(data.error);
			} else {
				setAllColors(data);
			}
		});
	}, []);

	// If the coupon is good, apply the discount
	const totalAmountAdjusted = goodCoupon
		? (
				total_amount -
				Number(total_amount) * (appliedCoupon.discount / 100)
			).toFixed(2)
		: total_amount;

	const handleClickImage = (item) => {
		// If you want a modal for product image/design, store item in state
		setModalItem(item);
	};

	return (
		<Z1CartDetailsWrapper>
			<Collapse
				expandIconPosition='right'
				bordered={false}
				expandIcon={({ isActive }) =>
					isActive ? <FaChevronUp /> : <FaChevronDown />
				}
				items={[
					{
						key: "1",
						label: "Cart Details",
						children: (
							<CartItems>
						{cart.map((item, i) => {
							const product = item.allProductDetailsIncluded || {};
							const productAttrs = product.productAttributes || [];

							// gather unique colors/sizes/scents from productAttrs
							const uniqueProductColors = [
								...new Set(productAttrs.map((attr) => attr.color)),
							].filter((c) => c && c !== "nocolor");
							const uniqueProductSizes = [
								...new Set(productAttrs.map((attr) => attr.size)),
							].filter((s) => s && s !== "nosizes");
							const uniqueProductScents = [
								...new Set(productAttrs.map((attr) => attr.scent)),
							].filter((sc) => sc && sc !== "noscent");

							// find the matching local attribute
							const chosenAttr = productAttrs.find(
								(attr) =>
									attr.color === item.color &&
									attr.size === item.size &&
									// if your product doesn't have a scent, it won't match anyway
									attr.scent === item.scent
							);

							// max quantity
							const maxQuantity = chosenAttr
								? chosenAttr.quantity
								: product.quantity || item.max || 999;

							// if product is POD => disable color/size/scent changes
							const isPodProduct =
								item.isPrintifyProduct &&
								product.printifyProductDetails?.POD === true;

							return (
								<CartItem key={i}>
									<ItemImage
										src={item.image}
										alt={item.name}
										onClick={() => handleClickImage(item)}
									/>
									<ItemDetails>
										<ItemName>{item.name}</ItemName>

										{/* Quantity increment/decrement with maxQuantity */}
										<QuantityWrapper>
											<QuantityButton
												onClick={() =>
													toggleAmount(
														item.id,
														"dec",
														item.chosenProductAttributes,
														maxQuantity
													)
												}
											>
												-
											</QuantityButton>
											<ItemQuantity>{item.amount}</ItemQuantity>
											<QuantityButton
												onClick={() =>
													toggleAmount(
														item.id,
														"inc",
														item.chosenProductAttributes,
														maxQuantity
													)
												}
											>
												+
											</QuantityButton>
										</QuantityWrapper>

										<ItemPrice>Price: ${item.priceAfterDiscount}</ItemPrice>
										<ItemTotal>
											Item Total: $
											{(item.priceAfterDiscount * item.amount).toFixed(2)}
										</ItemTotal>

										{/* If we have chosenProductAttributes => show color/size/scent (if present) */}
										{item.chosenProductAttributes && (
											<AttributeWrapper>
												{/* ===== COLOR SELECT ===== */}
												{uniqueProductColors.length > 0 && (
													<>
														{isPodProduct && item.customDesign ? (
															// POD with customDesign => single disabled option
															<AttributeSelect
																disabled
																style={{ color: "grey" }}
																value={
																	item.customDesign.variants?.color?.title ||
																	item.customDesign.color ||
																	item.color
																}
															>
																<option
																	value={
																		item.customDesign.variants?.color?.title ||
																		item.customDesign.color ||
																		item.color
																	}
																>
																	{item.customDesign.variants?.color?.title ||
																		item.customDesign.color ||
																		item.color}
																</option>
															</AttributeSelect>
														) : (
															// Normal color select => multiple options
															<AttributeSelect
																disabled={isPodProduct}
																style={{
																	color: isPodProduct ? "grey" : "inherit",
																}}
																value={item.color}
																onChange={(e) => {
																	if (!isPodProduct) {
																		const newColor = e.target.value;
																		// find matching attribute with the new color
																		const chosenColorImageHelper =
																			productAttrs.find(
																				(attr) => attr.color === newColor
																			);
																		const chosenColorImage =
																			chosenColorImageHelper?.productImages?.[0]
																				?.url;
																		const chosenAttribute2 = productAttrs.find(
																			(attr) =>
																				attr.color?.toLowerCase() ===
																					newColor.toLowerCase() &&
																				attr.size?.toLowerCase() ===
																					item.size.toLowerCase() &&
																				attr.scent?.toLowerCase() ===
																					item.scent?.toLowerCase()
																		);
																		const newQuantity =
																			chosenAttribute2?.quantity || 0;

																		changeColor(
																			item.id,
																			newColor,
																			item.size,
																			chosenColorImage,
																			newQuantity,
																			item.color
																			// If you also need to pass scent, add item.scent here
																		);
																	}
																}}
															>
																{uniqueProductColors.map((cc, ii) => {
																	const colorName = allColors.find(
																		(c) => c.hexa === cc
																	)?.color;
																	return (
																		<option key={ii} value={cc}>
																			{colorName || cc}
																		</option>
																	);
																})}
															</AttributeSelect>
														)}
													</>
												)}

												{/* ===== SIZE SELECT ===== */}
												{uniqueProductSizes.length > 0 && (
													<>
														{isPodProduct && item.customDesign ? (
															// POD => single disabled option for size
															<AttributeSelect
																disabled
																style={{ color: "grey" }}
																value={
																	item.customDesign.variants?.size?.title ||
																	item.customDesign.size ||
																	item.size
																}
															>
																<option
																	value={
																		item.customDesign.variants?.size?.title ||
																		item.customDesign.size ||
																		item.size
																	}
																>
																	{item.customDesign.variants?.size?.title ||
																		item.customDesign.size ||
																		item.size}
																</option>
															</AttributeSelect>
														) : (
															// Normal size select => multiple options
															<AttributeSelect
																disabled={isPodProduct}
																style={{
																	color: isPodProduct ? "grey" : "inherit",
																}}
																value={item.size}
																onChange={(e) => {
																	if (!isPodProduct) {
																		const newSize = e.target.value;
																		const chosenAttribute2 = productAttrs.find(
																			(attr) =>
																				attr.size?.toLowerCase() ===
																					newSize.toLowerCase() &&
																				attr.color?.toLowerCase() ===
																					item.color.toLowerCase() &&
																				attr.scent?.toLowerCase() ===
																					item.scent?.toLowerCase()
																		);
																		const newQuantity =
																			chosenAttribute2?.quantity || 0;

																		changeSize(
																			item.id,
																			newSize,
																			item.color,
																			newQuantity,
																			item.size
																		);
																	}
																}}
															>
																{uniqueProductSizes.map((ss, ii) => (
																	<option key={ii} value={ss}>
																		{ss}
																	</option>
																))}
															</AttributeSelect>
														)}
													</>
												)}

												{/* ===== SCENT SELECT ===== */}
												{uniqueProductScents.length > 0 && (
													<>
														{isPodProduct && item.customDesign ? (
															// POD => single disabled option for scent
															<AttributeSelect
																disabled
																style={{ color: "grey" }}
																value={
																	item.customDesign.variants?.scent?.title ||
																	item.customDesign.scent ||
																	item.scent
																}
															>
																<option
																	value={
																		item.customDesign.variants?.scent?.title ||
																		item.customDesign.scent ||
																		item.scent
																	}
																>
																	{item.customDesign.variants?.scent?.title ||
																		item.customDesign.scent ||
																		item.scent}
																</option>
															</AttributeSelect>
														) : (
															// Normal scent select => multiple options
															<AttributeSelect
																disabled={isPodProduct}
																style={{
																	color: isPodProduct ? "grey" : "inherit",
																}}
																value={item.scent}
																onChange={(e) => {
																	if (!isPodProduct && changeScent) {
																		const newScent = e.target.value;
																		const chosenAttribute2 = productAttrs.find(
																			(attr) =>
																				attr.scent?.toLowerCase() ===
																					newScent.toLowerCase() &&
																				attr.size?.toLowerCase() ===
																					item.size.toLowerCase() &&
																				attr.color?.toLowerCase() ===
																					item.color.toLowerCase()
																		);
																		const newQuantity =
																			chosenAttribute2?.quantity || 0;

																		changeScent(
																			item.id,
																			newScent,
																			item.color,
																			item.size,
																			newQuantity,
																			item.scent
																		);
																	}
																}}
															>
																{uniqueProductScents.map((sc, index) => (
																	<option key={index} value={sc}>
																		{sc}
																	</option>
																))}
															</AttributeSelect>
														)}
													</>
												)}
											</AttributeWrapper>
										)}

										<RemoveButton
											onClick={() => removeItem(item.id, item.size, item.color)}
										>
											<FaTrashAlt />
										</RemoveButton>
									</ItemDetails>
								</CartItem>
							);
						})}

						<TotalAmount>
							{goodCoupon ? (
								<DiscountedTotal>
									Total Amount:{" "}
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

						<ClearCartButton onClick={clearCart}>Clear Cart</ClearCartButton>
					</CartItems>
						),
					},
				]}
			/>

			{/* Optional modal for product image */}
			<Modal
				open={!!modalItem}
				onCancel={() => setModalItem(null)}
				footer={null}
				title={null}
				closable={true}
				centered
				bodyStyle={{ padding: "10px", textAlign: "center" }}
				maskClosable
				width='auto'
				zIndex={9999}
			>
				{modalItem && (
					<img
						src={modalItem.image}
						alt={modalItem.name}
						style={{
							maxWidth: "90vw",
							maxHeight: "70vh",
							objectFit: "contain",
						}}
					/>
				)}
			</Modal>
		</Z1CartDetailsWrapper>
	);
};

export default Z1CartDetails;

/* ========================== Styled Components ========================== */

const Z1CartDetailsWrapper = styled.div`
	.ant-collapse-header-text {
		background-color: var(--button-bg-primary) !important;
		padding: 5px;
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
	cursor: pointer;
`;

const ItemDetails = styled.div`
	display: flex;
	flex-direction: column;
	width: 100%;
	position: relative;
`;

const ItemName = styled.p`
	font-weight: bold;
	margin-bottom: 5px;
	text-transform: capitalize;
	font-size: 0.9rem;
`;

const QuantityWrapper = styled.div`
	display: flex;
	align-items: center;
	margin-bottom: 10px;
	font-size: 0.9rem;
`;

const QuantityButton = styled.button`
	background: #ddd;
	border: none;
	padding: 5px 10px;
	cursor: pointer;
	font-size: 0.9rem;

	&:hover {
		background: #ccc;
	}
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

const ItemTotal = styled.p`
	font-weight: bold;
	color: #0c1d2d;
	font-size: 0.9rem;
	margin-top: 5px;
`;

const AttributeWrapper = styled.div`
	display: flex;
	align-items: center;
	margin-top: 10px;
	flex-wrap: wrap;
	gap: 10px;
`;

const AttributeSelect = styled.select`
	padding: 5px;
	border: 1px solid #ccc;
	border-radius: 5px;
	cursor: pointer;

	&:hover {
		border-color: #888;
	}

	&:disabled {
		background-color: #ebebeb;
		cursor: not-allowed;
	}
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
