import React, { useState, useEffect } from "react";
import { Modal, Input, Button, Select, Table, message, Checkbox } from "antd";
import styled from "styled-components";
import {
	FaBoxOpen,
	FaDollarSign,
	FaReceipt,
	FaTruck,
	FaCalendarAlt,
	FaEdit,
	FaUser,
	FaTrash,
} from "react-icons/fa";
import { updatingAnOrder2 } from "../apiAdmin";
import { isAuthenticated } from "../../auth";
import ProductEditModal from "./ProductEditModal";

const { Option } = Select;

const OrderDetailsModal = ({ isVisible, order, onCancel, setIsVisible }) => {
	// ============================================================
	// Existing component state
	// ============================================================
	const [isEditTrackingModalVisible, setIsEditTrackingModalVisible] =
		useState(false);
	const [isEditStatusModalVisible, setIsEditStatusModalVisible] =
		useState(false);
	const [isEditShipToModalVisible, setIsEditShipToModalVisible] =
		useState(false);
	const [isEditProductModalVisible, setIsEditProductModalVisible] =
		useState(false);

	const [trackingNumber, setTrackingNumber] = useState("");
	const [status, setStatus] = useState(order?.status || "");
	const [customerDetails, setCustomerDetails] = useState(
		order?.customerDetails || {}
	);
	const [selectedProduct, setSelectedProduct] = useState(null);

	// For image preview
	const [modalImage, setModalImage] = useState("");

	const { user, token } = isAuthenticated();

	// ============================================================
	// NEW: Expenses state/logic
	// ============================================================
	// We store the expenses as an array of { label, price }.
	const [expenses, setExpenses] = useState([]);

	// On mount or when `order` changes, convert `order.orderExpenses` (object)
	// into an array for table consumption.
	useEffect(() => {
		if (order?.orderExpenses) {
			const arr = Object.entries(order.orderExpenses).map(([label, price]) => ({
				label,
				price,
			}));
			setExpenses(arr);
		} else {
			setExpenses([]);
		}
	}, [order]);

	// Handlers for table
	const handleAddExpenseRow = () => {
		setExpenses([...expenses, { label: "", price: 0 }]);
	};

	const handleDeleteExpenseRow = (index) => {
		const newExpenses = [...expenses];
		newExpenses.splice(index, 1);
		setExpenses(newExpenses);
	};

	const handleExpenseLabelChange = (value, index) => {
		const newExpenses = [...expenses];
		newExpenses[index].label = value;
		setExpenses(newExpenses);
	};

	const handleExpensePriceChange = (value, index) => {
		const newExpenses = [...expenses];
		newExpenses[index].price = value;
		setExpenses(newExpenses);
	};

	// Columns for the "Edit Expenses" table
	const expenseColumns = [
		{
			title: "Label",
			dataIndex: "label",
			key: "label",
			render: (text, record, index) => (
				<Input
					value={record.label}
					onChange={(e) => handleExpenseLabelChange(e.target.value, index)}
				/>
			),
		},
		{
			title: "Price",
			dataIndex: "price",
			key: "price",
			width: 100,
			render: (value, record, index) => (
				<Input
					type='number'
					value={record.price}
					onChange={(e) => handleExpensePriceChange(e.target.value, index)}
				/>
			),
		},
		{
			title: "Action",
			dataIndex: "action",
			key: "action",
			width: 60,
			align: "center",
			render: (_, record, index) => (
				<Button danger onClick={() => handleDeleteExpenseRow(index)}>
					<FaTrash />
				</Button>
			),
		},
	];

	// Save updated expenses to DB
	const handleSaveExpenses = async () => {
		try {
			// Convert array -> object
			const newOrderExpenses = expenses.reduce((acc, cur) => {
				if (cur.label.trim()) {
					acc[cur.label] = Number(cur.price) || 0;
				}
				return acc;
			}, {});

			await updatingAnOrder2(order._id, user._id, token, "orderExpenses", {
				orderExpenses: newOrderExpenses,
			});
			// Update local order object
			order.orderExpenses = newOrderExpenses;
			// Use antd message instead of alert
			message.success("Expenses updated successfully!");
		} catch (error) {
			console.error("Error updating expenses:", error);
		}
	};

	// ============================================================
	// "Send Email" checkboxes (excluded from expenses)
	// ============================================================
	const [sendEmailTracking, setSendEmailTracking] = useState(false);
	const [sendEmailStatus, setSendEmailStatus] = useState(false);
	const [sendEmailShipTo, setSendEmailShipTo] = useState(false);

	// ============================================================
	// EDIT LOGIC (Tracking, Status, Ship To, Product)
	// ============================================================
	const handleEditTrackingClick = () => {
		setIsEditTrackingModalVisible(true);
		setTrackingNumber(order.trackingNumber || "");
	};

	const handleEditStatusClick = () => {
		setIsEditStatusModalVisible(true);
		setStatus(order.status || "");
	};

	const handleEditShipToClick = () => {
		setIsEditShipToModalVisible(true);
		setCustomerDetails(order.customerDetails || {});
	};

	const handleEditProductClick = (product) => {
		setSelectedProduct(product);
		setIsEditProductModalVisible(true);
	};

	const handleEditCancel = () => {
		setIsEditTrackingModalVisible(false);
		setIsEditStatusModalVisible(false);
		setIsEditShipToModalVisible(false);
		setIsEditProductModalVisible(false);
		setTrackingNumber("");
		setStatus("");
		setCustomerDetails({});
		setSelectedProduct(null);
		// Reset checkboxes
		setSendEmailTracking(false);
		setSendEmailStatus(false);
		setSendEmailShipTo(false);
	};

	const handleEditTrackingSubmit = async () => {
		try {
			const updatedTrackingNumber = {
				trackingNumber,
				sendEmail: sendEmailTracking ? "yes" : "no",
			};
			await updatingAnOrder2(
				order._id,
				user._id,
				token,
				"trackingNumber",
				updatedTrackingNumber
			);
			order.trackingNumber = trackingNumber;
			setIsEditTrackingModalVisible(false);
			message.success("Tracking number updated successfully!");
		} catch (error) {
			console.error("Error updating tracking number:", error);
		}
	};

	const handleEditStatusSubmit = async () => {
		try {
			const updatedStatus = {
				status,
				sendEmail: sendEmailStatus ? "yes" : "no",
			};
			await updatingAnOrder2(
				order._id,
				user._id,
				token,
				"status",
				updatedStatus
			);
			order.status = status;
			setIsEditStatusModalVisible(false);
			message.success("Order status updated successfully!");
		} catch (error) {
			console.error("Error updating status:", error);
		}
	};

	const handleEditShipToSubmit = async () => {
		try {
			const updatedCustomerDetails = {
				customerDetails,
				sendEmail: sendEmailShipTo ? "yes" : "no",
			};
			await updatingAnOrder2(
				order._id,
				user._id,
				token,
				"customerDetails",
				updatedCustomerDetails
			);
			order.customerDetails = customerDetails;
			setIsEditShipToModalVisible(false);
			message.success("Shipping details updated successfully!");
		} catch (error) {
			console.error("Error updating customer details:", error);
		}
	};

	const handleProductUpdate = (updatedOrder) => {
		// Update the local order object with the new data
		Object.assign(order, updatedOrder);
	};

	// ============================================================
	// IMAGE PREVIEW LOGIC
	// ============================================================
	const handleImageClick = (url) => {
		setModalImage(url);
	};
	const handleCloseImageModal = () => {
		setModalImage("");
	};

	if (!order) return null;

	console.log(order, "novariables");

	// ============================================================
	// GROSS / EXPENSES / NET total
	// ============================================================
	const grossTotal = Number(order.totalAmountAfterDiscount || 0);
	const totalExpensesValue = expenses.reduce(
		(acc, cur) => acc + Number(cur.price || 0),
		0
	);
	const netTotal = grossTotal - totalExpensesValue;

	return (
		<>
			{/* ─────────────────────────────────────────────────────────
          MAIN ORDER MODAL
      ────────────────────────────────────────────────────────── */}
			<Modal
				title={`Order Details - Invoice Number: ${order.invoiceNumber}`}
				open={isVisible}
				onCancel={onCancel}
				footer={null}
				width={"84%"}
				style={{ marginLeft: "15.5%" }}
			>
				{/* 65% / 35% layout */}
				<div style={{ display: "flex", gap: "16px" }}>
					{/* LEFT SIDE (65%): Entire existing content */}
					<div style={{ flex: "0 0 65%" }}>
						<OrderDetailsWrapper>
							<CardContent>
								{/* LEFT SIDE: Basic Info */}
								<div className='col-md-6'>
									<Title>Your Orders</Title>
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
											// If `order.trackingNumber` contains 'http' or 'https', render a clickable link
											order.trackingNumber.includes("http") ||
											order.trackingNumber.includes("https") ? (
												<a
													href={order.trackingNumber}
													target='_blank'
													rel='noopener noreferrer'
												>
													Click Here...
												</a>
											) : (
												// Otherwise, just display the tracking number as plain text
												order.trackingNumber
											)
										) : (
											// If `order.trackingNumber` is falsy, display a fallback
											"No Tracking # Yet"
										)}{" "}
										<FaEdit
											style={{ cursor: "pointer", marginLeft: "10px" }}
											onClick={handleEditTrackingClick}
										/>
									</StyledText>

									<StyledText>
										<FaUser style={{ marginRight: "5px" }} />
										<strong>
											Customer Name: {order.customerDetails.name}
										</strong>{" "}
									</StyledText>
									<StyledText>
										<FaUser style={{ marginRight: "5px" }} />
										<strong>
											Customer Phone: {order.customerDetails.phone}
										</strong>{" "}
									</StyledText>
									<StyledText>
										<FaUser style={{ marginRight: "5px" }} />
										<strong>
											Customer Email: {order.customerDetails.email}
										</strong>{" "}
									</StyledText>

									<StyledText>
										<FaReceipt style={{ marginRight: "5px" }} />
										<strong>Ship To:</strong> {order.customerDetails.name}{" "}
										<FaEdit
											style={{ cursor: "pointer", marginLeft: "10px" }}
											onClick={handleEditShipToClick}
										/>
									</StyledText>
									<div>
										<FaTruck style={{ marginRight: "5px" }} />
										<strong>Carrier:</strong>{" "}
										{order.chosenShippingOption.carrierName}
									</div>
									<div>
										<FaTruck style={{ marginRight: "5px" }} />
										<strong>Ship To Address:</strong>{" "}
										{order.customerDetails.address},{" "}
										{order.customerDetails.city}, {order.customerDetails.state}{" "}
										{order.customerDetails.zipcode}
									</div>

									<StyledText>
										<FaBoxOpen style={{ marginRight: "5px" }} />
										<strong>Shipment Status:</strong>{" "}
										{order.status.charAt(0).toUpperCase() +
											order.status.slice(1).toLowerCase()}{" "}
										<FaEdit
											style={{ cursor: "pointer", marginLeft: "10px" }}
											onClick={handleEditStatusClick}
										/>
									</StyledText>

									<div className='row'>
										<div className='col-md-6'>
											<span>
												<FaDollarSign style={{ marginRight: "5px" }} />
												<strong>Payment Status:</strong>{" "}
												{order.paymentDetails?.payment?.status?.toLowerCase() ===
												"completed"
													? "Paid"
													: "Not Paid"}
											</span>
										</div>

										<div className='col-md-6'>
											<span>
												<FaReceipt style={{ marginRight: "5px" }} />
												<strong>Order Amount:</strong> $
												{(order.totalAmount - order.shippingFees).toFixed(2)}
											</span>
										</div>

										<div className='col-md-6'>
											<span>
												<FaDollarSign style={{ marginRight: "5px" }} />
												<strong>Shipping Fees:</strong> ${order.shippingFees}
											</span>
										</div>

										<div className='col-md-6'>
											<strong>Customer Comment:</strong> {order.orderComment}
										</div>

										{order?.appliedCoupon?.discount && (
											<>
												<div
													className='col-md-6'
													style={{ color: "darkgreen" }}
												>
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
										<strong>Total Amount:</strong>{" "}
										{Number(order.totalAmountAfterDiscount).toFixed(2)}
									</CenteredText>

									<SectionTitle>Payment Details</SectionTitle>
									<div className='row'>
										<div className='col-md-4'>
											<StyledText>
												<FaReceipt style={{ marginRight: "5px" }} />
												<strong>TransactionId:</strong>{" "}
												{order.paymentDetails?.payment?.receiptNumber ||
													order.paypalOrderId}
											</StyledText>
										</div>
										<div className='col-md-4'>
											<StyledText>
												<span style={{ marginLeft: "10px" }}>
													<strong>Last4:</strong>{" "}
													{order.paymentDetails?.payment?.cardDetails?.card
														?.last4 ||
														order.paymentDetails?.payment_source?.card
															?.last_digits}
												</span>
											</StyledText>
										</div>
										<div className='col-md-4'>
											<StyledText>
												<span style={{ marginLeft: "10px" }}>
													<strong>Expiry Date:</strong>{" "}
													{order.paymentDetails?.payment?.cardDetails?.card
														?.expMonth ||
														order.paymentDetails?.payment_source?.card?.expiry}
													/
													{
														order.paymentDetails?.payment?.cardDetails?.card
															?.expYear
													}
												</span>
											</StyledText>
										</div>
										<div className='col-md-4'>
											<StyledText>
												<span style={{ marginLeft: "10px" }}>
													<strong>Card Type:</strong>{" "}
													{order.paymentDetails?.payment_source?.card?.type}
												</span>
											</StyledText>
										</div>
										<div className='col-md-4'>
											<StyledText>
												<span style={{ marginLeft: "10px" }}>
													<strong>Card Brand:</strong>{" "}
													{order.paymentDetails?.payment_source?.card?.brand}
												</span>
											</StyledText>
										</div>
									</div>
								</div>

								{/* RIGHT SIDE: PRODUCTS */}
								<SectionTitle style={{ marginTop: "25px" }}>
									Products{" "}
									<span
										style={{
											cursor: "pointer",
											marginLeft: "10px",
											fontSize: "18px",
										}}
									>
										(Edit:{" "}
										<FaEdit onClick={() => handleEditProductClick(order)} />)
									</span>
								</SectionTitle>

								{/* ================= NO-VARIABLE PRODUCTS ================= */}
								{order.productsNoVariable.map((product) => {
									// Fallback for POD image
									const displayImg =
										product.image && product.image.length > 0
											? product.image
											: product.isPrintifyProduct &&
												  product.customDesign?.originalPrintifyImageURL
												? product.customDesign.originalPrintifyImageURL
												: "https://via.placeholder.com/64";

									return (
										<ProductWrapper key={product.productId}>
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
													<strong>SKU:</strong> {product.productSKU}
													<span style={{ marginLeft: "20px" }}>
														<strong>Color:</strong> {product.color}
													</span>
													<span style={{ marginLeft: "20px" }}>
														<strong>Size:</strong> {product.size}
													</span>
												</StyledText>

												{/* Show POD source if isPrintifyProduct */}
												{product.isPrintifyProduct && (
													<StyledText>
														<strong>Source:</strong> Print On Demand
													</StyledText>
												)}

												{/* If there's a customDesign => Show finalScreenshotUrl & texts */}
												{product.isPrintifyProduct &&
													product.printifyProductDetails?.POD &&
													product.customDesign && (
														<div style={{ margin: "10px 0" }}>
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
																			marginBottom: "10px",
																		}}
																		onClick={() =>
																			handleImageClick(
																				product.customDesign.finalScreenshotUrl
																			)
																		}
																	/>

																	<StyledText>
																		<strong>Raw Design Image:</strong>
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
																			marginBottom: "10px",
																		}}
																		onClick={() =>
																			handleImageClick(
																				product.customDesign.finalScreenshotUrl
																			)
																		}
																	/>
																</>
															)}

															{/* Custom text(s) */}
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
																					<br />
																					&nbsp;{" "}
																					<strong>
																						Background color:
																					</strong>{" "}
																					{textObj.background_color}
																				</StyledText>
																			)
																		)}
																	</div>
																)}
														</div>
													)}

												<StyledText>
													<strong>Total Amount:</strong>{" "}
													{(product.ordered_quantity * product.price).toFixed(
														2
													)}
												</StyledText>
												<FaEdit
													style={{ cursor: "pointer", marginLeft: "10px" }}
													onClick={() => handleEditProductClick(product)}
												/>
											</ProductDetails>
										</ProductWrapper>
									);
								})}

								{/* ================= PRODUCTS WITH VARIABLES ================= */}
								{order.chosenProductQtyWithVariables.map((product) => {
									// Fallback for POD image
									const displayImg =
										product.image && product.image.length > 0
											? product.image
											: product.isPrintifyProduct &&
												  product.customDesign?.originalPrintifyImageURL
												? product.customDesign.originalPrintifyImageURL
												: "https://via.placeholder.com/64";

									return (
										<ProductWrapper key={product.productId}>
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
													<strong>SKU:</strong>{" "}
													{product.chosenAttributes?.SubSKU}
													<span style={{ marginLeft: "20px" }}>
														<strong>Color:</strong>{" "}
														{product.chosenAttributes?.color}
													</span>
													<span style={{ marginLeft: "20px" }}>
														<strong>Size:</strong>{" "}
														{product.chosenAttributes?.size}
													</span>
												</StyledText>

												{/* If local productImages exist (e.g., multiple angles) */}
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

												{/* If it's a POD item => show final design, custom texts, etc. */}
												{product.isPrintifyProduct &&
													product.printifyProductDetails?.POD &&
													product.customDesign && (
														<div style={{ margin: "10px 0" }}>
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
																			marginBottom: "10px",
																		}}
																		onClick={() =>
																			handleImageClick(
																				product.customDesign.finalScreenshotUrl
																			)
																		}
																	/>

																	<StyledText>
																		<strong>Raw Design:</strong>
																	</StyledText>
																	<img
																		src={product.customDesign.bareScreenshotUrl}
																		alt='Final Design'
																		style={{
																			width: "150px",
																			border: "1px solid #ccc",
																			cursor: "pointer",
																			marginBottom: "10px",
																		}}
																		onClick={() =>
																			handleImageClick(
																				product.customDesign.bareScreenshotUrl
																			)
																		}
																	/>
																</>
															)}

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
																					<br />
																					&nbsp;{" "}
																					<strong>
																						Background color:
																					</strong>{" "}
																					{textObj.background_color}
																				</StyledText>
																			)
																		)}
																	</div>
																)}
														</div>
													)}

												{/* Source: Print On Demand */}
												{product.isPrintifyProduct && (
													<StyledText>
														<strong>Source:</strong> Print On Demand
													</StyledText>
												)}

												<StyledText>
													<strong>Total Amount:</strong>{" "}
													{(product.ordered_quantity * product.price).toFixed(
														2
													)}
												</StyledText>

												<FaEdit
													style={{ cursor: "pointer", marginLeft: "10px" }}
													onClick={() => handleEditProductClick(product)}
												/>
											</ProductDetails>
										</ProductWrapper>
									);
								})}
							</CardContent>
						</OrderDetailsWrapper>
					</div>

					{/* RIGHT SIDE (35%): Edit Expenses */}
					<div
						style={{
							flex: "0 0 35%",
							borderLeft: "1px solid #ccc",
							paddingLeft: "16px",
						}}
					>
						<h3>Edit Expenses</h3>
						<Table
							columns={expenseColumns}
							dataSource={expenses}
							pagination={false}
							rowKey={(record, index) => index}
							size='small'
							style={{ marginBottom: "1rem" }}
						/>
						<Button
							type='dashed'
							onClick={handleAddExpenseRow}
							style={{ marginBottom: "1rem", width: "100%" }}
						>
							+ Add Expense
						</Button>
						<Button type='primary' onClick={handleSaveExpenses} block>
							Save Expenses
						</Button>

						{/* Summary Container */}
						<div
							style={{
								marginTop: "1rem",
								padding: "1rem",
								background: "#f5f5f5",
								borderRadius: "5px",
								border: "1px solid #ccc",
							}}
						>
							<SummaryRow>
								<span>Gross Total:</span>
								<strong>${grossTotal.toFixed(2)}</strong>
							</SummaryRow>
							<SummaryRow>
								<span>Total Expenses:</span>
								<strong>${totalExpensesValue.toFixed(2)}</strong>
							</SummaryRow>
							<SummaryRow
								style={{
									borderTop: "1px solid #ccc",
									marginTop: "0.5rem",
									paddingTop: "0.5rem",
								}}
							>
								<span>Net Total:</span>
								<strong>${netTotal.toFixed(2)}</strong>
							</SummaryRow>
						</div>
					</div>
				</div>
			</Modal>

			{/* ─────────────────────────────────────────────────────────
          TRACKING NUMBER MODAL
      ────────────────────────────────────────────────────────── */}
			<Modal
				title='Edit Tracking Number'
				open={isEditTrackingModalVisible}
				onCancel={handleEditCancel}
				footer={[
					<Button key='cancel' onClick={handleEditCancel}>
						Cancel
					</Button>,
					<Button
						key='submit'
						type='primary'
						onClick={handleEditTrackingSubmit}
					>
						Save
					</Button>,
				]}
			>
				<Input
					placeholder='Enter Tracking Number'
					value={trackingNumber}
					onChange={(e) => setTrackingNumber(e.target.value)}
					style={{ marginBottom: 10 }}
				/>
				<Checkbox
					checked={sendEmailTracking}
					onChange={(e) => setSendEmailTracking(e.target.checked)}
				>
					Send Email To Customer?
				</Checkbox>
			</Modal>

			{/* ─────────────────────────────────────────────────────────
          STATUS MODAL
      ────────────────────────────────────────────────────────── */}
			<Modal
				title='Edit Status'
				open={isEditStatusModalVisible}
				onCancel={handleEditCancel}
				footer={[
					<Button key='cancel' onClick={handleEditCancel}>
						Cancel
					</Button>,
					<Button key='submit' type='primary' onClick={handleEditStatusSubmit}>
						Save
					</Button>,
				]}
			>
				<Select
					placeholder='Select Status'
					value={status}
					onChange={(value) => setStatus(value)}
					style={{ width: "100%", marginBottom: 10 }}
				>
					<Option value='In processing'>In Processing</Option>
					<Option value='Ready To Ship'>Ready To Ship</Option>
					<Option value='Shipped'>Shipped</Option>
					<Option value='Delivered'>Delivered</Option>
					<Option value='Cancelled'>Cancelled</Option>
					<Option value='Backordered'>Backordered</Option>
					<Option value='Onhold'>Onhold</Option>
				</Select>
				<Checkbox
					checked={sendEmailStatus}
					onChange={(e) => setSendEmailStatus(e.target.checked)}
				>
					Send Email To Customer?
				</Checkbox>
			</Modal>

			{/* ─────────────────────────────────────────────────────────
          SHIP-TO MODAL
      ────────────────────────────────────────────────────────── */}
			<Modal
				title='Edit Ship To Details'
				open={isEditShipToModalVisible}
				onCancel={handleEditCancel}
				footer={[
					<Button key='cancel' onClick={handleEditCancel}>
						Cancel
					</Button>,
					<Button key='submit' type='primary' onClick={handleEditShipToSubmit}>
						Save
					</Button>,
				]}
			>
				<Input
					placeholder='Name'
					value={customerDetails.name}
					onChange={(e) =>
						setCustomerDetails({ ...customerDetails, name: e.target.value })
					}
					style={{ marginBottom: "10px" }}
				/>
				<Input
					placeholder='Email'
					value={customerDetails.email}
					onChange={(e) =>
						setCustomerDetails({ ...customerDetails, email: e.target.value })
					}
					style={{ marginBottom: "10px" }}
				/>
				<Input
					placeholder='Phone'
					value={customerDetails.phone}
					onChange={(e) =>
						setCustomerDetails({ ...customerDetails, phone: e.target.value })
					}
					style={{ marginBottom: "10px" }}
				/>
				<Input
					placeholder='Address'
					value={customerDetails.address}
					onChange={(e) =>
						setCustomerDetails({ ...customerDetails, address: e.target.value })
					}
					style={{ marginBottom: "10px" }}
				/>
				<Input
					placeholder='State'
					value={customerDetails.state}
					onChange={(e) =>
						setCustomerDetails({ ...customerDetails, state: e.target.value })
					}
					style={{ marginBottom: "10px" }}
				/>
				<Input
					placeholder='Zipcode'
					value={customerDetails.zipcode}
					onChange={(e) =>
						setCustomerDetails({ ...customerDetails, zipcode: e.target.value })
					}
					style={{ marginBottom: "10px" }}
				/>
				<Checkbox
					checked={sendEmailShipTo}
					onChange={(e) => setSendEmailShipTo(e.target.checked)}
				>
					Send Email To Customer?
				</Checkbox>
			</Modal>

			{/* ─────────────────────────────────────────────────────────
          EDIT PRODUCT MODAL
      ────────────────────────────────────────────────────────── */}
			{selectedProduct && (
				<ProductEditModal
					isVisible={isEditProductModalVisible}
					product={selectedProduct}
					order={order}
					onCancel={handleEditCancel}
					onUpdate={handleProductUpdate}
					setIsVisible={setIsEditProductModalVisible}
					setIsVisibleMain={setIsVisible}
				/>
			)}

			{/* ─────────────────────────────────────────────────────────
          IMAGE PREVIEW MODAL
      ────────────────────────────────────────────────────────── */}
			<Modal
				open={!!modalImage}
				onCancel={handleCloseImageModal}
				footer={null}
				closable={true}
				centered
				width='auto'
				bodyStyle={{ padding: "10px", textAlign: "center" }}
				zIndex={9999}
			>
				{modalImage && (
					<img
						src={modalImage}
						alt='Preview'
						style={{
							maxWidth: "90vw",
							maxHeight: "80vh",
							objectFit: "contain",
						}}
					/>
				)}
			</Modal>
		</>
	);
};

export default OrderDetailsModal;

/* ================= STYLES ================= */
const OrderDetailsWrapper = styled.div`
	padding: 20px;
	background-color: #f9f9f9;
	color: #333333;
`;

const CardContent = styled.div`
	padding: 16px;
`;

const Title = styled.h2`
	color: #333333;
	font-weight: bolder;
`;

const SectionTitle = styled.h4`
	color: #333333;
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
	cursor: pointer; /* Make it clickable */
`;

const ProductDetails = styled.div`
	flex: 1;
	display: flex;
	flex-direction: column;
	justify-content: center;
`;

// A small row styling for the summary lines
const SummaryRow = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 0.25rem;
	font-size: 15px;
`;
