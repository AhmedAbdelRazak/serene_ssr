import React, { useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import styled from "styled-components";
import { Tabs } from "@/legacy_frontend/components/CompatTabs";
import {
	HistoryOutlined,
	UnorderedListOutlined,
	BarChartOutlined,
} from "@ant-design/icons";
import SellerNavbar from "../SellerNavigation/SellerNavbar";
import SellerReports from "./SellerReports";
import OrderDetailsModal from "./OrderDetailsModal";
import SellerOrdersHistory from "./SellerOrdersHistory";
import SellerOrdersInProgress from "./SellerOrdersInProgress";

const { TabPane } = Tabs;

const SellerDashboardMain = () => {
	const [SellerMenuStatus, setSellerMenuStatus] = useState(false);
	const [collapsed, setCollapsed] = useState(false);
	const [activeTab, setActiveTab] = useState("OrdersReport");
	const [isModalVisible, setIsModalVisible] = useState(false);
	const [selectedOrder, setSelectedOrder] = useState(null);
	const history = useHistory();

	// We'll store the extracted storeId here
	const [storeId, setStoreId] = useState(null);

	useEffect(() => {
		// Conditionally collapse nav if screen is small
		if (window.innerWidth <= 1000) {
			setCollapsed(true);
		}
	}, []);

	// On initial mount, read ?tab= from the URL
	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		const tab = params.get("tab");
		if (tab) {
			setActiveTab(tab);
		}
	}, []);

	// Also on initial mount, read storeData from localStorage
	useEffect(() => {
		const localStoreData = localStorage.getItem("storeData");
		if (localStoreData) {
			try {
				const parsed = JSON.parse(localStoreData);
				// If your store doc has an _id, set it here:
				if (parsed._id) {
					setStoreId(parsed._id);
				}
			} catch (err) {
				console.error("Error parsing storeData from localStorage:", err);
			}
		}
	}, []);

	const handleTabChange = (tabKey) => {
		setActiveTab(tabKey);
		history.push(`/seller/dashboard?tab=${tabKey}`);
	};

	const showModal = (order) => {
		setSelectedOrder(order);
		setIsModalVisible(true);
	};

	const handleCancel = () => {
		setIsModalVisible(false);
		setSelectedOrder(null);
	};

	return (
		<SellerDashboardMainWrapper collapsed={collapsed}>
			<div className='grid-container-main'>
				<div className='navcontent'>
					<SellerNavbar
						fromPage='SellerDashboard'
						SellerMenuStatus={SellerMenuStatus}
						setSellerMenuStatus={setSellerMenuStatus}
						collapsed={collapsed}
						setCollapsed={setCollapsed}
					/>
				</div>

				<div className='otherContentWrapper'>
					<div className='container-wrapper'>
						<CustomTabs
							activeKey={activeTab}
							onChange={handleTabChange}
							type='card'
							tabBarGutter={0}
						>
							<TabPane
								tab={
									<span>
										<BarChartOutlined /> Order Report
									</span>
								}
								key='OrdersReport'
							>
								<SellerReports storeId={storeId} />
							</TabPane>

							<TabPane
								tab={
									<span>
										<HistoryOutlined /> Orders History
									</span>
								}
								key='OrdersHistory'
							>
								<div>
									<SellerOrdersHistory
										showModal={showModal}
										storeId={storeId}
									/>
								</div>
							</TabPane>
							<TabPane
								tab={
									<span>
										<UnorderedListOutlined /> Orders In Progress
									</span>
								}
								key='OrdersInProgress'
							>
								<div>
									<SellerOrdersInProgress
										showModal={showModal}
										storeId={storeId}
									/>
								</div>
							</TabPane>
						</CustomTabs>
					</div>
				</div>
			</div>
			<OrderDetailsModal
				isVisible={isModalVisible}
				order={selectedOrder}
				onCancel={handleCancel}
				setIsVisible={setIsModalVisible}
				storeId={storeId}
			/>
		</SellerDashboardMainWrapper>
	);
};

export default SellerDashboardMain;

/* ====================== STYLES ====================== */
const SellerDashboardMainWrapper = styled.div`
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
