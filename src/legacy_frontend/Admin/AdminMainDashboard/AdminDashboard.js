import React, { useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import styled from "styled-components";
import { Tabs } from "antd";
import {
	HistoryOutlined,
	UnorderedListOutlined,
	BarChartOutlined,
} from "@ant-design/icons";
import AdminNavbar from "../AdminNavbar/AdminNavbar";
import OrdersHistory from "./OrdersHistory";
import OrdersInProgress from "./OrdersInProgress";
import OrderDetailsModal from "./OrderDetailsModal";
import AdminReports from "./AdminReports";
import AllStoresForAdmin from "./AllStoresForAdmin";

const AdminDashboard = () => {
	const [AdminMenuStatus, setAdminMenuStatus] = useState(false);
	const [collapsed, setCollapsed] = useState(false);
	const [activeTab, setActiveTab] = useState("OrdersReport");
	const [isModalVisible, setIsModalVisible] = useState(false);
	const [selectedOrder, setSelectedOrder] = useState(null);
	const history = useHistory();

	useEffect(() => {
		if (window.innerWidth <= 1000) {
			setCollapsed(true);
		}
		// eslint-disable-next-line
	}, []);

	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		const tab = params.get("tab");
		if (tab) {
			setActiveTab(tab);
		}
		// eslint-disable-next-line
	}, []);

	const showModal = (order) => {
		setSelectedOrder(order);
		setIsModalVisible(true);
	};

	const handleCancel = () => {
		setIsModalVisible(false);
		setSelectedOrder(null);
	};

	const handleTabChange = (tabKey) => {
		setActiveTab(tabKey);
		history.push(`/admin/dashboard?tab=${tabKey}`);
	};

	const tabItems = [
		{
			key: "OrdersReport",
			label: (
				<span>
					<BarChartOutlined /> Order Report
				</span>
			),
			children: <AdminReports showModal={showModal} />,
		},
		{
			key: "OrdersHistory",
			label: (
				<span>
					<HistoryOutlined /> Orders History
				</span>
			),
			children: <OrdersHistory showModal={showModal} />,
		},
		{
			key: "OrdersInProgress",
			label: (
				<span>
					<UnorderedListOutlined /> Orders In Progress
				</span>
			),
			children: <OrdersInProgress showModal={showModal} />,
		},
		{
			key: "allStores",
			label: (
				<span>
					<UnorderedListOutlined /> All Stores/ Brands
				</span>
			),
			children: <AllStoresForAdmin showModal={showModal} />,
		},
	];

	return (
		<AdminDashboardWrapper collapsed={collapsed}>
			<div className='grid-container-main'>
				<div className='navcontent'>
					<AdminNavbar
						fromPage='AdminDashboard'
						AdminMenuStatus={AdminMenuStatus}
						setAdminMenuStatus={setAdminMenuStatus}
						collapsed={collapsed}
						setCollapsed={setCollapsed}
					/>
				</div>

				<div className='otherContentWrapper'>
					<div className='container-wrapper'>
						{/* 
              Removed "centered" so it aligns left.
              Overriding default ant-tabs-card borders/tabs via CSS below.
            */}
						<CustomTabs
							activeKey={activeTab}
							onChange={handleTabChange}
							type='card'
							tabBarGutter={0} // remove default spacing between tabs
							items={tabItems}
						/>
					</div>
				</div>
			</div>

			<OrderDetailsModal
				isVisible={isModalVisible}
				order={selectedOrder}
				onCancel={handleCancel}
				setIsVisible={setIsModalVisible}
			/>
		</AdminDashboardWrapper>
	);
};

export default AdminDashboard;

/* ====================== STYLES ====================== */
const AdminDashboardWrapper = styled.div`
	overflow-x: hidden;
	margin-top: 80px;
	min-height: 715px;

	.grid-container-main {
		display: grid;
		grid-template-columns: ${(props) =>
			props.collapsed ? "5% 95%" : "17% 83%"};
	}

	.container-wrapper {
		border: 2px solid var(--border-color-light);
		padding: 20px;
		border-radius: 20px;
		background: white;
		margin: 0 10px;
		transition: var(--main-transition);
	}

	@media (max-width: 1000px) {
		.grid-container-main {
			grid-template-columns: 100%;
		}
	}
`;

/**
 * CustomTabs overrides some Ant Tabs styles (for type="card").
 * - Aligns them left with margin-left
 * - Removes gaps between tabs
 * - Uses your root colors for active, hover, etc.
 * - Increases font size and uses bold text
 */
const CustomTabs = styled(Tabs)`
	.ant-tabs-nav {
		margin-left: 10px; /* left margin for alignment */
	}

	/* Ensures the tab "cards" touch each other (no spacing) */
	.ant-tabs-tab {
		margin: 0 !important; /* remove default margin */
		padding: 12px 16px;
		font-size: 1rem;
		font-weight: bold;
		border-color: #dec8c8 !important;
		transition: var(--main-transition);
	}

	/* The 'card' style uses borders; remove tab radius so they meet flush */
	&.ant-tabs-card > .ant-tabs-nav .ant-tabs-tab,
	&.ant-tabs-card > div > .ant-tabs-nav .ant-tabs-tab {
		border-radius: 0;
		border: 1px solid var(--border-color-dark);
		border-right-width: 0; /* ensures a continuous border chain */
	}

	/* The last tab needs a right border */
	&.ant-tabs-card > .ant-tabs-nav .ant-tabs-tab:last-of-type,
	&.ant-tabs-card > div > .ant-tabs-nav .ant-tabs-tab:last-of-type {
		border-right-width: 1px;
	}

	/* Active tab styling */
	&.ant-tabs-card > .ant-tabs-nav .ant-tabs-tab-active,
	&.ant-tabs-card > div > .ant-tabs-nav .ant-tabs-tab-active {
		background-color: var(--primary-color-light);
		border-color: var(--primary-color-dark) !important;
		color: var(--text-color-dark) !important;
	}

	/* Hover effect on tabs */
	.ant-tabs-tab:hover {
		background-color: var(--primary-color-lighter);
		color: var(--text-color-primary);
	}
`;
