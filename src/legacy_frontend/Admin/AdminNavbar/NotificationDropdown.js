// src/components/AdminNavigation/NotificationDropdown.js

import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { getUnseenMessagesDetails, updateSeenByAdmin } from "../apiAdmin";
import { isAuthenticated } from "../../auth";

const NotificationDropdown = ({ onClose }) => {
	const [unseenMessages, setUnseenMessages] = useState([]);
	const [loading, setLoading] = useState(true);
	const { token } = isAuthenticated() || {};

	useEffect(() => {
		const fetchUnseenMessages = async () => {
			try {
				const data = await getUnseenMessagesDetails(token);
				if (Array.isArray(data)) {
					setUnseenMessages(data);
				}
			} catch (err) {
				console.error("Error fetching unseen messages details:", err);
			} finally {
				setLoading(false);
			}
		};
		fetchUnseenMessages();
	}, [token]);

	const handleClick = async (caseId) => {
		try {
			await updateSeenByAdmin(caseId, token);
			onClose(); // close dropdown
			window.location.href = `/admin/customer-service?caseId=${caseId}`;
		} catch (err) {
			console.error("Error updating seen by admin:", err);
		}
	};

	return (
		<DropdownContainer>
			{loading ? (
				<LoadingMessage>Loading...</LoadingMessage>
			) : unseenMessages.length === 0 ? (
				<NoMessages>No new notifications</NoMessages>
			) : (
				unseenMessages.map((oneCase) => (
					<MessageItem
						key={oneCase._id}
						onClick={() => handleClick(oneCase._id)}
					>
						<MessageHeader>
							{/* Show the from name or any relevant info */}
							{oneCase.conversation[0]?.messageBy?.customerName ||
								"Unknown Sender"}
						</MessageHeader>
						<MessageBody>
							{oneCase.conversation[0]?.message?.slice(0, 60) || "No content"}
							...
						</MessageBody>
					</MessageItem>
				))
			)}
		</DropdownContainer>
	);
};

export default NotificationDropdown;

/* ========== STYLES ========== */
const DropdownContainer = styled.div`
	position: absolute;
	top: 60px;
	right: 0;
	width: 300px;
	max-height: 400px;
	overflow-y: auto;
	background-color: white;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
	border-radius: 5px;
	z-index: 1000;
`;

const LoadingMessage = styled.div`
	padding: 20px;
	text-align: center;
`;

const NoMessages = styled.div`
	padding: 20px;
	text-align: center;
`;

const MessageItem = styled.div`
	padding: 10px;
	border-bottom: 1px solid #f0f0f0;
	cursor: pointer;
	&:hover {
		background-color: #f9f9f9;
	}
`;

const MessageHeader = styled.div`
	font-weight: bold;
`;

const MessageBody = styled.div`
	color: #555;
`;
