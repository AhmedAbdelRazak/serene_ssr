import React, { useEffect, useState } from "react";
import styled from "styled-components";
import {
	DatePicker,
	Select,
	Spin,
	Card,
	Row,
	Col,
	Empty,
	Table,
	Button,
} from "antd";
import axios from "axios";
import dayjs from "dayjs";
import Chart from "react-apexcharts";
import CountUp from "react-countup";
import { isAuthenticated } from "../../auth";
import ReportDetailsModal from "./ReportDetailsModal"; // Ensure correct path

const { RangePicker } = DatePicker;
const { Option } = Select;

/** The measure options you allow in the backend: */
const measureOptions = [
	{ label: "Order Count", value: "orderCount" },
	{ label: "Total Quantity", value: "totalQuantity" },
	{ label: "Gross Total", value: "grossTotal" },
	{ label: "Net Total", value: "netTotal" },
	{ label: "Gross Margin", value: "grossMargin" },
];

// For display labels throughout charts/tables/tooltips:
const measureLabelMap = {
	orderCount: "Order Count",
	totalQuantity: "Total Quantity",
	grossTotal: "Gross Total",
	netTotal: "Net Total",
	grossMargin: "Gross Margin",
};

// Utility to determine if the measure should be displayed as currency
const isCurrencyMeasure = (measureType) =>
	["grossTotal", "netTotal", "grossMargin"].includes(measureType);

// Format the y-value for tooltips or other chart cells
const formatValue = (measureType, val) => {
	if (isCurrencyMeasure(measureType)) {
		// Display as currency with two decimals
		return `$${Number(val).toFixed(2)}`;
	} else {
		// Integers or raw numeric
		return Number(val).toLocaleString();
	}
};

const SellerReports = ({ storeId }) => {
	const [loading, setLoading] = useState(false);
	const { user, token } = isAuthenticated();

	// 1) Date range: default to the LAST 30 DAYS
	const [dateRange, setDateRange] = useState([
		dayjs().subtract(30, "day").startOf("day"),
		dayjs().endOf("day"),
	]);

	// Track which quick‐range button is active:
	const [quickRange, setQuickRange] = useState("last30days");

	// 2) Measure type (used for dayOverDay, state, status, scoreboard)
	const [measureType, setMeasureType] = useState("grossTotal");

	// 3) Data from backend
	const [reportData, setReportData] = useState(null);

	// Modal for “detailed orders”
	const [detailsModalVisible, setDetailsModalVisible] = useState(false);
	const [detailsFilterType, setDetailsFilterType] = useState(null); // "product" or "state"
	const [detailsFilterValue, setDetailsFilterValue] = useState(null); // e.g. "T-Shirt" or "NY"

	// Extract sub-arrays after data arrives
	const {
		dayOverDay = [],
		productSummary = [],
		stateSummary = [],
		statusSummary = [],
		scoreboard = [],
	} = reportData || {};

	// Scoreboard is an array with 1 object (if data is found)
	const score =
		scoreboard && scoreboard.length
			? scoreboard[0]
			: {
					totalOrders: 0,
					totalQuantity: 0,
					grossTotal: 0,
					totalExpenses: 0,
					netTotal: 0,
				};

	// 4) Fetch data from server whenever dateRange or measureType changes
	const fetchReport = async () => {
		try {
			// Skip if we don't have a storeId yet
			if (!storeId) return;

			setLoading(true);
			const startDate = dateRange[0].format("YYYY-MM-DD");
			const endDate = dateRange[1].format("YYYY-MM-DD");

			const res = await axios.get(
				`${process.env.REACT_APP_API_URL}/seller/order-report/report/${user._id}/${storeId}`,
				{
					params: { startDate, endDate, measureType },
					headers: { Authorization: `Bearer ${token}` },
				}
			);

			setReportData(res.data.data);
		} catch (err) {
			console.error("Error fetching admin report:", err);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchReport();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [dateRange, measureType, storeId]);
	// Include storeId in dependency array so we fetch whenever storeId changes.

	// ==================== Quick Range Handler ====================
	const handleQuickRange = (key) => {
		setQuickRange(key);
		let start = null;
		let end = dayjs().endOf("day");

		switch (key) {
			case "today":
				start = dayjs().startOf("day");
				break;
			case "yesterday":
				start = dayjs().subtract(1, "day").startOf("day");
				end = dayjs().subtract(1, "day").endOf("day");
				break;
			case "last7days":
				start = dayjs().subtract(6, "day").startOf("day"); // i.e. 7 days total
				break;
			case "last14days":
				start = dayjs().subtract(13, "day").startOf("day");
				break;
			case "last30days":
				start = dayjs().subtract(29, "day").startOf("day");
				break;
			case "all":
				start = dayjs("2000-01-01").startOf("day");
				break;
			default:
				start = dayjs().subtract(13, "day").startOf("day");
				break;
		}
		setDateRange([start, end]);
	};

	// ==================== Chart & Table Settings ====================
	const measureLabel = measureLabelMap[measureType] || measureType;

	const chartTooltip = {
		y: {
			formatter: (val) => formatValue(measureType, val),
		},
	};

	// ---------- Day Over Day (Line) ----------
	const dayOverDayChartOptions = {
		chart: {
			id: "dayOverDay",
			toolbar: { show: false },
			zoom: { enabled: false },
		},
		xaxis: {
			categories: dayOverDay.map((d) => d._id),
		},
		yaxis: {
			labels: {
				formatter: (val) => formatValue(measureType, val),
			},
		},
		stroke: { curve: "smooth" },
		colors: ["#d4af37"],
		dataLabels: { enabled: false },
		title: {
			text: `Day Over Day (${measureLabel})`,
			align: "center",
			style: { fontSize: "16px" },
		},
		tooltip: chartTooltip,
	};
	const dayOverDayChartSeries = [
		{
			name: measureLabel,
			data: dayOverDay.map((d) => d.measure),
		},
	];

	// ---------- State Summary (Bar) ----------
	const stateLabels = stateSummary.map((s) => s._id || "Unknown");
	const stateValues = stateSummary.map((s) => s.measure);

	const stateChartOptions = {
		chart: {
			id: "stateSummary",
			type: "bar",
			toolbar: { show: false },
			// Enable bar clicks:
			events: {
				dataPointSelection: (event, chartContext, config) => {
					const { dataPointIndex } = config;
					if (dataPointIndex >= 0) {
						const clickedState = stateLabels[dataPointIndex];
						// Show modal for that state
						setDetailsFilterType("state");
						setDetailsFilterValue(clickedState);
						setDetailsModalVisible(true);
					}
				},
			},
		},
		plotOptions: {
			bar: {
				borderRadius: 4,
				horizontal: false,
			},
		},
		xaxis: {
			categories: stateLabels,
			labels: { rotate: -45 },
		},
		yaxis: {
			labels: { formatter: (val) => formatValue(measureType, val) },
		},
		dataLabels: { enabled: false },
		colors: ["#b8b8b8"],
		title: {
			text: `State Summary (${measureLabel})`,
			align: "center",
			style: { fontSize: "16px" },
		},
		tooltip: chartTooltip,
	};
	const stateChartSeries = [
		{
			name: measureLabel,
			data: stateValues,
		},
	];

	// ---------- Status Summary (Pie Chart) ----------
	const statusLabels = statusSummary.map((s) => s._id || "Unknown");
	const statusValues = statusSummary.map((s) => s.measure);

	const statusChartOptions = {
		chart: { type: "pie" },
		labels: statusLabels,
		title: {
			text: `Status Summary (${measureLabel})`,
			align: "center",
			style: { fontSize: "16px" },
		},
		legend: { position: "bottom" },
		colors: [
			"#d4af37", // gold
			"#c0c0c0", // classic silver
			"#dedede", // lighter silver
			"#b8b8b8", // mid-silver
			"#f2f2f2", // near white
			"#a8a8a8", // darker grey
		],
		tooltip: chartTooltip,
	};

	// ---------- Product Summary (Table) ----------
	const sortedProductSummary = [...productSummary].sort(
		(a, b) => (b.totalQuantity || 0) - (a.totalQuantity || 0)
	);

	const productTableColumns = [
		{
			title: "#",
			dataIndex: "index",
			key: "index",
			width: 50,
			render: (_, __, index) => index + 1,
		},
		{
			title: "Product",
			dataIndex: "_id",
			key: "productName",
		},
		{
			title: "Ordered Quantity",
			dataIndex: "totalQuantity",
			key: "totalQuantity",
			render: (value) => Number(value || 0).toLocaleString(),
		},
		{
			title: "Product Total Price",
			dataIndex: "grossTotal",
			key: "grossTotal",
			render: (value) => `$${(value || 0).toFixed(2)}`,
		},
	];

	const productTableData = sortedProductSummary.map((item) => ({
		key: item._id || Math.random(), // fallback if _id is missing
		_id: item._id, // product name
		orderCount: item.orderCount || 0,
		totalQuantity: item.totalQuantity || 0,
		grossTotal: item.grossTotal || 0,
		netTotal: item.netTotal || 0,
	}));

	// Make each row clickable to open the modal for that product
	const onProductTableRow = (record) => ({
		onClick: () => {
			setDetailsFilterType("product");
			setDetailsFilterValue(record._id);
			setDetailsModalVisible(true);
		},
	});

	return (
		<SellerReportsWrapper>
			<h1 className='page-title'>Orders Report</h1>

			{/* Controls: Quick Range Buttons & RangePicker & Measure Type */}
			<ControlsBar>
				<QuickButtonsBar>
					<Button
						type={quickRange === "today" ? "primary" : "default"}
						onClick={() => handleQuickRange("today")}
					>
						Today
					</Button>
					<Button
						type={quickRange === "yesterday" ? "primary" : "default"}
						onClick={() => handleQuickRange("yesterday")}
					>
						Yesterday
					</Button>
					<Button
						type={quickRange === "last7days" ? "primary" : "default"}
						onClick={() => handleQuickRange("last7days")}
					>
						Last 7 Days
					</Button>
					<Button
						type={quickRange === "last14days" ? "primary" : "default"}
						onClick={() => handleQuickRange("last14days")}
					>
						Last 14 Days
					</Button>
					<Button
						type={quickRange === "last30days" ? "primary" : "default"}
						onClick={() => handleQuickRange("last30days")}
					>
						Last 30 Days
					</Button>
					<Button
						type={quickRange === "all" ? "primary" : "default"}
						onClick={() => handleQuickRange("all")}
					>
						All Orders
					</Button>
				</QuickButtonsBar>

				<div className='control-item'>
					<label>Date Range:</label>
					<RangePicker
						value={dateRange}
						onChange={(val) => setDateRange(val)}
						allowClear={false}
					/>
				</div>

				<div className='control-item'>
					<label>Measure Type:</label>
					<Select
						value={measureType}
						onChange={(val) => setMeasureType(val)}
						style={{ width: 200 }}
					>
						{measureOptions.map((opt) => (
							<Option key={opt.value} value={opt.value}>
								{opt.label}
							</Option>
						))}
					</Select>
				</div>
			</ControlsBar>

			{loading ? (
				<Spin spinning tip='Loading Reports...' size='large'>
					<div style={{ minHeight: 220 }} />
				</Spin>
			) : !reportData ? (
				<Empty description='No report data yet.' />
			) : (
				<>
					{/* Scoreboard */}
					<ScoreboardWrapper>
						<Row gutter={[15, 15]}>
							<Col xs={24} sm={12} md={6} lg={5}>
								<StyledCard hoverable>
									<h3>Total Orders</h3>
									<p>
										<CountUp
											end={score.totalOrders}
											separator=','
											duration={1}
										/>
									</p>
								</StyledCard>
							</Col>
							<Col xs={24} sm={12} md={6} lg={5}>
								<StyledCard hoverable>
									<h3>Total Quantity</h3>
									<p>
										<CountUp
											end={score.totalQuantity}
											separator=','
											duration={1}
										/>
									</p>
								</StyledCard>
							</Col>
							<Col xs={24} sm={12} md={6} lg={5}>
								<StyledCard hoverable>
									<h3>Gross Total</h3>
									<p>
										$
										<CountUp
											end={score.grossTotal || 0}
											separator=','
											decimals={2}
											duration={1}
										/>
									</p>
								</StyledCard>
							</Col>
							<Col xs={24} sm={12} md={6} lg={5}>
								<StyledCard hoverable>
									<h3>Total Expenses</h3>
									<p>
										$
										<CountUp
											end={score.totalExpenses || 0}
											separator=','
											decimals={2}
											duration={1}
										/>
									</p>
								</StyledCard>
							</Col>
							<Col xs={24} sm={12} md={6} lg={4}>
								<StyledCard hoverable>
									<h3>Net Total</h3>
									<p>
										$
										<CountUp
											end={score.netTotal || 0}
											separator=','
											decimals={2}
											duration={1}
										/>
									</p>
								</StyledCard>
							</Col>
						</Row>
					</ScoreboardWrapper>

					{/* Charts & Tables Grid */}
					<ChartGrid>
						{/* Day Over Day (Line) */}
						<div className='chart-box'>
							{dayOverDay && dayOverDay.length ? (
								<Chart
									options={dayOverDayChartOptions}
									series={dayOverDayChartSeries}
									type='line'
									width='600'
									height='500'
								/>
							) : (
								<Empty description='No Day Over Day Data' />
							)}
						</div>

						{/* Product Summary (Table) */}
						<div className='chart-box'>
							{sortedProductSummary && sortedProductSummary.length ? (
								<Table
									columns={productTableColumns}
									dataSource={productTableData}
									pagination={false}
									size='small'
									onRow={onProductTableRow}
									title={() => "Product Summary (All Stats)"}
									style={{
										maxHeight: "500px",
										minHeight: "500px",
										overflowY: "auto",
									}}
								/>
							) : (
								<Empty description='No Product Data' />
							)}
						</div>

						{/* State Summary (Bar) */}
						<div className='chart-box'>
							{stateSummary.length ? (
								<Chart
									options={stateChartOptions}
									series={stateChartSeries}
									type='bar'
									width='600'
									height='500'
								/>
							) : (
								<Empty description='No State Data' />
							)}
						</div>

						{/* Status Summary (Pie) */}
						<div className='chart-box'>
							{statusSummary && statusSummary.length ? (
								<Chart
									options={statusChartOptions}
									series={statusValues}
									type='pie'
									width='600'
									height='500'
								/>
							) : (
								<Empty description='No Status Data' />
							)}
						</div>
					</ChartGrid>
				</>
			)}

			{/* Modal for viewing detailed orders */}
			<ReportDetailsModal
				open={detailsModalVisible}
				onClose={() => setDetailsModalVisible(false)}
				filterType={detailsFilterType}
				filterValue={detailsFilterValue}
				startDate={dateRange[0]}
				endDate={dateRange[1]}
				storeId={storeId}
			/>
		</SellerReportsWrapper>
	);
};

export default SellerReports;

/* ====================== STYLES ====================== */
const SellerReportsWrapper = styled.div`
	background-color: #f2f2f2;
	padding: 20px;
	border-radius: 20px;
	border: 2px solid #dedede;

	.page-title {
		font-size: 1.4rem;
		margin-bottom: 20px;
		color: #333;
		font-weight: bold;
		text-align: center;
	}

	td,
	th {
		text-transform: capitalize;
		font-size: 12px;
	}
`;

const ControlsBar = styled.div`
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	margin-bottom: 20px;
	gap: 1rem;

	.control-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		label {
			font-weight: 600;
			color: #555;
		}
	}
`;

const QuickButtonsBar = styled.div`
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
`;

const ScoreboardWrapper = styled.div`
	margin-bottom: 20px;
`;

const StyledCard = styled(Card)`
	text-align: center;
	background: linear-gradient(135deg, #d4af37 30%, #ffffff 120%);
	border-radius: 10px;
	border: 1px solid #ccc;
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

	h3 {
		font-size: 1rem;
		margin-bottom: 0.5rem;
		color: #333;
	}
	p {
		font-size: 1.8rem;
		font-weight: bold;
		color: #444;
		margin: 0;
	}
`;

const ChartGrid = styled.div`
	display: grid;
	grid-template-columns: 1fr;
	gap: 30px;

	.chart-box {
		border: 1px solid #ccc;
		border-radius: 10px;
		padding: 10px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		background: #ffffff;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;

		.ant-table-title {
			font-weight: bold;
			font-size: 1.1rem;
			text-align: center;
			padding: 8px 0;
			background: #d4af37; /* Goldish header for the table */
			color: #fff;
			border-radius: 6px;
			margin-bottom: 10px;
		}
	}

	@media (min-width: 992px) {
		grid-template-columns: 1fr 1fr;
	}
`;
