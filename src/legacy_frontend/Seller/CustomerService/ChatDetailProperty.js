/** @format */
import React, { useEffect, useRef, useState } from "react";
import styled, { keyframes } from "styled-components";
import { isAuthenticated } from "../../auth";
import {
  markAllMessagesAsSeenBySeller,
  toggleCaseAiResponder,
  updateSupportCase,
} from "../apiSeller";
import {
  Button as AntdButton,
  Form,
  Input,
  Select,
  Switch,
  Upload,
  message as antMessage,
} from "antd";
import socket from "../../Chat/socket";
import EmojiPicker from "emoji-picker-react";
import { SmileOutlined, UploadOutlined } from "@ant-design/icons";

const { Option } = Select;
const URL_REGEX = /(https?:\/\/[^\s]+)/g;
const CHAT_LINK_STYLE = {
  color: "#1d4ed8",
  textDecoration: "underline",
  fontStyle: "italic",
  fontWeight: 600,
};

const getLinkLabel = (url) =>
  /track|tracking|usps|ups|fedex|dhl/i.test(url)
    ? "Track order"
    : /\/custom-gifts\/.+\?occasion=/i.test(url)
      ? "View design"
      : /\/custom-gifts\?occasion=/i.test(url)
        ? "View designs"
        : /\/custom-gifts\/|\/single-product\/|\/our-products\//i.test(url)
          ? "View product"
          : "Visit page";

const renderMessageText = (text) =>
  `${text || ""}`.split("\n").map((line, lineIndex, allLines) => (
    <React.Fragment key={`line-${lineIndex}`}>
      {line.split(URL_REGEX).map((part, partIndex) =>
        /^https?:\/\/[^\s]+$/i.test(part) ? (
          <a
            href={part}
            key={`part-${lineIndex}-${partIndex}`}
            target="_blank"
            rel="noreferrer"
            title={part}
            style={CHAT_LINK_STYLE}
          >
            {getLinkLabel(part)}
          </a>
        ) : (
          <React.Fragment key={`part-${lineIndex}-${partIndex}`}>
            {part}
          </React.Fragment>
        ),
      )}
      {lineIndex < allLines.length - 1 && <br />}
    </React.Fragment>
  ));

const ChatDetailProperty = ({
  chat,
  isHistory,
  fetchChats,
  chosenLanguage,
  globalAiEnabled,
  onChatUpdated,
}) => {
  const { user, token } = isAuthenticated();
  const agentId = user?._id || "";

  const [messages, setMessages] = useState(chat.conversation || []);
  const [newMessage, setNewMessage] = useState("");
  const [caseStatus, setCaseStatus] = useState(chat.caseStatus);
  const [aiEnabled, setAiEnabled] = useState(Boolean(chat.aiToRespond));
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [fileList, setFileList] = useState([]);
  const [typingStatus, setTypingStatus] = useState("");
  const [displayName, setDisplayName] = useState(
    chat.supporterName || user?.name || "Agent",
  );

  const messagesEndRef = useRef(null);

  useEffect(() => {
    setMessages(chat.conversation || []);
    setCaseStatus(chat.caseStatus);
    setAiEnabled(Boolean(chat.aiToRespond));
    setDisplayName(chat.supporterName || user?.name || "Agent");
  }, [chat, user?.name]);

  useEffect(() => {
    if (!isHistory && chat.caseStatus === "open") {
      markAllMessagesAsSeenBySeller(chat._id, agentId, token)
        .then(() => {
          setMessages(
            (chat.conversation || []).map((entry) => ({
              ...entry,
              seenBySeller: true,
            })),
          );
        })
        .catch((err) => {
          console.error("Error marking messages as seen on mount:", err);
        });
    }
  }, [chat._id, chat.caseStatus, isHistory, agentId, token, chat.conversation]);

  useEffect(() => {
    socket.emit("joinRoom", { caseId: chat._id });

    const handleReceiveMessage = (updatedCase) => {
      if (updatedCase?._id !== chat._id) return;
      setMessages(updatedCase.conversation || []);
      setCaseStatus(updatedCase.caseStatus);
      setAiEnabled(Boolean(updatedCase.aiToRespond));

      if (!isHistory && updatedCase.caseStatus === "open") {
        markAllMessagesAsSeenBySeller(chat._id, agentId, token).catch((err) =>
          console.error("Error marking messages as seen after new msg:", err),
        );
      }
    };

    const handleSupportCaseUpdated = (updatedCase) => {
      if (updatedCase?._id !== chat._id) return;
      setMessages(updatedCase.conversation || []);
      setCaseStatus(updatedCase.caseStatus);
      setAiEnabled(Boolean(updatedCase.aiToRespond));
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
    socket.on("supportCaseUpdated", handleSupportCaseUpdated);
    socket.on("typing", handleTyping);
    socket.on("stopTyping", handleStopTyping);

    return () => {
      socket.off("receiveMessage", handleReceiveMessage);
      socket.off("supportCaseUpdated", handleSupportCaseUpdated);
      socket.off("typing", handleTyping);
      socket.off("stopTyping", handleStopTyping);
      socket.emit("leaveRoom", { caseId: chat._id });
    };
  }, [chat._id, displayName, isHistory, agentId, token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingStatus]);

  const manualReplyLocked =
    !isHistory &&
    caseStatus === "open" &&
    chat.openedBy === "client" &&
    aiEnabled &&
    globalAiEnabled;

  const handleSendMessage = async () => {
    const msg = newMessage.trim();
    if (!msg) return;
    if (manualReplyLocked) {
      antMessage.warning(
        "AI replies are active for this chat. Turn them off before replying manually.",
      );
      return;
    }

    const messageData = {
      caseId: chat._id,
      senderType: "staff",
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

    setMessages((prev) => [...prev, messageData]);

    try {
      await updateSupportCase(chat._id, { conversation: messageData }, token);
      setNewMessage("");
      socket.emit("stopTyping", { caseId: chat._id, user: displayName });

      if (typeof fetchChats === "function") {
        fetchChats();
      }
    } catch (err) {
      console.error("Error sending agent message:", err);
      antMessage.error(
        err?.message ||
          "Unable to send the message while AI replies are active.",
      );
    }
  };

  const handleInputChange = (e) => {
    setNewMessage(e.target.value);
    socket.emit("typing", { caseId: chat._id, user: displayName });
  };

  const handleInputBlur = () => {
    socket.emit("stopTyping", { caseId: chat._id, user: displayName });
  };

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

  const handleDisplayNameChange = (e) => {
    setDisplayName(e.target.value);
  };

  const handleAiToggle = async (checked) => {
    try {
      const updatedChat = await toggleCaseAiResponder(
        chat._id,
        user?._id,
        token,
        checked,
      );
      setAiEnabled(Boolean(updatedChat?.aiToRespond));
      onChatUpdated?.(updatedChat);
      if (typeof fetchChats === "function") {
        fetchChats();
      }
      antMessage.success(
        checked
          ? "AI replies are now active for this chat."
          : "AI replies are off. You can respond manually now.",
      );
    } catch (err) {
      console.error("Error toggling AI replies:", err);
      antMessage.error(err?.message || "Unable to update AI reply status.");
    }
  };

  const onEmojiClick = (emojiObj) => {
    setNewMessage((prev) => prev + emojiObj.emoji);
    setShowEmojiPicker(false);
  };

  const handleFileChange = ({ fileList: nextFileList }) => {
    setFileList(nextFileList);
  };

  const isMine = (msg) => msg.messageBy?.userId === agentId;

  return (
    <ChatDetailWrapper>
      <h3 style={{ textTransform: "capitalize" }}>
        {chosenLanguage === "Arabic" ? "محادثة مع" : "Chat with"}{" "}
        <span style={{ fontWeight: "bold" }}>
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

      {!isHistory && (
        <>
          <StatusSelect value={caseStatus} onChange={handleChangeStatus}>
            <Option value="open">
              {chosenLanguage === "Arabic" ? "مفتوح" : "Open"}
            </Option>
            <Option value="closed">
              {chosenLanguage === "Arabic" ? "مغلق" : "Closed"}
            </Option>
          </StatusSelect>

          {caseStatus === "open" && (
            <Form layout="vertical">
              {chat.openedBy === "client" && (
                <AiControlRow>
                  <div>
                    <strong>
                      {chosenLanguage === "Arabic"
                        ? "ردود الذكاء الاصطناعي"
                        : "AI Replies"}
                    </strong>
                    <AiHint>
                      {globalAiEnabled
                        ? aiEnabled
                          ? chosenLanguage === "Arabic"
                            ? "الذكاء الاصطناعي يتولى هذه المحادثة حاليًا."
                            : "AI currently owns this customer conversation."
                          : chosenLanguage === "Arabic"
                            ? "الردود اليدوية متاحة لهذه المحادثة."
                            : "Manual replies are enabled for this chat."
                        : chosenLanguage === "Arabic"
                          ? "الذكاء الاصطناعي العام متوقف، لذلك تظل الردود اليدوية متاحة."
                          : "Global AI is off, so manual replies remain available."}
                    </AiHint>
                  </div>
                  <Switch checked={aiEnabled} onChange={handleAiToggle} />
                </AiControlRow>
              )}

              <Form.Item label="Display Name">
                <Input
                  value={displayName}
                  onChange={handleDisplayNameChange}
                  placeholder="Enter your display name"
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
            <strong>{msg.messageBy.customerName}:</strong>{" "}
            {renderMessageText(msg.message)}
            <div>
              <small>{new Date(msg.date).toLocaleString()}</small>
            </div>
          </MessageBubble>
        ))}

        {typingStatus && (
          <TypingIndicator>
            <span className="typing-text">{typingStatus}</span>
            <span className="dot"></span>
            <span className="dot"></span>
            <span className="dot"></span>
          </TypingIndicator>
        )}
        <div ref={messagesEndRef} />
      </ChatMessages>

      {!isHistory && caseStatus === "open" && (
        <>
          {manualReplyLocked && (
            <LockNotice>
              {chosenLanguage === "Arabic"
                ? "الذكاء الاصطناعي يرد على هذه المحادثة حاليًا. أوقف المفتاح أعلاه للرد يدويًا."
                : "AI replies are on for this chat. Turn off the switch above to take over manually."}
            </LockNotice>
          )}
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
              disabled={manualReplyLocked}
            />
            <SmileOutlined
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            />

            {showEmojiPicker && !manualReplyLocked && (
              <EmojiPickerWrapper>
                <EmojiPicker onEmojiClick={onEmojiClick} />
              </EmojiPickerWrapper>
            )}

            <Upload
              fileList={fileList}
              onChange={handleFileChange}
              beforeUpload={() => false}
              disabled={manualReplyLocked}
            >
              <AntdButton
                icon={<UploadOutlined />}
                disabled={manualReplyLocked}
              />
            </Upload>

            <SendButton
              type="primary"
              onClick={handleSendMessage}
              disabled={manualReplyLocked}
            >
              {chosenLanguage === "Arabic" ? "إرسال" : "Send"}
            </SendButton>
          </ChatInputContainer>
        </>
      )}
    </ChatDetailWrapper>
  );
};

export default ChatDetailProperty;

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
  overflow-x: hidden;
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
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-word;

  strong {
    display: block;
    margin-bottom: 4px;
  }

  a {
    font-weight: 600;
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

const AiControlRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
  padding: 12px 14px;
  background: #f7f8fb;
  border: 1px solid #e4e6eb;
  border-radius: 10px;
`;

const AiHint = styled.div`
  margin-top: 4px;
  font-size: 0.85rem;
  color: #666;
`;

const LockNotice = styled.div`
  margin-bottom: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  background: #fff7e6;
  border: 1px solid #ffd591;
  color: #8c5d00;
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
