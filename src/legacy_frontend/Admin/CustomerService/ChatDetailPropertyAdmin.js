/** @format */
// src/components/AdminNavigation/ChatDetailPropertyAdmin.js
import React, { useState, useEffect, useRef } from "react";
import styled, { keyframes } from "styled-components";
import {
  Input,
  Select,
  Button as AntdButton,
  Upload,
  Form,
  Switch,
  message as antMessage,
} from "antd";
import { SmileOutlined, UploadOutlined } from "@ant-design/icons";
import EmojiPicker from "emoji-picker-react";

import socket from "../../Chat/socket";
import { isAuthenticated } from "../../auth";
import {
  adminUpdateSupportCase,
  adminMarkAllMessagesAsSeen,
  adminToggleCaseAiResponder,
} from "../apiAdmin";

const { Option } = Select;
const ADMIN_NOTIFICATIONS_REFRESH_EVENT = "admin-support-notifications-refresh";
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

const ChatDetailPropertyAdmin = ({
  chat,
  isHistory,
  fetchChats,
  globalAiEnabled,
  onChatUpdated,
}) => {
  const { user, token } = isAuthenticated() || {};

  const [messages, setMessages] = useState(chat.conversation || []);
  const [newMessage, setNewMessage] = useState("");
  const [caseStatus, setCaseStatus] = useState(chat.caseStatus);
  const [aiEnabled, setAiEnabled] = useState(Boolean(chat.aiToRespond));
  const [displayName, setDisplayName] = useState(
    chat.supporterName || user?.name || "Admin",
  );

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [fileList, setFileList] = useState([]);
  const [typingStatus, setTypingStatus] = useState("");

  const messagesEndRef = useRef(null);

  useEffect(() => {
    setMessages(chat.conversation || []);
    setCaseStatus(chat.caseStatus);
    setAiEnabled(Boolean(chat.aiToRespond));
    setDisplayName(chat.supporterName || user?.name || "Admin");
  }, [chat, user?.name]);

  // Join the room
  useEffect(() => {
    socket.emit("joinRoom", { caseId: chat._id });

    const handleReceiveMessage = (updatedCase) => {
      if (updatedCase._id === chat._id) {
        setMessages(updatedCase.conversation);
        setCaseStatus(updatedCase.caseStatus);
        setAiEnabled(Boolean(updatedCase.aiToRespond));
      }
    };

    const handleSupportCaseUpdated = (updatedCase) => {
      if (updatedCase?._id === chat._id) {
        setMessages(updatedCase.conversation || []);
        setCaseStatus(updatedCase.caseStatus);
        setAiEnabled(Boolean(updatedCase.aiToRespond));
      }
    };

    const handleTyping = (data) => {
      if (data.caseId === chat._id && data.user !== displayName) {
        setTypingStatus(`${data.user} is typing...`);
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
  }, [chat._id, displayName]);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingStatus]);

  const manualReplyLocked =
    !isHistory &&
    caseStatus === "open" &&
    chat.openedBy === "client" &&
    aiEnabled &&
    globalAiEnabled;

  // Send a message
  const handleSendMessage = async () => {
    const trimmed = newMessage.trim();
    if (!trimmed) return;
    if (manualReplyLocked) {
      antMessage.warning(
        "AI replies are active for this chat. Turn them off before replying manually.",
      );
      return;
    }

    const messageData = {
      caseId: chat._id,
      messageBy: {
        customerName: displayName,
        customerEmail: user?.email,
        userId: user?._id,
      },
      message: trimmed,
      date: new Date(),
      seenByAdmin: true,
    };

    // 1) local
    setMessages((prev) => [...prev, messageData]);
    setNewMessage("");

    // 2) update DB
    try {
      await adminUpdateSupportCase(chat._id, token, {
        conversation: messageData,
      });
      socket.emit("stopTyping", { caseId: chat._id, user: displayName });

      if (typeof fetchChats === "function") {
        fetchChats();
      }
    } catch (err) {
      console.error("Error sending admin message:", err);
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

  // Update case status
  const handleCaseStatusChange = async (val) => {
    try {
      await adminUpdateSupportCase(chat._id, token, { caseStatus: val });
      setCaseStatus(val);

      // If we close it, emit closeCase
      if (val === "closed") {
        socket.emit("closeCase", {
          case: { ...chat, caseStatus: "closed" },
          closedBy: "admin",
        });
      }

      if (typeof fetchChats === "function") {
        fetchChats();
      }
    } catch (err) {
      console.error("Error updating case status (admin):", err);
    }
  };

  // Mark all messages as seen by Admin
  const markAllAsSeen = async () => {
    try {
      await adminMarkAllMessagesAsSeen(chat._id, token, user?._id);
      setMessages((prev) => prev.map((m) => ({ ...m, seenByAdmin: true })));
      window.dispatchEvent(new Event(ADMIN_NOTIFICATIONS_REFRESH_EVENT));
    } catch (err) {
      console.error("Error marking all messages as seen by Admin:", err);
    }
  };

  // Upload (placeholder)
  const handleFileChange = ({ fileList }) => {
    setFileList(fileList);
  };

  const handleDisplayNameChange = (e) => {
    setDisplayName(e.target.value);
  };

  const handleAiToggle = async (checked) => {
    try {
      const updatedChat = await adminToggleCaseAiResponder(
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

  const isMine = (msg) => msg.messageBy?.userId === user?._id;

  return (
    <ChatDetailWrapper>
      <h3>
        Chat with: <strong>{chat.displayName1 || "Unknown"}</strong>
      </h3>
      <p>
        <strong>Inquiry About:</strong>{" "}
        {chat.conversation[0]?.inquiryAbout || "N/A"}
      </p>
      <p>
        <strong>Details:</strong>{" "}
        {chat.conversation[0]?.inquiryDetails || "N/A"}
      </p>

      {!isHistory && (
        <>
          <SelectStatus value={caseStatus} onChange={handleCaseStatusChange}>
            <Option value="open">Open</Option>
            <Option value="closed">Closed</Option>
          </SelectStatus>

          {caseStatus === "open" && (
            <Form layout="vertical">
              {chat.openedBy === "client" && (
                <AiControlRow>
                  <div>
                    <strong>AI Replies</strong>
                    <AiHint>
                      {globalAiEnabled
                        ? aiEnabled
                          ? "AI currently owns this customer conversation."
                          : "Manual replies are enabled for this chat."
                        : "Global AI is off, so manual replies remain available."}
                    </AiHint>
                  </div>
                  <Switch checked={aiEnabled} onChange={handleAiToggle} />
                </AiControlRow>
              )}
              <Form.Item label="Admin Display Name">
                <Input
                  value={displayName}
                  onChange={handleDisplayNameChange}
                  placeholder="Enter your display name"
                />
              </Form.Item>
              <AntdButton onClick={markAllAsSeen}>Mark All as Seen</AntdButton>
            </Form>
          )}
        </>
      )}

      <MessagesWrapper>
        {messages.map((msg, idx) => (
          <MessageBubble key={idx} isMine={isMine(msg)}>
            <strong>{msg.messageBy?.customerName}:</strong>{" "}
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
      </MessagesWrapper>

      {!isHistory && caseStatus === "open" && (
        <>
          {manualReplyLocked && (
            <LockNotice>
              AI replies are on for this chat. Turn off the switch above to take
              over manually.
            </LockNotice>
          )}
          <InputContainer>
            <Input
              placeholder="Type your message..."
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
                <EmojiPicker
                  onEmojiClick={(emojiObj) => {
                    setNewMessage((prev) => prev + emojiObj.emoji);
                    setShowEmojiPicker(false);
                  }}
                />
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
              Send
            </SendButton>
          </InputContainer>
        </>
      )}
    </ChatDetailWrapper>
  );
};

export default ChatDetailPropertyAdmin;

/* =========== STYLES =========== */
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

const SelectStatus = styled(Select)`
  width: 150px;
  margin-bottom: 20px;
`;

const MessagesWrapper = styled.div`
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  margin-bottom: 20px;
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
  border: 1px solid #ccc;
  background-color: ${(props) => (props.isMine ? "#d2f8d2" : "#f5f5f5")};
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

const InputContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
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
