import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { Tabs } from "@/legacy_frontend/components/CompatTabs";
import { PlusSquareOutlined, EditOutlined } from "@ant-design/icons";
import { useHistory } from "react-router-dom";
import AdminNavbar from "../AdminNavbar/AdminNavbar";
import AddSubcategory from "./AddSubcategory";
import UpdateSubcategory from "./UpdateSubcategory";

const { TabPane } = Tabs;

const SubcategoryMain = () => {
	const [AdminMenuStatus, setAdminMenuStatus] = useState(false);
	const [collapsed, setCollapsed] = useState(false);
	const [activeTab, setActiveTab] = useState("UpdateSubcategory");
	const history = useHistory();

	useEffect(() => {
		if (window.innerWidth <= 1000) {
			setCollapsed(true);
		}
		// eslint-disable-next-line
	}, []);

	useEffect(() => {
		if (window.location.search.includes("addsubcategory")) {
			setActiveTab("AddSubcategories");
		} else if (window.location.search.includes("updatesubcategory")) {
			setActiveTab("UpdateSubcategory");
		} else {
			setActiveTab("UpdateSubcategory");
		}
		// eslint-disable-next-line
	}, [activeTab]);

	const handleTabChange = (key) => {
		setActiveTab(key);
		if (key === "AddSubcategories") {
			history.push("/admin/subcategories?addsubcategory");
		} else {
			history.push("/admin/subcategories?updatesubcategory");
		}
	};

	return (
		<SubcategoryMainWrapper collapsed={collapsed}>
			<div className='grid-container-main'>
				<div className='navcontent'>
					<AdminNavbar
						fromPage='Subcategories'
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
										<PlusSquareOutlined /> Add Subcategory
									</span>
								}
								key='AddSubcategories'
							>
								<AddSubcategory />
							</TabPane>
							<TabPane
								tab={
									<span>
										<EditOutlined /> Update Subcategory
									</span>
								}
								key='UpdateSubcategory'
							>
								<UpdateSubcategory />
							</TabPane>
						</CustomTabs>
					</div>
				</div>
			</div>
		</SubcategoryMainWrapper>
	);
};

export default SubcategoryMain;

/* ========= STYLES ========= */
const SubcategoryMainWrapper = styled.div`
	overflow-x: hidden;
	margin-top: 80px;
	min-height: 715px;
	padding-bottom: 100px;

	.grid-container-main {
		display: grid;
		grid-template-columns: ${(props) =>
			props.collapsed ? "5% 75%" : "17% 75%"};
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
