import React, { useEffect, useState } from "react";
import { isAuthenticated } from "../../auth";
import styled from "styled-components";
import { getUnassignedSupportCases, updateSupportCase } from "../apiAdmin";
import ChatDetail from "./ChatDetail";
import socket from "../../Chat/socket";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const InstantChat = () => {
	const [chats, setChats] = useState([]);
	const [selectedChat, setSelectedChat] = useState(null);
	const { user, token } = isAuthenticated();
	const [typingStatus, setTypingStatus] = useState("");

	const fetchChats = async () => {
		try {
			const response = await getUnassignedSupportCases(token);
			setChats(response.filter((chat) => chat.caseStatus !== "closed"));
		} catch (error) {
			console.error("Error fetching support cases", error);
		}
	};

	useEffect(() => {
		fetchChats();

		socket.on("closeCase", (closedCase) => {
			setChats((prevChats) =>
				prevChats.filter((chat) => chat._id !== closedCase.case._id)
			);
			if (selectedChat && selectedChat._id === closedCase.case._id) {
				setSelectedChat(null);
			}
		});

		socket.on("newChat", (newCase) => {
			setChats((prevChats) => [...prevChats, newCase]);
		});

		socket.on("receiveMessage", (message) => {
			if (message && message.messageBy && message.messageBy.customerName) {
				toast.info(`New message from ${message.messageBy.customerName}`);
				fetchChats(); // Update the chat list when a new message is received
			}
		});

		socket.on("typing", (data) => {
			if (
				data.caseId === selectedChat?._id &&
				data.name !== user.name.split(" ")[0]
			) {
				setTypingStatus(`${data.name} is typing...`);
			}
		});

		socket.on("stopTyping", (data) => {
			if (
				data.caseId === selectedChat?._id &&
				data.name !== user.name.split(" ")[0]
			) {
				setTypingStatus("");
			}
		});

		return () => {
			socket.off("closeCase");
			socket.off("newChat");
			socket.off("receiveMessage");
			socket.off("typing");
			socket.off("stopTyping");
		};
		// eslint-disable-next-line
	}, [token, selectedChat]);

	const handleStartChat = async (chatId) => {
		try {
			await updateSupportCase(chatId, { supporterId: user._id }, token);
			const response = await getUnassignedSupportCases(token);
			const filteredChats = response.filter(
				(chat) => chat.caseStatus !== "closed"
			);
			setChats(filteredChats);
			const selectedChat = filteredChats.find((chat) => chat._id === chatId);
			setSelectedChat(selectedChat);
		} catch (error) {
			console.error("Error starting chat", error);
		}
	};

	const getUnrespondedMessagesCount = (chat) => {
		let count = 0;
		let lastResponder = "";
		for (let i = chat.conversation.length - 1; i >= 0; i--) {
			const currentMessageBy = chat.conversation[i]?.messageBy?.customerName;
			if (!currentMessageBy) continue;
			if (lastResponder && currentMessageBy !== lastResponder) break;
			if (currentMessageBy !== user.name.split(" ")[0]) count++;
			lastResponder = currentMessageBy;
		}
		return count;
	};

	const hasResponder = (chat) => {
		return chat.conversation.some(
			(message) =>
				message?.messageBy?.customerName !==
				chat.conversation[0]?.messageBy?.customerName
		);
	};

	return (
		<ChatContainer>
			<ToastContainer />
			<ChatListWrapper>
				{chats.length > 0 ? (
					chats.map((chat) => {
						const unrespondedMessagesCount = getUnrespondedMessagesCount(chat);
						const noResponder = !hasResponder(chat);
						return (
							<ChatItem
								key={chat._id}
								onClick={() => handleStartChat(chat._id)}
								isActive={selectedChat && selectedChat._id === chat._id}
								noResponder={noResponder}
							>
								<p>{chat.conversation[0]?.messageBy?.customerName}</p>
								<p>{new Date(chat.createdAt).toLocaleString()}</p>
								<MessageCount
									style={{
										backgroundColor:
											(unrespondedMessagesCount === 0 ||
												unrespondedMessagesCount === 1) &&
											!noResponder
												? "green"
												: "red",
									}}
								>
									{unrespondedMessagesCount}
								</MessageCount>
							</ChatItem>
						);
					})
				) : (
					<p>No unassigned chats available.</p>
				)}
			</ChatListWrapper>
			<ChatDetailWrapper>
				{selectedChat ? (
					<ChatDetail chat={selectedChat} fetchChats={fetchChats} />
				) : (
					<p>Select a chat to start.</p>
				)}
				{typingStatus && <TypingStatus>{typingStatus}</TypingStatus>}
			</ChatDetailWrapper>
		</ChatContainer>
	);
};

export default InstantChat;

const ChatContainer = styled.div`
	display: flex;
	width: 100%;
	height: 100%;
`;

const ChatListWrapper = styled.div`
	width: 40%;
	height: 100%;
	padding: 20px;
	background-color: var(--background-light);
	border-right: 1px solid var(--border-color-dark);
	overflow-y: auto;
`;

const ChatDetailWrapper = styled.div`
	width: 60%;
	height: 100%;
	padding: 20px;
`;

const ChatItem = styled.div`
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 10px;
	border: 1px solid var(--border-color-dark);
	border-radius: 8px;
	background-color: ${(props) =>
		props.isActive
			? "var(--primary-color-light)"
			: props.noResponder
				? "var(--secondary-color-light)"
				: "var(--background-light)"};
	cursor: pointer;
	transition: background-color 0.3s;

	&:hover {
		background-color: var(--primary-color-lighter);
	}
`;

const MessageCount = styled.div`
	width: 20px;
	height: 20px;
	border-radius: 50%;
	color: white;
	display: flex;
	justify-content: center;
	align-items: center;
	font-size: 0.8rem;
`;

const TypingStatus = styled.div`
	margin-top: 10px;
	color: var(--text-color-dark);
	font-style: italic;
`;
