/** @format */
// src/components/AdminNavigation/CustomerServiceMainAdmin.js

import React, { useState, useEffect, useCallback } from "react";
import styled from "styled-components";
import { Tabs } from "@/legacy_frontend/components/CompatTabs";
import { Radio } from "antd";
import { useLocation, useHistory } from "react-router-dom";
import AdminNavbar from "../AdminNavbar/AdminNavbar";
import socket from "../../Chat/socket";
import { isAuthenticated } from "../../auth";
import {
  adminGetActiveB2CChats,
  adminGetClosedB2CChats,
  adminGetActiveB2BChats,
  adminGetClosedB2BChats,
  adminMarkAllMessagesAsSeen, // <= add this function in apiAdmin
  getWebsiteSetup,
} from "../apiAdmin";
import ChatDetailPropertyAdmin from "./ChatDetailPropertyAdmin";

const { TabPane } = Tabs;
const ADMIN_NOTIFICATIONS_REFRESH_EVENT = "admin-support-notifications-refresh";

/**
 * Helper to count how many messages are unseen by Admin
 * (i.e. seenByAdmin=false and messageBy.userId != admin._id)
 */
function getUnseenCountForAdmin(supportCase, adminUserId) {
  if (!supportCase?.conversation) return 0;
  return supportCase.conversation.filter(
    (msg) => !msg.seenByAdmin && msg.messageBy.userId !== adminUserId,
  ).length;
}

/**
 * CustomerServiceMainAdmin
 * - uses URL query params for tab=..., caseId=..., history=...
 * - real-time updates: newChat, closeCase, receiveMessage
 * - covers both B2C (client â†” admin) and B2B (seller â†” admin).
 */
const CustomerServiceMainAdmin = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [AdminMenuStatus, setAdminMenuStatus] = useState(false);

  const { user, token } = isAuthenticated() || {};
  const adminUserId = user?._id; // short alias
  const location = useLocation();
  const history = useHistory();

  // Data arrays
  const [b2cActive, setB2cActive] = useState([]);
  const [b2bActive, setB2bActive] = useState([]);
  const [b2cHistory, setB2cHistory] = useState([]);
  const [b2bHistory, setB2bHistory] = useState([]);
  const [websiteSetup, setWebsiteSetup] = useState({});

  // Selected chat
  const [selectedChat, setSelectedChat] = useState(null);

  useEffect(() => {
    if (window.innerWidth <= 1000) {
      setCollapsed(true);
    }
  }, []);

  useEffect(() => {
    if (!adminUserId || !token) return;
    getWebsiteSetup(adminUserId, token).then((res) => {
      if (res && !res.error) {
        setWebsiteSetup(res || {});
      }
    });
  }, [adminUserId, token]);

  // Parse query params: tab=..., caseId=..., history=...
  // eslint-disable-next-line
  const searchParams = new URLSearchParams(location.search);
  const activeTabQuery = searchParams.get("tab") || "b2cActive";
  const caseIdQuery = searchParams.get("caseId") || null;
  const historyFilterQuery = searchParams.get("history") || "b2c";

  const [activeTab, setActiveTab] = useState(activeTabQuery);
  const [historyFilter, setHistoryFilter] = useState(historyFilterQuery);

  // Whenever location.search changes, reset local states if no ?caseId
  useEffect(() => {
    setActiveTab(activeTabQuery);
    setHistoryFilter(historyFilterQuery);
    if (!caseIdQuery) {
      setSelectedChat(null);
    }
    // eslint-disable-next-line
  }, [activeTabQuery, historyFilterQuery, caseIdQuery]);

  // ----- Fetch Data for each tab & filter -----
  const fetchB2CActive = useCallback(() => {
    if (!adminUserId || !token) return;
    adminGetActiveB2CChats(adminUserId, token).then((res) => {
      if (Array.isArray(res)) setB2cActive(res);
    });
  }, [adminUserId, token]);

  const fetchB2BActive = useCallback(() => {
    if (!adminUserId || !token) return;
    adminGetActiveB2BChats(adminUserId, token).then((res) => {
      if (Array.isArray(res)) setB2bActive(res);
    });
  }, [adminUserId, token]);

  const fetchB2CHistory = useCallback(() => {
    if (!adminUserId || !token) return;
    adminGetClosedB2CChats(adminUserId, token).then((res) => {
      if (Array.isArray(res)) setB2cHistory(res);
    });
  }, [adminUserId, token]);

  const fetchB2BHistory = useCallback(() => {
    if (!adminUserId || !token) return;
    adminGetClosedB2BChats(adminUserId, token).then((res) => {
      if (Array.isArray(res)) setB2bHistory(res);
    });
  }, [adminUserId, token]);

  // On mount / tab change
  useEffect(() => {
    if (!adminUserId || !token) return;

    if (activeTab === "b2cActive") {
      fetchB2CActive();
    } else if (activeTab === "b2bActive") {
      fetchB2BActive();
    } else if (activeTab === "history") {
      if (historyFilter === "b2c") {
        fetchB2CHistory();
      } else {
        fetchB2BHistory();
      }
    }
  }, [
    activeTab,
    historyFilter,
    adminUserId,
    token,
    fetchB2CActive,
    fetchB2BActive,
    fetchB2CHistory,
    fetchB2BHistory,
  ]);

  // Auto-select chat if ?caseId
  useEffect(() => {
    if (!caseIdQuery) {
      setSelectedChat(null);
      return;
    }
    let foundChat = null;
    if (activeTab === "b2cActive") {
      foundChat = b2cActive.find((c) => c._id === caseIdQuery);
    } else if (activeTab === "b2bActive") {
      foundChat = b2bActive.find((c) => c._id === caseIdQuery);
    } else if (activeTab === "history") {
      if (historyFilter === "b2c") {
        foundChat = b2cHistory.find((c) => c._id === caseIdQuery);
      } else {
        foundChat = b2bHistory.find((c) => c._id === caseIdQuery);
      }
    }
    setSelectedChat(foundChat || null);
  }, [
    caseIdQuery,
    activeTab,
    historyFilter,
    b2cActive,
    b2bActive,
    b2cHistory,
    b2bHistory,
  ]);

  // ========================
  // Mark a case as "seen by Admin" + select it
  // ========================
  const markAsSeenAndSelect = useCallback(
    async (oneCase) => {
      if (!oneCase || !adminUserId || !token) return;
      try {
        // 1) Mark all messages as seen by Admin in DB
        await adminMarkAllMessagesAsSeen(oneCase._id, token, adminUserId);

        // 2) Locally update the conversation's seenByAdmin to true
        const updatedConversation = oneCase.conversation.map((m) => ({
          ...m,
          seenByAdmin: true,
        }));
        const updatedCase = { ...oneCase, conversation: updatedConversation };

        // 3) Update whichever array this belongs to
        if (oneCase.openedBy === "client") {
          setB2cActive((prev) =>
            prev.map((c) => (c._id === oneCase._id ? updatedCase : c)),
          );
        } else {
          // B2B => openedBy= "seller" or "super admin"
          setB2bActive((prev) =>
            prev.map((c) => (c._id === oneCase._id ? updatedCase : c)),
          );
        }

        // 4) Set the selectedChat to updatedCase
        setSelectedChat(updatedCase);

        // 5) Update the query param
        searchParams.set("caseId", oneCase._id);
        history.push({
          pathname: location.pathname,
          search: searchParams.toString(),
        });
        window.dispatchEvent(new Event(ADMIN_NOTIFICATIONS_REFRESH_EVENT));
      } catch (err) {
        console.error("Error marking case as seen by admin:", err);
      }
    },
    [adminUserId, token, history, location.pathname, searchParams],
  );

  // ========================
  // Socket.IO Real-Time
  // ========================
  useEffect(() => {
    const handleNewChat = (newCase) => {
      if (!newCase) return;
      // If newCase is B2C or B2B => push to correct array
      if (newCase.openedBy === "client") {
        setB2cActive((prev) => [...prev, newCase]);
      } else {
        setB2bActive((prev) => [...prev, newCase]);
      }
    };

    const handleCloseCase = (payload) => {
      const closedCase = payload.case;
      if (!closedCase) return;

      if (closedCase.openedBy === "client") {
        setB2cActive((prev) => prev.filter((c) => c._id !== closedCase._id));
        setB2cHistory((prev) => [...prev, closedCase]);
      } else {
        setB2bActive((prev) => prev.filter((c) => c._id !== closedCase._id));
        setB2bHistory((prev) => [...prev, closedCase]);
      }
      // If currently selected, reset
      if (selectedChat && selectedChat._id === closedCase._id) {
        setSelectedChat(null);
      }
    };

    const handleReceiveMessage = (updatedCase) => {
      if (!updatedCase) return;

      // B2C if openedBy=client
      if (updatedCase.openedBy === "client") {
        setB2cActive((prev) =>
          prev.map((c) => (c._id === updatedCase._id ? updatedCase : c)),
        );
      } else {
        // B2B if openedBy in ["seller","super admin"]
        setB2bActive((prev) =>
          prev.map((c) => (c._id === updatedCase._id ? updatedCase : c)),
        );
      }

      // If this chat is currently open => automatically mark them as seen
      if (selectedChat && selectedChat._id === updatedCase._id) {
        markAsSeenAndSelect(updatedCase);
      }
    };

    const handleSupportCaseUpdated = (updatedCase) => {
      if (!updatedCase?._id) return;

      setB2cActive((prev) =>
        prev.map((c) => (c._id === updatedCase._id ? updatedCase : c)),
      );
      setB2bActive((prev) =>
        prev.map((c) => (c._id === updatedCase._id ? updatedCase : c)),
      );
      setB2cHistory((prev) =>
        prev.map((c) => (c._id === updatedCase._id ? updatedCase : c)),
      );
      setB2bHistory((prev) =>
        prev.map((c) => (c._id === updatedCase._id ? updatedCase : c)),
      );

      if (selectedChat && selectedChat._id === updatedCase._id) {
        setSelectedChat(updatedCase);
      }
    };

    socket.on("newChat", handleNewChat);
    socket.on("closeCase", handleCloseCase);
    socket.on("receiveMessage", handleReceiveMessage);
    socket.on("supportCaseUpdated", handleSupportCaseUpdated);

    return () => {
      socket.off("newChat", handleNewChat);
      socket.off("closeCase", handleCloseCase);
      socket.off("receiveMessage", handleReceiveMessage);
      socket.off("supportCaseUpdated", handleSupportCaseUpdated);
    };
  }, [selectedChat, markAsSeenAndSelect]);

  // ========================
  // Handlers for tab / filter
  // ========================
  const handleTabChange = (newKey) => {
    searchParams.set("tab", newKey);
    searchParams.delete("caseId");
    history.push({
      pathname: location.pathname,
      search: searchParams.toString(),
    });
  };

  const handleHistoryFilterChange = (e) => {
    const val = e.target.value;
    searchParams.set("history", val);
    searchParams.delete("caseId");
    history.push({
      pathname: location.pathname,
      search: searchParams.toString(),
    });
  };

  // Selecting a chat => mark all messages as seen + select it
  const handleSelectChat = (oneCase) => {
    if (!oneCase) return;
    markAsSeenAndSelect(oneCase);
  };

  // ========================
  // Render the left-case list
  // ========================
  const renderCasesList = (casesArray) => {
    if (!casesArray || casesArray.length === 0) {
      return <p style={{ padding: "10px" }}>No chats found.</p>;
    }

    return casesArray.map((oneChat) => {
      const isSelected = selectedChat && selectedChat._id === oneChat._id;

      // Count how many messages are unseen by Admin
      const unseenCount = getUnseenCountForAdmin(oneChat, adminUserId);

      return (
        <CaseItem
          key={oneChat._id}
          onClick={() => handleSelectChat(oneChat)}
          isSelected={isSelected}
          hasUnseen={unseenCount > 0}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <strong>{oneChat.displayName1}</strong>
            {unseenCount > 0 && <Badge>{unseenCount}</Badge>}
          </div>
          <small style={{ display: "block", color: "#555" }}>
            Status: {oneChat.caseStatus}
          </small>
        </CaseItem>
      );
    });
  };

  const handleChatUpdated = useCallback(
    (updatedChat) => {
      if (!updatedChat?._id) return;

      setB2cActive((prev) =>
        prev.map((c) => (c._id === updatedChat._id ? updatedChat : c)),
      );
      setB2bActive((prev) =>
        prev.map((c) => (c._id === updatedChat._id ? updatedChat : c)),
      );
      setB2cHistory((prev) =>
        prev.map((c) => (c._id === updatedChat._id ? updatedChat : c)),
      );
      setB2bHistory((prev) =>
        prev.map((c) => (c._id === updatedChat._id ? updatedChat : c)),
      );

      if (selectedChat && selectedChat._id === updatedChat._id) {
        setSelectedChat(updatedChat);
      }
    },
    [selectedChat],
  );

  const globalAiEnabled = Boolean(
    websiteSetup?.aiAgentToRespond && !websiteSetup?.deactivateChatResponse,
  );

  // For the history tab
  const currentHistoryArray = historyFilter === "b2c" ? b2cHistory : b2bHistory;

  return (
    <CustomerServiceMainAdminWrapper $collapsed={collapsed}>
      <div className="grid-container-main">
        <div className="navcontent">
          <AdminNavbar
            fromPage="CustomerService"
            AdminMenuStatus={AdminMenuStatus}
            setAdminMenuStatus={setAdminMenuStatus}
            collapsed={collapsed}
            setCollapsed={setCollapsed}
          />
        </div>

        <div className="otherContentWrapper">
          <div className="container-wrapper">
            <Tabs activeKey={activeTab} onChange={handleTabChange}>
              {/* Active B2C */}
              <TabPane tab="Active B2C" key="b2cActive">
                <InnerTabLayout>
                  <LeftColumn>{renderCasesList(b2cActive)}</LeftColumn>
                  <RightColumn>
                    {selectedChat ? (
                      <ChatDetailPropertyAdmin
                        key={selectedChat._id}
                        chat={selectedChat}
                        isHistory={false}
                        fetchChats={fetchB2CActive}
                        globalAiEnabled={globalAiEnabled}
                        onChatUpdated={handleChatUpdated}
                      />
                    ) : (
                      <Placeholder>Select a Chat</Placeholder>
                    )}
                  </RightColumn>
                </InnerTabLayout>
              </TabPane>

              {/* Active B2B */}
              <TabPane tab="Active B2B" key="b2bActive">
                <InnerTabLayout>
                  <LeftColumn>{renderCasesList(b2bActive)}</LeftColumn>
                  <RightColumn>
                    {selectedChat ? (
                      <ChatDetailPropertyAdmin
                        key={selectedChat._id}
                        chat={selectedChat}
                        isHistory={false}
                        fetchChats={fetchB2BActive}
                        globalAiEnabled={globalAiEnabled}
                        onChatUpdated={handleChatUpdated}
                      />
                    ) : (
                      <Placeholder>Select a Chat</Placeholder>
                    )}
                  </RightColumn>
                </InnerTabLayout>
              </TabPane>

              {/* History */}
              <TabPane tab="History" key="history">
                <Radio.Group
                  onChange={handleHistoryFilterChange}
                  value={historyFilter}
                  style={{ marginBottom: 16 }}
                >
                  <Radio.Button value="b2c">B2C Chats</Radio.Button>
                  <Radio.Button value="b2b">B2B Chats</Radio.Button>
                </Radio.Group>

                <InnerTabLayout>
                  <LeftColumn>
                    {renderCasesList(currentHistoryArray)}
                  </LeftColumn>
                  <RightColumn>
                    {selectedChat ? (
                      <ChatDetailPropertyAdmin
                        key={selectedChat._id}
                        chat={selectedChat}
                        isHistory={true}
                        fetchChats={() =>
                          historyFilter === "b2c"
                            ? fetchB2CHistory()
                            : fetchB2BHistory()
                        }
                        globalAiEnabled={globalAiEnabled}
                        onChatUpdated={handleChatUpdated}
                      />
                    ) : (
                      <Placeholder>Select a Chat from History</Placeholder>
                    )}
                  </RightColumn>
                </InnerTabLayout>
              </TabPane>
            </Tabs>
          </div>
        </div>
      </div>
    </CustomerServiceMainAdminWrapper>
  );
};

export default CustomerServiceMainAdmin;

/* --- STYLED COMPONENTS --- */
const CustomerServiceMainAdminWrapper = styled.div`
  overflow-x: hidden;
  margin-top: 90px;
  min-height: 715px;

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
`;

const InnerTabLayout = styled.div`
  display: flex;
  flex-direction: row;
  gap: 1rem;
  height: 83vh;
`;

const LeftColumn = styled.div`
  width: 20%;
  background: #f9f9f9;
  border-right: 1px solid #ccc;
  overflow-y: auto;
  padding: 10px;
`;

const RightColumn = styled.div`
  width: 80%;
  padding: 10px;
`;

const CaseItem = styled.div`
  cursor: pointer;
  /* If selected, highlight with #d3e0fa,
     else if hasUnseen => #ffe5e5,
     else => #fff */
  background: ${({ isSelected, hasUnseen }) =>
    isSelected ? "#d3e0fa" : hasUnseen ? "#ffe5e5" : "#fff"};

  margin-bottom: 8px;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 8px;
  transition: background 0.2s ease;

  &:hover {
    background: #e8e8e8;
  }
`;

const Badge = styled.span`
  background: red;
  color: white;
  border-radius: 50%;
  padding: 0 8px;
  font-size: 0.75rem;
  margin-left: 6px;
`;

const Placeholder = styled.div`
  text-align: center;
  color: #888;
  margin-top: 50px;
`;
