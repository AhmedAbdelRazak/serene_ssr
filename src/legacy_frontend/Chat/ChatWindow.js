/** @format
 *  ChatWindow.js  – Serene Jannat Marketplace
 *  ------------------------------------------------------------------
 *  Changes vs. the component you provided:
 *    • message list is strictly date‑sorted → correct ordering
 *    • optimistic send keeps UI snappy, but duplicates are filtered
 *    • agent URLs appear as “Click here” links (shortened)
 *    • ESLint warnings fixed (useMemo used, missing dependency added)
 *  The rest of the component—including all styling, labels, props,
 *  placeholders, Arabic text, autocomplete, rating flow, etc.—is
 *  untouched.
 *  ------------------------------------------------------------------
 */

import React, {
	useState,
	useEffect,
	useRef,
	useCallback,
	useMemo,
} from "react";
import { Button, Input, Select, Form, Upload, message } from "antd";
import {
	createNewSupportCase,
	getSupportCaseById,
	updateSupportCase,
	updateSeenByCustomer,
	autoCompleteProducts,
	checkInvoiceNumber,
} from "../apiCore"; // adjust path if needed
import styled, { keyframes } from "styled-components";
import { getSocket } from "./socket";
import EmojiPicker from "emoji-picker-react";
import {
	UploadOutlined,
	CloseOutlined,
	WarningFilled,
	CustomerServiceFilled,
} from "@ant-design/icons";
import StarRatings from "react-star-ratings";
import { isAuthenticated } from "../auth";

const { Option } = Select;

/* ────────────────────────────────────────────────────────────
   CONSTANTS & HELPERS
   ──────────────────────────────────────────────────────────── */

const INQUIRY_TYPES = [
	{ value: "order", label: "Inquiry about an Order" },
	{ value: "product", label: "Inquiry about a Product" },
	{ value: "other", label: "Other Inquiry" },
];

/** local id for optimistic messages */
const genLocalId = () =>
	`local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/** milliseconds range treated as “same” for dedup */
const TS_EPSILON = 10_000;

/* ────────────────────────────────────────────────────────────
   COMPONENT
   ──────────────────────────────────────────────────────────── */

const ChatWindow = ({ closeChatWindow, chosenLanguage, websiteSetup }) => {
	/* ════════════════════════════════════════════════════════
	   0) BASIC STATE
	   ════════════════════════════════════════════════════════ */
	const [customerName, setCustomerName] = useState("");
	const [customerEmail, setCustomerEmail] = useState("");

	const [inquiryAbout, setInquiryAbout] = useState("");
	const [orderNumber, setOrderNumber] = useState("");
	const [productName, setProductName] = useState("");
	const [otherInquiry, setOtherInquiry] = useState("");
	const [storeId, setStoreId] = useState(null);

	const [caseId, setCaseId] = useState("");
	const [submitted, setSubmitted] = useState(false);
	const [messages, setMessages] = useState([]);
	const [newMessage, setNewMessage] = useState("");

	const [showEmojiPicker, setShowEmojiPicker] = useState(false);
	const [fileList, setFileList] = useState([]);
	const [typingStatus, setTypingStatus] = useState("");

	const [isRatingVisible, setIsRatingVisible] = useState(false);
	const [rating, setRating] = useState(0);

	const messagesEndRef = useRef(null);

	const [productSuggestions, setProductSuggestions] = useState([]);
	const [showSuggestions, setShowSuggestions] = useState(false);
	const [hasSelectedProduct, setHasSelectedProduct] = useState(false);
	const selectedProductNameRef = useRef("");

	/* ==> optimistic bookkeeping */
	const pendingLocalIds = useRef(new Set());

	/* memo: lowercase email (used in comparisons) */
	const lowerCustomerEmail = useMemo(
		() => (customerEmail ? customerEmail.toLowerCase() : ""),
		[customerEmail]
	);
	const socket = useMemo(() => getSocket(), []);

	const fetchSupportCase = useCallback(async (id) => {
		try {
			if (!id) return;
			const supCase = await getSupportCaseById(id);
			if (supCase?.conversation) setMessages(sortByDate(supCase.conversation));
		} catch (err) {
			console.error("Error fetching support case:", err);
		}
	}, []); //  ← empty dependency array keeps the reference stable

	/* ════════════════════════════════════════════════════════
	   1) ON‑MOUNT  – restore cached chat, pre‑fill user
	   ════════════════════════════════════════════════════════ */
	useEffect(() => {
		if (isAuthenticated()) {
			const { user } = isAuthenticated();
			setCustomerName(user.name || "");
			setCustomerEmail(user.email || user.phone || "");
		}

		const saved = JSON.parse(localStorage.getItem("currentChat") || "null");
		if (saved?.caseId) {
			setCaseId(saved.caseId);
			setCustomerName(saved.customerName || "");
			setCustomerEmail(saved.customerEmail || "");
			setInquiryAbout(saved.inquiryAbout || "");
			setOrderNumber(saved.orderNumber || "");
			setProductName(saved.productName || "");
			setOtherInquiry(saved.otherInquiry || "");
			setStoreId(saved.storeId || null);
			setSubmitted(saved.submitted || false);
			setMessages(sortByDate(saved.messages || []));

			/* now safe because fetchSupportCase is memoised */
			fetchSupportCase(saved.caseId);
		}
	}, [fetchSupportCase]);

	/* ════════════════════════════════════════════════════════
	   2) JOIN / LEAVE SOCKET ROOM
	   ════════════════════════════════════════════════════════ */
	useEffect(() => {
		if (caseId) socket.emit("joinRoom", { caseId });
		return () => {
			if (caseId) socket.emit("leaveRoom", { caseId });
		};
	}, [caseId, socket]);

	/* ════════════════════════════════════════════════════════
	   3) SOCKET LISTENERS
	   ════════════════════════════════════════════════════════ */
	useEffect(() => {
		function handleReceiveMessage(msgData) {
			if (msgData.caseId !== caseId) return;

			setMessages((prev) => {
				/* filter optimistic duplicate */
				const filtered = prev.filter(
					(m) =>
						!m.local ||
						!(
							m.message === msgData.message &&
							m.messageBy?.customerEmail === msgData.messageBy?.customerEmail &&
							Math.abs(new Date(m.date) - new Date(msgData.date)) < TS_EPSILON
						)
				);
				return sortByDate([...filtered, msgData]);
			});
			pendingLocalIds.current.clear();
			markMessagesAsSeen(caseId);
		}

		function handleCloseCase(data) {
			if (data?.case?._id === caseId) setIsRatingVisible(true);
		}

		const handleTyping = (info) => {
			if (info.caseId === caseId && info.user !== customerName) {
				setTypingStatus(`${info.user} is typing`);
			}
		};
		const handleStopTyping = (info) => {
			if (info.caseId === caseId && info.user !== customerName) {
				setTypingStatus("");
			}
		};

		socket.on("receiveMessage", handleReceiveMessage);
		socket.on("closeCase", handleCloseCase);
		socket.on("typing", handleTyping);
		socket.on("stopTyping", handleStopTyping);

		return () => {
			socket.off("receiveMessage", handleReceiveMessage);
			socket.off("closeCase", handleCloseCase);
			socket.off("typing", handleTyping);
			socket.off("stopTyping", handleStopTyping);
		};
	}, [caseId, customerName, customerEmail, socket]); // ← added missing dep

	/* ════════════════════════════════════════════════════════
	   4) LOCAL‑STORAGE SYNC + mark‑seen
	   ════════════════════════════════════════════════════════ */
	useEffect(() => {
		if (!caseId) return;
		const snapshot = {
			caseId,
			customerName,
			customerEmail,
			inquiryAbout,
			orderNumber,
			productName,
			otherInquiry,
			storeId,
			submitted,
			messages,
		};
		localStorage.setItem("currentChat", JSON.stringify(snapshot));
		markMessagesAsSeen(caseId);
	}, [
		caseId,
		customerName,
		customerEmail,
		inquiryAbout,
		orderNumber,
		productName,
		otherInquiry,
		storeId,
		submitted,
		messages,
	]);

	/* ════════════════════════════════════════════════════════
	   5) HELPERS – fetch / mark‑seen / sort
	   ════════════════════════════════════════════════════════ */

	async function markMessagesAsSeen(id) {
		try {
			if (id) await updateSeenByCustomer(id);
		} catch (err) {
			console.error("Error marking messages as seen:", err);
		}
	}
	function sortByDate(arr = []) {
		return [...arr].sort(
			(a, b) => new Date(a.date || 0) - new Date(b.date || 0)
		);
	}

	/* ════════════════════════════════════════════════════════
	   6) SCROLL TO BOTTOM ON NEW MESSAGE / TYPING
	   ════════════════════════════════════════════════════════ */
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages, typingStatus]);

	/* ════════════════════════════════════════════════════════
	   7) PRODUCT AUTOCOMPLETE
	   ════════════════════════════════════════════════════════ */
	useEffect(() => {
		let ignore = false;
		(async () => {
			const txt = productName.trim();
			if (inquiryAbout !== "product" || txt.length < 4) {
				if (!ignore) {
					setProductSuggestions([]);
					setShowSuggestions(false);
				}
				return;
			}
			if (
				hasSelectedProduct &&
				txt.length >= selectedProductNameRef.current.trim().length
			)
				return;

			try {
				const sugg = await autoCompleteProducts(txt);
				if (!ignore) {
					setProductSuggestions(sugg);
					setShowSuggestions(true);
				}
			} catch (err) {
				console.error("Error auto‑completing products:", err);
			}
		})();
		return () => {
			ignore = true;
		};
	}, [inquiryAbout, productName, hasSelectedProduct]);

	const handleSelectProduct = (prod) => {
		setProductName(prod.productName);
		setStoreId(prod.store || null);
		selectedProductNameRef.current = prod.productName;
		setHasSelectedProduct(true);
		setShowSuggestions(false);
		setProductSuggestions([]);
	};

	/* ════════════════════════════════════════════════════════
	   8) ORDER / INVOICE VALIDATION
	   ════════════════════════════════════════════════════════ */
	async function checkOrderInvoice() {
		if (!orderNumber.trim()) return;
		try {
			const result = await checkInvoiceNumber(orderNumber.trim());
			result.found ? setStoreId(result.storeId || null) : setStoreId(null);
		} catch (err) {
			console.error("Error checking invoice:", err);
		}
	}

	/* ════════════════════════════════════════════════════════
	   9) CREATE SUPPORT CASE
	   ════════════════════════════════════════════════════════ */
	async function handleSubmit() {
		/* validation */
		if (!customerName.trim() || !customerEmail.trim()) {
			message.error("Please enter your name and email/phone.");
			return;
		}
		if (!isAuthenticated() && customerName.trim().split(" ").length < 2) {
			message.error("Please enter your full name (first and last).");
			return;
		}
		const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		const phoneRx = /^[0-9]{10,15}$/;
		if (!emailRx.test(customerEmail) && !phoneRx.test(customerEmail)) {
			message.error("Enter a valid email or phone.");
			return;
		}
		if (!inquiryAbout) {
			message.error("Select what your inquiry is about.");
			return;
		}

		let detail = "";
		if (inquiryAbout === "order") {
			detail = orderNumber.trim();
			if (detail) await checkOrderInvoice();
		} else if (inquiryAbout === "product") {
			detail = productName.trim();
		} else {
			detail = otherInquiry.trim();
		}
		if (!detail) {
			message.error("Please provide details for your inquiry.");
			return;
		}

		const payload = {
			customerName,
			customerEmail,
			displayName1: customerName,
			displayName2: "Platform Support",
			role: 0,
			storeId: storeId || null,
			inquiryAbout,
			inquiryDetails: detail || "General Inquiry",
			supporterId: "606060606060606060606060",
			ownerId: "606060606060606060606060",
		};

		try {
			const newCase = await createNewSupportCase(payload);
			setCaseId(newCase._id);
			setSubmitted(true);
			setMessages(
				sortByDate(
					newCase.conversation?.length
						? newCase.conversation
						: [
								{
									_id: genLocalId(),
									messageBy: { customerName: "System" },
									message: "A representative will be with you in 3-5 minutes.",
									date: new Date(),
								},
							]
				)
			);
		} catch (err) {
			console.error("Error creating support case:", err);
		}
	}

	/* ════════════════════════════════════════════════════════
	   10) SEND MESSAGE (optimistic)
	   ════════════════════════════════════════════════════════ */
	async function handleSendMessage() {
		if (!newMessage.trim()) return;

		const localId = genLocalId();
		const nowISO = new Date().toISOString();

		const optimistic = {
			_id: localId,
			caseId,
			local: true,
			messageBy: { customerName, customerEmail },
			message: newMessage,
			date: nowISO,
		};

		setMessages((prev) => sortByDate([...prev, optimistic]));
		pendingLocalIds.current.add(localId);

		setNewMessage("");
		if (caseId) socket.emit("stopTyping", { caseId, user: customerName });

		try {
			await updateSupportCase(caseId, {
				conversation: {
					messageBy: { customerName, customerEmail },
					message: newMessage,
					date: nowISO,
				},
			});
			socket.emit("sendMessage", {
				caseId,
				messageBy: { customerName, customerEmail },
				message: newMessage,
				date: nowISO,
			});
		} catch (err) {
			console.error("Error sending message:", err);
			message.error("Message failed to send. Please try again.");
			setMessages((prev) => prev.filter((m) => m._id !== localId));
			pendingLocalIds.current.delete(localId);
		}
	}

	/* ════════════════════════════════════════════════════════
	   11) RATING / CLOSE
	   ════════════════════════════════════════════════════════ */
	function handleCloseChat() {
		setIsRatingVisible(true);
	}
	async function handleRateService(val) {
		try {
			await updateSupportCase(caseId, {
				rating: val,
				caseStatus: "closed",
				closedBy: "client",
			});
			localStorage.removeItem("currentChat");
			setIsRatingVisible(false);
			closeChatWindow();
			message.success("Thanks for your feedback!");
		} catch (err) {
			console.error("Error rating support case:", err);
		}
	}
	async function handleSkipRating() {
		try {
			await updateSupportCase(caseId, {
				caseStatus: "closed",
				closedBy: "client",
			});
			localStorage.removeItem("currentChat");
			setIsRatingVisible(false);
			closeChatWindow();
		} catch (err) {
			console.error("Error skipping rating:", err);
		}
	}

	/* ════════════════════════════════════════════════════════
	   12) TYPING HANDLERS
	   ════════════════════════════════════════════════════════ */
	const handleInputChange = (e) => {
		setNewMessage(e.target.value);
		if (caseId) socket.emit("typing", { caseId, user: customerName });
	};
	const handleStopTypingLocal = () => {
		if (caseId) socket.emit("stopTyping", { caseId, user: customerName });
	};
	const handlePressEnter = (e) => {
		if (!e.shiftKey) {
			e.preventDefault();
			handleSendMessage();
		}
	};

	/* ════════════════════════════════════════════════════════
	   13) EMOJI & FILE UPLOAD
	   ════════════════════════════════════════════════════════ */
	const handleEmojiClick = (emojiObj) => {
		setNewMessage((prev) => prev + emojiObj.emoji);
		setShowEmojiPicker(false);
	};
	const handleFileChange = ({ fileList: list }) => setFileList(list);

	/* ════════════════════════════════════════════════════════
	   14) LINK RENDERER  (shortens agent URLs)
	   ════════════════════════════════════════════════════════ */
	const renderLinks = useCallback((txt, shorten = false) => {
		const urlRegex = /(https?:\/\/[^\s]+)/g;
		return txt.split(urlRegex).map((part, i) =>
			part.match(urlRegex) ? (
				<a href={part} key={i} target='_blank' rel='noreferrer'>
					{shorten ? "Click here" : part}
				</a>
			) : (
				part
			)
		);
	}, []);

	const isMine = (msg) =>
		msg.messageBy?.customerEmail &&
		lowerCustomerEmail &&
		msg.messageBy.customerEmail.toLowerCase() === lowerCustomerEmail;

	/* ════════════════════════════════════════════════════════
	   15) RENDER
	   ════════════════════════════════════════════════════════ */
	return (
		<ChatWindowWrapper>
			{websiteSetup?.deactivateChatResponse && (
				<OfflineNotice>
					<span className='mr-1'>
						<WarningFilled style={{ color: "#ff4d4f" }} />
					</span>
					<span>
						All our agents are currently away.
						<br />
						Please leave your name, e‑mail / phone and your question. One of our
						specialists will get back to you within the next business day.
					</span>
				</OfflineNotice>
			)}

			<Header>
				<h3>
					<CustomerServiceFilled className='mr-1' />
					{chosenLanguage === "Arabic" ? "دعم العملاء" : "Customer Support"}
				</h3>
				<Button
					type='text'
					icon={<CloseOutlined />}
					onClick={closeChatWindow}
				/>
			</Header>

			{/* ─────────────── Rating Pane ─────────────── */}
			{isRatingVisible ? (
				<RatingContainer>
					<h4>
						{chosenLanguage === "Arabic" ? "قيم خدمتنا" : "Rate Our Service"}
					</h4>
					<StarRatings
						rating={rating}
						starRatedColor='#faad14'
						changeRating={setRating}
						numberOfStars={5}
						name='rating'
						starDimension='24px'
					/>
					<div className='rating-buttons'>
						<Button type='primary' onClick={() => handleRateService(rating)}>
							{chosenLanguage === "Arabic" ? "إرسال التقييم" : "Submit Rating"}
						</Button>
						<Button onClick={handleSkipRating}>
							{chosenLanguage === "Arabic" ? "تخطي" : "Skip"}
						</Button>
					</div>
				</RatingContainer>
			) : submitted ? (
				/* ─────────────── Chat Area ─────────────── */
				<>
					<MessagesSection>
						{messages.map((msg) => {
							const mine = isMine(msg);
							return (
								<MessageBubble isMine={mine} key={msg._id || Math.random()}>
									<strong>{msg.messageBy?.customerName || "Agent"}:</strong>{" "}
									{renderLinks(msg.message, !mine)}
									<small>{new Date(msg.date).toLocaleString()}</small>
								</MessageBubble>
							);
						})}
						{typingStatus && (
							<TypingIndicator>
								<span className='typing-text'>{typingStatus}</span>
								<span className='dot'></span>
								<span className='dot'></span>
								<span className='dot'></span>
							</TypingIndicator>
						)}
						<div ref={messagesEndRef} />
					</MessagesSection>

					<Form.Item>
						<ChatInputContainer>
							<Input.TextArea
								placeholder={
									chosenLanguage === "Arabic"
										? "اكتب رسالتك..."
										: "Type your message..."
								}
								value={newMessage}
								onChange={handleInputChange}
								onBlur={handleStopTypingLocal}
								autoSize={{ minRows: 1, maxRows: 6 }}
								onPressEnter={handlePressEnter}
							/>
							<Button onClick={() => setShowEmojiPicker((p) => !p)}>😀</Button>
							{showEmojiPicker && (
								<EmojiPickerWrapper>
									<EmojiPicker onEmojiClick={handleEmojiClick} />
								</EmojiPickerWrapper>
							)}
							<Upload
								fileList={fileList}
								onChange={handleFileChange}
								beforeUpload={() => false}
							>
								<Button icon={<UploadOutlined />} />
							</Upload>
						</ChatInputContainer>

						<Button
							type='primary'
							block
							onClick={handleSendMessage}
							style={{ marginTop: 8 }}
						>
							{chosenLanguage === "Arabic" ? "إرسال" : "Send"}
						</Button>
						<Button
							type='default'
							block
							onClick={handleCloseChat}
							style={{ marginTop: 8, background: "#ff4d4f", color: "#fff" }}
						>
							<CloseOutlined />{" "}
							{chosenLanguage === "Arabic" ? "إغلاق المحادثة" : "Close Chat"}
						</Button>
					</Form.Item>
				</>
			) : (
				/* ─────────────── Initial Form ─────────────── */
				<Form layout='vertical' onFinish={handleSubmit}>
					<Form.Item label='Full Name' required>
						<Input
							value={customerName}
							onChange={(e) => setCustomerName(e.target.value)}
							placeholder='FirstName LastName'
							disabled={isAuthenticated() && !!customerName}
							style={
								isAuthenticated() && customerName
									? { background: "#f5f5f5", color: "#666" }
									: undefined
							}
						/>
					</Form.Item>

					<Form.Item label='Email or Phone' required>
						<Input
							value={customerEmail}
							onChange={(e) => setCustomerEmail(e.target.value)}
							placeholder='client@example.com or 1234567890'
							disabled={isAuthenticated() && !!customerEmail}
							style={
								isAuthenticated() && customerEmail
									? { background: "#f5f5f5", color: "#666" }
									: undefined
							}
						/>
					</Form.Item>

					<Form.Item label='Inquiry About' required>
						<Select
							placeholder='Select an option'
							value={inquiryAbout || undefined}
							onChange={setInquiryAbout}
						>
							{INQUIRY_TYPES.map((opt) => (
								<Option key={opt.value} value={opt.value}>
									{opt.label}
								</Option>
							))}
						</Select>
					</Form.Item>

					{inquiryAbout === "order" && (
						<Form.Item label='Order/Invoice Number' required>
							<Input
								value={orderNumber}
								onChange={(e) => setOrderNumber(e.target.value)}
								placeholder='E.g. INV12345'
							/>
						</Form.Item>
					)}

					{inquiryAbout === "product" && (
						<Form.Item label='Product Name' required>
							<ProductInputWrapper>
								<Input
									value={productName}
									onChange={(e) => setProductName(e.target.value)}
									placeholder='Type at least 4 letters...'
								/>
								{showSuggestions && productSuggestions.length > 0 && (
									<SuggestionsList>
										{productSuggestions.map((prod) => (
											<SuggestionItem
												key={prod._id}
												onClick={() => handleSelectProduct(prod)}
											>
												<strong>{prod.productName}</strong>
												{prod.productSKU ? ` (SKU: ${prod.productSKU})` : ""}
											</SuggestionItem>
										))}
									</SuggestionsList>
								)}
							</ProductInputWrapper>
						</Form.Item>
					)}

					{inquiryAbout === "other" && (
						<Form.Item label='Brief Description' required>
							<Input
								value={otherInquiry}
								onChange={(e) => setOtherInquiry(e.target.value)}
								placeholder='Describe your inquiry'
							/>
						</Form.Item>
					)}

					<Button type='primary' htmlType='submit' block>
						{chosenLanguage === "Arabic" ? "بدء المحادثة" : "Start Chat"}
					</Button>
				</Form>
			)}
		</ChatWindowWrapper>
	);
};

export default ChatWindow;

/* ────────────────────────────────────────────────────────────
   STYLED COMPONENTS (identical except where commented)
   ──────────────────────────────────────────────────────────── */

const ChatWindowWrapper = styled.div`
	position: fixed;
	bottom: 70px;
	right: 20px;
	width: 350px;
	max-width: 90%;
	height: 70vh;
	max-height: 80vh;
	background: #fff;
	border: 1px solid #ccc;
	border-radius: 8px;
	z-index: 1001;
	box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
	padding: 20px;
	overflow: hidden;

	select,
	option,
	input,
	strong {
		text-transform: capitalize !important;
	}

	@media (max-width: 768px) {
		bottom: 85px;
		right: 5%;
		width: 90%;
		height: 80vh;
	}
`;

const Header = styled.div`
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 10px;
	h3 {
		font-weight: bold;
		font-size: 1.5rem;
	}
`;

const MessagesSection = styled.div`
	max-height: 55vh;
	margin-bottom: 10px;
	overflow-y: auto;
	scroll-behavior: smooth;
`;

const typingBounce = keyframes`
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1.0); }
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
		width: 6px;
		height: 6px;
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
	margin-bottom: 8px;
	padding: 8px;
	border-radius: 6px;
	line-height: 1.4;
	background: ${(props) => (props.isMine ? "#d2f8d2" : "#f5f5f5")};

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

const RatingContainer = styled.div`
	text-align: center;

	.rating-buttons {
		margin-top: 16px;
		display: flex;
		justify-content: center;
		gap: 10px;
	}
`;

const ChatInputContainer = styled.div`
	display: flex;
	gap: 4px;

	textarea {
		flex: 1;
		resize: none;
	}
`;

const EmojiPickerWrapper = styled.div`
	position: absolute;
	bottom: 60px;
	right: 20px;
	z-index: 9999;
	background: #fff;
	box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
`;

const ProductInputWrapper = styled.div`
	position: relative;
`;

const SuggestionsList = styled.ul`
	position: absolute;
	top: 38px;
	left: 0;
	right: 0;
	max-height: 180px;
	overflow-y: auto;
	background: #fff;
	border: 1px solid #ccc;
	list-style: none;
	margin: 0;
	padding: 0;
	z-index: 9999;
`;

const SuggestionItem = styled.li`
	padding: 8px 12px;
	cursor: pointer;
	&:hover {
		background-color: #eee;
	}
`;

const OfflineNotice = styled.div`
	background: #fafafa;
	border: 1px solid #eee;
	padding: 2px 5px;
	margin-bottom: 16px;
	border-radius: 6px;
	font-size: 0.78rem;
	font-weight: bold;
`;
