/* eslint-disable */
import React, { useState, useEffect, useMemo } from "react";
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
import { isAuthenticated } from "../../auth";
import socket from "../../Chat/socket";
const ChatSound = "/Notification.wav";

// Import your new SELLER APIs:
import {
	getStoreManagement,
	getUnseenMessagesCountBySeller,
	getUnseenMessagesListBySeller,
} from "../apiSeller";

// The dropdown component we just built:
import SellerNotificationDropdown from "./SellerNotificationDropdown";

const resolveAssetSrc = (asset) =>
	typeof asset === "string" ? asset : asset?.src || "";

const TopNavbar = ({ onProfileClick, collapsed }) => {
	const [dropdownOpen, setDropdownOpen] = useState(false);
	const { chosenLanguage } = useCartContext();

	// For the BELL icon + dropdown
	const [unseenCases, setUnseenCases] = useState([]); // list of unseen cases
	const [showNotificationDropdown, setShowNotificationDropdown] =
		useState(false);

	// For the CHAT icon badge
	const [unseenMessagesCount, setUnseenMessagesCount] = useState(0);

	// This toggles the red badge if you want it on the Chat icon
	const [notificationVisible, setNotificationVisible] = useState(false);

	// Auth
	const { user, token } = isAuthenticated();
	const userId = user && user._id;

	// Sound
	const [isUserInteracted, setIsUserInteracted] = useState(false);
	const newMessageAudio = useMemo(() => new Audio(ChatSound), []);
	const profileIconSrc = useMemo(() => resolveAssetSrc(iconLogo), []);

	// Store ID (fetched from backend if user.storeId is not already defined)
	const [storeId, setStoreId] = useState(null);

	// ------------------------------
	// 1) On mount, fetch storeId
	// ------------------------------
	useEffect(() => {
		if (!userId || !token) return;
		(async () => {
			try {
				const res = await getStoreManagement(userId, token);
				if (res && res._id) {
					setStoreId(res._id);
				}
			} catch (err) {
				console.error("Error fetching store management:", err);
			}
		})();
	}, [userId, token]);

	// ------------------------------
	// 2) Once we have storeId, set up unseen fetch + socket
	// ------------------------------
	useEffect(() => {
		if (!storeId || !token || !userId) return;

		const fetchUnseenData = async () => {
			try {
				// a) get the *count* (for chat icon badge)
				const countData = await getUnseenMessagesCountBySeller(storeId, token);
				if (countData && countData.count !== undefined) {
					setUnseenMessagesCount(countData.count);
					setNotificationVisible(countData.count > 0);
				}

				// b) get the *list* (for the bell dropdown)
				const listData = await getUnseenMessagesListBySeller(storeId, token);
				if (Array.isArray(listData)) {
					setUnseenCases(listData);
				}
			} catch (error) {
				console.error("Error fetching unseen messages for seller:", error);
			}
		};

		// Mark user has interacted (so we can play audio)
		const handleUserInteraction = () => {
			setIsUserInteracted(true);
		};

		window.addEventListener("click", handleUserInteraction, { once: true });
		window.addEventListener("keydown", handleUserInteraction, { once: true });

		// Initial fetch
		fetchUnseenData();

		// Socket events
		socket.on("newChat", (payload) => {
			if (payload && payload.targetSellerId === userId) {
				if (
					window.location.pathname !== "/seller/customer-service" &&
					isUserInteracted
				) {
					newMessageAudio.play().catch((err) => console.error(err));
				}
				fetchUnseenData();
			}
		});

		socket.on("receiveMessage", (updatedCase) => {
			if (
				window.location.pathname !== "/seller/customer-service" &&
				isUserInteracted
			) {
				newMessageAudio.play().catch((err) => console.error(err));
			}
			fetchUnseenData();
		});

		// Cleanup
		return () => {
			window.removeEventListener("click", handleUserInteraction);
			window.removeEventListener("keydown", handleUserInteraction);
			socket.off("newChat");
			socket.off("receiveMessage");
		};
	}, [storeId, token, userId, isUserInteracted, newMessageAudio]);

	// ---------------
	// Admin-like menu items
	// ---------------
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

	// Toggle the bell dropdown
	const toggleNotificationDropdown = () => {
		setShowNotificationDropdown(!showNotificationDropdown);
	};

	return (
		<NavbarWrapper>
			{/* Left Logo */}
			<LeftSection>
				<Logo show={collapsed}>
					<LastAddedLogoImage />
				</Logo>
			</LeftSection>

			{/* Right Icons */}
			<RightSection>
				<Icons>
					{/* Language Switcher */}
					<IconWrapper style={{ width: "25%" }}>
						<GlobalOutlined className='mx-2' />
						<LanguageText>
							{chosenLanguage === "English" ? "عربي" : "En"}
						</LanguageText>
					</IconWrapper>

					{/* Store Management */}
					<IconWrapper
						onClick={() =>
							(window.location.href = "/seller/seller/store-management")
						}
					>
						<SettingOutlined />
					</IconWrapper>

					{/* BELL ICON => Shows dropdown of unseen message cases */}
					<IconWrapper onClick={toggleNotificationDropdown}>
						<BellOutlined />
						{/* If you want a little red badge for the # of unseen cases, do: */}
						{unseenCases.length > 0 && (
							<NotificationBadge>{unseenCases.length}</NotificationBadge>
						)}
						{showNotificationDropdown && (
							<SellerNotificationDropdown
								unseenCases={unseenCases}
								onClose={() => setShowNotificationDropdown(false)}
							/>
						)}
					</IconWrapper>

					{/* CHAT ICON => routes to /seller/customer-service, shows total unseen message count */}
					<IconWrapper
						onClick={() => (window.location.href = "/seller/customer-service")}
					>
						<IoChatbubblesOutline />
						{notificationVisible && unseenMessagesCount > 0 && (
							<NotificationBadge>{unseenMessagesCount}</NotificationBadge>
						)}
					</IconWrapper>
				</Icons>

				{/* Profile */}
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
									<img src={profileIconSrc} alt='Profile' />
								) : (
									<UserOutlined />
								)}
								<div>
									<span>Seller Account</span>
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

/* ============================
       Styled Components
============================ */
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
	margin-left: ${(props) => (props.show ? "50px" : "")} !important;
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

	small {
		display: block;
		color: #bbb;
		font-size: 12px;
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
	display: flex;
	justify-content: center;
	align-items: center;
	font-size: 12px;
`;
