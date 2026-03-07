import React, { useState } from "react";
import styled from "styled-components";
import {
	FaBoxOpen,
	FaDollarSign,
	FaReceipt,
	FaTruck,
	FaCalendarAlt,
} from "react-icons/fa";
import { Modal } from "antd"; // using antd's modal

const OrdersPage = ({ orders }) => {
	// Store the image URL we want to preview in a modal
	const [modalImage, setModalImage] = useState("");

	// Handler to open the modal
	const handleImageClick = (imgUrl) => {
		setModalImage(imgUrl);
	};

	// Handler to close the modal
	const handleCloseModal = () => {
		setModalImage("");
	};

	return (
		<OrdersWrapper>
			{orders.map((order) => (
				<OrderCard key={order.invoiceNumber}>
					<CardTitle>Invoice Number: {order.invoiceNumber}</CardTitle>
					<CardContent>
						<Title>Your Orders</Title>
						<div className='col-md-5'>
							<StyledText>
								<FaCalendarAlt style={{ marginRight: "5px" }} />
								<strong>Order Date:</strong>{" "}
								{new Date(order.orderCreationDate).toLocaleDateString()}{" "}
								{new Date(order.orderCreationDate).toLocaleTimeString()}
							</StyledText>

							<StyledText>
								<FaTruck style={{ marginRight: "5px" }} />
								<strong>Tracking Number:</strong>{" "}
								{order.trackingNumber ? (
									// Check if the trackingNumber includes "http" or "https"
									order.trackingNumber.includes("http") ||
									order.trackingNumber.includes("https") ? (
										<a
											href={order.trackingNumber}
											target='_blank'
											rel='noopener noreferrer'
										>
											Click To Check Tracking Number
										</a>
									) : (
										// If no "http"/"https", just show the tracking number
										order.trackingNumber
									)
								) : (
									// Fallback if there's no tracking number
									"No Tracking # Yet"
								)}
							</StyledText>

							<div>
								<FaTruck style={{ marginRight: "5px" }} />
								<strong>Ship To Address:</strong>{" "}
								{order.customerDetails.address}, {order.customerDetails.city},{" "}
								{order.customerDetails.state} {order.customerDetails.zipcode}
							</div>

							<div className='row'>
								<div className='col-md-6'>
									<span>
										<FaBoxOpen style={{ marginRight: "5px" }} />
										<strong>Shipment Status:</strong>{" "}
										{order.status.charAt(0).toUpperCase() +
											order.status.slice(1).toLowerCase()}
									</span>
								</div>

								<div className='col-md-6'>
									<span>
										<FaDollarSign style={{ marginRight: "5px" }} />
										<strong>Payment Status:</strong>{" "}
										{order?.paymentDetails?.payment?.status?.toLowerCase() ===
										"completed"
											? "Paid"
											: "Not Paid"}
									</span>
								</div>

								<div className='col-md-6'>
									<span>
										<FaReceipt style={{ marginRight: "5px" }} />
										<strong>Order Amount:</strong> $
										{(
											order.totalAmountAfterDiscount - order.shippingFees
										).toFixed(2)}
									</span>
								</div>

								<div className='col-md-6'>
									<span>
										<FaDollarSign style={{ marginRight: "5px" }} />
										<strong>Shipping Fees:</strong> ${order.shippingFees}
									</span>
								</div>

								{order?.appliedCoupon?.discount && (
									<>
										<div className='col-md-6' style={{ color: "darkgreen" }}>
											<FaDollarSign style={{ marginRight: "5px" }} />
											<strong>Applied Coupon:</strong>
											{order.appliedCoupon.discount}% OFF!
										</div>
										<div className='col-md-6' style={{ color: "darkred" }}>
											<FaDollarSign style={{ marginRight: "5px" }} />
											<strong>Before Discount Total:</strong> $
											{order.totalAmount && order.totalAmount.toFixed(2)}
										</div>
									</>
								)}
							</div>

							<CenteredText>
								<strong>Total Amount:</strong> $
								{Number(order.totalAmountAfterDiscount).toFixed(2)}
							</CenteredText>

							<SectionTitle>Payment Details</SectionTitle>
							<div className='row'>
								<div className='col-md-4'>
									<StyledText>
										<FaReceipt style={{ marginRight: "5px" }} />
										<strong>TransactionId:</strong>{" "}
										{order.paymentDetails?.payment?.receiptNumber}
									</StyledText>
								</div>
								<div className='col-md-4'>
									<StyledText>
										<span style={{ marginLeft: "10px" }}>
											<strong>Last4:</strong>{" "}
											{order.paymentDetails?.payment?.cardDetails?.card?.last4}
										</span>
									</StyledText>
								</div>
								<div className='col-md-4'>
									<StyledText>
										<span style={{ marginLeft: "10px" }}>
											<strong>Expiry Date:</strong>{" "}
											{
												order.paymentDetails?.payment?.cardDetails?.card
													?.expMonth
											}
											/
											{
												order.paymentDetails?.payment?.cardDetails?.card
													?.expYear
											}
										</span>
									</StyledText>
								</div>
							</div>
						</div>

						<SectionTitle>Products</SectionTitle>

						{/* ======== NO-VARIABLE PRODUCTS ======== */}
						{order.productsNoVariable.map((product) => {
							// Decide which image to show. If product.image is empty, try customDesign
							const displayImg =
								product.image && product.image.length > 0
									? product.image
									: product.isPrintifyProduct &&
										  product.customDesign?.originalPrintifyImageURL
										? product.customDesign.originalPrintifyImageURL
										: "https://via.placeholder.com/64";

							return (
								<ProductWrapper key={product.name}>
									<ProductImage
										src={displayImg}
										alt={product.name}
										// Make the image clickable => open modal
										onClick={() => handleImageClick(displayImg)}
									/>
									<ProductDetails>
										<StyledText>
											<strong>Product Name:</strong> {product.name}
											<span style={{ marginLeft: "20px" }}>
												<strong>Ordered Quantity:</strong>{" "}
												{product.ordered_quantity}
											</span>
											<span style={{ marginLeft: "20px" }}>
												<strong>Price/Unit:</strong> ${product.price}
											</span>
										</StyledText>
										<StyledText>
											<strong>SKU:</strong> {product.sku}
											<span style={{ marginLeft: "20px" }}>
												<strong>Color:</strong> {product.color}
											</span>
											<span style={{ marginLeft: "20px" }}>
												<strong>Size:</strong> {product.size}
											</span>
										</StyledText>
										{/* If POD, show "Source: Print On Demand" */}
										{product.isPrintifyProduct && (
											<StyledText>
												<strong>Source:</strong>Serene Jannat Print On Demand
											</StyledText>
										)}
										<StyledText>
											<strong>Total Amount:</strong> $
											{(product.ordered_quantity * product.price).toFixed(2)}
										</StyledText>
									</ProductDetails>
								</ProductWrapper>
							);
						})}

						{/* ======== VARIABLE PRODUCTS ======== */}
						{order.chosenProductQtyWithVariables.map((product) => {
							// Decide which image to show
							const displayImg =
								product.image && product.image.length > 0
									? product.image
									: product.isPrintifyProduct &&
										  product.customDesign?.originalPrintifyImageURL
										? product.customDesign.originalPrintifyImageURL
										: "https://via.placeholder.com/64";

							return (
								<ProductWrapper key={product.name}>
									<ProductImage
										src={displayImg}
										alt={product.name}
										onClick={() => handleImageClick(displayImg)}
									/>
									<ProductDetails>
										<StyledText>
											<strong>Product Name:</strong> {product.name}
											<span style={{ marginLeft: "20px" }}>
												<strong>Ordered Quantity:</strong>{" "}
												{product.ordered_quantity}
											</span>
											<span style={{ marginLeft: "20px" }}>
												<strong>Price/Unit:</strong> ${product.price}
											</span>
										</StyledText>
										<StyledText>
											<strong>SKU:</strong> {product.chosenAttributes.SubSKU}
											<span style={{ marginLeft: "20px" }}>
												<strong>Color:</strong> {product.chosenAttributes.color}
											</span>
											<span style={{ marginLeft: "20px" }}>
												<strong>Size:</strong> {product.chosenAttributes.size}
											</span>
										</StyledText>

										{/* If we have productImages for the variable item */}
										{product.productImages &&
											product.productImages.length > 0 && (
												<div>
													<StyledText>Product Images:</StyledText>
													{product.productImages.map((img, index) => (
														<img
															key={index}
															src={img.url}
															alt='Product'
															style={{
																width: "100px",
																marginRight: "10px",
																cursor: "pointer",
																borderRadius: "5px",
															}}
															onClick={() => handleImageClick(img.url)}
														/>
													))}
												</div>
											)}

										{/* If Print On Demand (POD) => show final design + text */}
										{product.isPrintifyProduct &&
											product.printifyProductDetails?.POD && (
												<>
													<StyledText>
														<strong>Source:</strong>Serene Jannat Print On
														Demand
													</StyledText>
													{product.customDesign && (
														<div style={{ margin: "10px 0" }}>
															{/* Final Screenshot */}
															{product.customDesign.finalScreenshotUrl && (
																<>
																	<StyledText>
																		<strong>Final Design Preview:</strong>
																	</StyledText>
																	<img
																		src={
																			product.customDesign.finalScreenshotUrl
																		}
																		alt='Final Design'
																		style={{
																			width: "150px",
																			border: "1px solid #ccc",
																			cursor: "pointer",
																		}}
																		onClick={() =>
																			handleImageClick(
																				product.customDesign.finalScreenshotUrl
																			)
																		}
																	/>
																</>
															)}
															{/* Custom Text(s) */}
															{product.customDesign.texts &&
																product.customDesign.texts.length > 0 && (
																	<div>
																		<StyledText>
																			<strong>Custom Text(s):</strong>
																		</StyledText>
																		{product.customDesign.texts.map(
																			(textObj, idx) => (
																				<StyledText
																					key={idx}
																					style={{ marginLeft: "15px" }}
																				>
																					- <strong>Text:</strong> "
																					{textObj.text}"
																					<br />
																					&nbsp; <strong>Color:</strong>{" "}
																					{textObj.color}
																					<br />
																					&nbsp; <strong>
																						Font Family:
																					</strong>{" "}
																					{textObj.font_family}
																				</StyledText>
																			)
																		)}
																	</div>
																)}
														</div>
													)}
												</>
											)}

										<StyledText>
											<strong>Total Amount:</strong> $
											{(product.ordered_quantity * product.price).toFixed(2)}
										</StyledText>
									</ProductDetails>
								</ProductWrapper>
							);
						})}
					</CardContent>
				</OrderCard>
			))}

			{/* ===== Modal to show the full-size image ===== */}
			<Modal
				open={!!modalImage}
				onCancel={handleCloseModal}
				footer={null}
				closable={true}
				centered
				bodyStyle={{ padding: "10px", textAlign: "center" }}
				width='auto'
				zIndex={9999}
			>
				{modalImage && (
					<img
						src={modalImage}
						alt='Full Preview'
						style={{
							maxWidth: "90vw",
							maxHeight: "80vh",
							objectFit: "contain",
						}}
					/>
				)}
			</Modal>
		</OrdersWrapper>
	);
};

export default OrdersPage;

/* ==================== STYLES ==================== */
const OrdersWrapper = styled.div`
	padding: 20px;
	background-color: var(--background-light);
	color: var(--text-color-primary);

	@media (max-width: 768px) {
		padding: 0px;
		font-size: 13px !important;
	}
`;

const Title = styled.h2`
	color: var(--text-color-primary);
	font-weight: bolder;

	@media (max-width: 768px) {
		padding: 0px !important;
		font-size: 1.5rem !important;
	}
`;

const OrderCard = styled.div`
	border: 1px solid var(--border-color-light);
	border-radius: 5px;
	margin-bottom: 20px;
	background-color: #efefef;
	padding: 16px;
`;

const CardTitle = styled.h3`
	color: var(--text-color-primary);
	font-weight: bolder;

	@media (max-width: 768px) {
		font-size: 1.5rem !important;
		margin: 0px !important;
		text-align: center;
	}
`;

const CardContent = styled.div`
	padding: 16px;

	@media (max-width: 800px) {
		padding: 7px;
	}
`;

const SectionTitle = styled.h4`
	color: var(--text-color-primary);
	margin-top: 20px;
`;

const StyledText = styled.p`
	margin-bottom: 5px;
`;

const CenteredText = styled.p`
	text-align: center;
	font-size: 18px;
	font-weight: bold;
	margin-top: 10px;
	margin-bottom: 10px;
`;

const ProductWrapper = styled.div`
	display: flex;
	margin-bottom: 10px;
`;

const ProductImage = styled.img`
	width: 64px;
	height: 64px;
	object-fit: cover;
	border-radius: 5px;
	margin-right: 10px;
	cursor: pointer; /* show that it's clickable */
`;

const ProductDetails = styled.div`
	flex: 1;
	display: flex;
	flex-direction: column;
	justify-content: center;
`;
