/* eslint-disable */
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import styled from "styled-components";
import { Dropdown } from "antd";
import {
  UserOutlined,
  LogoutOutlined,
  MailOutlined,
  BellOutlined,
  SettingOutlined,
  GlobalOutlined,
} from "@ant-design/icons";
import { IoChatbubblesOutline } from "react-icons/io5";
import { useCartContext } from "../../cart_context";
import LastAddedLogoImage from "./LastAddedLogoImage";
import iconLogo from "../iconLogo.png";

// Admin APIs
import {
  getUnassignedSupportCasesCount,
  getUnseenMessagesCountByAdmin,
} from "../apiAdmin";

// Socket + Auth + Notification Sound
import socket from "../../Chat/socket";
import { isAuthenticated } from "../../auth";
const ChatSound = "/Notification.wav";
const ADMIN_NOTIFICATIONS_REFRESH_EVENT = "admin-support-notifications-refresh";

// The admin notification dropdown
import NotificationDropdown from "./NotificationDropdown";

const resolveAssetSrc = (asset) =>
  typeof asset === "string" ? asset : asset?.src || "";

const TopNavbar = ({ onProfileClick, collapsed }) => {
  const { chosenLanguage } = useCartContext();
  const [unassignedCount, setUnassignedCount] = useState(0);
  const [unseenMessagesCount, setUnseenMessagesCount] = useState(0);

  const [notificationVisible, setNotificationVisible] = useState(false);
  const [showNotificationDropdown, setShowNotificationDropdown] =
    useState(false);

  const [dropdownOpen, setDropdownOpen] = useState(false); // For the profile menu

  const { token } = isAuthenticated() || {};
  const [isUserInteracted, setIsUserInteracted] = useState(false);
  const newMessageAudio = useMemo(() => new Audio(ChatSound), []);
  const profileIconSrc = useMemo(() => resolveAssetSrc(iconLogo), []);

  // A ref to detect clicks outside the dropdown
  const dropdownRef = useRef(null);

  const refreshNotificationState = useCallback(async () => {
    if (!token) return;

    try {
      const [unassignedData, unseenData] = await Promise.all([
        getUnassignedSupportCasesCount(token),
        getUnseenMessagesCountByAdmin(token),
      ]);

      if (unassignedData?.count !== undefined) {
        setUnassignedCount(unassignedData.count);
        setNotificationVisible(unassignedData.count > 0);
      }

      if (unseenData?.count !== undefined) {
        setUnseenMessagesCount(unseenData.count);
      }
    } catch (err) {
      console.error("Error refreshing admin notification state:", err);
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    refreshNotificationState();

    const handleUserInteraction = () => setIsUserInteracted(true);
    window.addEventListener("click", handleUserInteraction, { once: true });
    window.addEventListener("keydown", handleUserInteraction, { once: true });

    const handleRefresh = () => {
      refreshNotificationState();
    };

    const handleReceiveMessage = () => {
      // If admin is not in the /admin/customer-service page, beep
      if (
        window.location.pathname !== "/admin/customer-service" &&
        isUserInteracted
      ) {
        newMessageAudio
          .play()
          .catch((err) => console.error("Error playing audio:", err));
      }
      refreshNotificationState();
    };

    socket.on("newChat", handleRefresh);
    socket.on("closeCase", handleRefresh);
    socket.on("supportCaseUpdated", handleRefresh);
    socket.on("receiveMessage", handleReceiveMessage);
    window.addEventListener(ADMIN_NOTIFICATIONS_REFRESH_EVENT, handleRefresh);

    return () => {
      window.removeEventListener("click", handleUserInteraction);
      window.removeEventListener("keydown", handleUserInteraction);
      window.removeEventListener(
        ADMIN_NOTIFICATIONS_REFRESH_EVENT,
        handleRefresh,
      );
      socket.off("newChat", handleRefresh);
      socket.off("closeCase", handleRefresh);
      socket.off("supportCaseUpdated", handleRefresh);
      socket.off("receiveMessage", handleReceiveMessage);
    };
  }, [token, newMessageAudio, isUserInteracted, refreshNotificationState]);

  // Close dropdown if click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        showNotificationDropdown
      ) {
        setShowNotificationDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showNotificationDropdown]);

  // Admin profile menu items
  const menuItems = [
    {
      key: "profile",
      icon: <UserOutlined />,
      label: "Profile",
    },
    {
      key: "inbox",
      icon: <MailOutlined />,
      label: "Inbox",
    },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "Logout",
    },
  ];

  // Toggle the NotificationDropdown
  const toggleNotificationDropdown = (e) => {
    e.stopPropagation(); // so we don't close it immediately
    setShowNotificationDropdown(!showNotificationDropdown);
  };

  return (
    <NavbarWrapper>
      <LeftSection>
        <Logo $collapsed={collapsed}>
          <LastAddedLogoImage />
        </Logo>
      </LeftSection>

      <RightSection>
        <Icons>
          {/* Language Switch */}
          <IconWrapper style={{ width: "25%" }}>
            <GlobalOutlined className="mx-2" />
            <LanguageText>
              {chosenLanguage === "English" ? "عربي" : "En"}
            </LanguageText>
          </IconWrapper>

          {/* Admin Settings */}
          <IconWrapper
            onClick={() =>
              (window.location.href = "/admin/store-management?storesettings")
            }
          >
            <SettingOutlined />
          </IconWrapper>

          {/* BELL => Unseen Admin Messages */}
          <IconWrapper ref={dropdownRef} onClick={toggleNotificationDropdown}>
            <BellOutlined />
            {unseenMessagesCount > 0 && (
              <NotificationBadge>{unseenMessagesCount}</NotificationBadge>
            )}
            {showNotificationDropdown && (
              <NotificationDropdown
                onClose={() => setShowNotificationDropdown(false)}
                onNotificationsChanged={refreshNotificationState}
              />
            )}
          </IconWrapper>

          {/* Chat Bubble => Unassigned cases */}
          <IconWrapper
            onClick={() => (window.location.href = "/admin/customer-service")}
          >
            <IoChatbubblesOutline />
            {notificationVisible && (
              <NotificationBadge>{unassignedCount}</NotificationBadge>
            )}
          </IconWrapper>
        </Icons>

        <ProfileMenu>
          <Dropdown
            menu={{ items: menuItems }}
            trigger={["click"]}
            open={dropdownOpen}
            onOpenChange={(flag) => setDropdownOpen(flag)}
          >
            <div>
              <Profile onClick={onProfileClick}>
                {profileIconSrc ? (
                  <img src={profileIconSrc} alt="Profile" />
                ) : (
                  <UserOutlined />
                )}
                <div>
                  <span>The Boss</span>
                </div>
              </Profile>
            </div>
          </Dropdown>
        </ProfileMenu>
      </RightSection>
    </NavbarWrapper>
  );
};

export default TopNavbar;

/* ============ STYLES ============ */
const NavbarWrapper = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 70px;
  background-color: #1e1e2d;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 1000;
`;

const LeftSection = styled.div`
  display: flex;
  align-items: center;
`;

const Logo = styled.div`
  display: flex;
  align-items: center;
  margin-left: ${(props) => (props.$collapsed ? "50px" : "")} !important;
  @media (max-width: 750px) {
    display: none;
  }
`;

const RightSection = styled.div`
  display: flex;
  align-items: center;
`;

const Icons = styled.div`
  display: flex;
  align-items: center;
  margin-left: 40px !important;
  margin-right: 40px !important;

  svg {
    font-size: 25px;
    color: #fff;
    cursor: pointer;
  }
`;

const IconWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background-color: #161621;
  border-radius: 5px;
  margin-right: 20px !important;
  cursor: pointer;
`;

const LanguageText = styled.span`
  color: #fff;
  margin-left: 5px;
  font-size: 14px;
`;

const ProfileMenu = styled.div`
  display: flex;
  align-items: center;
`;

const Profile = styled.div`
  display: flex;
  align-items: center;
  cursor: pointer;

  img {
    border-radius: 25%;
  }

  span {
    font-weight: bold;
    color: #fff;
    margin-left: 15px !important;
  }
`;

const NotificationBadge = styled.div`
  position: absolute;
  top: 0;
  right: 0;
  width: 15px;
  height: 15px;
  background-color: red;
  color: white;
  border-radius: 50%;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
`;
