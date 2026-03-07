import React, { useEffect, useState } from "react";
import styled, { keyframes, css } from "styled-components";
import { FaTimes, FaTrashAlt } from "react-icons/fa";
import { useCartContext } from "../cart_context";
import { Link } from "react-router-dom";
import { getColors } from "../apiCore";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import ReactGA from "react-ga4";
import ReactPixel from "react-facebook-pixel";
import { Modal } from "antd";
import axios from "axios";
import { isAuthenticated } from "../auth";

/* Keyframe animations */
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

const fadeOut = keyframes`
  from {
    opacity: 1;
    transform: translateX(0);
  }
  to {
    opacity: 0;
    transform: translateX(100%);
  }
`;

const SidebarCart = ({ from }) => {
	const {
		closeSidebar2,
		isSidebarOpen2,
		cart,
		toggleAmount,
		changeColor,
		changeSize,
		changeScent, // <-- you need this if you actually allow changing the scent in-cart
		removeItem,
		clearCart,
		total_amount,
	} = useCartContext();

	const [allColors, setAllColors] = useState([]);
	const [modalItem, setModalItem] = useState(null); // For optional product-image popup

	// Fetch color data once
	useEffect(() => {
		getColors().then((data) => {
			if (data.error) {
				console.log(data.error);
			} else {
				setAllColors(data);
			}
		});
	}, []);

	/**
	 * ----------------------------------------------------------------------------
	 * “Stock availability” check: now includes color + size + scent,
	 * and also allows backorder if it's a POD or otherwise.
	 * ----------------------------------------------------------------------------
	 */
	const checkingAvailability = cart.map((item) => {
		const product = item.allProductDetailsIncluded || {};
		const productAttrs = product.productAttributes || [];

		// if it’s a POD item, we might allow backorder or treat it differently
		// eslint-disable-next-line
		const isPodProduct =
			item.isPrintifyProduct && product.printifyProductDetails?.POD === true;

		// find the “chosenAttr” by color + size + scent
		const chosenAttr = productAttrs.find(
			(attr) =>
				attr.color === item.color &&
				attr.size === item.size &&
				attr.scent === item.scent
		);

		// The product might be active OR on backorder for it to be considered “in stock”
		// If there’s a matching attribute, check that quantity; otherwise fallback to product.quantity
		if (productAttrs.length > 0 && chosenAttr) {
			return (
				(product.activeProduct || product.activeBackorder) && // allow if either is true
				chosenAttr.quantity >= item.amount &&
				item.amount > 0
			);
		} else {
			// if no matching attribute or productAttrs is empty => fallback
			return (
				(product.activeProduct || product.activeBackorder) &&
				product.quantity >= item.amount &&
				item.amount > 0
			);
		}
	});

	const isStockAvailable = checkingAvailability.every(Boolean);

	const handleClickImage = (item) => {
		// show modal
		setModalItem(item);
	};

	return (
		<>
			<ToastContainer className='toast-top-center' position='top-center' />

			{/* Overlay behind cart sidebar */}
			{isSidebarOpen2 && <Overlay onClick={() => closeSidebar2()} />}

			<CartWrapper $isOpen={isSidebarOpen2} $fromPage={from === "NavbarBottom"}>
				<CloseIcon onClick={() => closeSidebar2()} />

				<CartContent>
					{cart.length === 0 ? (
						<p
							style={{
								fontSize: "1.3rem",
								color: "darkred",
								textAlign: "center",
								fontWeight: "bold",
								marginTop: "50px",
							}}
						>
							Your cart is currently empty
						</p>
					) : (
						cart.map((item, i) => {
							const product = item.allProductDetailsIncluded || {};
							const productAttrs = product.productAttributes || [];

							// figure out which attribute the user selected
							const chosenAttr = productAttrs.find(
								(attr) =>
									attr.color === item.color &&
									attr.size === item.size &&
									attr.scent === item.scent
							);
							const maxQuantity = chosenAttr
								? chosenAttr.quantity
								: product.quantity || item.max;

							// out-of-stock check
							const isItemOutOfStock =
								(!product.activeBackorder &&
									chosenAttr &&
									chosenAttr.quantity < item.amount) ||
								product.quantity <= 0;

							// check if POD product => disable color/size/scent changes
							const isPodProduct =
								item.isPrintifyProduct &&
								product.printifyProductDetails?.POD === true;

							// build arrays for color/size/scent (filter out blanks)
							const uniqueProductColors = [
								...new Set(productAttrs.map((attr) => attr.color)),
							].filter((c) => c && c !== "nocolor");

							const uniqueProductSizes = [
								...new Set(productAttrs.map((attr) => attr.size)),
							].filter((s) => s && s !== "nosizes");

							const uniqueProductScents = [
								...new Set(productAttrs.map((attr) => attr.scent)),
							].filter((sc) => sc && sc !== "noscent");

							return (
								<CartItem key={i}>
									<ItemImage
										src={item.image}
										alt={item.name}
										onClick={() => handleClickImage(item)}
									/>

									<ItemDetails>
										<ItemName>{item.name}</ItemName>

										{isItemOutOfStock && (
											<OutOfStockMessage>Out Of Stock</OutOfStockMessage>
										)}

										{/* Quantity +/- */}
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

										{/* Only show color/size/scent if they exist */}
										{productAttrs.length > 0 && (
											<AttributeWrapper>
												{/* ========== COLOR SELECT ========== */}
												{uniqueProductColors.length > 0 && (
													<>
														{isPodProduct && item.customDesign ? (
															// POD => single disabled option
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
															// Normal color select
															<AttributeSelect
																disabled={isPodProduct}
																style={{
																	color: isPodProduct ? "grey" : "inherit",
																}}
																value={item.color}
																onChange={(e) => {
																	if (!isPodProduct) {
																		const newColor = e.target.value;
																		const newChosenAttr = productAttrs.find(
																			(a) =>
																				a.color.toLowerCase() ===
																					newColor.toLowerCase() &&
																				a.size.toLowerCase() ===
																					item.size.toLowerCase() &&
																				a.scent.toLowerCase() ===
																					item.scent.toLowerCase()
																		);
																		const chosenColorImage =
																			newChosenAttr?.productImages?.[0]?.url ||
																			item.image;
																		const newQuantity =
																			newChosenAttr?.quantity || 0;

																		changeColor(
																			item.id,
																			newColor,
																			item.size,
																			chosenColorImage,
																			newQuantity,
																			item.color,
																			item.scent // pass current scent
																		);
																	}
																}}
															>
																{uniqueProductColors.map((colorVal, idx) => {
																	// Attempt to match color name from allColors
																	const foundColorObj = allColors.find(
																		(clr) => clr.hexa === colorVal
																	);
																	const colorName = foundColorObj
																		? foundColorObj.color
																		: colorVal;
																	return (
																		<option key={idx} value={colorVal}>
																			{colorName}
																		</option>
																	);
																})}
															</AttributeSelect>
														)}
													</>
												)}

												{/* ========== SIZE SELECT ========== */}
												{uniqueProductSizes.length > 0 && (
													<>
														{isPodProduct && item.customDesign ? (
															// POD => single disabled option
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
															// Normal size select
															<AttributeSelect
																disabled={isPodProduct}
																style={{
																	color: isPodProduct ? "grey" : "inherit",
																}}
																value={item.size}
																onChange={(e) => {
																	if (!isPodProduct) {
																		const newSize = e.target.value;
																		const newChosenAttr = productAttrs.find(
																			(a) =>
																				a.size.toLowerCase() ===
																					newSize.toLowerCase() &&
																				a.color.toLowerCase() ===
																					item.color.toLowerCase() &&
																				a.scent.toLowerCase() ===
																					item.scent.toLowerCase()
																		);
																		const newQuantity =
																			newChosenAttr?.quantity || 0;
																		changeSize(
																			item.id,
																			newSize,
																			item.color,
																			newQuantity,
																			item.size,
																			item.scent
																		);
																	}
																}}
															>
																{uniqueProductSizes.map((sz, i2) => (
																	<option key={i2} value={sz}>
																		{sz}
																	</option>
																))}
															</AttributeSelect>
														)}
													</>
												)}

												{/* ========== SCENT SELECT ========== */}
												{uniqueProductScents.length > 0 && (
													<>
														{isPodProduct && item.customDesign ? (
															// POD => single disabled option
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
															// Normal scent select
															<AttributeSelect
																disabled={isPodProduct}
																style={{
																	color: isPodProduct ? "grey" : "inherit",
																}}
																value={item.scent}
																onChange={(e) => {
																	if (!isPodProduct) {
																		const newScent = e.target.value;
																		const newChosenAttr = productAttrs.find(
																			(a) =>
																				a.scent.toLowerCase() ===
																					newScent.toLowerCase() &&
																				a.color.toLowerCase() ===
																					item.color.toLowerCase() &&
																				a.size.toLowerCase() ===
																					item.size.toLowerCase()
																		);
																		const newQuantity =
																			newChosenAttr?.quantity || 0;
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
																{uniqueProductScents.map((sc, i3) => (
																	<option key={i3} value={sc}>
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
						})
					)}

					{cart.length > 0 && (
						<TotalAmount>
							Total Amount: ${Number(total_amount).toFixed(2)}
							<hr className='col-md-6' />
						</TotalAmount>
					)}

					{cart.length > 0 && (
						<ButtonsWrapper>
							<CheckoutButton
								to='/cart'
								onClick={() => {
									if (isStockAvailable) {
										ReactGA.event({
											category: "Continue To Checkout",
											action: "User Clicked Continue To Checkout From Cart",
										});

										const eventId = `initiateCheckout-${Date.now()}`;

										ReactPixel.track(
											"InitiateCheckout",
											{
												content_ids: cart.map((item) => item.id),
												contents: cart.map((item) => ({
													id: item.id,
													quantity: item.amount,
													item_price: item.priceAfterDiscount,
												})),
												value: Number(total_amount).toFixed(2),
												currency: "USD",
												content_type: "product",
											},
											{
												eventID: eventId,
											}
										);

										axios
											.post(
												`${process.env.REACT_APP_API_URL}/facebookpixel/conversionapi`,
												{
													eventName: "InitiateCheckout",
													eventId,
													email: isAuthenticated()?.user?.email || null,
													phone: isAuthenticated()?.user?.phone || null,
													currency: "USD",
													value: Number(total_amount).toFixed(2),
													contentIds: cart.map((item) => item.id),
													userAgent: window.navigator.userAgent,
													// Omit clientIpAddress to let the server pick up req.ip
												}
											)
											.catch((err) => {
												console.error(
													"Server-side InitiateCheckout event error:",
													err
												);
											});

										window.scrollTo({ top: 0, behavior: "smooth" });
										closeSidebar2();
									} else {
										// find which items are out of stock
										const outOfStockItems = cart.filter(
											(itm, idx) => !checkingAvailability[idx]
										);
										outOfStockItems.forEach((itm) => {
											toast.error(
												`Please remove product ${itm.name} so you can checkout`
											);
										});
									}
								}}
							>
								{isStockAvailable
									? "Continue To Check Out"
									: "No Stock Available"}
							</CheckoutButton>

							<ClearCartButton onClick={clearCart}>Clear Cart</ClearCartButton>
						</ButtonsWrapper>
					)}
				</CartContent>
			</CartWrapper>

			{/* Optional product-image modal */}
			<Modal
				open={!!modalItem}
				onCancel={() => setModalItem(null)}
				footer={null}
				title={null}
				closable
				centered
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
		</>
	);
};

export default SidebarCart;

/* -------------- STYLED COMPONENTS -------------- */

const Overlay = styled.div`
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background-color: rgba(0, 0, 0, 0.5);
	z-index: 5;
	animation: ${fadeIn} 0.3s ease-in-out;
`;

const CartWrapper = styled.div`
	position: fixed;
	top: 0;
	right: 0;
	width: ${(props) => (props.$fromPage ? "400px" : "300px")};
	height: 100vh;
	background: var(--background-light);
	padding: 20px;
	transform: translateX(${(props) => (props.$isOpen ? "0" : "100%")});
	transition: transform 0.3s ease;
	z-index: 1500;
	display: flex;
	flex-direction: column;
	align-items: center;
	animation: ${(props) =>
		props.$isOpen
			? css`
					${fadeIn} 0.3s ease forwards
				`
			: css`
					${fadeOut} 0.3s ease forwards
				`};
	overflow-y: auto;
`;

const CloseIcon = styled(FaTimes)`
	position: absolute;
	top: 10px;
	right: 10px;
	cursor: pointer;
	color: var(--text-color-dark);
	font-size: 24px;

	@media (max-width: 900px) {
		right: 20px;
	}
`;

const CartContent = styled.div`
	width: 100%;
	margin-top: 50px;
	font-size: 18px;
	color: var(--text-color-dark);
`;

const CartItem = styled.div`
	display: flex;
	align-items: center;
	margin-bottom: 15px;
	border-bottom: 1px solid var(--border-color-dark);
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
	align-items: flex-start;
	width: 100%;
	position: relative;
`;

const ItemName = styled.p`
	font-weight: bold;
	margin-bottom: 5px;
	text-transform: capitalize;
	font-size: 0.9rem;
`;

const OutOfStockMessage = styled.p`
	color: red;
	font-weight: bold;
	margin-top: 5px;
	font-size: 12px;
`;

const QuantityWrapper = styled.div`
	display: flex;
	align-items: center;
	margin-bottom: 10px;
	font-size: 0.9rem;
`;

const QuantityButton = styled.button`
	background: var(--neutral-medium);
	border: none;
	padding: 5px 10px;
	cursor: pointer;
	font-size: 0.9rem;

	&:hover {
		background: var(--neutral-dark);
		color: var(--neutral-light);
	}
`;

const ItemQuantity = styled.p`
	margin: 0 10px;
	font-size: 0.9rem;
	font-weight: bold;
`;

const ItemPrice = styled.p`
	font-weight: bold;
	color: var(--primary-color);
	font-size: 0.9rem;
`;

const ItemTotal = styled.p`
	font-weight: bold;
	color: var(--primary-color);
	font-size: 0.9rem;
	margin-top: 5px;
`;

const AttributeWrapper = styled.div`
	display: flex;
	align-items: center;
	margin-top: 10px;
	flex-wrap: wrap;
`;

const AttributeSelect = styled.select`
	margin-right: 10px;
	padding: 5px;
	border: 1px solid var(--border-color-dark);
	border-radius: 5px;
	cursor: pointer;
	max-width: 70%;
	text-transform: capitalize;
	font-size: 14px;

	&:hover {
		border-color: var(--border-color-light);
	}

	@media (max-width: 900px) {
		max-width: 80% !important;
	}

	&:disabled {
		background-color: #ebebeb;
		cursor: not-allowed;
	}
`;

const RemoveButton = styled.button`
	position: absolute;
	right: 50px;
	top: 20px;
	background: none;
	border: none;
	color: var(--secondary-color);
	font-size: 18px;
	cursor: pointer;

	&:hover {
		color: var(--secondary-color-dark);
	}

	@media (max-width: 900px) {
		right: 50px;
		top: 20px;
	}
`;

const TotalAmount = styled.div`
	margin-top: 20px;
	font-size: 1.2rem;
	font-weight: bold;
	color: var(--primary-color);
	text-align: center;
`;

const ButtonsWrapper = styled.div`
	display: flex;
	flex-direction: column;
	align-items: center;
	width: 100%;
	margin-top: 10px;
`;

const CheckoutButton = styled(Link)`
	margin-top: 10px;
	padding: 10px 40px;
	background: var(--primary-color-dark);
	color: var(--neutral-light);
	border: none;
	font-size: 14px;
	transition: var(--main-transition);
	border-radius: 5px;
	cursor: pointer;
	text-align: center;

	&:hover {
		background: var(--primary-color-darker);
	}
`;

const ClearCartButton = styled.button`
	margin-top: 30px;
	padding: 10px 20px;
	background: var(--secondary-color-dark);
	color: var(--neutral-light);
	border: none;
	font-size: 14px;
	transition: var(--main-transition);
	border-radius: 5px;
	cursor: pointer;

	&:hover {
		background: var(--secondary-color-darker);
	}
`;
