/** @format */
import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { Table, Card, Row, Col, Button, Tooltip, Input } from "antd";
import { Link } from "react-router-dom";
import {
	FilterOutlined,
	DeploymentUnitOutlined,
	InboxOutlined,
	StarOutlined,
	StarFilled,
} from "@ant-design/icons";
import CountUp from "react-countup";

import { getProducts, getStoreManagement } from "../../apiSeller";
import { isAuthenticated } from "../../../auth";
import { toast } from "react-toastify";

import AttributesModal from "./AttributesModal";
import UpdateProductSingle from "./UpdateProductSingle";

const UpdateProduct = () => {
	const [allProducts, setAllProducts] = useState([]);
	const [filteredProducts, setFilteredProducts] = useState([]);

	const [modalVisible, setModalVisible] = useState(false); // For variable attributes
	const [clickedProduct, setClickedProduct] = useState({}); // For attributes modal

	const [selectedProductToUpdate, setSelectedProductToUpdate] = useState(null);

	const [searchQuery, setSearchQuery] = useState("");
	const [filterType, setFilterType] = useState("All");
	// "OutOfStock" | "InStock" | "Featured" | "NotFeatured" | "All"

	const { user, token } = isAuthenticated();

	/* =========================================
     1) On mount, check localStorage => if no storeData, load from API
  ========================================= */
	useEffect(() => {
		const localStoreData = localStorage.getItem("storeData");
		if (localStoreData) {
			try {
				const parsedData = JSON.parse(localStoreData);
				if (parsedData && parsedData._id) {
					console.log("Using store from localStorage => fetching products");
					getProducts(parsedData._id).then((data) => {
						if (!data || data.error) {
							console.log(data?.error || "Error fetching products");
						} else {
							setAllProducts(data);
						}
					});
				} else {
					toast.error("No valid store found in local storage.");
					loadAllProducts(); // fallback
				}
			} catch (err) {
				console.error("Error parsing storeData from localStorage:", err);
				loadAllProducts(); // fallback if parsing fails
			}
		} else {
			// If none in localStorage, fetch store & products from API
			loadAllProducts();
		}
		// eslint-disable-next-line
	}, []);

	/* =========================================
     2) Load store from API => fetch products
  ========================================= */
	const loadAllProducts = () => {
		getStoreManagement(user._id, token)
			.then((res) => {
				if (res && !res.error) {
					// Merge forced fields if needed
					const mergedData = {
						...res,
						transactionFeePercentage: 3.5,
						activatePayOnDelivery: false,
					};

					// If store has _id, fetch products
					if (mergedData && mergedData._id) {
						console.log("Beginning Of Getting Products from DB");
						getProducts(mergedData._id).then((data) => {
							if (!data || data.error) {
								console.log(data?.error || "Error fetching products");
							} else {
								setAllProducts(data);
							}
						});
					} else {
						toast.error("No store found. Cannot load products.");
					}
				} else if (res && res.error) {
					console.log("Error loading store data:", res.error);
				}
			})
			.catch((err) => {
				console.error("Error fetching store management:", err);
			});
	};

	/* =========================================
     3) Recalc filtered products each time allProducts, filterType, or search changes
  ========================================= */
	useEffect(() => {
		let modified = modifyForTable(allProducts);

		// Apply Filter
		modified = applyFilters(modified, filterType);

		// Apply Search
		if (searchQuery.trim()) {
			modified = applySearch(modified, searchQuery.trim().toLowerCase());
		}

		setFilteredProducts(modified);
	}, [allProducts, filterType, searchQuery]);

	/* =========================================
     Helper Functions
  ========================================= */
	function modifyForTable(products) {
		// Convert DB products => array for Table
		return products.map((p) => ({
			productId: p._id,
			productName: p.productName,
			productSKU: p.productSKU,
			price: p.priceAfterDiscount,
			quantity: p.addVariables
				? p.productAttributes.reduce((acc, attr) => acc + attr.quantity, 0)
				: p.quantity,
			createdAt: p.createdAt,
			addedBy:
				p?.addedByEmployee?.name || (p.isPrintifyProduct ? "Printify" : ""),
			thumbnailUrl: p.thumbnailImage?.[0]?.images?.[0]?.url || "",
			isPrintify: p.isPrintifyProduct || false,
			featured: p.featuredProduct || false,
			originalProduct: p, // keep entire product
		}));
	}

	function applyFilters(rows, filterType) {
		if (filterType === "All") return rows;
		if (filterType === "OutOfStock") {
			return rows.filter((r) => Number(r.quantity) <= 0);
		}
		if (filterType === "InStock") {
			return rows.filter((r) => Number(r.quantity) > 0);
		}
		if (filterType === "Featured") {
			return rows.filter((r) => r.originalProduct.featuredProduct === true);
		}
		if (filterType === "NotFeatured") {
			return rows.filter((r) => r.originalProduct.featuredProduct === false);
		}
		return rows;
	}

	function applySearch(rows, query) {
		return rows.filter((row) => {
			const productName = row.productName?.toLowerCase() || "";
			const productSKU = row.productSKU?.toLowerCase() || "";
			return productName.includes(query) || productSKU.includes(query);
		});
	}

	// Sum of quantity
	function calculateStockLevel(products) {
		let total = 0;
		products.forEach((p) => {
			if (!p.addVariables) {
				total += p.quantity || 0;
			} else {
				total += p.productAttributes.reduce(
					(acc, attr) => acc + (attr.quantity || 0),
					0
				);
			}
		});
		return total;
	}

	// Sum of (quantity * priceAfterDiscount)
	function calculateStockWorth(products) {
		let total = 0;
		products.forEach((p) => {
			if (!p.addVariables) {
				total += (p.quantity || 0) * (p.priceAfterDiscount || 0);
			} else {
				const subTotal = p.productAttributes.reduce(
					(acc, attr) =>
						acc + (attr.quantity || 0) * (attr.priceAfterDiscount || 0),
					0
				);
				total += subTotal;
			}
		});
		return total;
	}

	// Sum of (quantity * price)
	function calculateStockCost(products) {
		let total = 0;
		products.forEach((p) => {
			if (!p.addVariables) {
				total += (p.quantity || 0) * (p.price || 0);
			} else {
				const subTotal = p.productAttributes.reduce(
					(acc, attr) => acc + (attr.quantity || 0) * (attr.price || 0),
					0
				);
				total += subTotal;
			}
		});
		return total;
	}

	// Sum of (quantity * MSRP)
	function calculatePurchasePrice(products) {
		let total = 0;
		products.forEach((p) => {
			if (!p.addVariables) {
				total += (p.quantity || 0) * (p.MSRPPriceBasic || 0);
			} else {
				const subTotal = p.productAttributes.reduce(
					(acc, attr) => acc + (attr.quantity || 0) * (attr.MSRP || 0),
					0
				);
				total += subTotal;
			}
		});
		return total;
	}

	/* =========================================
     Table columns
  ========================================= */
	const columns = [
		{
			title: "Item #",
			dataIndex: "index",
			key: "index",
			width: 90,
			render: (_val, _record, index) => index + 1,
		},
		{
			title: "Product Name",
			dataIndex: "productName",
			key: "productName",
			width: 250,
			ellipsis: { showTitle: false },
			render: (text) => (
				<Tooltip title={text || "N/A"}>
					<span style={{ textTransform: "capitalize" }}>{text}</span>
				</Tooltip>
			),
		},
		{
			title: "SKU",
			dataIndex: "productSKU",
			key: "productSKU",
			width: 120,
			ellipsis: { showTitle: false },
			render: (text) => (
				<Tooltip title={text || "N/A"}>
					<span>{text}</span>
				</Tooltip>
			),
		},
		{
			title: "Price",
			dataIndex: "price",
			key: "price",
			width: 100,
			render: (_val, record) => {
				const product = record.originalProduct;
				if (product.addVariables) {
					// show link to view attribute-level pricing
					return (
						<Tooltip title='Click to view attribute-level pricing'>
							<span
								style={{
									fontWeight: "bold",
									textDecoration: "underline",
									color: "darkblue",
									cursor: "pointer",
								}}
								onClick={() => {
									setClickedProduct(product);
									setModalVisible(true);
								}}
							>
								Check Attributes
							</span>
						</Tooltip>
					);
				}
				return _val;
			},
		},
		{
			title: "Stock",
			dataIndex: "quantity",
			key: "quantity",
			width: 80,
			render: (val) => (
				<div
					style={{
						background: val <= 0 ? "#fdd0d0" : "",
						textAlign: "center",
						borderRadius: "4px",
					}}
				>
					{val}
				</div>
			),
		},
		{
			title: "Created On",
			dataIndex: "createdAt",
			key: "createdAt",
			width: 120,
			render: (val) => (val ? new Date(val).toLocaleDateString() : "N/A"),
		},
		{
			title: "Created By",
			dataIndex: "addedBy",
			key: "addedBy",
			width: 120,
			ellipsis: { showTitle: false },
			render: (text) => (
				<Tooltip title={text || "N/A"}>
					<span>{text}</span>
				</Tooltip>
			),
		},
		{
			title: "Thumbnail",
			dataIndex: "thumbnailUrl",
			key: "thumbnailUrl",
			width: 120,
			render: (url, record) => {
				return url ? (
					<Tooltip title={record.productName}>
						<img
							src={url}
							alt={record.productName}
							style={{
								width: "50px",
								height: "50px",
								objectFit: "cover",
								borderRadius: "4px",
							}}
						/>
					</Tooltip>
				) : (
					"N/A"
				);
			},
		},
		{
			title: "Action",
			key: "action",
			width: 120,
			render: (_val, record) => (
				<Tooltip title='Update Product'>
					<Link
						to='/seller/products-management?tab=UpdateProducts&updateproduct'
						onClick={() => {
							setSelectedProductToUpdate(record);
						}}
						style={{ fontWeight: "bold", color: "blue" }}
					>
						Update...
					</Link>
				</Tooltip>
			),
		},
	];

	/* =========================================
     Summary Calculations
  ========================================= */
	const overallProductsCount = allProducts.length;
	const overallInventoryLevel = calculateStockLevel(allProducts);
	const overallPurchasePrice = calculatePurchasePrice(allProducts);
	const overallSellingPrice = calculateStockWorth(allProducts); // "Total Selling Price"
	const overallStockWorth = calculateStockCost(allProducts); // "Stock Worth"

	/* =========================================
     Switch between table and single-product update
  ========================================= */
	const handleBackToList = () => {
		setSelectedProductToUpdate(null);
		window.scrollTo({ top: 0, behavior: "smooth" });
	};

	return (
		<UpdateProductWrapper>
			{/* SCORECARDS */}
			{!selectedProductToUpdate && (
				<Row
					gutter={[16, 16]}
					style={{
						marginTop: 20,
						marginBottom: 20,
						display: "flex",
						flexWrap: "wrap",
						alignItems: "stretch",
					}}
				>
					<Col xs={24} sm={12} md={8} lg={5} style={{ display: "flex" }}>
						<Card
							style={{
								background: "#f1416c",
								color: "white",
								width: "100%",
								display: "flex",
								flexDirection: "column",
								justifyContent: "center",
							}}
							hoverable
						>
							<h5 style={{ fontWeight: "bolder" }}>Overall Products Count</h5>
							<CountUp
								style={{ color: "white", fontSize: "1.4rem" }}
								duration={3}
								delay={1}
								end={overallProductsCount}
								separator=','
							/>
							<span style={{ color: "white", marginLeft: "5px" }}>
								Products
							</span>
						</Card>
					</Col>

					<Col xs={24} sm={12} md={8} lg={5} style={{ display: "flex" }}>
						<Card
							style={{
								background: "#009ef7",
								color: "white",
								width: "100%",
								display: "flex",
								flexDirection: "column",
								justifyContent: "center",
							}}
							hoverable
						>
							<h5 style={{ fontWeight: "bolder" }}>Overall Inventory Level</h5>
							<CountUp
								style={{ color: "white", fontSize: "1.4rem" }}
								duration={3}
								delay={1}
								end={overallInventoryLevel}
								separator=','
							/>
							<span style={{ color: "white", marginLeft: "5px" }}>Items</span>
						</Card>
					</Col>

					{/* The next cards only show if user role allows */}
					{!["Order Taker", "Operations", "Stock Keeper"].includes(
						user.userRole
					) && (
						<>
							<Col xs={24} sm={12} md={8} lg={5} style={{ display: "flex" }}>
								<Card
									style={{
										background: "#541838",
										color: "white",
										width: "100%",
										display: "flex",
										flexDirection: "column",
										justifyContent: "center",
									}}
									hoverable
								>
									<h5 style={{ fontWeight: "bolder" }}>Purchase Price</h5>
									<CountUp
										style={{ color: "white", fontSize: "1.4rem" }}
										duration={3}
										delay={1}
										end={overallPurchasePrice}
										separator=','
									/>
									<span style={{ color: "white", marginLeft: "5px" }}>USD</span>
								</Card>
							</Col>

							<Col xs={24} sm={12} md={8} lg={5} style={{ display: "flex" }}>
								<Card
									style={{
										background: "#50cd89",
										color: "white",
										width: "100%",
										display: "flex",
										flexDirection: "column",
										justifyContent: "center",
									}}
									hoverable
								>
									<h5 style={{ fontWeight: "bolder" }}>Total Selling Price</h5>
									<CountUp
										style={{ color: "white", fontSize: "1.4rem" }}
										duration={3}
										delay={1}
										end={overallSellingPrice}
										separator=','
									/>
									<span style={{ color: "white", marginLeft: "5px" }}>USD</span>
								</Card>
							</Col>

							<Col xs={24} sm={12} md={8} lg={4} style={{ display: "flex" }}>
								<Card
									style={{
										background: "#185434",
										color: "white",
										width: "100%",
										display: "flex",
										flexDirection: "column",
										justifyContent: "center",
									}}
									hoverable
								>
									<h5 style={{ fontWeight: "bolder" }}>Stock Worth</h5>
									<CountUp
										style={{ color: "white", fontSize: "1.4rem" }}
										duration={3}
										delay={1}
										end={overallStockWorth}
										separator=','
									/>
									<span style={{ color: "white", marginLeft: "5px" }}>USD</span>
								</Card>
							</Col>
						</>
					)}
				</Row>
			)}

			{/* IF SELECTED PRODUCT => SINGLE UPDATE | ELSE => TABLE */}
			{selectedProductToUpdate && selectedProductToUpdate.productId ? (
				<div style={{ marginTop: 30 }}>
					<h4
						onClick={handleBackToList}
						style={{ cursor: "pointer", textDecoration: "underline" }}
					>
						Back To Products List
					</h4>
					<div className='my-3'>
						<UpdateProductSingle
							productId={selectedProductToUpdate.productId}
						/>
					</div>
				</div>
			) : (
				<>
					{/* FILTER BUTTONS + SEARCH BAR */}
					<div
						style={{
							display: "flex",
							flexWrap: "wrap",
							gap: 10,
							alignItems: "center",
							marginBottom: 16,
						}}
					>
						<Button
							icon={<DeploymentUnitOutlined />}
							onClick={() => setFilterType("All")}
							type={filterType === "All" ? "primary" : "default"}
						>
							All
						</Button>

						<Button
							icon={<InboxOutlined />}
							onClick={() => setFilterType("OutOfStock")}
							type={filterType === "OutOfStock" ? "primary" : "default"}
						>
							Out Of Stock
						</Button>

						<Button
							icon={<InboxOutlined />}
							onClick={() => setFilterType("InStock")}
							type={filterType === "InStock" ? "primary" : "default"}
						>
							In Stock
						</Button>

						<Button
							icon={<StarFilled />}
							onClick={() => setFilterType("Featured")}
							type={filterType === "Featured" ? "primary" : "default"}
						>
							Featured
						</Button>

						<Button
							icon={<StarOutlined />}
							onClick={() => setFilterType("NotFeatured")}
							type={filterType === "NotFeatured" ? "primary" : "default"}
						>
							Not Featured
						</Button>

						{/* Search Input */}
						<Input
							placeholder='Search product name or SKU...'
							allowClear
							style={{ width: 300 }}
							prefix={<FilterOutlined />}
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
						/>
					</div>

					{/* TABLE */}
					<Table
						columns={columns}
						dataSource={filteredProducts}
						rowKey={(record) => record.productId}
						pagination={{ pageSize: 40 }}
						style={{ background: "white", overflowY: "auto", height: "700px" }}
						scroll={{ x: 900 }}
					/>
				</>
			)}

			{/* ATTRIBUTES MODAL */}
			<AttributesModal
				product={clickedProduct}
				modalVisible={modalVisible}
				setModalVisible={setModalVisible}
			/>
		</UpdateProductWrapper>
	);
};

export default UpdateProduct;

/* ================== STYLES ================== */
const UpdateProductWrapper = styled.div`
	min-height: 980px;
	margin: 0 20px;

	h4 {
		font-weight: bold;
		text-decoration: underline;
		font-size: 1.3rem;
		text-align: left;
		margin-bottom: 20px;
	}
`;
