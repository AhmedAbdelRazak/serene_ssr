/** @format */
import React, { useEffect, useState, useCallback } from "react";
import styled from "styled-components";
import { Tabs } from "@/legacy_frontend/components/CompatTabs";
import { Button, Radio } from "antd";
import { useLocation, useHistory } from "react-router-dom";
import SellerNavbar from "../SellerNavigation/SellerNavbar";
import { isAuthenticated } from "../../auth";

// Seller-related API calls
import {
  getActiveB2CChats,
  getActiveB2BChats,
  getClosedB2CChats,
  getClosedB2BChats,
  createB2BSupportCase,
  markAllMessagesAsSeenBySeller,
  getWebsiteSetupPublic,
} from "../apiSeller";

import socket from "../../Chat/socket";
import ChatDetailProperty from "./ChatDetailProperty";

const { TabPane } = Tabs;

/**
 * Helper to count how many messages are unseen by Seller
 * (i.e. seenBySeller=false and messageBy.userId != sellerId)
 */
function getUnseenCountForSeller(supportCase, sellerId) {
  if (!supportCase?.conversation) return 0;
  return supportCase.conversation.filter(
    (msg) => !msg.seenBySeller && msg.messageBy.userId !== sellerId,
  ).length;
}

/**
 * CustomerServiceSellerMain
 * - Manages B2C (client â†” seller) and B2B (seller â†” admin) chats.
 * - Uses query params instead of localStorage (tab=..., caseId=..., history=...).
 * - Real-time updates for newChat, closeCase, receiveMessage.
 */
const CustomerServiceSellerMain = ({ chosenLanguage }) => {
  const [SellerMenuStatus, setSellerMenuStatus] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const { user, token } = isAuthenticated() || {};
  const userId = user?._id || "";

  const location = useLocation();
  const history = useHistory();

  // Data arrays
  const [b2cActive, setB2cActive] = useState([]);
  const [b2bActive, setB2bActive] = useState([]);
  const [b2cHistory, setB2cHistory] = useState([]);
  const [b2bHistory, setB2bHistory] = useState([]);
  const [websiteSetup, setWebsiteSetup] = useState({});

  // The currently selected chat
  const [selectedChat, setSelectedChat] = useState(null);

  // Collapse if small screen
  useEffect(() => {
    if (window.innerWidth <= 1000) {
      setCollapsed(true);
    }
  }, []);

  useEffect(() => {
    getWebsiteSetupPublic().then((res) => {
      if (res && !res.error) {
        setWebsiteSetup(res || {});
      }
    });
  }, []);

  // Parse query params
  const searchParams = new URLSearchParams(location.search);
  const activeTabQuery = searchParams.get("tab") || "b2cActive";
  const caseIdQuery = searchParams.get("caseId") || null;
  const historyFilterQuery = searchParams.get("history") || "b2c";

  const [activeTab, setActiveTab] = useState(activeTabQuery);
  const [historyFilter, setHistoryFilter] = useState(historyFilterQuery);

  // If URL changes => update states
  useEffect(() => {
    setActiveTab(activeTabQuery);
    setHistoryFilter(historyFilterQuery);
    setSelectedChat(null);
    // eslint-disable-next-line
  }, [activeTabQuery, historyFilterQuery]);

  // Fetch data whenever tab or filter changes
  useEffect(() => {
    if (!userId || !token) return;

    const fetchData = async () => {
      if (activeTab === "b2cActive") {
        const data = await getActiveB2CChats(userId, token);
        if (Array.isArray(data)) setB2cActive(data);
      } else if (activeTab === "b2bActive") {
        const data = await getActiveB2BChats(userId, token);
        if (Array.isArray(data)) setB2bActive(data);
      } else if (activeTab === "history") {
        if (historyFilter === "b2c") {
          const data = await getClosedB2CChats(userId, token);
          if (Array.isArray(data)) setB2cHistory(data);
        } else {
          const data = await getClosedB2BChats(userId, token);
          if (Array.isArray(data)) setB2bHistory(data);
        }
      }
    };

    fetchData();
  }, [activeTab, historyFilter, userId, token]);

  // Auto-select a chat if ?caseId
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

  // Mark messages as seen + select
  const markAsSeenAndSelect = useCallback(
    (chatCase) => {
      if (!chatCase) return;
      markAllMessagesAsSeenBySeller(chatCase._id, userId, token).then(() => {
        // Locally mark conversation as seen
        const updatedConversation = chatCase.conversation.map((m) => ({
          ...m,
          seenBySeller: true,
          // B2B or B2C doesn't force seenByAdmin = true for B2B if you want them separate
          // But if you still want to forcibly mark seenByAdmin, leave it in
          // Here we remove it for pure separation:
        }));
        const updatedChat = { ...chatCase, conversation: updatedConversation };

        setSelectedChat(updatedChat);

        // Update whichever array it's in
        if (chatCase.openedBy === "client") {
          setB2cActive((prev) =>
            prev.map((c) => (c._id === chatCase._id ? updatedChat : c)),
          );
        } else {
          // B2B => openedBy= "seller" or "super admin"
          setB2bActive((prev) =>
            prev.map((c) => (c._id === chatCase._id ? updatedChat : c)),
          );
        }

        // Update the query param
        const newParams = new URLSearchParams(location.search);
        newParams.set("caseId", chatCase._id);
        history.push({
          pathname: location.pathname,
          search: newParams.toString(),
        });
      });
    },
    // eslint-disable-next-line
    [userId, token, location.search, history],
  );

  // Socket.IO
  useEffect(() => {
    // newChat => might be b2c or b2b
    const handleNewChat = (newCase) => {
      if (!newCase) return;
      if (newCase.openedBy === "client") {
        setB2cActive((prev) => [...prev, newCase]);
      } else {
        setB2bActive((prev) => [...prev, newCase]);
      }
    };

    // closeCase => remove from active arrays, put into history
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
      if (selectedChat && selectedChat._id === closedCase._id) {
        setSelectedChat(null);
      }
    };

    // receiveMessage => update relevant chat in memory
    const handleReceiveMessage = (updatedCase) => {
      if (!updatedCase) return;

      // B2C => openedBy= "client"
      if (updatedCase.openedBy === "client") {
        setB2cActive((prev) =>
          prev.map((c) => (c._id === updatedCase._id ? updatedCase : c)),
        );
      } else {
        // B2B => openedBy in ["seller","super admin"]
        setB2bActive((prev) =>
          prev.map((c) => (c._id === updatedCase._id ? updatedCase : c)),
        );
      }

      // If this chat is currently selected => mark them as seen immediately
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

  // handleTabChange => update query param
  const handleTabChange = (newActiveKey) => {
    searchParams.set("tab", newActiveKey);
    searchParams.delete("caseId");
    history.push({
      pathname: location.pathname,
      search: searchParams.toString(),
    });
  };

  // handleHistoryFilterChange => update query param
  const handleHistoryFilterChange = (e) => {
    const value = e.target.value;
    setHistoryFilter(value);
    searchParams.set("history", value);
    searchParams.delete("caseId");
    history.push({
      pathname: location.pathname,
      search: searchParams.toString(),
    });
  };

  // Create a B2B case => seller â†” admin
  const handleCreateB2BCase = () => {
    const newCaseData = {
      customerName: user.name,
      customerEmail: user.email,
      inquiryAbout: "General Inquiry to Admin",
      inquiryDetails: "Hello Admin, I need support regarding my products.",
      supporterId: userId,
      ownerId: userId,
      role: user.role || 2000,
      displayName1: user.name,
      displayName2: "Admin Support",
      supporterName: user.name,
    };

    createB2BSupportCase(userId, token, newCaseData).then((res) => {
      if (res && !res.error) {
        setB2bActive((prev) => [...prev, res]);
        searchParams.set("tab", "b2bActive");
        searchParams.set("caseId", res._id);
        history.push({
          pathname: location.pathname,
          search: searchParams.toString(),
        });
      }
    });
  };

  // handleSelectChat => mark unseen & set selected
  const handleSelectChat = (oneChat) => {
    if (!oneChat) return;
    markAsSeenAndSelect(oneChat);
  };

  // Count unseen for the left list
  const getUnseenCountForChat = (oneChat) => {
    return getUnseenCountForSeller(oneChat, userId);
  };

  const renderCasesList = (casesArray) => {
    if (!casesArray || casesArray.length === 0) {
      return <p style={{ padding: "10px" }}>No chats found.</p>;
    }

    return casesArray.map((oneChat) => {
      const unseenCount = getUnseenCountForChat(oneChat);
      const isSelected = selectedChat && selectedChat._id === oneChat._id;

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

  const currentHistoryData = historyFilter === "b2c" ? b2cHistory : b2bHistory;

  return (
    <CustomerServiceMainWrapper
      dir={chosenLanguage === "Arabic" ? "rtl" : "ltr"}
      show={collapsed}
    >
      <div className="grid-container-main">
        <div className="navcontent">
          <SellerNavbar
            fromPage="Support"
            SellerMenuStatus={SellerMenuStatus}
            setSellerMenuStatus={setSellerMenuStatus}
            collapsed={collapsed}
            setCollapsed={setCollapsed}
            chosenLanguage={chosenLanguage}
          />
        </div>

        <div className="otherContentWrapper">
          <div className="container-wrapper">
            <Tabs activeKey={activeTab} onChange={handleTabChange}>
              {/* B2C ACTIVE */}
              <TabPane tab="Active B2C" key="b2cActive">
                <InnerTabLayout>
                  <LeftColumn>{renderCasesList(b2cActive)}</LeftColumn>
                  <RightColumn>
                    {selectedChat ? (
                      <ChatDetailProperty
                        key={selectedChat._id}
                        chat={selectedChat}
                        isHistory={false}
                        fetchChats={() => getActiveB2CChats(userId, token)}
                        chosenLanguage={chosenLanguage}
                        globalAiEnabled={globalAiEnabled}
                        onChatUpdated={handleChatUpdated}
                      />
                    ) : (
                      <Placeholder>Select a Chat</Placeholder>
                    )}
                  </RightColumn>
                </InnerTabLayout>
              </TabPane>

              {/* B2B ACTIVE */}
              <TabPane tab="Active B2B" key="b2bActive">
                <Button
                  type="primary"
                  onClick={handleCreateB2BCase}
                  style={{ marginBottom: 16 }}
                >
                  Create a ticket w/ Serene Jannat Administration
                </Button>
                <InnerTabLayout>
                  <LeftColumn>{renderCasesList(b2bActive)}</LeftColumn>
                  <RightColumn>
                    {selectedChat ? (
                      <ChatDetailProperty
                        key={selectedChat._id}
                        chat={selectedChat}
                        isHistory={false}
                        fetchChats={() => getActiveB2BChats(userId, token)}
                        chosenLanguage={chosenLanguage}
                        globalAiEnabled={globalAiEnabled}
                        onChatUpdated={handleChatUpdated}
                      />
                    ) : (
                      <Placeholder>Select a Chat</Placeholder>
                    )}
                  </RightColumn>
                </InnerTabLayout>
              </TabPane>

              {/* HISTORY */}
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
                  <LeftColumn>{renderCasesList(currentHistoryData)}</LeftColumn>
                  <RightColumn>
                    {selectedChat ? (
                      <ChatDetailProperty
                        key={selectedChat._id}
                        chat={selectedChat}
                        isHistory={true}
                        fetchChats={() => {
                          if (historyFilter === "b2c") {
                            return getClosedB2CChats(userId, token);
                          }
                          return getClosedB2BChats(userId, token);
                        }}
                        chosenLanguage={chosenLanguage}
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
    </CustomerServiceMainWrapper>
  );
};

export default CustomerServiceSellerMain;

/* ================== STYLES ================== */
const CustomerServiceMainWrapper = styled.div`
  overflow-x: hidden;
  margin-top: 80px;
  min-height: 715px;

  .grid-container-main {
    display: grid;
    grid-template-columns: ${(props) => (props.show ? "5% 75%" : "17% 75%")};
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
