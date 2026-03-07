import React, { useEffect, useState, useCallback } from "react";
import { Table, Card, Row, Col, Modal } from "antd";
import styled from "styled-components";
import CountUp from "react-countup";
import { getListOfOrdersAggregatedSeller } from "../apiSeller";
import { isAuthenticated } from "../../auth";
import { EyeOutlined } from "@ant-design/icons";

const SellerOrdersInProgress = ({ showModal, storeId }) => {
	const [data, setData] = useState([]);
	const [totalOrders, setTotalOrders] = useState(0);
	const [totalQuantity, setTotalQuantity] = useState(0);
	const [totalAmount, setTotalAmount] = useState(0);
	const [loading, setLoading] = useState(false);
	const [expandedRowKeys, setExpandedRowKeys] = useState([]);
	const [modalImage, setModalImage] = useState(null);

	const { user, token } = isAuthenticated();

	const fetchOrders = useCallback(async () => {
		setLoading(true);

		const page = 1;
		const records = 50;
		// For "open" orders, we keep start/end as null in your API
		const startDate = null;
		const endDate = null;
		const status = "open";
		const userId = user._id;

		try {
			const response = await getListOfOrdersAggregatedSeller(
				token,
				page,
				records,
				startDate,
				endDate,
				status,
				userId,
				storeId
			);
			if (response && response.orders) {
				setData(response.orders);
				setTotalOrders(response.totalRecords);
				setTotalQuantity(
					response.orders.reduce((acc, order) => acc + order.totalOrderQty, 0)
				);
				setTotalAmount(
					response.orders.reduce(
						(acc, order) => acc + order.totalAmountAfterDiscount,
						0
					)
				);
			}
		} catch (error) {
			console.error("Error fetching orders:", error);
		} finally {
			setLoading(false);
		}
		// eslint-disable-next-line
	}, [user._id, token]);

	useEffect(() => {
		fetchOrders();
	}, [fetchOrders, showModal]);

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

	const expandedRowRender = (record) => {
		const products = [
			...record.productsNoVariable,
			...record.chosenProductQtyWithVariables,
		];

		return (
			<ExpandedContainer>
				{products.map((prod, index) => {
					const displayImg = getDisplayImage(prod);
					return (
						<ProductRow key={index}>
							<img
								src={displayImg}
								alt={prod.name}
								style={{ width: "50px", marginRight: 16, borderRadius: 5 }}
								onClick={() => setModalImage(displayImg)}
							/>
							<div>
								<div style={{ fontWeight: "bold" }}>{prod.name}</div>
								{prod.chosenAttributes && (
									<div style={{ margin: "2px 0" }}>
										<strong>Color:</strong> {prod.chosenAttributes.color} |{" "}
										<strong>Size:</strong> {prod.chosenAttributes.size}
									</div>
								)}
								<div>Quantity: {prod.ordered_quantity}</div>
								<div>Price: ${prod.price}</div>

								{prod.isPrintifyProduct && prod.printifyProductDetails?.POD && (
									<>
										<div style={{ marginTop: "5px" }}>
											<small>
												<strong>Source:</strong> Print On Demand
											</small>
										</div>
										{prod.customDesign && (
											<div style={{ marginTop: "5px" }}>
												{prod.customDesign.finalScreenshotUrl && (
													<div>
														<strong>Final Design Preview:</strong>
														<br />
														<img
															src={prod.customDesign.finalScreenshotUrl}
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
																	prod.customDesign.finalScreenshotUrl
																)
															}
														/>
													</div>
												)}
												{prod.customDesign.texts &&
													prod.customDesign.texts.length > 0 && (
														<div style={{ marginTop: "5px" }}>
															<strong>Custom Text(s):</strong>
															<ul>
																{prod.customDesign.texts.map((txt, i) => (
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

	const columns = [
		{
			title: "#",
			dataIndex: "index",
			key: "index",
			render: (_, __, index) => index + 1,
			width: 50,
		},
		{
			title: "Customer Name",
			dataIndex: ["customerDetails", "name"],
			key: "customerName",
			width: 300,
		},
		{
			title: "Customer Phone",
			dataIndex: ["customerDetails", "phone"],
			key: "customerPhone",
			width: 150,
		},
		{
			title: "Customer State",
			dataIndex: ["customerDetails", "state"],
			key: "customerState",
			width: 150,
		},
		{
			title: "Customer Address",
			dataIndex: ["customerDetails", "address"],
			key: "customerAddress",
			width: 250,
		},
		{
			title: "Status",
			dataIndex: "status",
			key: "status",
			width: 100,
			render: (text) => text.charAt(0).toUpperCase() + text.slice(1),
		},
		{
			title: "Invoice #",
			dataIndex: "invoiceNumber",
			key: "invoiceNumber",
			width: 100,
		},
		{
			title: "Tracking #",
			dataIndex: "trackingNumber",
			key: "trackingNumber",
			width: 120,
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
		{
			title: "Order Details",
			key: "details",
			width: 120,
			render: (_, record) => (
				<DetailsLink onClick={() => showModal(record)}>
					<EyeOutlined />
					&nbsp; Details
				</DetailsLink>
			),
		},
	];

	return (
		<>
			<Row gutter={16} style={{ marginTop: 20, marginBottom: 20 }}>
				<Col xs={24} md={8}>
					<Card
						style={{
							backgroundColor: "var(--primary-color-dark)",
							color: "#fff",
						}}
						hoverable
					>
						<CardTitle>Total Orders</CardTitle>
						<CardCount>
							<CountUp
								start={0}
								end={totalOrders}
								duration={1.5}
								separator=','
							/>
						</CardCount>
					</Card>
				</Col>
				<Col xs={24} md={8}>
					<Card
						style={{
							backgroundColor: "var(--secondary-color-dark)",
							color: "#fff",
						}}
						hoverable
					>
						<CardTitle>Total Quantity</CardTitle>
						<CardCount>
							<CountUp
								start={0}
								end={totalQuantity}
								duration={2}
								separator=','
							/>
						</CardCount>
					</Card>
				</Col>
				<Col xs={24} md={8}>
					<Card
						style={{
							backgroundColor: "var(--accent-color-1-dark)",
							color: "#fff",
						}}
						hoverable
					>
						<CardTitle>Total Amount</CardTitle>
						<CardCount>
							<CountUp
								start={0}
								end={totalAmount}
								duration={2.5}
								separator=','
								decimals={2}
								prefix='$'
							/>
						</CardCount>
					</Card>
				</Col>
			</Row>

			<Table
				columns={columns}
				dataSource={data}
				loading={loading}
				expandable={{
					expandedRowRender: expandedRowRender,
					expandedRowKeys: expandedRowKeys,
					onExpand: handleExpand,
				}}
				rowKey={(record) => record._id}
				style={{ marginTop: 16 }}
				scroll={{ x: 900 }}
			/>

			<Modal
				open={!!modalImage}
				onCancel={() => setModalImage(null)}
				footer={null}
				closable={true}
				centered
				width='auto'
				bodyStyle={{ padding: "10px", textAlign: "center" }}
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
	);
};

export default SellerOrdersInProgress;

/* ========== STYLES ========== */
const CardTitle = styled.div`
	font-size: 1.2em;
	font-weight: bold;
	margin-bottom: 5px;
`;

const CardCount = styled.div`
	font-size: 1.7rem;
	font-weight: bold;
`;

const DetailsLink = styled.span`
	color: #1890ff;
	cursor: pointer;
	text-decoration: underline;
`;

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
