import React, { useState } from "react";
import styled from "styled-components";
import { Link, useHistory, Redirect } from "react-router-dom";
import {
	MenuFoldOutlined,
	MenuUnfoldOutlined,
	SettingOutlined,
	ImportOutlined,
	CustomerServiceOutlined,
	CreditCardOutlined,
	DollarCircleOutlined,
	ShopOutlined,
	HomeOutlined,
	CarryOutOutlined,
} from "@ant-design/icons";
import { Button, Menu } from "antd";
import TopNavbar from "./TopNavbar";
import { signout } from "../../auth";
import { useCartContext } from "../../cart_context";

function getItem(label, key, icon, children, type, className) {
	return {
		key,
		icon,
		children,
		label,
		type,
		className,
	};
}

const handleSignout = (history) => {
	signout(() => {
		history.push("/");
	});
};

const items = [
	getItem(
		<Link to='/seller/dashboard'>Seller Dashboard</Link>,
		"sub1",
		<HomeOutlined />
	),

	getItem(
		<Link to='/seller/store-management'>Store Settings</Link>,
		"sub10",
		<SettingOutlined />
	),

	getItem(
		<Link to='/seller/products-management'>Products</Link>,
		"sub6",
		<DollarCircleOutlined />
	),

	getItem(
		<Link to='/seller/customer-service'>Customer Service</Link>,
		"sub7",

		<CustomerServiceOutlined />
	),

	getItem(
		<Link to='/seller/coupon-management'>Manage Coupons</Link>,
		"sub23",
		<CarryOutOutlined />
	),

	getItem(
		<div className='margin-divider'></div>,
		"divider1",
		null,
		null,
		"divider"
	),
	getItem(
		"Printify Management",
		"sub13",
		<ImportOutlined />,
		null,
		null,
		"black-bg"
	),
	getItem("CRM", "sub14", <CustomerServiceOutlined />, null, null, "black-bg"),
	getItem("Store POS", "sub15", <ShopOutlined />, null, null, "black-bg"),
	getItem(
		"Financials",
		"sub16",
		<DollarCircleOutlined />,
		null,
		null,
		"black-bg"
	),

	getItem(
		<div className='margin-divider'></div>,
		"divider2",
		null,
		null,
		"divider2"
	),
	getItem("Payments", "sub18", <CreditCardOutlined />, null, null, "red-bg"),
	getItem(
		<div style={{ fontWeight: "bold", textDecoration: "underline" }}>
			Signout
		</div>,
		"signout",
		<CreditCardOutlined />,
		null,
		null,
		"reddish-bg"
	),
];

const SellerNavbar = ({
	fromPage,
	setSellerMenuStatus,
	collapsed,
	setCollapsed,
}) => {
	const [clickedOn, setClickedOn] = useState(false);
	const { chosenLanguage } = useCartContext();
	const history = useHistory();

	const toggleCollapsed = () => {
		setCollapsed(!collapsed);
		setSellerMenuStatus(!collapsed);
	};

	return (
		<>
			<TopNavbar chosenLanguage={chosenLanguage} collapsed={collapsed} />
			<SellerNavbarWrapper
				show={collapsed}
				show2={clickedOn}
				style={{
					width: collapsed ? 80 : 285,
				}}
				dir={chosenLanguage === "Arabic" ? "rtl" : "ltr"}
			>
				<Button
					type='primary'
					onClick={toggleCollapsed}
					style={{
						marginBottom: 8,
						textAlign: "center",
						marginLeft: chosenLanguage === "Arabic" ? 200 : 5,
						marginTop: chosenLanguage === "Arabic" ? 10 : 10,
						left: collapsed ? "10px" : "220px",
					}}
				>
					{collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
				</Button>
				<Menu
					dir={chosenLanguage === "Arabic" ? "rtl" : "ltr"}
					defaultSelectedKeys={
						fromPage === "AdminDashboard"
							? "sub1"
							: fromPage === "Categories"
								? "sub2"
								: fromPage === "Subcategories"
									? "sub3"
									: fromPage === "Attributes"
										? "sub4"
										: fromPage === "Genders"
											? "sub20"
											: fromPage === "SellerProductManagement"
												? "sub6"
												: fromPage === "Support"
													? "sub7"
													: fromPage === "Vendors"
														? "sub8"
														: fromPage === "StoreManagement"
															? "sub10"
															: fromPage === "Website"
																? "sub21"
																: fromPage === "StorePOS"
																	? "sub15"
																	: fromPage === "CouponManagement"
																		? "sub23"
																		: fromPage === "PrintifyMain"
																			? "sub13"
																			: "sub1"
					}
					defaultOpenKeys={["sub1"]}
					mode='inline'
					theme='dark'
					inlineCollapsed={collapsed}
					items={items}
					onClick={(e) => {
						if (e.key === "signout") {
							handleSignout(history);
						}

						if (e.key === "StoreLogo") {
							setClickedOn(true);
						} else {
							setClickedOn(false);
						}

						return <Redirect to={e.key} />;
					}}
				/>
			</SellerNavbarWrapper>
		</>
	);
};

export default SellerNavbar;

const SellerNavbarWrapper = styled.div`
	margin-bottom: 15px;
	background: ${(props) => (props.show ? "" : "#1e1e2d")};
	top: ${(props) => (props.show ? "20px" : "69px")} !important;
	z-index: 20000;
	overflow: auto;
	position: absolute;
	padding: 0px !important;

	position: fixed; // Add this line
	top: 0; // Adjust as needed
	left: 0; // Since the menu is on the right hand side
	height: 100vh; // Make it full height
	width: ${(props) => (props.show ? "5%" : "15%")} !important;

	ul {
		height: 90vh !important;
		padding-top: 20px;
	}

	.logoClass {
		display: ${(props) => (props.show ? "none " : "block")} !important;
	}

	li {
		/* margin: 20px auto; */
		font-size: 1rem;
		margin-bottom: ${(props) => (props.show ? "20px " : "15px")};
	}

	hr {
		color: white !important;
		background: white !important;
	}

	.ant-menu.ant-menu-inline-collapsed {
		min-height: 850px;
		/* position: fixed; */
	}

	.ant-menu.ant-menu-dark,
	.ant-menu-dark .ant-menu-sub,
	.ant-menu.ant-menu-dark .ant-menu-sub {
		color: rgba(255, 255, 255, 0.65);
		background: #1e1e2d !important;
	}

	.ant-menu.ant-menu-dark,
	.ant-menu-dark {
	}

	.ant-menu-item-selected {
		background: ${(props) => (props.show2 ? "none !important" : "")};
	}

	.black-bg {
		background-color: #0e0e15 !important;

		&:hover {
			background-color: #001427 !important; // Or any other color for hover state
		}
	}

	.red-bg {
		background-color: #270000 !important;

		&:hover {
			background-color: #270000 !important; // Or any other color for hover state
		}
	}

	.ant-menu-item-selected {
		background: black !important;
	}

	@media (max-width: 1200px) {
		width: ${(props) => (props.show ? "20%" : "35%")} !important;

		ul {
			display: ${(props) => (props.show ? "none" : "")};
			margin-top: 0px !important;
			top: 0px !important;
		}

		.ant-menu.ant-menu-dark {
			/* position: fixed; */
		}

		button {
			margin-top: 5px !important;
		}
	}

	@media (max-width: 1600px) {
		width: ${(props) => (props.show ? "5%" : "17%")} !important;

		ul {
			display: ${(props) => (props.show ? "none" : "")};
			margin-top: 0px !important;
			top: 0px !important;
		}

		.ant-menu.ant-menu-dark {
			/* position: fixed; */
		}

		button {
			margin-top: 5px !important;
			margin-left: -10px !important;
		}
	}
`;
