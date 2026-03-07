// /admin/components/ReportDetailsModal.jsx
import React, { useEffect, useState } from "react";
import { Modal, Table, Spin } from "antd";
import styled from "styled-components";
import { isAuthenticated } from "../../auth";
import axios from "axios";

/**
 * Reusable Modal that fetches orders by product or state, and displays them
 */

const ReportDetailsModal = ({
	open,
	onClose,
	filterType, // "product" or "state"
	filterValue, // e.g. "T-shirt" or "NY"
	startDate, // dayjs object
	endDate, // dayjs object
}) => {
	const [loading, setLoading] = useState(false);
	const [ordersData, setOrdersData] = useState([]);
	const [expandedRowKeys, setExpandedRowKeys] = useState([]);
	const [modalImage, setModalImage] = useState(null);
	const { user, token } = isAuthenticated();

	// ------------------------------
	// FETCH DATA WHENEVER FILTERS CHANGE OR MODAL OPENS
	// ------------------------------
	useEffect(() => {
		if (open && filterType && filterValue) {
			fetchFilteredOrders();
		}
		// eslint-disable-next-line
	}, [open, filterType, filterValue, startDate, endDate]);

	const fetchFilteredOrders = async () => {
		try {
			setLoading(true);
			const startStr = startDate ? startDate.format("YYYY-MM-DD") : undefined;
			const endStr = endDate ? endDate.format("YYYY-MM-DD") : undefined;
			const url = `${process.env.REACT_APP_API_URL}/order-report-modal/detailed-orders/${user._id}`;
			const params = {
				filterType,
				filterValue,
				startDate: startStr,
				endDate: endStr,
			};
			const headers = { Authorization: `Bearer ${token}` };

			const res = await axios.get(url, { params, headers });
			if (res.data.success && res.data.orders) {
				setOrdersData(res.data.orders);
				console.log(res.data, "res.data");
			} else {
				setOrdersData([]);
			}
		} catch (err) {
			console.error("Error fetching filtered orders:", err);
			setOrdersData([]);
		} finally {
			setLoading(false);
		}
	};

	// ------------------------------
	// HELPER: GET PRODUCT IMAGE
	// (same logic as your OrdersHistory)
	// ------------------------------
	const getDisplayImage = (product) => {
		if (product.image && product.image.length > 0) {
			return product.image;
		}
		if (
			product.isPrintifyProduct &&
			product.printifyProductDetails?.POD &&
			product.customDesign?.originalPrintifyImageURL
		) {
			return product.customDesign.originalPrintifyImageURL;
		}
		return "https://via.placeholder.com/50";
	};

	// ------------------------------
	// EXPANDED ROW
	// ------------------------------
	const expandedRowRender = (record) => {
		const products = [
			...(record.productsNoVariable || []),
			...(record.chosenProductQtyWithVariables || []),
		];

		return (
			<ExpandedContainer>
				{products.map((product, index) => {
					const displayImg = getDisplayImage(product);
					return (
						<ProductRow key={index}>
							<img
								src={displayImg}
								alt='product'
								style={{
									width: "50px",
									marginRight: 16,
									borderRadius: 5,
									cursor: "pointer",
								}}
								onClick={() => setModalImage(displayImg)}
							/>
							<div>
								<div style={{ fontWeight: "bold" }}>{product.name}</div>
								{product.chosenAttributes && (
									<div style={{ margin: "2px 0" }}>
										<strong>Color:</strong> {product.chosenAttributes.color} |{" "}
										<strong>Size:</strong> {product.chosenAttributes.size}
									</div>
								)}
								<div>
									Quantity: {product.ordered_quantity || product.orderedQty}
								</div>
								<div>Price: ${product.price}</div>

								{product.isPrintifyProduct &&
									product.printifyProductDetails?.POD && (
										<>
											<div style={{ marginTop: "5px" }}>
												<small>
													<strong>Source:</strong> Print On Demand
												</small>
											</div>
											{product.customDesign && (
												<div style={{ marginTop: "5px" }}>
													{product.customDesign.finalScreenshotUrl && (
														<>
															<strong>Final Design Preview:</strong>
															<br />
															<img
																src={product.customDesign.finalScreenshotUrl}
																alt='Final Design'
																style={{
																	width: "80px",
																	marginTop: "3px",
																	border: "1px solid #ccc",
																	borderRadius: "5px",
																	cursor: "pointer",
																}}
																onClick={() =>
																	setModalImage(
																		product.customDesign.finalScreenshotUrl
																	)
																}
															/>
														</>
													)}
													{product.customDesign.texts &&
														product.customDesign.texts.length > 0 && (
															<div style={{ marginTop: "5px" }}>
																<strong>Custom Text(s):</strong>
																<ul>
																	{product.customDesign.texts.map((txt, i) => (
																		<li key={i}>
																			<strong>Text:</strong> {txt.text}, Color:{" "}
																			{txt.color}
																		</li>
																	))}
																</ul>
															</div>
														)}
												</div>
											)}
										</>
									)}
							</div>
						</ProductRow>
					);
				})}
			</ExpandedContainer>
		);
	};

	const handleExpand = (expanded, record) => {
		setExpandedRowKeys(expanded ? [record._id] : []);
	};

	// ------------------------------
	// TABLE COLUMNS
	// (similar to OrdersHistory, adapt as needed)
	// ------------------------------
	const columns = [
		{
			title: "#",
			dataIndex: "index",
			key: "index",
			render: (_, __, index) => index + 1,
			width: 40,
		},
		{
			title: "Customer Name",
			dataIndex: ["customerDetails", "name"],
			key: "customerName",
			width: 150,
		},
		{
			title: "Phone",
			dataIndex: ["customerDetails", "phone"],
			key: "customerPhone",
			width: 100,
		},
		{
			title: "State",
			dataIndex: ["customerDetails", "state"],
			key: "customerState",
			width: 100,
		},
		{
			title: "ShipTo Address",
			dataIndex: ["customerDetails", "address"],
			key: "customerAddress",
			width: 140,
		},
		{
			title: "Status",
			dataIndex: "status",
			key: "status",
			render: (text) => text.charAt(0).toUpperCase() + text.slice(1),
			width: 80,
		},
		{
			title: "Invoice #",
			dataIndex: "invoiceNumber",
			key: "invoiceNumber",
			width: 50,
		},
		{
			title: "Tracking #",
			dataIndex: "trackingNumber",
			key: "trackingNumber",
			width: 150,
			render: (_, record) => {
				if (record.printifyOrderDetails && record.printifyOrderDetails.id) {
					return record.trackingNumber ? (
						<a
							href={record.trackingNumber}
							target='_blank'
							rel='noopener noreferrer'
						>
							Click Here...
						</a>
					) : (
						"No Tracking #"
					);
				}
				return record.trackingNumber ? record.trackingNumber : "No Tracking #";
			},
		},
	];

	return (
		<Modal
			title={
				filterType === "product" ? (
					<span
						style={{
							textTransform: "capitalize",
							fontWeight: "bold",
							color: "darkgoldenrod",
						}}
					>
						Orders for Product: {filterValue}
					</span>
				) : (
					<span
						style={{
							textTransform: "capitalize",
							fontWeight: "bold",
							color: "darkgoldenrod",
						}}
					>
						Orders for State: {filterValue}
					</span>
				)
			}
			open={open}
			onCancel={onClose}
			footer={null}
			width={"83%"}
			style={{ left: "7%" }}
		>
			{loading ? (
				<Spin spinning tip='Loading...'>
					<div style={{ minHeight: 120 }} />
				</Spin>
			) : (
				<>
					<Table
						columns={columns}
						dataSource={ordersData}
						rowKey={(record) => record._id}
						expandable={{
							expandedRowRender: expandedRowRender,
							expandedRowKeys: expandedRowKeys,
							onExpand: handleExpand,
						}}
						scroll={{ x: 900 }}
						pagination={{ pageSize: 10 }}
					/>

					{/* Large image preview modal inside the same parent Modal */}
					<Modal
						open={!!modalImage}
						onCancel={() => setModalImage(null)}
						footer={null}
						closable
						centered
						width='auto'
						// For Ant Design v5+, use `styles`:
						styles={{
							body: {
								padding: "10px",
								textAlign: "center",
							},
						}}
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
				</>
			)}
		</Modal>
	);
};

export default ReportDetailsModal;

/* =========== STYLES =========== */
const ExpandedContainer = styled.div`
	padding: 10px;
`;

const ProductRow = styled.div`
	display: flex;
	align-items: flex-start;
	margin-bottom: 8px;
	border-bottom: 1px dashed #ccc;
	padding-bottom: 8px;

	&:last-child {
		border-bottom: none;
	}
`;
