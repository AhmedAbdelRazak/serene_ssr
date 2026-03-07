/** @format */

import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { Tabs } from "@/legacy_frontend/components/CompatTabs";
import { PlusSquareOutlined, EditOutlined } from "@ant-design/icons";
import { useHistory } from "react-router-dom";
import AdminNavbar from "../AdminNavbar/AdminNavbar";
import CreateCampaign from "./CreateCampaign";
import ManageCampaigns from "./ManageCampaigns";

const { TabPane } = Tabs;

const AIMarketingMain = () => {
	const [AdminMenuStatus, setAdminMenuStatus] = useState(false);
	const [collapsed, setCollapsed] = useState(false);
	const [activeTab, setActiveTab] = useState("UpdateCampaign");
	const history = useHistory();

	useEffect(() => {
		if (window.innerWidth <= 1000) {
			setCollapsed(true);
		}
		// eslint-disable-next-line
	}, []);

	useEffect(() => {
		if (window.location.search.includes("create-campaign")) {
			setActiveTab("CreateCampaign");
		} else if (window.location.search.includes("update-campaign")) {
			setActiveTab("UpdateCampaign");
		} else {
			setActiveTab("UpdateCampaign");
		}
		// eslint-disable-next-line
	}, [activeTab]);

	const handleTabChange = (key) => {
		setActiveTab(key);
		if (key === "CreateCampaign") {
			history.push("/admin/ai-marketing?create-campaign");
		} else {
			history.push("/admin/ai-marketing?update-campaign");
		}
	};

	return (
		<AIMarketingMainWrapper collapsed={collapsed}>
			<div className='grid-container-main'>
				<div className='navcontent'>
					<AdminNavbar
						fromPage='Marketing'
						AdminMenuStatus={AdminMenuStatus}
						setAdminMenuStatus={setAdminMenuStatus}
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
										<PlusSquareOutlined /> Create New Campaign
									</span>
								}
								key='CreateCampaign'
							>
								<div className='mt-3'>
									<CreateCampaign />
								</div>
							</TabPane>

							<TabPane
								tab={
									<span>
										<EditOutlined /> Manage Campaigns
									</span>
								}
								key='UpdateCampaign'
							>
								<div>
									<ManageCampaigns />
								</div>
							</TabPane>
						</CustomTabs>
					</div>
				</div>
			</div>
		</AIMarketingMainWrapper>
	);
};

export default AIMarketingMain;

/* ========== STYLES ========== */
const AIMarketingMainWrapper = styled.div`
	overflow-x: hidden;
	margin-top: 80px;
	min-height: 715px;

	.grid-container-main {
		display: grid;
		grid-template-columns: ${(props) =>
			props.collapsed ? "4.5% 95.5%" : "15.2% 84.8%"};
	}

	.container-wrapper {
		border: 2px solid lightgrey;
		padding: 20px;
		border-radius: 20px;
		background: white;
		margin: 0px 10px;
	}
`;

const CustomTabs = styled(Tabs)`
	.ant-tabs-nav {
		margin-left: 10px;
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
