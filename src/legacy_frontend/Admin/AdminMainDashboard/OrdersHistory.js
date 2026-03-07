/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useEffect, useState } from "react";
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
import dayjs from "dayjs";

import { getListOfOrdersAggregated, getSearchOrder } from "../apiAdmin";
import { isAuthenticated } from "../../auth";

import { SearchOutlined, EyeOutlined } from "@ant-design/icons";

const { RangePicker } = DatePicker;
const { Search } = Input;

/* ───────────────────────────────────────────────────────── */

const OrdersHistory = ({ showModal }) => {
	/* --------------------- state --------------------- */
	const [data, setData] = useState([]);
	const [totalOrders, setTotalOrders] = useState(0);
	const [totalQuantity, setTotalQuantity] = useState(0);
	const [totalAmount, setTotalAmount] = useState(0);

	const [startDate, setStartDate] = useState(dayjs().subtract(3, "months"));
	const [endDate, setEndDate] = useState(dayjs());

	const [loading, setLoading] = useState(false);
	const [expandedRowKeys, setExpandedRowKeys] = useState([]);
	const [modalImage, setModalImage] = useState(null);

	const [pagination, setPagination] = useState({
		current: 1,
		pageSize: 30,
		total: 0,
	});

	const { user, token } = isAuthenticated();

	/* --------------------- helpers --------------------- */
	const getDisplayImage = (product) => {
		if (product.image?.length) return product.image;

		if (
			product.isPrintifyProduct &&
			product.printifyProductDetails?.POD &&
			product.customDesign?.originalPrintifyImageURL
		) {
			return product.customDesign.originalPrintifyImageURL;
		}
		return "https://via.placeholder.com/50";
	};

	/* --------------------- data fetch ------------------ */
	const fetchOrders = useCallback(
		async (page = 1, pageSize = 50, start = startDate, end = endDate) => {
			setLoading(true);

			try {
				const response = await getListOfOrdersAggregated(
					token,
					page,
					pageSize,
					start.format("YYYY-MM-DD"),
					end.format("YYYY-MM-DD"),
					"all", // status
					user?._id || "all"
				);

				if (response) {
					setData(response.orders);

					setTotalOrders(response.totalRecords || 0);
					setTotalQuantity(
						(response.orders || []).reduce((acc, o) => acc + o.totalOrderQty, 0)
					);
					setTotalAmount(
						(response.orders || []).reduce(
							(acc, o) => acc + o.totalAmountAfterDiscount,
							0
						)
					);

					setPagination({
						current: page,
						pageSize,
						total: response.totalRecords || 0,
					});
				}
			} catch (err) {
				console.error("Error fetching orders:", err);
			} finally {
				setLoading(false);
			}
		},
		[token, user?._id, startDate, endDate]
	);

	/* --------------------- search ---------------------- */
	const handleSearch = async (value) => {
		if (!value) {
			fetchOrders(1, pagination.pageSize, startDate, endDate);
			return;
		}

		setLoading(true);
		try {
			const res = await getSearchOrder(token, value, user._id);

			if (res?.length) {
				setData(res);
				setTotalOrders(res.length);
				setTotalQuantity(res.reduce((acc, o) => acc + o.totalOrderQty, 0));
				setTotalAmount(
					res.reduce((acc, o) => acc + o.totalAmountAfterDiscount, 0)
				);
				setPagination((p) => ({ ...p, total: res.length, current: 1 }));
			} else {
				setData([]);
				setTotalOrders(0);
				setTotalQuantity(0);
				setTotalAmount(0);
				setPagination((p) => ({ ...p, total: 0, current: 1 }));
			}
		} catch (err) {
			console.error("Error searching orders:", err);
		} finally {
			setLoading(false);
		}
	};

	/* --------------------- life‑cycle ------------------ */
	useEffect(() => {
		fetchOrders(1, pagination.pageSize, startDate, endDate);
	}, [startDate, endDate, showModal]); // showModal refreshes list when dialog closes

	/* --------------------- table helpers --------------- */
	const expandedRowRender = (record) => {
		const products = [
			...record.productsNoVariable,
			...record.chosenProductQtyWithVariables,
		];

		return (
			<ExpandedContainer>
				{products.map((product, idx) => {
					const displayImg = getDisplayImage(product);

					return (
						<ProductRow key={idx}>
							<img
								src={displayImg}
								alt='product'
								style={{
									width: 50,
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
											<div style={{ marginTop: 5 }}>
												<small>
													<strong>Source:</strong> Print On Demand
												</small>
											</div>

											{product.customDesign && (
												<div style={{ marginTop: 5 }}>
													{product.customDesign.finalScreenshotUrl && (
														<>
															<strong>Final Design Preview:</strong>
															<br />
															<img
																src={product.customDesign.finalScreenshotUrl}
																alt='Final Design'
																style={{
																	width: 80,
																	marginTop: 3,
																	border: "1px solid #ccc",
																	borderRadius: 5,
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

													{product.customDesign.texts?.length > 0 && (
														<div style={{ marginTop: 5 }}>
															<strong>Custom Text(s):</strong>
															<ul>
																{product.customDesign.texts.map((t, i) => (
																	<li key={i}>
																		<strong>Text:</strong> {t.text}, Color:{" "}
																		{t.color}
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

	/* --------------------- table columns --------------- */
	const columns = [
		{
			title: "#",
			dataIndex: "index",
			key: "index",
			render: (_, __, idx) =>
				(pagination.current - 1) * pagination.pageSize + (idx + 1),
			width: 50,
		},
		{
			title: "Customer Name",
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
			title: "ShipTo Address",
			dataIndex: ["customerDetails", "address"],
			key: "customerAddress",
		},
		{
			title: "Status",
			dataIndex: "status",
			key: "status",
			width: 110,
			render: (t) => t.charAt(0).toUpperCase() + t.slice(1),
		},
		{
			title: "Invoice #",
			dataIndex: "invoiceNumber",
			key: "invoiceNumber",
			width: 110,
		},
		{
			title: "Tracking #",
			dataIndex: "trackingNumber",
			key: "trackingNumber",
			width: 130,
			render: (_, rec) => {
				const printable = rec.trackingNumber;

				if (!printable) return "No Tracking #";

				const isURL =
					printable.includes("http://") || printable.includes("https://");

				return isURL ? (
					<a href={printable} target='_blank' rel='noopener noreferrer'>
						Click Here…
					</a>
				) : (
					printable
				);
			},
		},
		{
			title: "Order Details",
			key: "details",
			width: 120,
			render: (_, rec) => (
				<Tooltip title='Show Full Details'>
					<DetailsLink onClick={() => showModal(rec)}>
						<EyeOutlined />  Details
					</DetailsLink>
				</Tooltip>
			),
		},
	];

	/* --------------------- handlers -------------------- */
	const handleExpand = (expanded, record) => {
		setExpandedRowKeys(expanded ? [record._id] : []);
	};

	const handleTableChange = (pag /*, filters, sorter */) => {
		fetchOrders(pag.current, pag.pageSize, startDate, endDate);
	};

	/* --------------------- render ---------------------- */
	return (
		<>
			{/* summary cards */}
			<Row gutter={16} style={{ marginTop: 20, marginBottom: 20 }}>
				<Col xs={24} md={8}>
					<Card
						hoverable
						style={{ background: "var(--primary-color-dark)", color: "#fff" }}
					>
						<CardTitle>Total Orders</CardTitle>
						<CardCount>
							<CountUp end={totalOrders} duration={1.5} separator=',' />
						</CardCount>
					</Card>
				</Col>

				<Col xs={24} md={8}>
					<Card
						hoverable
						style={{ background: "var(--secondary-color-dark)", color: "#fff" }}
					>
						<CardTitle>Total Quantity</CardTitle>
						<CardCount>
							<CountUp end={totalQuantity} duration={2} separator=',' />
						</CardCount>
					</Card>
				</Col>

				<Col xs={24} md={8}>
					<Card
						hoverable
						style={{ background: "var(--accent-color-1-dark)", color: "#fff" }}
					>
						<CardTitle>Total Amount</CardTitle>
						<CardCount>
							<CountUp
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

			{/* date range & quick‑select */}
			<div className='my-3 mx-auto text-center'>
				<RangePicker
					className='w-25'
					value={[startDate, endDate]}
					onChange={(d) => {
						setStartDate(d ? d[0] : dayjs().subtract(3, "months"));
						setEndDate(d ? d[1] : dayjs());
					}}
					style={{ marginBottom: 10, marginRight: 10 }}
				/>

				<Button
					onClick={() => {
						setStartDate(dayjs().subtract(3, "months"));
						setEndDate(dayjs());
					}}
				>
					Select Last 3 Months
				</Button>
			</div>

			{/* search */}
			<div className='my-3 mx-auto text-center'>
				<Search
					placeholder='Search Orders'
					onSearch={handleSearch}
					enterButton={<SearchOutlined />}
					style={{ width: "25%" }}
				/>
			</div>

			{/* table */}
			<Table
				columns={columns}
				dataSource={data}
				loading={loading}
				expandable={{
					expandedRowRender,
					expandedRowKeys,
					onExpand: handleExpand,
				}}
				rowKey={(r) => r._id}
				style={{ marginTop: 16 }}
				scroll={{ x: 900 }}
				pagination={{
					...pagination,
					showSizeChanger: true,
					pageSizeOptions: ["10", "20", "30", "50", "100"],
				}}
				onChange={handleTableChange}
			/>

			{/* design / image modal */}
			<Modal
				open={!!modalImage}
				onCancel={() => setModalImage(null)}
				footer={null}
				centered
				width='auto'
				bodyStyle={{ padding: 10, textAlign: "center" }}
			>
				{modalImage && (
					<img
						src={modalImage}
						alt='Full Preview'
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

export default OrdersHistory;

/* ───────────── styled‑components (unchanged) ───────────── */
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
