import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { getSupportCases } from "../apiAdmin";
import { isAuthenticated } from "../../auth";
import ChatDetail from "./ChatDetail";
import StarRatings from "react-star-ratings";

const HistoryChats = () => {
	const [chats, setChats] = useState([]);
	const [selectedChat, setSelectedChat] = useState(null);
	const { token } = isAuthenticated();

	useEffect(() => {
		const fetchChats = async () => {
			try {
				const response = await getSupportCases("closed", token);
				console.log("Fetched Support Cases:", response); // Log the fetched data
				const closedChats = response.sort(
					(a, b) => new Date(b.createdAt) - new Date(a.createdAt)
				);
				setChats(closedChats);
				console.log("Filtered Closed Chats:", closedChats); // Log the filtered data
			} catch (error) {
				console.error("Error fetching support cases", error);
			}
		};

		fetchChats();
	}, [token]);

	const handleSelectChat = (chat) => {
		setSelectedChat(chat);
	};

	return (
		<ChatContainer>
			<ChatListWrapper>
				{chats.length > 0 ? (
					chats.map((chat) => (
						<ChatItem
							key={chat._id}
							onClick={() => handleSelectChat(chat)}
							isActive={selectedChat && selectedChat._id === chat._id}
						>
							<ChatItemHeader>
								<p>{chat.conversation[0]?.messageBy?.customerName}</p>
								<p>{new Date(chat.createdAt).toLocaleString()}</p>
							</ChatItemHeader>
							<StarRatingWrapper>
								<StarRatings
									rating={chat.rating || 0} // Default to 0 if rating is null
									starRatedColor='gold'
									numberOfStars={5}
									starDimension='20px'
									starSpacing='2px'
								/>
							</StarRatingWrapper>
						</ChatItem>
					))
				) : (
					<p>No chat history available.</p>
				)}
			</ChatListWrapper>
			<ChatDetailWrapper>
				{selectedChat ? (
					<ChatDetail chat={selectedChat} isHistory={true} />
				) : (
					<p>Select a chat to view details.</p>
				)}
			</ChatDetailWrapper>
		</ChatContainer>
	);
};

export default HistoryChats;

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
	flex-direction: column;
	justify-content: space-between;
	align-items: center;
	padding: 10px;
	border: 1px solid var(--border-color-dark);
	border-radius: 8px;
	background-color: ${(props) =>
		props.isActive ? "var(--primary-color-light)" : "var(--background-light)"};
	cursor: pointer;
	transition: background-color 0.3s;

	&:hover {
		background-color: var(--primary-color-light);
	}
`;

const ChatItemHeader = styled.div`
	display: flex;
	justify-content: space-between;
	width: 100%;
`;

const StarRatingWrapper = styled.div`
	margin-top: 10px;
`;
