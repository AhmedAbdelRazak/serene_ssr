import React, { useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import styled from "styled-components";
import { Tabs } from "@/legacy_frontend/components/CompatTabs";
import { HistoryOutlined, BarChartOutlined } from "@ant-design/icons";

import SellerNavbar from "../SellerNavigation/SellerNavbar";
import AddProduct from "./AddingProduct/AddProduct";
import UpdateProduct from "./UpdatingProduct/UpdateProduct";

const { TabPane } = Tabs;

const SellerProductManagementMain = () => {
	const [SellerMenuStatus, setSellerMenuStatus] = useState(false);
	const [collapsed, setCollapsed] = useState(false);

	// Weâ€™ll default to "UpdateProducts" if no valid tab is found
	const [activeTab, setActiveTab] = useState("UpdateProducts");

	const history = useHistory();

	// Collapse side nav for mobile
	useEffect(() => {
		if (window.innerWidth <= 1000) {
			setCollapsed(true);
		}
	}, []);

	// Read `?tab=...` on mount. If valid, set it; if none, use "UpdateProducts".
	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		const tab = params.get("tab");

		// If the URL tab is either "AddProducts" or "UpdateProducts," set that
		if (tab === "AddProducts" || tab === "UpdateProducts") {
			setActiveTab(tab);
		} else {
			// Otherwise, default to "UpdateProducts" (and update the URL accordingly)
			history.replace("/seller/products-management?tab=UpdateProducts");
		}
	}, [history]);

	// On tab change, update the URL param
	const handleTabChange = (tabKey) => {
		setActiveTab(tabKey);
		history.push(`/seller/products-management?tab=${tabKey}`);
	};

	return (
		<SellerProductManagementMainWrapper collapsed={collapsed}>
			<div className='grid-container-main'>
				<div className='navcontent'>
					<SellerNavbar
						fromPage='SellerProductManagement'
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
										<BarChartOutlined /> Add a New Product
									</span>
								}
								key='AddProducts'
							>
								<div className='mt-3'>
									<AddProduct />
								</div>
							</TabPane>

							<TabPane
								tab={
									<span>
										<HistoryOutlined /> Update Products
									</span>
								}
								key='UpdateProducts'
							>
								<div>
									<UpdateProduct />
								</div>
							</TabPane>
						</CustomTabs>
					</div>
				</div>
			</div>
		</SellerProductManagementMainWrapper>
	);
};

export default SellerProductManagementMain;

/* ====================== STYLES ====================== */
const SellerProductManagementMainWrapper = styled.div`
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

	.ant-tabs-tab {
		margin: 0 !important;
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
		border-right-width: 0;
	}

	&.ant-tabs-card > .ant-tabs-nav .ant-tabs-tab:last-of-type,
	&.ant-tabs-card > div > .ant-tabs-nav .ant-tabs-tab:last-of-type {
		border-right-width: 1px;
	}

	&.ant-tabs-card > .ant-tabs-nav .ant-tabs-tab-active,
	&.ant-tabs-card > div > .ant-tabs-nav .ant-tabs-tab-active {
		background-color: var(--primary-color-light);
		border-color: var(--primary-color-dark) !important;
		color: var(--text-color-dark) !important;
	}

	.ant-tabs-tab:hover {
		background-color: var(--primary-color-lighter);
		color: var(--text-color-primary);
	}
`;
