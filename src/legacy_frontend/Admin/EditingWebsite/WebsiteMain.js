import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { Tabs } from "@/legacy_frontend/components/CompatTabs";
import { useHistory, useLocation } from "react-router-dom";
import AdminNavbar from "../AdminNavbar/AdminNavbar";
import { Button, message } from "antd";
import { getWebsiteSetup, updateWebsiteSetup } from "../apiAdmin";

// Child components
import HomeSection from "./HomeSection";
import HomeExtraSections from "./HomeExtraSections";
import ContactUsSection from "./ContactUsSection";
import AboutUsSection from "./AboutUsSection";
import TermsGuestsSection from "./TermsGuestsSection";
import TermsB2BSection from "./TermsB2BSection";
import ReturnsAndRefundSection from "./ReturnsAndRefundSection";
import { isAuthenticated } from "../../auth";

const { TabPane } = Tabs;
const WEBSITE_TAB_KEYS = new Set([
  "home",
  "homeExtra",
  "about",
  "contact",
  "tcGuests",
  "tcB2B",
  "returns",
]);

const normalizeWebsiteTab = (tabKey) =>
  WEBSITE_TAB_KEYS.has(tabKey) ? tabKey : "home";

const defaultWebsiteData = {
  sereneJannatLogo: {},
  homeMainBanners: [],
  homePageSections: [],
  contactUsPage: {},
  aboutUsBanner: {},
  termsAndCondition: "",
  termsAndCondition_B2B: "",
  returnsAndRefund: "",
  deactivateOrderCreation: "",
  aiAgentToRespond: "",
  deactivateChatResponse: "",
};

const WebsiteMain = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [AdminMenuStatus, setAdminMenuStatus] = useState(false);
  const history = useHistory();
  const location = useLocation();

  const [websiteData, setWebsiteData] = useState(defaultWebsiteData);

  const [activeTab, setActiveTab] = useState("home");

  const [loading, setLoading] = useState(false);

  const { user, token } = isAuthenticated();
  const userId = user._id;

  useEffect(() => {
    // Collapse for mobile
    if (window.innerWidth <= 1000) {
      setCollapsed(true);
    }

    // Attempt to fetch the doc from the backend
    fetchWebsiteData();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search || "");
    const tabFromQuery = params.get("tab");
    const tabFromStorage =
      typeof window !== "undefined"
        ? localStorage.getItem("websiteActiveTab")
        : null;
    const resolvedTab = normalizeWebsiteTab(
      tabFromQuery || tabFromStorage || "home",
    );

    if (activeTab !== resolvedTab) {
      setActiveTab(resolvedTab);
    }

    if (tabFromQuery !== resolvedTab) {
      params.set("tab", resolvedTab);
      history.replace({
        pathname: location.pathname,
        search: `?${params.toString()}`,
      });
    }

    if (typeof window !== "undefined") {
      localStorage.setItem("websiteActiveTab", resolvedTab);
    }
  }, [activeTab, history, location.pathname, location.search]);

  // Fetch single website doc
  const fetchWebsiteData = () => {
    setLoading(true);
    getWebsiteSetup(userId, token)
      .then((res) => {
        setLoading(false);
        if (res && !res.error) {
          setWebsiteData({
            ...defaultWebsiteData,
            ...(res || {}),
            sereneJannatLogo: res?.sereneJannatLogo || {},
            contactUsPage: res?.contactUsPage || {},
            aboutUsBanner: res?.aboutUsBanner || {},
            homeMainBanners: Array.isArray(res?.homeMainBanners)
              ? res.homeMainBanners
              : [],
            homePageSections: Array.isArray(res?.homePageSections)
              ? res.homePageSections
              : [],
          });
        } else if (res && res.error) {
          message.error(res.error);
        }
      })
      .catch((err) => {
        setLoading(false);
        console.error("Error fetching website setup:", err);
        message.error("Failed to load website data");
      });
  };

  // Switch tabs & store in localStorage
  const handleTabChange = (key) => {
    const resolvedTab = normalizeWebsiteTab(key);
    setActiveTab(resolvedTab);
    localStorage.setItem("websiteActiveTab", resolvedTab);

    const params = new URLSearchParams(location.search || "");
    params.set("tab", resolvedTab);
    history.replace({
      pathname: location.pathname,
      search: `?${params.toString()}`,
    });
  };

  // Save changes to backend, then refetch to sync
  const handleSaveChanges = () => {
    setLoading(true);
    updateWebsiteSetup(userId, token, websiteData)
      .then((res) => {
        setLoading(false);
        if (res && !res.error) {
          message.success("Website setup updated successfully!");
          // Now refetch to ensure local data is the updated doc
          fetchWebsiteData();
        } else if (res && res.error) {
          message.error(res.error);
        }
      })
      .catch((err) => {
        setLoading(false);
        console.error("Error updating website setup:", err);
        message.error("Update failed");
      });
  };

  return (
    <WebsiteMainWrapper $collapsed={collapsed}>
      <div className="grid-container-main">
        <div className="navcontent">
          <AdminNavbar
            fromPage="Website"
            AdminMenuStatus={AdminMenuStatus}
            setAdminMenuStatus={setAdminMenuStatus}
            collapsed={collapsed}
            setCollapsed={setCollapsed}
          />
        </div>

        <div className="otherContentWrapper">
          <div className="container-wrapper">
            <h2 style={{ marginBottom: "20px" }}>Website Basic Setup</h2>

            {/* Use CustomTabs styled similarly to AdminDashboard */}
            <CustomTabs
              activeKey={activeTab}
              onChange={handleTabChange}
              type="card"
              tabBarGutter={0}
            >
              <TabPane tab="Home" key="home">
                <HomeSection
                  websiteData={websiteData}
                  setWebsiteData={setWebsiteData}
                />
              </TabPane>

              <TabPane tab="Home Extra" key="homeExtra">
                <HomeExtraSections
                  websiteData={websiteData}
                  setWebsiteData={setWebsiteData}
                />
              </TabPane>

              <TabPane tab="About Us" key="about">
                <AboutUsSection
                  websiteData={websiteData}
                  setWebsiteData={setWebsiteData}
                />
              </TabPane>

              <TabPane tab="Contact Us" key="contact">
                <ContactUsSection
                  websiteData={websiteData}
                  setWebsiteData={setWebsiteData}
                />
              </TabPane>

              <TabPane tab="T&C (Clients)" key="tcGuests">
                <TermsGuestsSection
                  websiteData={websiteData}
                  setWebsiteData={setWebsiteData}
                />
              </TabPane>

              <TabPane tab="T&C (B2B)" key="tcB2B">
                <TermsB2BSection
                  websiteData={websiteData}
                  setWebsiteData={setWebsiteData}
                />
              </TabPane>

              <TabPane tab="Returns & Refund" key="returns">
                <ReturnsAndRefundSection
                  websiteData={websiteData}
                  setWebsiteData={setWebsiteData}
                />
              </TabPane>
            </CustomTabs>

            <div style={{ marginTop: "60px" }}>
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
    </WebsiteMainWrapper>
  );
};

export default WebsiteMain;

/* ====================== STYLES ====================== */
const WebsiteMainWrapper = styled.div`
  min-height: 300px;
  overflow-x: hidden;
  margin-top: 90px;

  .grid-container-main {
    display: grid;
    grid-template-columns: ${(props) =>
      props.$collapsed ? "5% 75%" : "17% 75%"};
  }

  .container-wrapper {
    border: 2px solid lightgrey;
    padding: 20px;
    border-radius: 20px;
    background: var(--mainWhite);
    margin: 0px 10px;
    width: 100%;
  }

  @media (max-width: 1000px) {
    .grid-container-main {
      grid-template-columns: 100%;
    }
  }
`;

/**
 * CustomTabs replicates the "card" style and custom styling
 * used in the AdminDashboard component.
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
