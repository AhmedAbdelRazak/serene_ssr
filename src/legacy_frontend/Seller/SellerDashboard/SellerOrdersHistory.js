import React, { useEffect, useState } from "react";
import {
	DatePicker,
	Table,
	Button,
	Input,
	Modal,
	Card,
	Row,
	Col,
	Tooltip,
} from "antd";
import styled from "styled-components";
import CountUp from "react-countup";
import dayjs from "dayjs"; // using dayjs instead of moment
import {
	getListOfOrdersAggregatedSeller,
	getSearchOrderSeller,
} from "../apiSeller";
import { isAuthenticated } from "../../auth";
import { SearchOutlined, EyeOutlined } from "@ant-design/icons";

const { RangePicker } = DatePicker;
const { Search } = Input;

const SellerOrdersHistory = ({ showModal, storeId }) => {
	const [data, setData] = useState([]);
	const [totalOrders, setTotalOrders] = useState(0);
	const [totalQuantity, setTotalQuantity] = useState(0);
	const [totalAmount, setTotalAmount] = useState(0);
	const [startDate, setStartDate] = useState(dayjs().subtract(5, "months"));
	const [endDate, setEndDate] = useState(dayjs());
	const [loading, setLoading] = useState(false);
	const [expandedRowKeys, setExpandedRowKeys] = useState([]);
	const [modalImage, setModalImage] = useState(null);

	const { user, token } = isAuthenticated();

	// ─────────────────────────────────────────────────────────
	// FETCH ORDERS
	// ─────────────────────────────────────────────────────────
	const fetchOrders = async (start, end) => {
		setLoading(true);

		const page = 1;
		const records = 50;
		const status = "all";
		const userId = user._id;

		const startDateStr = start.format("YYYY-MM-DD");
		const endDateStr = end.format("YYYY-MM-DD");

		try {
			const response = await getListOfOrdersAggregatedSeller(
				token,
				page,
				records,
				startDateStr,
				endDateStr,
				status,
				userId,
				storeId
			);
			if (response && response.orders) {
				setData(response.orders);
				setTotalOrders(response.totalRecords);

				const totalQty = response.orders.reduce(
					(acc, order) => acc + order.totalOrderQty,
					0
				);
				setTotalQuantity(totalQty);

				const totalAmt = response.orders.reduce(
					(acc, order) => acc + order.totalAmountAfterDiscount,
					0
				);
				setTotalAmount(totalAmt);
			}
		} catch (error) {
			console.error("Error fetching orders:", error);
		} finally {
			setLoading(false);
		}
	};

	// ─────────────────────────────────────────────────────────
	// SEARCH ORDERS
	// ─────────────────────────────────────────────────────────
	const handleSearch = async (value) => {
		if (!value) {
			fetchOrders(startDate, endDate);
		} else {
			setLoading(true);
			try {
				const response = await getSearchOrderSeller(
					token,
					value,
					user._id,
					storeId
				);
				if (response && response.length) {
					setData(response);
					setTotalOrders(response.length);

					const totalQty = response.reduce(
						(acc, order) => acc + order.totalOrderQty,
						0
					);
					setTotalQuantity(totalQty);

					const totalAmt = response.reduce(
						(acc, order) => acc + order.totalAmountAfterDiscount,
						0
					);
					setTotalAmount(totalAmt);
				} else {
					setData([]);
					setTotalOrders(0);
					setTotalQuantity(0);
					setTotalAmount(0);
				}
			} catch (error) {
				console.error("Error searching orders:", error);
			} finally {
				setLoading(false);
			}
		}
	};

	useEffect(() => {
		fetchOrders(startDate, endDate);
		// eslint-disable-next-line
	}, [startDate, endDate, showModal]);

	// ─────────────────────────────────────────────────────────
	// HELPER: GET PRODUCT IMAGE
	// ─────────────────────────────────────────────────────────
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

	// ─────────────────────────────────────────────────────────
	// EXPANDED ROW
	// ─────────────────────────────────────────────────────────
	const expandedRowRender = (record) => {
		const products = [
			...record.productsNoVariable,
			...record.chosenProductQtyWithVariables,
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
								<div>Quantity: {product.ordered_quantity}</div>
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

	// ─────────────────────────────────────────────────────────
	// TABLE COLUMNS
	// ─────────────────────────────────────────────────────────
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
		},
		{
			title: "Phone",
			dataIndex: ["customerDetails", "phone"],
			key: "customerPhone",
			width: 150,
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
		},
		{
			title: "Status",
			dataIndex: "status",
			key: "status",
			render: (text) => text.charAt(0).toUpperCase() + text.slice(1),
			width: 110,
		},
		{
			title: "Invoice #",
			dataIndex: "invoiceNumber",
			key: "invoiceNumber",
			width: 110,
		},
		{
			title: "Tracking #",
			dataIndex: "trackingNumber",
			key: "trackingNumber",
			width: 130,
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
				<Tooltip title='Show Full Details'>
					<DetailsLink onClick={() => showModal(record)}>
						<EyeOutlined />
						&nbsp; Details
					</DetailsLink>
				</Tooltip>
			),
		},
	];

	return (
		<>
			<Row gutter={16} style={{ marginTop: "20px", marginBottom: "20px" }}>
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

			<div className='my-3 mx-auto text-center'>
				<RangePicker
					className='w-25'
					value={[startDate, endDate]}
					onChange={(dates) => {
						setStartDate(dates ? dates[0] : dayjs().subtract(3, "months"));
						setEndDate(dates ? dates[1] : dayjs());
					}}
					style={{ marginBottom: 10, marginRight: 10 }}
				/>
				<Button
					onClick={() => {
						setStartDate(dayjs().subtract(3, "months"));
						setEndDate(dayjs());
					}}
				>
					Select Last 3 Months
				</Button>
			</div>

			<div className='my-3 mx-auto text-center'>
				<Search
					placeholder='Search Orders'
					onSearch={handleSearch}
					enterButton={<SearchOutlined />}
					style={{ width: "25%" }}
				/>
			</div>

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
				pagination={{
					pageSize: 30,
					// Optional: allow changing page size
					showSizeChanger: true,
					pageSizeOptions: ["10", "20", "30", "50", "100"],
				}}
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

export default SellerOrdersHistory;

/* ===================== STYLES ===================== */
const CardTitle = styled.div`
	font-size: 1.2em;
	font-weight: bold;
	margin-bottom: 5px;
`;

const CardCount = styled.div`
	font-size: 1.7rem;
	font-weight: bold;
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

const DetailsLink = styled.span`
	color: #1890ff;
	cursor: pointer;
	text-decoration: underline;
`;
