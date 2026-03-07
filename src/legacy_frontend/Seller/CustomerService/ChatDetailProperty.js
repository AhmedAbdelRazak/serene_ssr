/** @format */
import React, { useState, useEffect, useRef } from "react";
import styled, { keyframes } from "styled-components";
import { isAuthenticated } from "../../auth";
import {
	updateSupportCase,
	markAllMessagesAsSeenBySeller, // <-- IMPORT
} from "../apiSeller";
import { Input, Select, Button as AntdButton, Upload, Form } from "antd";
import socket from "../../Chat/socket";
import EmojiPicker from "emoji-picker-react";
import { SmileOutlined, UploadOutlined } from "@ant-design/icons";

const { Option } = Select;

const ChatDetailProperty = ({
	chat,
	isHistory,
	fetchChats,
	chosenLanguage,
}) => {
	const { user, token } = isAuthenticated();

	// If you have logic for agentId from query param:
	// eslint-disable-next-line
	const [agentId, setAgentId] = useState(user?._id || "");

	// Local states for messages, new message input, caseStatus, etc.
	const [messages, setMessages] = useState(chat.conversation || []);
	const [newMessage, setNewMessage] = useState("");
	const [caseStatus, setCaseStatus] = useState(chat.caseStatus);

	const [showEmojiPicker, setShowEmojiPicker] = useState(false);
	const [fileList, setFileList] = useState([]);
	const [typingStatus, setTypingStatus] = useState("");

	// Display name for who is sending (the seller/agent):
	const [displayName, setDisplayName] = useState(
		chat.supporterName || user?.name || "Agent"
	);

	const messagesEndRef = useRef(null);

	// 1) Immediately mark all as seen whenever we open this chat
	useEffect(() => {
		// If not history and chat is open, mark all messages as seen
		if (!isHistory && chat.caseStatus === "open") {
			markAllMessagesAsSeenBySeller(chat._id, agentId, token)
				.then(() => {
					// Optionally, update local states if needed
					// E.g., setMessages -> mark conversation as read in local state
					const updatedMessages = (chat.conversation || []).map((m) => ({
						...m,
						seenBySeller: true,
						seenByAdmin: true,
					}));
					setMessages(updatedMessages);
				})
				.catch((err) => {
					console.error("Error marking messages as seen on mount:", err);
				});
		}
	}, [chat._id, chat.caseStatus, isHistory, agentId, token, chat.conversation]);

	// 2) Socket: join the room, handle inbound events
	useEffect(() => {
		// Join the socket room
		socket.emit("joinRoom", { caseId: chat._id });

		const handleReceiveMessage = (updatedCase) => {
			// If the update is for this exact chat
			if (updatedCase._id === chat._id) {
				setMessages(updatedCase.conversation);

				// *** Mark them as seen if this chat is open (not history and is open)
				if (!isHistory && updatedCase.caseStatus === "open") {
					markAllMessagesAsSeenBySeller(chat._id, agentId, token).catch((err) =>
						console.error("Error marking messages as seen after new msg:", err)
					);
				}
			}
		};

		const handleTyping = (data) => {
			if (data.caseId === chat._id && data.user !== displayName) {
				setTypingStatus(`${data.user} is typing`);
			}
		};

		const handleStopTyping = (data) => {
			if (data.caseId === chat._id && data.user !== displayName) {
				setTypingStatus("");
			}
		};

		socket.on("receiveMessage", handleReceiveMessage);
		socket.on("typing", handleTyping);
		socket.on("stopTyping", handleStopTyping);

		// Cleanup on unmount
		return () => {
			socket.off("receiveMessage", handleReceiveMessage);
			socket.off("typing", handleTyping);
			socket.off("stopTyping", handleStopTyping);
			socket.emit("leaveRoom", { caseId: chat._id });
		};
	}, [chat._id, displayName, isHistory, agentId, token]);

	// Auto-scroll to bottom whenever messages OR typing status changes
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages, typingStatus]);

	/* ---------------- SEND MESSAGE ---------------- */
	const handleSendMessage = async () => {
		const msg = newMessage.trim();
		if (!msg) return;

		const messageData = {
			caseId: chat._id,
			messageBy: {
				customerName: displayName,
				customerEmail: user?.email,
				userId: agentId,
			},
			message: msg,
			date: new Date(),
			seenBySeller: true,
			seenByAdmin: true,
		};

		// 1) Optimistic update local
		setMessages((prev) => [...prev, messageData]);

		// 2) Update DB
		try {
			await updateSupportCase(chat._id, { conversation: messageData }, token);

			// 3) Socket broadcast
			socket.emit("sendMessage", messageData);

			setNewMessage("");
			socket.emit("stopTyping", { caseId: chat._id, user: displayName });

			if (typeof fetchChats === "function") {
				fetchChats();
			}
		} catch (err) {
			console.error("Error sending agent message:", err);
		}
	};

	const handleInputChange = (e) => {
		setNewMessage(e.target.value);
		socket.emit("typing", { caseId: chat._id, user: displayName });
	};

	const handleInputBlur = () => {
		socket.emit("stopTyping", { caseId: chat._id, user: displayName });
	};

	/* ---------------- CASE STATUS ---------------- */
	const handleChangeStatus = async (value) => {
		try {
			await updateSupportCase(chat._id, { caseStatus: value }, token);
			setCaseStatus(value);

			if (value === "closed") {
				socket.emit("closeCase", {
					case: { ...chat, caseStatus: "closed" },
					closedBy: user?.name || "Agent",
				});
			}
		} catch (err) {
			console.error("Error updating case status:", err);
		}
	};

	/* ---------------- DISPLAY NAME (ADMIN-ONLY) ---------------- */
	const handleDisplayNameChange = (e) => {
		setDisplayName(e.target.value);
	};

	/* ---------------- EMOJI PICKER ---------------- */
	const onEmojiClick = (emojiObj) => {
		setNewMessage((prev) => prev + emojiObj.emoji);
		setShowEmojiPicker(false);
	};

	/* ---------------- FILE ATTACHMENT (Placeholder) ---------------- */
	const handleFileChange = ({ fileList }) => {
		setFileList(fileList);
		// If you want to do an actual upload, handle it here
	};

	const isMine = (msg) => {
		return msg.messageBy.userId === agentId;
	};

	return (
		<ChatDetailWrapper>
			<h3 style={{ textTransform: "capitalize" }}>
				{chosenLanguage === "Arabic" ? "محادثة مع" : "Chat with"}{" "}
				<span style={{ fontWeight: "bold" }}>
					{/* Show some fallback if missing property or name */}
					{chat.propertyId?.propertyName ||
						chat.conversation[0]?.messageBy?.customerName ||
						"Unknown"}
				</span>
			</h3>
			<p>
				<strong>
					{chosenLanguage === "Arabic" ? "حول الاستفسار:" : "Inquiry About:"}
				</strong>{" "}
				{chat.conversation[0]?.inquiryAbout}
			</p>
			<p>
				<strong>{chosenLanguage === "Arabic" ? "تفاصيل:" : "Details:"}</strong>{" "}
				{chat.conversation[0]?.inquiryDetails}
			</p>

			{/* Not history => show controls */}
			{!isHistory && (
				<>
					<StatusSelect value={caseStatus} onChange={handleChangeStatus}>
						<Option value='open'>
							{chosenLanguage === "Arabic" ? "مفتوح" : "Open"}
						</Option>
						<Option value='closed'>
							{chosenLanguage === "Arabic" ? "مغلق" : "Closed"}
						</Option>
					</StatusSelect>

					{caseStatus === "open" && (
						<Form layout='vertical'>
							<Form.Item label='Display Name'>
								<Input
									value={displayName}
									onChange={handleDisplayNameChange}
									placeholder='Enter your display name'
									// e.g. only super admin can change:
									disabled={user?.role !== 1}
								/>
							</Form.Item>
						</Form>
					)}
				</>
			)}

			<ChatMessages>
				{messages.map((msg, idx) => (
					<MessageBubble key={idx} isMine={isMine(msg)}>
						<strong>{msg.messageBy.customerName}:</strong> {msg.message}
						<div>
							<small>{new Date(msg.date).toLocaleString()}</small>
						</div>
					</MessageBubble>
				))}

				{typingStatus && (
					<TypingIndicator>
						<span className='typing-text'>{typingStatus}</span>
						<span className='dot'></span>
						<span className='dot'></span>
						<span className='dot'></span>
					</TypingIndicator>
				)}
				<div ref={messagesEndRef} />
			</ChatMessages>

			{/* If not history + open => show input */}
			{!isHistory && caseStatus === "open" && (
				<ChatInputContainer>
					<Input
						placeholder={
							chosenLanguage === "Arabic"
								? "اكتب رسالتك..."
								: "Type your message..."
						}
						value={newMessage}
						onChange={handleInputChange}
						onBlur={handleInputBlur}
						onPressEnter={handleSendMessage}
					/>
					<SmileOutlined onClick={() => setShowEmojiPicker(!showEmojiPicker)} />

					{showEmojiPicker && (
						<EmojiPickerWrapper>
							<EmojiPicker onEmojiClick={onEmojiClick} />
						</EmojiPickerWrapper>
					)}

					<Upload
						fileList={fileList}
						onChange={handleFileChange}
						beforeUpload={() => false}
					>
						<AntdButton icon={<UploadOutlined />} />
					</Upload>

					<SendButton type='primary' onClick={handleSendMessage}>
						{chosenLanguage === "Arabic" ? "إرسال" : "Send"}
					</SendButton>
				</ChatInputContainer>
			)}
		</ChatDetailWrapper>
	);
};

export default ChatDetailProperty;

/* ========== STYLED COMPONENTS ========== */

const ChatDetailWrapper = styled.div`
	display: flex;
	flex-direction: column;
	width: 100%;
	height: 800px;
	padding: 20px;
	background-color: var(--background-light);
	border-radius: 8px;
	box-shadow: var(--box-shadow-dark);
`;

const ChatMessages = styled.div`
	flex: 1;
	overflow-y: auto;
	margin-bottom: 20px;
	position: relative;
`;

const typingBounce = keyframes`
  0%, 80%, 100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1.0);
  }
`;

const TypingIndicator = styled.div`
	display: flex;
	align-items: center;
	margin-top: 5px;
	.typing-text {
		margin-right: 8px;
		font-style: italic;
		color: #666;
	}
	.dot {
		width: 4px;
		height: 4px;
		border-radius: 50%;
		background-color: #666;
		margin: 0 2px;
		animation: ${typingBounce} 1s infinite ease-in-out;
	}
	.dot:nth-child(2) {
		animation-delay: 0.2s;
	}
	.dot:nth-child(3) {
		animation-delay: 0.4s;
	}
`;

const MessageBubble = styled.div`
	margin-bottom: 10px;
	padding: 10px;
	border-radius: 8px;
	background-color: ${(props) => (props.isMine ? "#d2f8d2" : "#f5f5f5")};
	border: 1px solid #ccc;

	strong {
		display: block;
		margin-bottom: 4px;
	}
	small {
		display: block;
		margin-top: 4px;
		font-size: 0.75rem;
		color: #888;
	}
`;

const StatusSelect = styled(Select)`
	width: 150px;
	margin-bottom: 20px;
`;

const ChatInputContainer = styled.div`
	display: flex;
	align-items: center;
	gap: 5px;

	input {
		flex-grow: 1;
	}
	button {
		width: auto;
	}
`;

const EmojiPickerWrapper = styled.div`
	position: absolute;
	bottom: 60px;
	right: 20px;
	z-index: 1002;
`;

const SendButton = styled(AntdButton)`
	background-color: var(--button-bg-primary);
	color: var(--button-font-color);
	border: none;
	transition: var(--main-transition);

	&:hover {
		background-color: var(--button-bg-primary-light);
		color: var(--button-font-color);
	}
`;
