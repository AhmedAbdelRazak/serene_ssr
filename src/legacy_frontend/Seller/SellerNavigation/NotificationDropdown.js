import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { getUnseenMessagesDetails, updateSeenByAdmin } from "../apiAdmin";
import { isAuthenticated } from "../../auth";

const NotificationDropdown = ({ onClose }) => {
	const [unseenMessages, setUnseenMessages] = useState([]);
	const [loading, setLoading] = useState(true);
	const { token } = isAuthenticated();

	useEffect(() => {
		const fetchUnseenMessages = async () => {
			try {
				const response = await getUnseenMessagesDetails(token);
				setUnseenMessages(response);
				setLoading(false);
			} catch (error) {
				console.error("Error fetching unseen messages details", error);
				setLoading(false);
			}
		};

		fetchUnseenMessages();
	}, [token]);

	const handleClick = async (chatId) => {
		console.log(`Updating seen status for chat ID: ${chatId}`);
		await updateSeenByAdmin(chatId, token);
		onClose();
		window.location.href = `/admin/customer-service`;
	};

	return (
		<DropdownContainer>
			{loading ? (
				<LoadingMessage>Loading...</LoadingMessage>
			) : unseenMessages.length === 0 ? (
				<NoMessages>No new notifications</NoMessages>
			) : (
				unseenMessages.map((message, index) => (
					<MessageItem key={index} onClick={() => handleClick(message._id)}>
						<MessageHeader>
							{message.conversation[0].messageBy.customerName}
						</MessageHeader>
						<MessageBody>{message.conversation[0].message}</MessageBody>
					</MessageItem>
				))
			)}
		</DropdownContainer>
	);
};

export default NotificationDropdown;

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
