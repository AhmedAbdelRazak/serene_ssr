import React, { useEffect, useState } from "react";
import { useLocation, useHistory } from "react-router-dom";
import { getPurchaseHistory } from "../apiCore";
import { isAuthenticated } from "../auth";
import { Layout, Menu } from "antd";
import {
	UserOutlined,
	ShoppingCartOutlined,
	HeartOutlined,
} from "@ant-design/icons";
import OrdersPage from "./OrdersPage";
import UpdateProfilePage from "./UpdateProfilePage";
import ContactCustomerServicePage from "./ContactCustomerServicePage";
import UserWishlist from "./UserWishlist";
import styled from "styled-components";
import { Helmet } from "react-helmet-async";
import ReactGA from "react-ga4";
import ReactPixel from "react-facebook-pixel";
import axios from "axios";
import { useCartContext } from "../cart_context"; //  â† NEW import

const { Sider, Content } = Layout;

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

const UserDashboard = () => {
	const [collapsed, setCollapsed] = useState(false);
	const [currentPage, setCurrentPage] = useState("orders");
	const [orders, setOrders] = useState([]);

	const { user, token } = isAuthenticated();
	const history = useHistory();
	const location = useLocation();
	const { clearCart } = useCartContext(); //  â† NEW hook

	/* stable primitives for deps */
	const { email: userEmail, phone: userPhone } = user || {};

	/* â”€â”€â”€ Fetch orders & handle forced reload â”€â”€â”€ */
	useEffect(() => {
		const qp = new URLSearchParams(location.search);
		const pg = qp.get("page");
		if (pg) setCurrentPage(pg);

		getPurchaseHistory(user._id, token).then((data) => {
			if (data.error) console.error(data.error);
			else setOrders(data);
		});

		const cameFromCart = location.state && location.state.from === "/cart";
		const hasRefreshed = localStorage.getItem("hasRefreshed");
		if (cameFromCart && !hasRefreshed) {
			localStorage.setItem("hasRefreshed", "true");
			window.location.reload();
		}
	}, [location.search, location.state, user._id, token]);

	/* â”€â”€â”€ Detect firstâ€‘time Paid order â†’ analytics + clear cart â”€â”€â”€ */
	useEffect(() => {
		if (!orders.length) return;

		const latestPaid = orders
			.filter((o) => o.paymentStatus === "Paid")
			.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

		if (!latestPaid) return;

		const key = `purchase-fired-${latestPaid.invoiceNumber}`;
		if (localStorage.getItem(key)) return; // already processed

		/* --- Google Analytics --- */
		ReactGA.event({
			category: "User Successfully Paid",
			action: "User Successfully Paid",
			value: Number(latestPaid.totalAmountAfterDiscount),
		});

		/* --- Facebook Pixel + CAPI --- */
		const fbEventId = `purchase-${latestPaid.invoiceNumber}`;
		const allItems = latestPaid.chosenProductQtyWithVariables.concat(
			latestPaid.productsNoVariable
		);

		ReactPixel.track(
			"Purchase",
			{
				currency: "USD",
				value: Number(latestPaid.totalAmountAfterDiscount),
				contents: allItems.map((p) => ({
					id: p.productId,
					quantity: p.ordered_quantity,
				})),
				content_type: "product",
			},
			{ eventID: fbEventId }
		);

		axios
			.post(`${process.env.REACT_APP_API_URL}/facebookpixel/conversionapi`, {
				eventName: "Purchase",
				eventId: fbEventId,
				email: userEmail || null,
				phone: userPhone || null,
				currency: "USD",
				value: Number(latestPaid.totalAmountAfterDiscount),
				contentIds: allItems.map((p) => p.productId),
				userAgent: window.navigator.userAgent,
			})
			.catch(() => {
				/* silent */
			});

		/* --- Clear cart once --- */
		clearCart(); //  â† NEW call

		/* mark as handled */
		localStorage.setItem(key, "true");
	}, [orders, userEmail, userPhone, clearCart]);

	/* â”€â”€â”€ sideâ€‘menu handlers â”€â”€â”€ */
	const toggleCollapse = () => setCollapsed(!collapsed);

	const handleMenuClick = ({ key }) => {
		setCurrentPage(key);
		history.push(`?page=${key}`);
	};

	const renderContent = () => {
		switch (currentPage) {
			case "orders":
				return orders && orders.length ? (
					<OrdersPage orders={orders} />
				) : (
					<>No Orders</>
				);
			case "profile":
				return <UpdateProfilePage />;
			case "contact":
				return <ContactCustomerServicePage />;
			case "wishlist":
				return <UserWishlist />;
			default:
				return <OrdersPage orders={orders} />;
		}
	};

	/* â”€â”€â”€ Render â”€â”€â”€ */
	return (
		<UserDashboardWrapper>
			<Helmet>{/* extra tags if needed */}</Helmet>

			<Layout style={{ minHeight: "100vh" }}>
				<Sider
					collapsible
					collapsed={collapsed}
					onCollapse={toggleCollapse}
					breakpoint='md'
					width={240}
					collapsedWidth={40}
				>
					<Menu
						theme='dark'
						selectedKeys={[currentPage]}
						mode='inline'
						onClick={handleMenuClick}
					>
						<Menu.Item key='orders' icon={<ShoppingCartOutlined />}>
							Your Orders
						</Menu.Item>
						<Menu.Item key='profile' icon={<UserOutlined />}>
							Update Profile
						</Menu.Item>
						{/* <Menu.Item key='contact' icon={<CustomerServiceOutlined />}>
              Contact Customer Service
            </Menu.Item> */}
						<Menu.Item key='wishlist' icon={<HeartOutlined />}>
							Wish List
						</Menu.Item>
					</Menu>
				</Sider>

				<Layout>
					<Content
						style={{
							margin: "0 16px",
							padding: "24px",
							backgroundColor: "var(--background-light)",
						}}
					>
						{renderContent()}
					</Content>
				</Layout>
			</Layout>
		</UserDashboardWrapper>
	);
};

export default UserDashboard;

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ styled components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

const UserDashboardWrapper = styled.div`
	@media (max-width: 800px) {
		.ant-layout-content {
			padding: 10px !important;
		}
	}

	.ant-layout-sider-children {
		background-color: var(--primary-color-darker) !important;
	}

	ul {
		background: var(--primary-color-darker) !important;
	}

	.ant-menu-item-selected {
		background-color: var(--secondary-color) !important;
	}

	.ant-menu-dark .ant-menu-item-selected > a,
	.ant-menu-dark .ant-menu-item-selected > a:hover {
		color: var(--button-font-color) !important;
	}
`;

