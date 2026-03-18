import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { Tabs } from "@/legacy_frontend/components/CompatTabs";
import { Button, message } from "antd";
import { useHistory, useLocation } from "react-router-dom";
import AdminNavbar from "../AdminNavbar/AdminNavbar";
import {
  getStoreManagement,
  getWebsiteSetup,
  updateStoreManagement,
  updateWebsiteSetup,
} from "../apiAdmin";
import { isAuthenticated } from "../../auth";

// Child components
import StoreBasicInfo from "./StoreBasicInfo";
import StoreLogoSection from "./StoreLogoSection";
import StoreAboutUsBanner from "./StoreAboutUsBanner";
import ShippingOptionsContent from "./ShippingOptionsContent"; // <-- IMPORT

const { TabPane } = Tabs;
const STORE_TABS = new Set([
  "storeLogo",
  "basicInfo",
  "aboutUs",
  "shippingOptions",
]);
const normalizeStoreTab = (tabKey) =>
  STORE_TABS.has(tabKey) ? tabKey : "storeLogo";

const AdminStoreManagementMain = () => {
  const [AdminMenuStatus, setAdminMenuStatus] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [websiteData, setWebsiteData] = useState({
    deactivateOrderCreation: false,
    aiAgentToRespond: false,
    deactivateChatResponse: false,
  });

  // For reading/updating the URL in React Router v5
  const history = useHistory();
  const location = useLocation();

  // State for store data
  const [storeData, setStoreData] = useState({
    // initial defaults
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

  // Default tab if none is specified
  const defaultTab = "storeLogo";

  // Helper to read ?tab=... from the URL or default to "storeLogo"
  const getActiveTabFromURL = () => {
    const params = new URLSearchParams(location.search);
    return normalizeStoreTab(params.get("tab") || defaultTab);
  };

  // Track which tab is active in local state
  const [activeTab, setActiveTab] = useState(getActiveTabFromURL());
  const [storeDocumentId, setStoreDocumentId] = useState("");

  // Auth
  const { user, token } = isAuthenticated();
  const userId = user && user._id;

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
    fetchStoreManagementData();
    fetchWebsiteSettingsData();
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

  // Fetch store data
  const fetchStoreManagementData = () => {
    setLoading(true);
    getStoreManagement(userId, token)
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
          const resolvedStoreId = res?._id || res?.id || mergedData?._id || "";
          setStoreDocumentId((prev) => prev || resolvedStoreId);
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

  const fetchWebsiteSettingsData = () => {
    getWebsiteSetup(userId, token)
      .then((res) => {
        if (res && !res.error) {
          setWebsiteData((prev) => ({
            ...prev,
            ...(res || {}),
            deactivateOrderCreation: Boolean(res?.deactivateOrderCreation),
            aiAgentToRespond: Boolean(res?.aiAgentToRespond),
            deactivateChatResponse: Boolean(res?.deactivateChatResponse),
          }));
        }
      })
      .catch((err) => {
        console.error("Error fetching website settings:", err);
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

    Promise.all([
      updateStoreManagement(userId, token, finalData),
      updateWebsiteSetup(userId, token, {
        deactivateOrderCreation: Boolean(websiteData.deactivateOrderCreation),
        aiAgentToRespond: Boolean(websiteData.aiAgentToRespond),
        deactivateChatResponse: Boolean(websiteData.deactivateChatResponse),
      }),
    ])
      .then(([storeRes, websiteRes]) => {
        setLoading(false);
        if (storeRes?.error) {
          message.error(storeRes.error);
          return;
        }

        if (websiteRes?.error) {
          message.error(websiteRes.error);
          return;
        }

        if (!storeRes || !websiteRes) {
          message.error("Some settings could not be saved. Please try again.");
          return;
        }

        message.success("Store and website controls updated successfully!");
        fetchStoreManagementData();
        fetchWebsiteSettingsData();
      })
      .catch((err) => {
        setLoading(false);
        console.error("Error updating store or website settings:", err);
        message.error("Update failed");
      });
  };

  return (
    <AdminStoreManagementMainWrapper $collapsed={collapsed}>
      <div className="grid-container-main">
        <div className="navcontent">
          <AdminNavbar
            fromPage="StoreManagement"
            AdminMenuStatus={AdminMenuStatus}
            setAdminMenuStatus={setAdminMenuStatus}
            collapsed={collapsed}
            setCollapsed={setCollapsed}
          />
        </div>

        <div className="otherContentWrapper">
          <div className="container-wrapper">
            <h2>Store Management</h2>

            <StyledTabs
              activeKey={activeTab}
              onChange={handleTabChange}
              type="card"
            >
              <TabPane tab="Store Logo" key="storeLogo">
                <StoreLogoSection
                  storeData={storeData}
                  setStoreData={setStoreData}
                />
              </TabPane>

              <TabPane tab="Basic Info" key="basicInfo">
                <StoreBasicInfo
                  storeData={storeData}
                  setStoreData={setStoreData}
                  websiteData={websiteData}
                  setWebsiteData={setWebsiteData}
                />
              </TabPane>

              <TabPane tab="About Us Banner" key="aboutUs">
                <StoreAboutUsBanner
                  storeData={storeData}
                  setStoreData={setStoreData}
                />
              </TabPane>

              {/* Only show if storeData._id exists */}
              {(storeDocumentId || storeData._id || storeData.id) && (
                <TabPane tab="Shipping Options" key="shippingOptions">
                  <ShippingOptionsContent
                    storeId={storeDocumentId || storeData._id || storeData.id}
                  />
                </TabPane>
              )}
            </StyledTabs>

            <div style={{ marginTop: 40 }}>
              <Button
                type="primary"
                loading={loading}
                onClick={handleSaveChanges}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AdminStoreManagementMainWrapper>
  );
};

export default AdminStoreManagementMain;

/* ====== STYLES ====== */

const AdminStoreManagementMainWrapper = styled.div`
  overflow-x: hidden;
  margin-top: 80px;
  min-height: 715px;

  .grid-container-main {
    display: grid;
    grid-template-columns: ${(props) =>
      props.$collapsed ? "5% 95%" : "17% 83%"};
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
