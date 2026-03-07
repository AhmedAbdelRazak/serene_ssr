import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { Tabs } from "@/legacy_frontend/components/CompatTabs";
import { Button, message } from "antd";
import { useHistory, useLocation } from "react-router-dom";
import SellerNavbar from "../SellerNavigation/SellerNavbar";
import { getStoreManagement, updateStoreManagement } from "../apiSeller";
import { isAuthenticated } from "../../auth";

// Child components
import StoreBasicInfo from "./StoreBasicInfo";
import StoreLogoSection from "./StoreLogoSection";
import StoreAboutUsBanner from "./StoreAboutUsBanner";
// eslint-disable-next-line
import ShippingOptionsContent from "./ShippingOptionsContent"; // <-- IMPORT

const { TabPane } = Tabs;
const STORE_TABS = new Set(["storeLogo", "basicInfo", "aboutUs", "shippingOptions"]);
const normalizeStoreTab = (tabKey) =>
	STORE_TABS.has(tabKey) ? tabKey : "storeLogo";

const SellerStoreManagementMain = () => {
	const [SellerMenuStatus, setSellerMenuStatus] = useState(false);
	const [collapsed, setCollapsed] = useState(false);
	const [loading, setLoading] = useState(false);

	// For reading/updating the URL in React Router v5
	const history = useHistory();
	const location = useLocation();

	// State for store data
	const [storeData, setStoreData] = useState({
		loyaltyPointsAward: 0,
		discountPercentage: 0,
		storePhone: "",
		storeAddress: "",
		onlineServicesFees: 0,
		transactionFeePercentage: 3.5,
		activatePayOnDelivery: false,
		purchaseTaxes: 0,
		freeShippingLimit: 0,
		discountOnFirstPurchase: 0,
		storeLogo: { public_id: "", url: "" },
		storeAboutUsBanner: { public_id: "", url: "", paragraph: "" },
		addStoreName: "",
		daysStoreClosed: [],
		activatePickupInStore: false,
		activatePayOnline: true,
	});

	// We keep a separate ownerId state to decide which userâ€™s store doc to fetch/update
	const { user, token } = isAuthenticated();
	const defaultUserId = user && user._id;
	const [ownerId, setOwnerId] = useState(defaultUserId);

	// Default tab if none is specified
	const defaultTab = "storeLogo";

	// Helper to read ?tab=... from the URL or default to "storeLogo"
	const getActiveTabFromURL = () => {
		const params = new URLSearchParams(location.search);
		return normalizeStoreTab(params.get("tab") || defaultTab);
	};

	// Track which tab is active in local state
	const [activeTab, setActiveTab] = useState(getActiveTabFromURL());

	// Default values
	const defaultValues = {
		loyaltyPointsAward: 80,
		discountPercentage: 10,
		purchaseTaxes: 3,
		freeShippingLimit: 150,
		discountOnFirstPurchase: 10,
	};

	// Collapse sidebar if screen is small
	useEffect(() => {
		if (window.innerWidth <= 1000) {
			setCollapsed(true);
		}

		// 1. Check if localStorage has "storeData"
		const localStoreData = localStorage.getItem("storeData");
		if (localStoreData) {
			try {
				const parsedData = JSON.parse(localStoreData);

				// Determine belongsTo ID (it could be a string or an object)
				let localOwnerId = parsedData.belongsTo;
				if (typeof localOwnerId === "object" && localOwnerId._id) {
					localOwnerId = localOwnerId._id;
				}

				// Merge data with defaults & forced fields
				const mergedData = {
					...defaultValues,
					...parsedData,
					transactionFeePercentage: 3.5,
					activatePayOnDelivery: false,
				};

				// Update storeData AND ownerId from localStorage
				setStoreData(mergedData);
				setOwnerId(localOwnerId);
			} catch (err) {
				console.error("Error parsing storeData from localStorage:", err);
				// If parsing fails, fallback to fetching from backend
				fetchStoreManagementData(defaultUserId);
			}
		} else {
			// If none in local storage, fetch from API using default userId
			fetchStoreManagementData(defaultUserId);
		}
		// eslint-disable-next-line
	}, []);

	// If the user navigates (e.g., back/forward) and changes the query param,
	// we want to detect that change and update the tab.
	useEffect(() => {
		const resolvedTab = getActiveTabFromURL();
		if (activeTab !== resolvedTab) {
			setActiveTab(resolvedTab);
		}
		// eslint-disable-next-line
	}, [location.search]);

	// Fetch store data using whichever ownerId we have
	const fetchStoreManagementData = (id) => {
		setLoading(true);
		getStoreManagement(id, token)
			.then((res) => {
				setLoading(false);
				if (res && !res.error) {
					// Merge data with defaults & forced fields
					const mergedData = {
						...defaultValues,
						...res,
						transactionFeePercentage: 3.5,
						activatePayOnDelivery: false,
					};
					setStoreData(mergedData);
				} else if (res && res.error) {
					// message.error(res.error);
				}
			})
			.catch((err) => {
				setLoading(false);
				console.error("Error fetching store management:", err);
				// message.error("Failed to load store data");
			});
	};

	// Switch tabs
	const handleTabChange = (newKey) => {
		const resolvedTab = normalizeStoreTab(newKey);
		setActiveTab(resolvedTab);

		// Update ?tab=newKey in the URL using history.push
		const params = new URLSearchParams(location.search);
		params.set("tab", resolvedTab);

		history.push({
			pathname: location.pathname, // keep the same path
			search: `?${params.toString()}`, // updated query string
		});
	};

	// Save changes
	const handleSaveChanges = () => {
		setLoading(true);
		const finalData = {
			...storeData,
			transactionFeePercentage: 3.5,
			activatePayOnDelivery: false,
		};

		// Update using ownerId (which may or may not be the authenticated user)
		updateStoreManagement(ownerId, token, finalData)
			.then((res) => {
				setLoading(false);
				if (res && !res.error) {
					message.success("Store management updated successfully!");
					// Re-fetch or do something else
					fetchStoreManagementData(ownerId);
				} else if (res && res.error) {
					message.error(res.error);
				}
			})
			.catch((err) => {
				setLoading(false);
				console.error("Error updating store management:", err);
				message.error("Update failed");
			});
	};

	return (
		<SellerStoreManagementMainWrapper collapsed={collapsed}>
			<div className='grid-container-main'>
				<div className='navcontent'>
					<SellerNavbar
						fromPage='StoreManagement'
						SellerMenuStatus={SellerMenuStatus}
						setSellerMenuStatus={setSellerMenuStatus}
						collapsed={collapsed}
						setCollapsed={setCollapsed}
					/>
				</div>

				<div className='otherContentWrapper'>
					<div className='container-wrapper'>
						<h2>Store Management</h2>

						<StyledTabs
							activeKey={activeTab}
							onChange={handleTabChange}
							type='card'
						>
							<TabPane tab='Store Logo' key='storeLogo'>
								<StoreLogoSection
									storeData={storeData}
									setStoreData={setStoreData}
								/>
							</TabPane>

							<TabPane tab='Basic Info' key='basicInfo'>
								<StoreBasicInfo
									storeData={storeData}
									setStoreData={setStoreData}
								/>
							</TabPane>

							<TabPane tab='About Us Banner' key='aboutUs'>
								<StoreAboutUsBanner
									storeData={storeData}
									setStoreData={setStoreData}
								/>
							</TabPane>

							{/* Only show if storeData._id exists */}
							{/* {storeData._id && (
								<TabPane tab='Shipping Options' key='shippingOptions'>
									<ShippingOptionsContent storeId={storeData._id} />
								</TabPane>
							)} */}
						</StyledTabs>

						<div style={{ marginTop: 40 }}>
							<Button
								type='primary'
								loading={loading}
								onClick={handleSaveChanges}
							>
								Save Changes
							</Button>
						</div>
					</div>
				</div>
			</div>
		</SellerStoreManagementMainWrapper>
	);
};

export default SellerStoreManagementMain;

/* ====== STYLES ====== */
const SellerStoreManagementMainWrapper = styled.div`
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

const StyledTabs = styled(Tabs)`
	margin-top: 20px;

	.ant-tabs-tab {
		padding: 10px 16px;
		font-size: 1rem;
		font-weight: 600;
	}

	&.ant-tabs-card > .ant-tabs-nav .ant-tabs-tab {
		border-radius: 0;
		border: 1px solid #ddd;
		margin: 0 !important;
	}
`;
